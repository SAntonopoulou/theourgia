"""Liber Resh adoration log.

Per the H01-H03 onboarding supplement: a small persistent row per
adoration the user has recorded. Streak + today widgets read this
table. The compute substrate at `core/resh/` derives the four
transition instants from sunrise/sunset; this table records which
ones have been observed.
"""

from __future__ import annotations

import enum
from datetime import date as date_cls, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    Date as DateColumn,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Adoration", "ReshTransition"]


class ReshTransition(str, enum.Enum):
    SUNRISE = "sunrise"
    NOON = "noon"
    SUNSET = "sunset"
    MIDNIGHT = "midnight"


class Adoration(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One observed adoration."""

    __tablename__ = "adoration"
    __table_args__ = (
        Index("ix_adoration_owner_id", "owner_id"),
        Index("ix_adoration_civil_date", "civil_date"),
        Index("ix_adoration_observed_at", "observed_at"),
    )

    civil_date: date_cls = Field(
        sa_column=Column(DateColumn, nullable=False),
        description="The local civil date this transition belongs to.",
    )

    transition: ReshTransition = Field(
        sa_column=Column(
            SQLEnum(
                ReshTransition,
                name="resh_transition",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    observed_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
        description="When the practitioner actually performed the adoration.",
    )

    note: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Optional reflection captured at the time.",
    )

    entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional link to a `liber_resh`-kind Entry when one was written.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )

    # Free-text location label captured at observation time. The actual
    # transitions were computed from lat/lng; we don't denormalise the
    # coords here (the user may move between adorations during the day).
    location_label: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
    )
