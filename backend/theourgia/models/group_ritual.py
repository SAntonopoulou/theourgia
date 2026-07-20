"""Group ritual + participant + fragment + reflection (B139 + v1-033).

Per ``plan/12-batches-backend.md`` § B139; cross-instance columns per
``docs/developer/federation-protocol.md`` §4.7/§4.8 (v1-033).

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

Cross-instance additions (v1-033):

  · ``origin_did`` + ``origin_ritual_id`` — set ONLY on mirror rows
    created from an inbound ``ritual.schedule`` envelope. A mirror
    has ``organizer_id IS NULL``: no local user can PATCH / start /
    close it — those transitions arrive from the origin instance.
  · ``egregore_name`` — the ritual declares itself an egregore
    creation event (plan/12 §"Egregore creation flow"). Frozen with
    the rest of the script once the ritual leaves DRAFT. At close,
    the resulting EGREGORE entity is registered in every
    participating vault — local directly, remote via
    ``ritual.update`` / ``update_kind=egregore_registration``.
  · ``GroupRitualRemoteParticipant`` — the cross-instance roster.
    Remote practitioners are vault DIDs, never local user rows.
  · Fragments / reflections can be authored remotely:
    ``author_id`` is nullable and ``author_did`` carries the remote
    vault DID. Exactly one of the two is set.
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
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field, SQLModel

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "GroupRitual",
    "GroupRitualParticipant",
    "GroupRitualRemoteParticipant",
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
    """A scheduled group working.

    Locally organized rituals carry ``organizer_id``; mirror rows
    created from an inbound ``ritual.schedule`` envelope carry
    ``origin_did`` + ``origin_ritual_id`` instead (v1-033).
    """

    __tablename__ = "group_ritual"
    __table_args__ = (
        Index("ix_group_ritual_organizer", "organizer_id"),
        Index("ix_group_ritual_hub", "hub_id"),
        Index("ix_group_ritual_status", "status"),
        Index(
            "ux_group_ritual_origin_ritual",
            "origin_ritual_id",
            unique=True,
            postgresql_where=text("origin_ritual_id IS NOT NULL"),
        ),
    )

    organizer_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
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

    egregore_name: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description=(
            "When set, the ritual declares itself an egregore creation "
            "event. At close the resulting EGREGORE entity is registered "
            "in every participating vault. Frozen once the ritual leaves "
            "DRAFT, like the rest of the script."
        ),
    )

    # ── Cross-instance mirror columns (v1-033) ─────────────────────
    origin_did: Optional[str] = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
        description=(
            "Organizer vault DID on the origin instance. Set ONLY on "
            "mirror rows created from an inbound ritual.schedule."
        ),
    )

    origin_ritual_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(PGUUID(as_uuid=True), nullable=True),
        description=(
            "The origin instance's ritual id — the id every "
            "ritual.update envelope references on the wire."
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


class GroupRitualRemoteParticipant(SQLModel, table=True):
    """Cross-instance roster row — a remote practitioner named by
    vault DID (v1-033). Local practitioners never appear here; they
    are :class:`GroupRitualParticipant` rows."""

    __tablename__ = "group_ritual_remote_participant"
    __table_args__ = (
        PrimaryKeyConstraint(
            "ritual_id", "did",
            name="pk_group_ritual_remote_participant",
        ),
    )

    ritual_id: UUID = Field(
        sa_column=Column(
            ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    did: str = Field(sa_column=Column(String(255), nullable=False))
    role_in_ritual: Optional[str] = Field(
        default=None, sa_column=Column(String(120), nullable=True),
    )
    invited_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class GroupRitualFragment(IDMixin, TimestampMixin, table=True):
    """One participant's contribution during the live ritual.
    Append-only — no update / delete affordance.

    Exactly one of ``author_id`` (local) / ``author_did`` (remote,
    v1-033) is set."""

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
    author_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    author_did: Optional[str] = Field(
        default=None, sa_column=Column(String(255), nullable=True),
    )
    body: str = Field(sa_column=Column(Text(), nullable=False))
    posted_at_utc: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class GroupRitualReflection(IDMixin, TimestampMixin, table=True):
    """Post-ritual write-once reflection. One per participant.

    Local authors are deduplicated by the UniqueConstraint on
    ``(ritual_id, author_id)``; remote authors (``author_did`` set,
    ``author_id`` NULL — v1-033) are deduplicated at the inbox
    handler because SQL NULLs never collide in a unique index."""

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
    author_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    author_did: Optional[str] = Field(
        default=None, sa_column=Column(String(255), nullable=True),
    )
    body: str = Field(sa_column=Column(Text(), nullable=False))
