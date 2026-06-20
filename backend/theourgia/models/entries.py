"""Journal-entry model.

A magician's atomic unit of content. Five intentional types map to the
five composer kinds the design system exposes:

- ``observation`` — a passage of reflection / record (the default)
- ``ritual`` — a logged rite
- ``divination`` — a reading (tarot / geomancy / astrology / …)
- ``synchronicity`` — a noticed coincidence
- ``capture`` — a quick observation from the global QuickCapture

The frontend-facing shape lives in ``theourgia.api.routers.v1.entries``
(``EntryRead`` / ``EntryCreate``). This module is the ORM only — the
canonical wire format mirrors the frontend's ``EntryRecord`` type.

Auth gating: ``owner_id`` is nullable for now because Phase 02 ships
before the auth HTTP routes. Anonymous writes during Phase 02 are
expected; this column gets a NOT NULL constraint when the auth flow
ships in a later batch (post-MVP).
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, String
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Entry", "EntryType"]


class EntryType(str, enum.Enum):
    """The five composer types the design system exposes."""

    OBSERVATION = "observation"
    RITUAL = "ritual"
    DIVINATION = "divination"
    SYNCHRONICITY = "synchronicity"
    CAPTURE = "capture"


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
    )

    title: str = Field(
        sa_column=Column(String(256), nullable=False),
    )

    type: EntryType = Field(
        default=EntryType.OBSERVATION,
        sa_column=Column(
            # values_callable: write the .value (lowercase) to Postgres, not
            # the .name (ALLCAPS). Matches the migration's CREATE TYPE.
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
        sa_column=Column(String, nullable=True),
        description="Full content. None when the entry is excerpt-only.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        description=(
            "User who authored. Nullable during Phase 02 before auth HTTP "
            "routes ship; tightened to NOT NULL post-MVP."
        ),
    )
