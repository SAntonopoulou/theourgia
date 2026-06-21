"""Rune reading log.

Per ``plan/06-divination-and-practice.md`` §4. We persist the rune
set + spread name + seed + drawn rune indices; the engine rederives
the orientations from the seed deterministically when the set's
``reversible_flags`` haven't changed.

The rune sets themselves are static catalog data — they live in
:mod:`theourgia.core.divination.runes.bundles`.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["RuneReading", "RuneSet"]


class RuneSet(str, enum.Enum):
    """Which runic alphabet — mirrors
    :class:`theourgia.core.divination.runes.engine.RuneSet`."""

    ELDER_FUTHARK = "elder_futhark"
    YOUNGER_FUTHARK = "younger_futhark"
    ANGLO_SAXON_FUTHORC = "anglo_saxon_futhorc"
    ARMANEN = "armanen"
    NORTHUMBRIAN = "northumbrian"


class RuneReading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One rune reading."""

    __tablename__ = "rune_reading"
    __table_args__ = (
        Index("ix_rune_reading_owner_id", "owner_id"),
        Index("ix_rune_reading_drawn_at", "drawn_at"),
        Index("ix_rune_reading_set", "rune_set"),
    )

    question: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    rune_set: RuneSet = Field(
        default=RuneSet.ELDER_FUTHARK,
        sa_column=Column(
            SQLEnum(
                RuneSet,
                name="rune_set",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="elder_futhark",
        ),
    )

    spread_name: str = Field(
        sa_column=Column(String(64), nullable=False),
        description='"single" / "three_rune" / "nine_rune_wyrd" / custom slug.',
    )

    position_count: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="How many runes were drawn (1, 3, 9, etc.).",
    )

    seed: str = Field(
        sa_column=Column(String(256), nullable=False),
    )

    drawn_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    # JSON list of dicts: {position_index, rune_index, orientation}.
    drawn_runes: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
    )

    interpretation: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    retrospective_rating: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
    )

    retrospective_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    entity_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    working_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
