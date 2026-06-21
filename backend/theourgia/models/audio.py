"""Audio attachment model.

An `AudioAttachment` is a voice recording (or any audio blob)
referenced from a journal entry. Storage is via the existing
:class:`Upload` substrate (objects-store-backed); this table just
adds the audio-specific metadata (duration, optional transcript,
optional waveform thumbnail).

Recording UI + waveform display + transcription are designer hand-off
(designer_handoff_02.handoff §6). The data model here is shape-stable;
neither the recording UX nor the transcription engine choice
(Whisper / wav2vec / etc.) changes the schema.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, Float, ForeignKey, Index, String, Text
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["AudioAttachment"]


class AudioAttachment(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One audio attachment linked to an entry.

    Composes with :class:`theourgia.models.uploads.Upload` for the
    actual blob — the ``upload_id`` FK points at the uploaded object
    in the storage backend. ``duration_seconds`` is denormalised here
    so the timeline UI doesn't need to probe the blob just to render
    a list.
    """

    __tablename__ = "audio_attachment"
    __table_args__ = (
        Index("ix_audio_attachment_entry_id", "entry_id"),
        Index("ix_audio_attachment_upload_id", "upload_id"),
        Index("ix_audio_attachment_owner_id", "owner_id"),
    )

    entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        description=(
            "Entry this audio belongs to. NULL while the user is "
            "recording and hasn't yet associated it with an entry."
        ),
    )

    upload_id: UUID = Field(
        sa_column=Column(
            ForeignKey("upload.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        description="The Upload row storing the actual audio blob.",
    )

    duration_seconds: float = Field(
        default=0.0,
        sa_column=Column(Float, nullable=False, server_default="0"),
    )

    mime_type: str = Field(
        default="audio/ogg",
        sa_column=Column(String(64), nullable=False, server_default="audio/ogg"),
        description=(
            "MIME of the blob. Common: audio/ogg (Opus), audio/webm, "
            "audio/mp4 (AAC), audio/wav."
        ),
    )

    transcript: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Optional transcription. Populated by the Whisper task "
            "when the user opts in; NULL when off. Phase 04 ships "
            "the column; the task itself lands when the operator "
            "configures the transcription backend."
        ),
    )

    transcript_engine: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            'The transcription engine + model that produced the '
            'transcript ("whisper:large-v3", "wav2vec2:base", …). '
            "Lets the UI tag the transcript with provenance."
        ),
    )

    waveform_thumbnail_url: Optional[str] = Field(
        default=None,
        sa_column=Column(String(512), nullable=True),
        description=(
            "Optional URL to a pre-rendered waveform thumbnail. "
            "When NULL the renderer computes one on demand."
        ),
    )

    label: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
