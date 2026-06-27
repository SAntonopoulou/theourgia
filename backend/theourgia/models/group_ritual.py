"""Group ritual + participant + fragment + reflection (B139).

Per ``plan/12-batches-backend.md`` § B139.

The H08 group-ritual surface trio (scheduler · coordination ·
post-mortem) drives the schema below.

Honesty rules wired here:

  · ``GroupRitualReflection`` is write-once per (ritual, author):
    UniqueConstraint enforces it at the DB layer.
  · ``GroupRitualFragment`` is append-only — no update / delete
    affordance even at the service layer.
  · Once a ritual enters COMPLETED, the script + correspondences
    are FROZEN. Service-layer guard refuses PATCH from
    non-DRAFT.
  · ``location_detail`` is only meaningful for ``PHYSICAL``
    location; ``DISPERSED`` is the default.
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
    PrimaryKeyConstraint,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field, SQLModel

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "GroupRitual",
    "GroupRitualParticipant",
    "GroupRitualFragment",
    "GroupRitualReflection",
    "GroupRitualLocation",
    "GroupRitualStatus",
    "ParticipantStatus",
]


class GroupRitualLocation(str, enum.Enum):
    PHYSICAL = "physical"
    VIRTUAL = "virtual"
    DISPERSED = "dispersed"


class GroupRitualStatus(str, enum.Enum):
    DRAFT = "draft"
    INVITED = "invited"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ParticipantStatus(str, enum.Enum):
    INVITED = "invited"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    IN_RITUAL = "in_ritual"
    COMPLETED = "completed"


class GroupRitual(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A scheduled group working — single-vault state in B139.
    Cross-instance broadcast lands in Phase 12.5 transport."""

    __tablename__ = "group_ritual"
    __table_args__ = (
        Index("ix_group_ritual_organizer", "organizer_id"),
        Index("ix_group_ritual_hub", "hub_id"),
        Index("ix_group_ritual_status", "status"),
    )

    organizer_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    hub_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("hub.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    title: str = Field(sa_column=Column(String(300), nullable=False))
    description: Optional[str] = Field(
        default=None, sa_column=Column(Text(), nullable=True),
    )

    scheduled_for_utc: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    location: GroupRitualLocation = Field(
        default=GroupRitualLocation.DISPERSED,
        sa_column=Column(
            SQLEnum(
                GroupRitualLocation,
                name="group_ritual_location",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=GroupRitualLocation.DISPERSED.value,
        ),
    )
    location_detail: Optional[str] = Field(
        default=None, sa_column=Column(String(500), nullable=True),
    )

    shared_script: Optional[str] = Field(
        default=None, sa_column=Column(Text(), nullable=True),
    )
    correspondences_payload: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )

    egregore_entity_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    status: GroupRitualStatus = Field(
        default=GroupRitualStatus.DRAFT,
        sa_column=Column(
            SQLEnum(
                GroupRitualStatus,
                name="group_ritual_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=GroupRitualStatus.DRAFT.value,
        ),
    )


class GroupRitualParticipant(SQLModel, table=True):
    __tablename__ = "group_ritual_participant"
    __table_args__ = (
        PrimaryKeyConstraint(
            "ritual_id", "user_id",
            name="pk_group_ritual_participant",
        ),
        Index(
            "ix_group_ritual_participant_user", "user_id",
        ),
    )

    ritual_id: UUID = Field(
        sa_column=Column(
            ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    status: ParticipantStatus = Field(
        default=ParticipantStatus.INVITED,
        sa_column=Column(
            SQLEnum(
                ParticipantStatus,
                name="group_ritual_participant_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=ParticipantStatus.INVITED.value,
        ),
    )
    role_in_ritual: Optional[str] = Field(
        default=None, sa_column=Column(String(120), nullable=True),
    )


class GroupRitualFragment(IDMixin, TimestampMixin, table=True):
    """One participant's contribution during the live ritual.
    Append-only — no update / delete affordance."""

    __tablename__ = "group_ritual_fragment"
    __table_args__ = (
        Index("ix_group_ritual_fragment_ritual", "ritual_id"),
    )

    ritual_id: UUID = Field(
        sa_column=Column(
            ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    author_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    body: str = Field(sa_column=Column(Text(), nullable=False))
    posted_at_utc: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class GroupRitualReflection(IDMixin, TimestampMixin, table=True):
    """Post-ritual write-once reflection. One per participant."""

    __tablename__ = "group_ritual_reflection"
    __table_args__ = (
        UniqueConstraint(
            "ritual_id", "author_id",
            name="uq_reflection_ritual_author",
        ),
        Index("ix_group_ritual_reflection_ritual", "ritual_id"),
    )

    ritual_id: UUID = Field(
        sa_column=Column(
            ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    author_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    body: str = Field(sa_column=Column(Text(), nullable=False))
