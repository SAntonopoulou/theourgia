"""Journal-entry model.

A magician's atomic unit of content. **Expanded for Phase 04**: the
discriminator now covers the full set of practitioner-record kinds
documented in `plan/04-journaling.md` §1, and the columns carry the
multi-calendar / visibility / mood-state metadata the journaling
substrate needs.

Backwards compatibility with Phase 02:

* The Phase 02 EntryType values (``observation``, ``ritual``,
  ``divination``, ``synchronicity``, ``capture``) remain valid —
  existing rows continue to work without migration.
* Phase 04 adds the new kinds (``note``, ``ritual_log``, ``dream``,
  ``working``, ``magical_record``, ``pathworking``, ``scrying``,
  ``body_practice``, ``meeting_note``, ``study_note``, ``liber_resh``,
  ``blog_post``).

The frontend-facing shape lives in ``theourgia.api.routers.v1.entries``
(``EntryRead`` / ``EntryCreate``). This module is the ORM only.

Auth gating: ``owner_id`` remains nullable for legacy anonymous-write
support; the auth gate is enforced at the API layer.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "EncryptionMode",
    "Entry",
    "EntryRevision",
    "EntryType",
    "EntryVisibility",
]


class EntryType(str, enum.Enum):
    """All entry kinds supported by Theourgia.

    The first five (``observation`` through ``capture``) are the
    Phase 02 set, kept for backwards compatibility. The remainder
    are Phase 04 additions per `plan/04-journaling.md` §1.
    """

    # Phase 02 legacy
    OBSERVATION = "observation"
    RITUAL = "ritual"
    DIVINATION = "divination"
    SYNCHRONICITY = "synchronicity"
    CAPTURE = "capture"

    # Phase 04 expansions
    NOTE = "note"
    RITUAL_LOG = "ritual_log"
    DREAM = "dream"
    WORKING = "working"
    MAGICAL_RECORD = "magical_record"
    PATHWORKING = "pathworking"
    SCRYING = "scrying"
    BODY_PRACTICE = "body_practice"
    MEETING_NOTE = "meeting_note"
    STUDY_NOTE = "study_note"
    LIBER_RESH = "liber_resh"
    BLOG_POST = "blog_post"


class EntryVisibility(str, enum.Enum):
    """Who can read the entry."""

    PERSONAL = "personal"
    VIEWER = "viewer"
    HUB = "hub"
    PUBLIC = "public"


class EncryptionMode(str, enum.Enum):
    """Per-entry encryption mode.

    ``sealed`` is irreversible at the row level: the encrypted_payload
    supersedes ``body`` once set. Full-text search isn't available
    server-side for sealed entries.
    """

    NONE = "none"
    SEALED = "sealed"


class Entry(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A single journal entry.

    Soft-delete: archives use ``deleted_at``; hard-delete only happens
    via GDPR export+delete or admin purge.
    """

    __tablename__ = "entry"
    __table_args__ = (
        Index("ix_entry_owner", "owner_id"),
        Index("ix_entry_type", "type"),
        Index("ix_entry_created_at", "created_at"),
        Index("ix_entry_occurred_at", "occurred_at"),
        Index("ix_entry_visibility", "visibility"),
    )

    # — Identity / display ——————————————————————————————
    title: str = Field(
        sa_column=Column(String(256), nullable=False),
    )

    type: EntryType = Field(
        default=EntryType.NOTE,
        sa_column=Column(
            SQLEnum(
                EntryType,
                name="entry_type",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="observation",
        ),
    )

    excerpt: str = Field(
        sa_column=Column(String(1024), nullable=False, server_default=""),
        description="Short preview shown in lists. ≤ 1024 chars.",
    )

    glyph: str = Field(
        default="feather",
        sa_column=Column(String(64), nullable=False, server_default="feather"),
        description="Name of the engraving-sprite glyph for visual marking.",
    )

    body: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Full content. Stored as Tiptap JSON serialised to a string "
            "for Phase 04+; older rows may carry plain prose. None when "
            "the entry is excerpt-only or sealed."
        ),
    )

    body_text: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Denormalised plaintext extraction of ``body`` for "
            "Postgres FTS. Absent for sealed entries."
        ),
    )

    # — Tagging (v1-001) ————————————————————————————————
    tags: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Free-form flexible tags.",
    )

    tradition_tags: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Tradition tags this entry belongs to (Hellenic, Thelemic, "
            "Hermetic, Goetic, Vedic, …). Checked against the "
            "operator-curated closed-tradition list before any public "
            "visibility path — see theourgia.core.traditions."
        ),
    )

    # — Ownership / authorship ——————————————————————————
    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )

    authored_by_persona_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("persona.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        description=(
            "Which persona / magickal-name identity authored this. "
            "Nullable while persona impl is deferred (Option D)."
        ),
    )

    # — Access control ——————————————————————————————————
    visibility: EntryVisibility = Field(
        default=EntryVisibility.PERSONAL,
        sa_column=Column(
            SQLEnum(
                EntryVisibility,
                name="entry_visibility",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="personal",
        ),
    )

    encryption_mode: EncryptionMode = Field(
        default=EncryptionMode.NONE,
        sa_column=Column(
            SQLEnum(
                EncryptionMode,
                name="entry_encryption_mode",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="none",
        ),
    )

    encrypted_payload: Optional[bytes] = Field(
        default=None,
        sa_column=Column("encrypted_payload", nullable=True),
        description=(
            "Client-encrypted Tiptap-JSON payload when "
            "``encryption_mode == sealed``. Server stores ciphertext "
            "only; key never leaves the client."
        ),
    )

    # — Temporal —————————————————————————————————————
    occurred_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
    )

    occurred_at_tz: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
    )

    # — Location ————————————————————————————————————
    location_lat: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
    )

    location_lon: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
    )

    # — Astrology / calendar auto-stamps ———————————————————
    astro_snapshot: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    calendar_snapshot: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    # — Body / state ——————————————————————————————————
    mood: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
    )

    energy: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
    )

    health_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    # FK to body_snapshot ships when that table lands in Batch 34.
    body_snapshot_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            "body_snapshot_id",
            nullable=True,
            index=True,
        ),
    )

    # — Threading ————————————————————————————————————
    parent_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )

    # — Scheduling ——————————————————————————————————
    scheduled_publish_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
    )

    # — Publish state (b108-2hm) ————————————————————————
    # Timestamp of when the entry was published — separate from
    # ``visibility`` (which can flip Personal → Public without a
    # publish action) so the editor can display "Published on X".
    published_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
    )

    # b108-2gw — per-entry comments opt-in. Same substrate as the
    # publication comments; only comments on entries with
    # visibility="public" and comments_enabled=True are surfaced.
    comments_enabled: bool = Field(default=False, nullable=False)


