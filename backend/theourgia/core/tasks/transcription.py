"""Audio transcription task (Tier 2 #10).

``POST /api/v1/audio/{id}/transcribe`` enqueues
:func:`transcribe_audio_attachment`, which downloads the attachment's
bytes from the storage substrate to a temp file, runs the configured
local engine (faster-whisper), and writes ``transcript`` +
``transcript_engine`` back onto the :class:`AudioAttachment` row.

Failure semantics mirror the backup task: an engine failure produces a
logged outcome dict, *not* a task-level exception — the attachment's
``transcript`` stays NULL and the user can simply retry. Retrying
automatically would just burn CPU on the same unreadable audio or the
same missing model. Genuine infrastructure errors inside the DB /
storage layers are also caught and logged; the worker never crashes.
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
from typing import Any
from uuid import UUID

from theourgia.core.config import get_settings
from theourgia.core.db import session_scope
from theourgia.core.storage.factory import build_storage_service
from theourgia.core.tasks.app import celery_app
from theourgia.core.transcription.factory import build_transcription_engine
from theourgia.models.audio import AudioAttachment
from theourgia.models.uploads import Upload

__all__ = ["transcribe_audio_attachment"]

_log = logging.getLogger(__name__)


# Suffix hints for the temp file — some decoders sniff the extension.
_MIME_SUFFIXES = {
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/flac": ".flac",
}


def _suffix_for_mime(mime_type: str) -> str:
    return _MIME_SUFFIXES.get((mime_type or "").lower().split(";")[0], ".audio")


@celery_app.task(
    name="theourgia.core.tasks.transcription.transcribe_audio_attachment",
    bind=True,
    autoretry_for=(),
    max_retries=0,
)
def transcribe_audio_attachment(
    self: Any,  # noqa: ARG001 — Celery's bound `self`, unused but conventional
    attachment_id: str,
) -> dict[str, Any]:
    """Transcribe one audio attachment. Returns an outcome dict::

        {
            "outcome": "success" | "failure" | "skipped",
            "attachment_id": "<uuid>",
            ...
        }
    """
    return asyncio.run(_transcribe_audio_attachment_async(attachment_id))


async def _transcribe_audio_attachment_async(
    attachment_id: str,
) -> dict[str, Any]:
    settings = get_settings()

    async with session_scope() as session:
        attachment = await session.get(AudioAttachment, UUID(attachment_id))
        if attachment is None or attachment.deleted_at is not None:
            _log.info(
                "transcription.skipped.missing_attachment",
                extra={"attachment_id": attachment_id},
            )
            return {
                "outcome": "skipped",
                "attachment_id": attachment_id,
                "reason": "missing_attachment",
            }

        upload = await session.get(Upload, attachment.upload_id)
        if upload is None:
            _log.warning(
                "transcription.skipped.missing_upload",
                extra={"attachment_id": attachment_id},
            )
            return {
                "outcome": "skipped",
                "attachment_id": attachment_id,
                "reason": "missing_upload",
            }

        # Fetch the bytes through the storage substrate (works for
        # local-FS and S3/R2 alike), spool to a temp file, and hand
        # the local path to the engine. The with-block guarantees
        # cleanup even on engine failure.
        try:
            audio_bytes = await build_storage_service(settings).get(
                upload.storage_key
            )
        except Exception:  # noqa: BLE001 — log + leave transcript NULL
            _log.exception(
                "transcription.storage_fetch_failed",
                extra={
                    "attachment_id": attachment_id,
                    "storage_key": upload.storage_key,
                },
            )
            return {
                "outcome": "failure",
                "attachment_id": attachment_id,
                "reason": "storage_fetch_failed",
            }

        engine = build_transcription_engine(settings)
        try:
            with tempfile.NamedTemporaryFile(
                suffix=_suffix_for_mime(attachment.mime_type)
            ) as tmp:
                tmp.write(audio_bytes)
                tmp.flush()
                result = engine.transcribe(tmp.name)
        except Exception:  # noqa: BLE001 — log + leave transcript NULL
            # Engine failure (incl. TranscriptionError): leave the
            # transcript NULL and log — NEVER mark the row with an
            # error sentinel and NEVER crash the worker.
            _log.exception(
                "transcription.engine_failed",
                extra={
                    "attachment_id": attachment_id,
                    "engine": getattr(engine, "name", "unknown"),
                },
            )
            return {
                "outcome": "failure",
                "attachment_id": attachment_id,
                "reason": "engine_failed",
            }

        attachment.transcript = result.text
        attachment.transcript_engine = result.engine_label
        await session.commit()

    _log.info(
        "transcription.complete",
        extra={
            "attachment_id": attachment_id,
            "engine_label": result.engine_label,
            "characters": len(result.text),
            "duration_s": result.duration_seconds,
        },
    )
    return {
        "outcome": "success",
        "attachment_id": attachment_id,
        "engine_label": result.engine_label,
        "characters": len(result.text),
        "duration_seconds": result.duration_seconds,
    }
