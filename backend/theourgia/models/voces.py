"""Voces Magicae models (B107).

Per `plan/07-workshop.md` § Voces Magicae and the H05 designer handoff.

``VoceMagicae`` is one vox magica (a word/phrase of power) saved to
the practitioner's vault. ``VoceRecording`` is an audio recording
attached to a vox, composed of an :class:`AudioAttachment` plus
metadata.

Honesty rule (H05): ``source_citation`` is **required and non-empty**
— the H05 designer locked this as a per-row provenance requirement.
The API layer enforces non-empty at create + update; the DB column
is ``nullable=False`` to back that up.

The bundled corpus ships in :mod:`theourgia.core.workshop.bundled_voces`
as Python constants — not DB rows. Practitioners fork an entry via
``POST /api/v1/voces/fork-bundled`` which copies the bundled fields
into a per-vault row and records the bundled id in
``forked_from_bundled_id`` for provenance.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "VoceMagicae",
    "VocePerVaultState",
    "VoceRecording",
    "SourceScript",
]


class SourceScript(str, enum.Enum):
    """Seven scripts the H05 spec accepts for the source text."""

    GREEK = "greek"
    HEBREW = "hebrew"
    LATIN = "latin"
    COPTIC = "coptic"
    ARABIC = "arabic"
    SANSKRIT = "sanskrit"
    CUSTOM = "custom"


class VoceMagicae(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One vox magica saved to the practitioner's vault."""

    __tablename__ = "voce_magicae"
    __table_args__ = (
        Index("ix_voce_owner", "owner_id"),
        Index("ix_voce_source_script", "source_script"),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    name: str = Field(max_length=240, nullable=False)
    source_text: str = Field(sa_column=Column(Text, nullable=False))
    source_script: SourceScript = Field(
        sa_column=Column(
            SQLEnum(
                SourceScript,
                name="voce_source_script",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )
    transliteration: Optional[str] = Field(
        default=None, sa_column=Column(Text),
    )
    ipa: Optional[str] = Field(default=None, max_length=480)
    # REQUIRED — H05 honesty rule. The DB enforces nullable=False; the
    # API layer enforces a non-empty value.
    source_citation: str = Field(max_length=480, nullable=False)

    # Associations.
    planetary_associations: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    elemental_associations: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )
    linked_entity_ids: list = Field(
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )

    # If forked from a bundled fixture, this preserves provenance.
    forked_from_bundled_id: Optional[str] = Field(
        default=None, max_length=120,
    )


class VocePerVaultState(IDMixin, TimestampMixin, table=True):
    """Per-(voce, owner) state — private notes + per-vault hide.

    Added in B114 per ``plan/08-batches-backend.md`` § B114.

    The bundled voce row stays canonical; this table lets a single
    practitioner attach a private note ("Why I learned this voce")
    AND hide individual entries from their own library without
    affecting the canonical row or any other practitioner.
    """

    __tablename__ = "voce_per_vault_state"
    __table_args__ = (
        Index("ix_voce_pvs_owner", "owner_id"),
        Index("ix_voce_pvs_voce", "voce_id"),
        UniqueConstraint(
            "voce_id", "owner_id", name="uq_voce_per_vault",
        ),
    )

    voce_id: UUID = Field(
        sa_column=Column(
            ForeignKey("voce_magicae.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    private_note: Optional[str] = Field(default=None, sa_column=Column(Text))
    hidden: bool = Field(default=False, nullable=False)


class VoceRecording(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """An audio recording of a vox magica."""

    __tablename__ = "voce_recording"
    __table_args__ = (Index("ix_voce_recording_voce", "voce_id"),)

    voce_id: UUID = Field(
        sa_column=Column(
            ForeignKey("voce_magicae.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    audio_attachment_id: UUID = Field(
        sa_column=Column(
            ForeignKey("audio_attachment.id", ondelete="RESTRICT"),
            nullable=False,
        ),
    )
    duration_seconds: int = Field(ge=0, nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