class EntryRevision(IDMixin, TimestampMixin, table=True):
    """One revision in the history of an :class:`Entry`.

    Append-only history. ``GET /api/v1/entries/:id/revisions`` returns
    the full chain.
    """

    __tablename__ = "entry_revision"
    __table_args__ = (
        Index("ix_entry_revision_entry_id", "entry_id"),
        Index("ix_entry_revision_created_at", "created_at"),
    )

    entry_id: UUID = Field(
        sa_column=Column(
            ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    revision_number: int = Field(
        sa_column=Column(Integer, nullable=False),
    )

    title_at_revision: str = Field(
        sa_column=Column(String(256), nullable=False),
    )

    body_at_revision: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    body_text_at_revision: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    type_at_revision: EntryType = Field(
        sa_column=Column(
            SQLEnum(
                EntryType,
                name="entry_type",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
        ),
    )

    visibility_at_revision: EntryVisibility = Field(
        sa_column=Column(
            SQLEnum(
                EntryVisibility,
                name="entry_visibility",
                values_callable=lambda obj: [m.value for m in obj],
                create_type=False,
            ),
            nullable=False,
        ),
    )

    edited_by: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    edit_summary: Optional[str] = Field(
        default=None,
        sa_column=Column(String(1024), nullable=True),
    )
