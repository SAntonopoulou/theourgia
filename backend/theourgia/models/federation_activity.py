"""Persisted inbound federation activities — Phase 12.5.

When a signed federation request reaches POST /api/v1/federation/inbox,
the verifier records the activity here BEFORE returning 202. Any
downstream processing (followers, notifications, hub updates, etc.)
reads from this table; this gives us:

  - At-least-once delivery semantics (peers can retry safely; the
    replay-nonce store rejects duplicates of the same signed envelope).
  - Auditability — every inbound activity is queryable verbatim by
    its sender DID and time.
  - Async processing isolation — the inbox returns 202 fast; handlers
    work the rows out-of-band.

The table is intentionally append-only; rows are not updated except
to flip `processed` + set `processed_at` when a handler finishes.
A retention job (separate) prunes processed rows older than a configured
horizon.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin


__all__ = [
    "FederationActivity",
    "FederationActivityKind",
    "FederationActivityStatus",
]


class FederationActivityKind(str, enum.Enum):
    """The high-level kind the receiver dispatches on.

    Wire keys are STABLE — peers send these exactly; the verifier
    persists them verbatim. New kinds are added by extending the enum,
    NEVER by re-purposing an existing wire key.
    """

    HUB_INVITE = "hub.invite"
    HUB_ACCEPT = "hub.accept"
    HUB_DECLINE = "hub.decline"
    HUB_LEAVE = "hub.leave"
    HUB_POST = "hub.post"
    HUB_UPDATE = "hub.update"
    HUB_DELETE = "hub.delete"

    FOLLOW_REQUEST = "follow.request"
    FOLLOW_ACCEPT = "follow.accept"
    FOLLOW_DECLINE = "follow.decline"
    FOLLOW_UNDO = "follow.undo"

    NOTE_CREATE = "note.create"
    NOTE_UPDATE = "note.update"
    NOTE_DELETE = "note.delete"

    LINEAGE_ATTEST = "lineage.attest"
    LINEAGE_COUNTERSIGN = "lineage.countersign"

    # Cross-instance group rituals (spec §4.7 / §4.8 — v1-033).
    # ``ritual.schedule`` carries the RitualSchedule op; ``ritual.update``
    # carries every RitualUpdate op (update_kind in the body selects
    # start / fragment / completion / postmortem_entry /
    # egregore_registration).
    RITUAL_SCHEDULE = "ritual.schedule"
    RITUAL_UPDATE = "ritual.update"

    # Unknown kinds get the catchall — the inbox accepts but flags for
    # operator review (rule: don't crash on unknown peer types).
    UNKNOWN = "unknown"


class FederationActivityStatus(str, enum.Enum):
    """Processing state. New rows start at PENDING; handlers transition."""

    PENDING = "pending"
    PROCESSED = "processed"
    ERRORED = "errored"
    SKIPPED = "skipped"
    """Activity was accepted but the operator's policy declines it
    (e.g., blocked peer, malformed payload that passed signature
    verification). Kept for audit; never re-processed."""


class FederationActivity(IDMixin, TimestampMixin, table=True):
    __tablename__ = "federation_activity"
    __table_args__ = (
        Index(
            "ix_federation_activity_sender_received",
            "sender_did",
            "received_at",
        ),
        Index(
            "ix_federation_activity_status",
            "status",
        ),
    )

    sender_did: str = Field(
        sa_column=Column(String(255), nullable=False),
        description="DID of the peer instance that signed the inbound request.",
    )

    kind: FederationActivityKind = Field(
        sa_column=Column(
            SQLEnum(
                FederationActivityKind,
                name="federation_activity_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    body_json: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False),
        description="Verbatim parsed JSON body — exactly the bytes that were signed.",
    )

    received_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        description="Server-side timestamp (rule: never trust peer clocks).",
    )

    status: FederationActivityStatus = Field(
        default=FederationActivityStatus.PENDING,
        sa_column=Column(
            SQLEnum(
                FederationActivityStatus,
                name="federation_activity_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    processed_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    error_detail: str | None = Field(
        default=None,
        sa_column=Column(String(2000), nullable=True),
        description="Truncated error string when status=ERRORED.",
    )

    target_hub_id: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description="Hub the activity is addressed to, if applicable.",
    )

    target_user_id: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description="User actor the activity is addressed to, if applicable.",
    )
