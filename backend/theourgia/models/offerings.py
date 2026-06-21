"""Offerings ledger — what the practitioner gave + how it was received.

Per `plan/05-magical-beings.md` §2. An `Offering` row is one
documented offering at a specific time, to a specific entity, with a
structured items list, an intention, and the practitioner's
perception of how it was received.

The astro_snapshot + multi_calendar_stamp columns auto-fill from
the Phase 03 ephemeris + calendar registry when the offering is
recorded — letting the user filter "offerings made during Mars
retrograde" or "Deipnon offerings to Hekate over the last year".
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Offering", "OfferingReception", "RecurringOffering"]


class OfferingReception(str, enum.Enum):
    """How the practitioner perceived the offering being received.

    Self-reported, optional. The plan calls for "none / faint / clear
    / strong / overwhelming" with the understanding that practitioner
    discernment varies — the field is informative, not diagnostic.
    """

    NONE = "none"
    FAINT = "faint"
    CLEAR = "clear"
    STRONG = "strong"
    OVERWHELMING = "overwhelming"


class Offering(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One offering recorded in the ledger."""

    __tablename__ = "offering"
    __table_args__ = (
        Index("ix_offering_owner_id", "owner_id"),
        Index("ix_offering_entity_id", "entity_id"),
        Index("ix_offering_offered_at", "offered_at"),
    )

    entity_id: UUID = Field(
        sa_column=Column(
            ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        description="Entity the offering was made to.",
    )

    working_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description=(
            "Optional FK to the working entry the offering was part of. "
            "Some offerings stand alone (a daily candle); others are "
            "embedded in a larger working."
        ),
    )

    offered_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    location: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description="Free-form location string (the household shrine, the crossroads, etc.).",
    )

    location_lat: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
    )

    location_lon: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
    )

    items: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Structured items list. Each entry: "
            "{ kind, quantity?, unit?, notes? }. Common kinds: "
            "wine / water / milk / honey / incense / food / flowers / "
            "libation / blood / breath / song / dance / money / time. "
            "Extensible — plugin kinds welcome."
        ),
    )

    intention: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    reception_perceived: Optional[OfferingReception] = Field(
        default=None,
        sa_column=Column(
            SQLEnum(
                OfferingReception,
                name="offering_reception",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=True,
        ),
    )

    outcome_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Subsequent observations — synchronicities, dreams, life events.",
    )

    astro_snapshot: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Auto-stamped at offered_at via the Phase 03 astro engine. JSON.",
    )

    calendar_snapshot: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Auto-stamped multi-calendar representation at offered_at. JSON.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


class RecurringOffering(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A scheduled recurring offering (e.g. "Hekate's Deipnon, monthly").

    The scheduler task (Celery beat) walks active rows and fires a
    reminder notification at the right time. The user then either
    records the offering (creating an :class:`Offering` row) or
    dismisses the reminder. Recurring rows are the *intent*; Offering
    rows are the *record*.

    Cadence shorthand:
    * ``daily`` / ``weekly`` / ``monthly`` — fixed calendar units.
    * ``lunar:deipnon`` — every dark moon (Hekate's supper).
    * ``lunar:noumenia`` — every first crescent.
    * ``festival:samhain`` / etc. — one-shot anchors at festival dates.
    * ``cron:0 6 * * 1`` — POSIX cron expressions for power users.
    """

    __tablename__ = "recurring_offering"
    __table_args__ = (
        Index("ix_recurring_offering_owner_id", "owner_id"),
        Index("ix_recurring_offering_entity_id", "entity_id"),
        Index("ix_recurring_offering_next_due_at", "next_due_at"),
    )

    entity_id: UUID = Field(
        sa_column=Column(
            ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    label: str = Field(
        sa_column=Column(String(256), nullable=False),
        description='Display label — "Hekate Deipnon", "Daily candle to Brigid".',
    )

    cadence: str = Field(
        sa_column=Column(String(128), nullable=False),
        description="See module docstring for the cadence shorthand vocabulary.",
    )

    items_template: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Template items list, applied to new Offering rows on each occurrence.",
    )

    next_due_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
        description="Scheduler reads this; recomputed after each occurrence.",
    )

    is_active: bool = Field(
        default=True,
        sa_column=Column(
            "is_active",
            nullable=False,
            server_default="true",
        ),
        description="False = paused without deleting the schedule.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
