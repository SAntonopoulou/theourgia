"""Geomancy reading log.

Per ``plan/06-divination-and-practice.md`` §3. We persist only the
input + the four mothers; the engine rederives daughters, nieces,
witnesses, judge, reconciler, and house assignments deterministically.
This keeps storage minimal and verifiable — the chart can be replayed
from the persisted row exactly.

The 16 figures themselves are static catalog data — they live in
:mod:`theourgia.core.divination.geomancy.bundles` and never need a
table.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["GeomancyMethod", "GeomancyReading"]


class GeomancyMethod(str, enum.Enum):
    """How the four mothers were generated."""

    DOTS = "dots"  # User drew dots in sand / on paper.
    RNG = "rng"  # Browser / server seeded RNG.
    MANUAL = "manual"  # Caller supplied the four mothers directly.


class GeomancyReading(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One geomancy session."""

    __tablename__ = "geomancy_reading"
    __table_args__ = (
        Index("ix_geomancy_reading_owner_id", "owner_id"),
        Index("ix_geomancy_reading_drawn_at", "drawn_at"),
        Index("ix_geomancy_reading_judge", "judge_figure"),
    )

    question: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    method: GeomancyMethod = Field(
        default=GeomancyMethod.RNG,
        sa_column=Column(
            SQLEnum(
                GeomancyMethod,
                name="geomancy_method",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="rng",
        ),
    )

    seed: str = Field(
        sa_column=Column(String(256), nullable=False),
        description="Cast seed; same seed = same four mothers = same chart.",
    )

    drawn_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    # JSON array of 4 figure-name strings (lowercase Latin canonical
    # names from FigureName). Engine derives everything else.
    mothers: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Four figure-name strings in mother order (M1..M4).",
    )

    # Denormalised judge for fast filtering — the chart is rederived
    # at read time but a "find all readings where judge = puella" query
    # shouldn't require running the engine over every row.
    judge_figure: str = Field(
        sa_column=Column(String(32), nullable=False),
        description="Lowercase Latin figure name of the judge.",
    )

    interpretation: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    retrospective_rating: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
        description="1..5 retrospective accuracy rating.",
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
