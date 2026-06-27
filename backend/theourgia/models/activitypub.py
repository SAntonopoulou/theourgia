"""ActivityPub adapter tables (Phase 13 stub).

Per ``plan/13-activitypub.md``.

This module ships the persistence layer for the H08 Cluster B
surfaces (16-21). The cross-instance HTTP delivery + signed
inbox processing land in Phase 13.5 once the Phase 12.5
transport is in.

Three tables:

  · ``activitypub_settings`` — per-vault settings: enabled,
    display name override, bio override, follower approval
    policy, outbound activity toggles, object-type mapping.
  · ``activitypub_follower`` — confirmed followers of a vault.
  · ``activitypub_follow_request`` — pending follow requests
    (Pending → Accepted/Rejected — the latter two emit AP
    Accept/Reject activities when the transport is online).

Honesty rules wired:

  · Master ``enabled`` defaults to FALSE — per-vault opt-in
    (H08 rule 28).
  · ``follower_approval`` defaults to MANUAL for vaults (H08
    rule 20).
  · ``broadcast_deletes`` defaults to FALSE — the H08 brief is
    explicit (rule 32 elaboration).
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = [
    "ActivityPubSettings",
    "ActivityPubFollower",
    "ActivityPubFollowRequest",
    "FollowerApproval",
    "FollowRequestState",
]


class FollowerApproval(str, enum.Enum):
    """How follow requests resolve.

    H08 rule 20: default MANUAL for vaults, AUTO for hubs. Hubs
    don't use this table — this enum applies to per-vault
    settings only.
    """

    MANUAL = "manual"
    AUTO = "auto"


class FollowRequestState(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class ActivityPubSettings(IDMixin, TimestampMixin, table=True):
    """Per-user ActivityPub settings. Exactly one row per user
    (UniqueConstraint on owner_id). The row is created on
    first read via get-or-create at the API seam."""

    __tablename__ = "activitypub_settings"
    __table_args__ = (
        UniqueConstraint("owner_id", name="uq_aps_owner"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    enabled: bool = Field(
        default=False,
        sa_column=Column(
            Boolean(), nullable=False, server_default="false",
        ),
    )

    # Optional overrides — empty/null = use vault display name + bio.
    display_name_override: Optional[str] = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )
    bio_override: Optional[str] = Field(
        default=None,
        sa_column=Column(String(2000), nullable=True),
    )

    follower_approval: FollowerApproval = Field(
        default=FollowerApproval.MANUAL,
        sa_column=Column(
            SQLEnum(
                FollowerApproval,
                name="ap_follower_approval",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=FollowerApproval.MANUAL.value,
        ),
    )

    # Outbound activity toggles.
    broadcast_creates: bool = Field(
        default=True,
        sa_column=Column(Boolean(), nullable=False, server_default="true"),
    )
    broadcast_updates: bool = Field(
        default=True,
        sa_column=Column(Boolean(), nullable=False, server_default="true"),
    )
    broadcast_deletes: bool = Field(
        default=False,
        sa_column=Column(Boolean(), nullable=False, server_default="false"),
    )

    # Per-entry-kind mapping to AP object types. JSONB so plugin
    # authors can extend the kind set without a schema migration.
    # Default seeded at the API seam:
    #   {"entries": "Article", "notes": "Note",
    #    "rituals": "Event", "publications": "Article"}
    object_type_mapping: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )


class ActivityPubFollower(IDMixin, TimestampMixin, table=True):
    """A confirmed follower of a local vault."""

    __tablename__ = "activitypub_follower"
    __table_args__ = (
        UniqueConstraint(
            "owner_id", "follower_did",
            name="uq_ap_follower_owner_did",
        ),
        Index("ix_ap_follower_owner", "owner_id"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    # The follower's AP actor URL (canonical) — e.g.,
    # ``https://thelema.example/users/frater-lux``.
    follower_did: str = Field(
        sa_column=Column(String(500), nullable=False),
    )
    # The follower's @handle@instance form, displayed in surface 17.
    follower_handle: Optional[str] = Field(
        default=None,
        sa_column=Column(String(320), nullable=True),
    )
    # The inbox URL we POST to when broadcasting an activity.
    follower_inbox_url: Optional[str] = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )

    last_delivery_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class ActivityPubFollowRequest(IDMixin, TimestampMixin, table=True):
    """A pending or resolved follow request from a remote actor."""

    __tablename__ = "activitypub_follow_request"
    __table_args__ = (
        Index("ix_ap_follow_request_owner", "owner_id"),
        Index(
            "ix_ap_follow_request_owner_state",
            "owner_id", "state",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    follower_did: str = Field(
        sa_column=Column(String(500), nullable=False),
    )
    follower_handle: Optional[str] = Field(
        default=None,
        sa_column=Column(String(320), nullable=True),
    )

    state: FollowRequestState = Field(
        default=FollowRequestState.PENDING,
        sa_column=Column(
            SQLEnum(
                FollowRequestState,
                name="ap_follow_request_state",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=FollowRequestState.PENDING.value,
        ),
    )

    resolved_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
