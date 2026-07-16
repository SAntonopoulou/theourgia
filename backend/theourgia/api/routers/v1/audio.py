"""Audio attachment HTTP endpoints (v1-012).

``GET  /api/v1/audio/{id}``            — attachment detail (incl. transcript)
``POST /api/v1/audio/{id}/transcribe`` — queue local Whisper transcription

Transcription is double-gated (FEATURES §2 — "opt-in"):

1. **Instance** — ``THEOURGIA_TRANSCRIPTION_ENABLED`` must be true.
2. **User** — the caller must have set the ``audio.transcription_opt_in``
   user setting.

Both gates fail closed with distinct 403 details so the frontend can
tell the operator-level "not available here" apart from the user-level
"you haven't opted in". The endpoint only ENQUEUES — the heavy lifting
happens in :func:`theourgia.core.tasks.transcription
.transcribe_audio_attachment` on a worker, fully locally. Audio bytes
never leave the instance.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.config import get_settings
from theourgia.core.tasks.transcription import transcribe_audio_attachment
from theourgia.models.audio import AudioAttachment
from theourgia.models.usersettings import UserSetting

__all__ = [
    "DETAIL_ALREADY_TRANSCRIBED",
    "DETAIL_INSTANCE_DISABLED",
    "DETAIL_NOT_OPTED_IN",
    "TRANSCRIPTION_OPT_IN_KEY",
    "AudioAttachmentRead",
    "TranscribeQueuedResponse",
    "router",
]

router = APIRouter()


TRANSCRIPTION_OPT_IN_KEY = "audio.transcription_opt_in"

# Distinct 403 details — the frontend branches on these.
DETAIL_INSTANCE_DISABLED = (
    "Transcription is not enabled on this instance."
)
DETAIL_NOT_OPTED_IN = (
    "You have not opted in to audio transcription. Enable "
    "audio.transcription_opt_in in your settings first."
)
DETAIL_ALREADY_TRANSCRIBED = (
    "A transcript already exists for this recording. Pass force=true "
    "to re-transcribe."
)


# ── Schemas ──────────────────────────────────────────────────────────


class AudioAttachmentRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    entry_id: str | None
    upload_id: str
    duration_seconds: float
    mime_type: str
    transcript: str | None
    transcript_engine: str | None
    waveform_thumbnail_url: str | None
    label: str | None
    created_at: datetime
    updated_at: datetime


class TranscribeQueuedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queued: bool


# ── Helpers ──────────────────────────────────────────────────────────


def _to_read(row: AudioAttachment) -> AudioAttachmentRead:
    return AudioAttachmentRead(
        id=str(row.id),
        entry_id=str(row.entry_id) if row.entry_id else None,
        upload_id=str(row.upload_id),
        duration_seconds=row.duration_seconds,
        mime_type=row.mime_type,
        transcript=row.transcript,
        transcript_engine=row.transcript_engine,
        waveform_thumbnail_url=row.waveform_thumbnail_url,
        label=row.label,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _get_owned_attachment(
    db: AsyncSession, attachment_id: UUID, owner_id: UUID
) -> AudioAttachment:
    """Load a live attachment owned by the caller, else 404.

    Non-owners get the same 404 as a missing row — the caller isn't
    allowed to know the attachment exists.
    """
    row = await db.get(AudioAttachment, attachment_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id is None
        or row.owner_id != owner_id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Audio attachment not found.",
        )
    return row


async def _user_opted_in(db: AsyncSession, user_id: UUID) -> bool:
    """Read the ``audio.transcription_opt_in`` user setting (default
    False). Same direct-row pattern as the user_settings router."""
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id,
        UserSetting.key == TRANSCRIPTION_OPT_IN_KEY,
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        return False
    try:
        return bool(json.loads(row.value_json))
    except (ValueError, TypeError):
        return False


# ── Endpoints ────────────────────────────────────────────────────────


@router.get(
    "/audio/{attachment_id}",
    response_model=AudioAttachmentRead,
    tags=["audio"],
)
async def get_audio_attachment(
    attachment_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> AudioAttachmentRead:
    """Attachment detail — includes ``transcript`` +
    ``transcript_engine`` so the editor can render provenance-tagged
    transcripts (and poll for a queued one)."""
    row = await _get_owned_attachment(db, attachment_id, current_user.id)
    return _to_read(row)


@router.post(
    "/audio/{attachment_id}/transcribe",
    response_model=TranscribeQueuedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["audio"],
)
async def transcribe_audio(
    attachment_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    force: bool = False,
) -> TranscribeQueuedResponse:
    """Queue local Whisper transcription for one attachment.

    202 on enqueue. 403 when the instance gate or the user opt-in
    gate is closed (distinct details). 409 when a transcript already
    exists and ``force`` is not set.
    """
    row = await _get_owned_attachment(db, attachment_id, current_user.id)

    settings = get_settings()
    if not settings.transcription_enabled:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, DETAIL_INSTANCE_DISABLED,
        )
    if not await _user_opted_in(db, current_user.id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, DETAIL_NOT_OPTED_IN,
        )

    if row.transcript is not None and not force:
        raise HTTPException(
            status.HTTP_409_CONFLICT, DETAIL_ALREADY_TRANSCRIBED,
        )

    transcribe_audio_attachment.delay(str(attachment_id))
    return TranscribeQueuedResponse(queued=True)
