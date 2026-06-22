"""Daily Practice Tracker models.

Per ``plan/06-divination-and-practice.md`` and the H04 sprint
delivery (B80 frontend surface). The practitioner defines their
own daily practices (morning grounding, dark-moon devotion,
banishing-before-sleep, etc.) and the tracker records whether
each was kept, skipped, or missed for each day.

The shape mirrors the shipped frontend contract in
``frontend/shared/src/DailyPractice/`` (verbatim from the H04
``Theourgia Daily Practice Tracker.dc.html``):

* :class:`CustomPractice` — one row per user-defined practice.
* :class:`PracticeCompletion` — one row per practice-per-day,
  status = done or skip. Missed = absence of a completion row
  for a date the practice's cadence fired on.

Tone discipline (H04 §S2):

- A skip is **information, not a failure** — `skip` is a first-class
  status, never coerced to `missed` and never paired with red chrome.
- Streaks compute over the live history; they are never persisted
  state. The API returns them on each Today response.

Reminders ride the same Celery beat scheduler as :class:`Adoration`
and :class:`RecurringOffering`; per-practice reminder rows are
added in a follow-up batch when notification preferences ship.
"""

from __future__ import annotations

import enum
from datetime import date as _date
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "CompletionStatus",
    "CustomPractice",
    "PracticeCadence",
    "PracticeCompletion",
]


class PracticeCadence(str, enum.Enum):
    """How often a practice fires.

    Verbatim from ``frontend/shared/src/DailyPractice/copy.ts``
    ``CADENCE_OPTIONS`` (line 38). ``CUSTOM`` carries free-text
    in :attr:`CustomPractice.cadence_custom`.
    """

    DAILY = "daily"
    WEEKLY = "weekly"
    MORNING = "morning"
    BEFORE_SLEEP = "before-sleep"
    DARK_MOON = "dark-moon"
    CUSTOM = "custom"


class CompletionStatus(str, enum.Enum):
    """The two recordable statuses.

    Missed is the absence of a row for a date the cadence fires on
    — there is no ``missed`` value because no row gets written for
    it. This keeps the table sparse and matches the frontend's
    skip-is-information discipline.
    """

    DONE = "done"
    SKIP = "skip"


class CustomPractice(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A user-defined daily practice.

    The practitioner authors these; each one is independent. The
    Daily Practice Tracker surface lists them and shows today's
    status + a 35-day streak grid per practice.
    """

    __tablename__ = "custom_practice"
    __table_args__ = (
        Index("ix_custom_practice_owner_id", "owner_id"),
        Index("ix_custom_practice_cadence", "cadence"),
        Index("ix_custom_practice_archived_at", "archived_at"),
    )

    name: str = Field(
        sa_column=Column(String(256), nullable=False),
        description="Display name — 'Morning grounding', 'Devotion to Hekate'.",
    )

    cadence: PracticeCadence = Field(
        default=PracticeCadence.DAILY,
        sa_column=Column(
            SQLEnum(
                PracticeCadence,
                name="practice_cadence",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="daily",
        ),
    )

    cadence_custom: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description=(
            "Free-form cadence description used when cadence=custom. "
            "'Every Tuesday + every full moon', 'first Friday of the month', etc."
        ),
    )

    intention: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Optional 1-2 sentence statement of why this practice exists. "
            "Surfaces as a soft italic line in the practice card."
        ),
    )

    glyph: Optional[str] = Field(
        default=None,
        sa_column=Column(String(16), nullable=True),
        description=(
            "Optional one-character glyph displayed in the practice card "
            "(e.g., ☽ for lunar, ⛧ for banishing). May be an emoji."
        ),
    )

    linked_entity_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional entity binding — Hekate, Hermes, an ancestor, etc.",
    )

    preferred_anchor: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            "Free-form preferred time anchor — 'dawn', 'noon', '06:00 local', "
            "'dark moon evening'. Used to inform reminder scheduling."
        ),
    )

    streak_label: str = Field(
        default="day streak",
        sa_column=Column(
            String(64),
            nullable=False,
            server_default="day streak",
        ),
        description=(
            "Label rendered next to the streak number. Defaults to 'day streak'; "
            "lunar practices may prefer 'kept in a row' or 'cycles kept'."
        ),
    )

    archived_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
        description=(
            "Set when the practitioner archives the practice. Distinct from "
            "deleted_at — archived practices are kept in the ledger for "
            "historical streak reading; deleted ones are soft-removed."
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
    )


class PracticeCompletion(IDMixin, TimestampMixin, table=True):
    """One day's completion record for a custom practice.

    Sparse table — only ``done`` or ``skip`` rows exist. The
    absence of a row for a given date means the practice was
    missed (and the cadence fired on that date) or simply that the
    cadence did not fire (e.g., a weekly practice on a non-firing
    day). The cadence-firing computation lives in the API layer,
    not in this table.
    """

    __tablename__ = "practice_completion"
    __table_args__ = (
        # One status per practice per day. The day is the
        # practitioner's local-timezone calendar day; the API
        # converts to/from UTC at the edge.
        UniqueConstraint(
            "practice_id", "date", name="uq_completion_practice_date",
        ),
        Index("ix_completion_practice_id", "practice_id"),
        Index("ix_completion_owner_id", "owner_id"),
        Index("ix_completion_date", "date"),
    )

    practice_id: UUID = Field(
        sa_column=Column(
            ForeignKey("custom_practice.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        description=(
            "Denormalised from practice.owner_id for fast per-user "
            "history queries without a join."
        ),
    )

    date: _date = Field(
        sa_column=Column(Date, nullable=False),
        description=(
            "The local-timezone calendar day this completion belongs to. "
            "Stored as DATE so timezone math at write time is unambiguous."
        ),
    )

    status: CompletionStatus = Field(
        sa_column=Column(
            SQLEnum(
                CompletionStatus,
                name="practice_completion_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    note: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Optional note attached to the completion — 'short version "
            "today', 'distracted by call', 'felt steady'."
        ),
    )

    linked_entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description=(
            "If the practitioner authored a full journal entry for this "
            "completion, the entry's id rides here. Surfaces a 'see entry' "
            "link on the practice card."
        ),
    )

    recorded_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
        description=(
            "Exact moment the completion was recorded — distinct from the "
            "calendar date the completion belongs to (a practitioner can "
            "back-fill yesterday's record)."
        ),
    )
