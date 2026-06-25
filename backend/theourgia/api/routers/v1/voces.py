"""Voces Magicae HTTP endpoints.

Per-vault rows + bundled fixtures + audio recordings.

``GET    /api/v1/voces/bundled``           — bundled PD corpus (public)
``GET    /api/v1/voces``                   — list per-vault
``POST   /api/v1/voces``                   — create
``GET    /api/v1/voces/{id}``              — detail (with recordings)
``PATCH  /api/v1/voces/{id}``              — update
``DELETE /api/v1/voces/{id}``              — soft delete
``POST   /api/v1/voces/fork-bundled``      — fork a bundled fixture
``POST   /api/v1/voces/{id}/recordings``   — attach an audio recording
``DELETE /api/v1/voces/{id}/recordings/{rec_id}`` — remove a recording

Honesty rule (H05): ``source_citation`` is required and non-empty
on every per-vault row. The schema enforces a non-empty string;
PATCH cannot clear it.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.workshop.bundled_voces import (
    BUNDLED_VOCES,
    bundled_by_id,
)
from theourgia.models.audio import AudioAttachment
from theourgia.models.entities import Entity
from theourgia.models.voces import SourceScript, VoceMagicae, VoceRecording

__all__ = ["router"]

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────


class BundledVoceRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    source_text: str
    source_script: str
    transliteration: str | None
    ipa: str | None
    source_citation: str
    planetary_associations: list[str]
    elemental_associations: list[str]


class VoceRecordingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    voce_id: str
    audio_attachment_id: str
    duration_seconds: int
    notes: str | None
    created_at: datetime
    updated_at: datetime


class VoceMagicaeRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    source_text: str
    source_script: str
    transliteration: str | None
    ipa: str | None
    source_citation: str
    planetary_associations: list[str]
    elemental_associations: list[str]
    linked_entity_ids: list[str]
    forked_from_bundled_id: str | None
    recordings: list[VoceRecordingRead]
    created_at: datetime
    updated_at: datetime


class VoceMagicaeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    source_text: str = Field(min_length=1)
    source_script: SourceScript
    transliteration: str | None = None
    ipa: str | None = Field(default=None, max_length=480)
    # REQUIRED — H05 honesty rule.
    source_citation: str = Field(min_length=1, max_length=480)
    planetary_associations: list[str] = Field(default_factory=list)
    elemental_associations: list[str] = Field(default_factory=list)
    linked_entity_ids: list[UUID] = Field(default_factory=list)


class VoceMagicaeUpdate(BaseModel):
    """``source_citation`` can be changed but never cleared."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    source_text: str | None = Field(default=None, min_length=1)
    source_script: SourceScript | None = None
    transliteration: str | None = None
    ipa: str | None = Field(default=None, max_length=480)
    source_citation: str | None = Field(
        default=None, min_length=1, max_length=480,
    )
    planetary_associations: list[str] | None = None
    elemental_associations: list[str] | None = None
    linked_entity_ids: list[UUID] | None = None


class VoceForkBundledPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bundled_id: str = Field(min_length=1, max_length=120)


class VoceRecordingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    audio_attachment_id: UUID
    duration_seconds: int = Field(ge=0)
    notes: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────


