"""Servitor + egregore tracker.

Per `plan/05-magical-beings.md` §7. A `Servitor` is a constructed
magickal entity — a chaos-magic / personal-creation being with a
defined purpose + feeding cadence + lifespan. An egregore is the
same model with `kind = egregore` and a `members` list linking to
human collaborators (used by hubs in Phase 12).

Tone-critical: per the plan's risks, no Tamagotchi gamification. The
UI presents servitor data with the same seriousness as the entity
ledger generally — no "your servitor is hungry!" copy.
"""

from __future__ import annotations

import enum
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["Servitor", "ServitorKind", "ServitorStatus", "ServitorTask"]


class ServitorKind(str, enum.Enum):
    """Distinguishes individual servitors from collective egregores."""

    SERVITOR = "servitor"
    EGREGORE = "egregore"


class ServitorStatus(str, enum.Enum):
    """Servitor lifecycle."""

    ACTIVE = "active"
    DORMANT = "dormant"
    RETIRED = "retired"
    DECOMMISSIONED = "decommissioned"


class Servitor(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One servitor or egregore."""

    __tablename__ = "servitor"
    __table_args__ = (
        Index("ix_servitor_owner_id", "owner_id"),
        Index("ix_servitor_kind", "kind"),
        Index("ix_servitor_status", "status"),
        Index("ix_servitor_last_fed_at", "last_fed_at"),
    )

    name: str = Field(
        sa_column=Column(String(256), nullable=False),
    )

    kind: ServitorKind = Field(
        default=ServitorKind.SERVITOR,
        sa_column=Column(
            SQLEnum(
                ServitorKind,
                name="servitor_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="servitor",
        ),
    )

    purpose: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="What this being is for.",
    )

    sigil_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    creation_entry_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="The entry documenting the creation ritual, if recorded.",
    )

    feeding_cadence: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            "Cadence string — daily / weekly / lunar / as-needed / "
            "or a specific cron expression."
        ),
    )

    feeding_method: Optional[str] = Field(
        default=None,
        sa_column=Column(String(128), nullable=True),
        description=(
            'Free-form description of how this being is fed — '
            '"energy" / "attention" / "sigil-gaze" / "offering" / etc.'
        ),
    )

    last_fed_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
    )

    lifespan_limit: Optional[date] = Field(
        default=None,
        sa_column=Column(Date, nullable=True),
        description=(
            "Planned retirement date. The scheduler can prompt the "
            "user as the date approaches; the user decides whether "
            "to retire or extend."
        ),
    )

    status: ServitorStatus = Field(
        default=ServitorStatus.ACTIVE,
        sa_column=Column(
            SQLEnum(
                ServitorStatus,
                name="servitor_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="active",
        ),
    )

    # Egregore-specific: list of user_ids (or external collaborator
    # ids) who participate. NULL for individual servitors.
    members: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description="Member user_ids for egregore kind. Empty for individual servitors.",
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


class ServitorTaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class ServitorTask(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A specific task / instruction given to a servitor."""

    __tablename__ = "servitor_task"
    __table_args__ = (
        Index("ix_servitor_task_servitor_id", "servitor_id"),
        Index("ix_servitor_task_status", "status"),
    )

    servitor_id: UUID = Field(
        sa_column=Column(
            ForeignKey("servitor.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    description: str = Field(
        sa_column=Column(Text, nullable=False),
    )

    given_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": False},
    )

    target_completion_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    completed_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    status: ServitorTaskStatus = Field(
        default=ServitorTaskStatus.PENDING,
        sa_column=Column(
            SQLEnum(
                ServitorTaskStatus,
                name="servitor_task_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="pending",
        ),
    )

    outcome_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
