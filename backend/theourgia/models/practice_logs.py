"""Practice-log models — body practice (asana / pranayama),
banishing.

Per ``plan/06-divination-and-practice.md`` §§12-13. Phase 06 closer.

Rituals, dreams, pathworking already ride the Entry model with the
corresponding ``EntryType`` values (ritual_log / dream / pathworking).
This module adds two focused models for surfaces that need their
own tables:

* :class:`BodyPracticeSession` — Liber-E-style asana + pranayama
  tracking with per-posture / per-pattern cumulative aggregation.
* :class:`BanishingLog` — quick-capture grounding / banishing log
  with method + pre/post state.

Tree of Life path catalog data lives in
:mod:`theourgia.core.divination.paths` as static bundle code
(22 paths × N traditions); no DB table needed.
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

__all__ = [
    "BanishingLog",
    "BanishingMethod",
    "BodyPracticeKind",
    "BodyPracticeSession",
]


class BodyPracticeKind(str, enum.Enum):
    """The two Liber-E categories + a general fallback."""

    ASANA = "asana"
    PRANAYAMA = "pranayama"
    OTHER = "other"


class BodyPracticeSession(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One session of asana / pranayama / other body practice."""

    __tablename__ = "body_practice_session"
    __table_args__ = (
        Index("ix_body_practice_owner_id", "owner_id"),
        Index("ix_body_practice_started_at", "started_at"),
        Index("ix_body_practice_kind", "kind"),
        Index("ix_body_practice_posture", "posture_or_pattern"),
    )

    kind: BodyPracticeKind = Field(
        default=BodyPracticeKind.ASANA,
        sa_column=Column(
            SQLEnum(
                BodyPracticeKind,
                name="body_practice_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="asana",
        ),
    )

    posture_or_pattern: str = Field(
        sa_column=Column(String(128), nullable=False),
        description=(
            "Free-form identifier. Asana: 'thunderbolt', 'god posture', "
            "'dragon' (Liber E vocabulary). Pranayama: '4-4-4-4', "
            "'4-8-4-8', 'so-ham'."
        ),
    )

    started_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    duration_seconds: int = Field(
        sa_column=Column(Integer, nullable=False),
        description="Total duration in seconds. Required.",
    )

    breaks_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
        description=(
            "Liber E counts breaks (involuntary movements, missed counts) "
            "as a measure of refinement. Lower is better with practice."
        ),
    )

    observation_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    body_snapshot_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("body_snapshot.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional body-sensation diagram captured during the session.",
    )

    entry_id: Optional[UUID] = Field(
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


class BanishingMethod(str, enum.Enum):
    """Common banishing / grounding methods.

    Names follow the practitioner vocabulary; "other" lets plugins
    add tradition-specific entries.
    """

    LBRP = "lbrp"
    STAR_RUBY = "star_ruby"
    SIMPLE_GROUND = "simple_ground"
    BREATH = "breath"
    WATER = "water"
    SALT = "salt"
    BELL = "bell"
    INCENSE = "incense"
    KHEPHRA = "khephra"  # solar invocation in lieu of explicit banishing
    OTHER = "other"


class BanishingLog(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One banishing / grounding event."""

    __tablename__ = "banishing_log"
    __table_args__ = (
        Index("ix_banishing_log_owner_id", "owner_id"),
        Index("ix_banishing_log_performed_at", "performed_at"),
        Index("ix_banishing_log_method", "method"),
    )

    method: BanishingMethod = Field(
        sa_column=Column(
            SQLEnum(
                BanishingMethod,
                name="banishing_method",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    method_label: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description=(
            "Free-form label when method=other. Otherwise an optional "
            "variant tag — 'LBRP (banishing form)' vs 'LBRP (invoking form)'."
        ),
    )

    performed_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    duration_seconds: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
    )

    state_before: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Free-form pre-state description (low energy / scattered / etc.).",
    )

    state_after: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    correspondences: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "Free-form correspondences captured — moon phase, "
            "planetary hour, location, tradition tag."
        ),
    )

    entry_id: Optional[UUID] = Field(
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