def _to_recording_read(row: VoceRecording) -> VoceRecordingRead:
    return VoceRecordingRead(
        id=str(row.id),
        voce_id=str(row.voce_id),
        audio_attachment_id=str(row.audio_attachment_id),
        duration_seconds=row.duration_seconds,
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_voce_read(
    row: VoceMagicae,
    recordings: list[VoceRecording] | None = None,
) -> VoceMagicaeRead:
    return VoceMagicaeRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        source_text=row.source_text,
        source_script=row.source_script.value,
        transliteration=row.transliteration,
        ipa=row.ipa,
        source_citation=row.source_citation,
        planetary_associations=list(row.planetary_associations or []),
        elemental_associations=list(row.elemental_associations or []),
        linked_entity_ids=[
            str(x) for x in (row.linked_entity_ids or [])
        ],
        forked_from_bundled_id=row.forked_from_bundled_id,
        recordings=[_to_recording_read(r) for r in (recordings or [])],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _owner_check(row: VoceMagicae, current_user_id: UUID | None) -> None:
    if (
        current_user_id is not None
        and row.owner_id is not None
        and row.owner_id != current_user_id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voce not found.")


async def _fetch_recordings(
    voce_id: UUID, db: AsyncSession,
) -> list[VoceRecording]:
    stmt = (
        select(VoceRecording)
        .where(VoceRecording.voce_id == voce_id)
        .where(VoceRecording.deleted_at.is_(None))
        .order_by(VoceRecording.created_at.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def _validate_entity_ids(
    ids: list[UUID], db: AsyncSession, owner_id: UUID | None,
) -> None:
    if not ids:
        return
    stmt = select(Entity).where(Entity.id.in_(ids))
    if owner_id is not None:
        stmt = stmt.where(Entity.owner_id == owner_id)
    rows = (await db.execute(stmt)).scalars().all()
    if len(rows) != len(set(ids)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "One or more linked_entity_ids are not in your vault.",
        )


# ── Routes ──────────────────────────────────────────────────────────


@router.get(
    "/voces/bundled",
    response_model=list[BundledVoceRead],
    tags=["voces"],
)
async def list_bundled_voces() -> list[BundledVoceRead]:
    """Return the bundled PD corpus — reference material, no auth."""
    return [
        BundledVoceRead(
            id=v.id,
            name=v.name,
            source_text=v.source_text,
            source_script=v.source_script,
            transliteration=v.transliteration,
            ipa=v.ipa,
            source_citation=v.source_citation,
            planetary_associations=list(v.planetary_associations),
            elemental_associations=list(v.elemental_associations),
        )
        for v in BUNDLED_VOCES
    ]


@router.get(
    "/voces", response_model=list[VoceMagicaeRead], tags=["voces"],
)
async def list_voces(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    source_script: SourceScript | None = None,
    limit: int = 100,
) -> list[VoceMagicaeRead]:
    stmt = select(VoceMagicae).where(VoceMagicae.deleted_at.is_(None))
    if current_user is not None:
        stmt = stmt.where(VoceMagicae.owner_id == current_user.id)
    if source_script is not None:
        stmt = stmt.where(VoceMagicae.source_script == source_script)
    stmt = stmt.order_by(VoceMagicae.created_at.desc()).limit(
        min(limit, 500)
    )
    rows = (await db.execute(stmt)).scalars().all()
    # List view omits recordings (use detail for those).
    return [_to_voce_read(row, []) for row in rows]


@router.post(
    "/voces",
    response_model=VoceMagicaeRead,
    status_code=status.HTTP_201_CREATED,
    tags=["voces"],
)
async def create_voce(
    payload: VoceMagicaeCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> VoceMagicaeRead:
    owner_id = current_user.id if current_user is not None else None
    await _validate_entity_ids(payload.linked_entity_ids, db, owner_id)
    row = VoceMagicae(
        owner_id=owner_id,
        name=payload.name,
        source_text=payload.source_text,
        source_script=payload.source_script,
        transliteration=payload.transliteration,
        ipa=payload.ipa,
        source_citation=payload.source_citation,
        planetary_associations=payload.planetary_associations,
        elemental_associations=payload.elemental_associations,
        linked_entity_ids=[str(e) for e in payload.linked_entity_ids],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_voce_read(row, [])


@router.get(
    "/voces/{voce_id}", response_model=VoceMagicaeRead, tags=["voces"],
)
async def get_voce(
    voce_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> VoceMagicaeRead:
    row = await db.get(VoceMagicae, voce_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voce not found.")
    _owner_check(row, current_user.id if current_user else None)
    recordings = await _fetch_recordings(voce_id, db)
    return _to_voce_read(row, recordings)


@router.patch(
    "/voces/{voce_id}", response_model=VoceMagicaeRead, tags=["voces"],
)
async def update_voce(
    voce_id: UUID,
    payload: VoceMagicaeUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> VoceMagicaeRead:
    row = await db.get(VoceMagicae, voce_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voce not found.")
    _owner_check(row, current_user.id if current_user else None)

    data = payload.model_dump(exclude_unset=True)
    if (
        "linked_entity_ids" in data
        and data["linked_entity_ids"] is not None
    ):
        await _validate_entity_ids(
            data["linked_entity_ids"], db, row.owner_id,
        )
        data["linked_entity_ids"] = [
            str(e) for e in data["linked_entity_ids"]
        ]
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    recordings = await _fetch_recordings(voce_id, db)
    return _to_voce_read(row, recordings)


@router.delete(
    "/voces/{voce_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["voces"],
)
async def delete_voce(
    voce_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    row = await db.get(VoceMagicae, voce_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voce not found.")
    _owner_check(row, current_user.id if current_user else None)
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/voces/fork-bundled",
    response_model=VoceMagicaeRead,
    status_code=status.HTTP_201_CREATED,
    tags=["voces"],
)
async def fork_bundled_voce(
    payload: VoceForkBundledPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> VoceMagicaeRead:
    """Fork a bundled fixture into the practitioner's vault.

    The new row preserves the bundled fixture's text, transliteration,
    IPA, and citation — and records the bundled id in
    ``forked_from_bundled_id`` for provenance.
    """
    bundled = bundled_by_id(payload.bundled_id)
    if bundled is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Bundled voce {payload.bundled_id!r} not found.",
        )
    try:
        script = SourceScript(bundled.source_script)
    except ValueError:
        # Defensive: bundled fixtures should always use a valid enum
        # value (B107 test covers this).
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Bundled fixture has invalid source_script.",
        )

    row = VoceMagicae(
        owner_id=current_user.id if current_user is not None else None,
        name=bundled.name,
        source_text=bundled.source_text,
        source_script=script,
        transliteration=bundled.transliteration,
        ipa=bundled.ipa,
        source_citation=bundled.source_citation,
        planetary_associations=list(bundled.planetary_associations),
        elemental_associations=list(bundled.elemental_associations),
        linked_entity_ids=[],
        forked_from_bundled_id=bundled.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_voce_read(row, [])


@router.post(
    "/voces/{voce_id}/recordings",
    response_model=VoceRecordingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["voces"],
)
async def add_voce_recording(
    voce_id: UUID,
    payload: VoceRecordingCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> VoceRecordingRead:
    voce = await db.get(VoceMagicae, voce_id)
    if voce is None or voce.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voce not found.")
    _owner_check(voce, current_user.id if current_user else None)

    audio = await db.get(AudioAttachment, payload.audio_attachment_id)
    if audio is None or audio.deleted_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "audio_attachment_id does not match a live audio attachment.",
        )
    if (
        voce.owner_id is not None
        and getattr(audio, "owner_id", None) is not None
        and audio.owner_id != voce.owner_id
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "audio_attachment_id must be in your vault.",
        )

    rec = VoceRecording(
        voce_id=voce_id,
        audio_attachment_id=payload.audio_attachment_id,
        duration_seconds=payload.duration_seconds,
        notes=payload.notes,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return _to_recording_read(rec)


@router.delete(
    "/voces/{voce_id}/recordings/{recording_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["voces"],
)
async def remove_voce_recording(
    voce_id: UUID,
    recording_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    voce = await db.get(VoceMagicae, voce_id)
    if voce is None or voce.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Voce not found.")
    _owner_check(voce, current_user.id if current_user else None)

    rec = await db.get(VoceRecording, recording_id)
    if rec is None or rec.deleted_at is not None or rec.voce_id != voce_id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Recording not found.",
        )
    rec.deleted_at = datetime.now(tz=rec.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
