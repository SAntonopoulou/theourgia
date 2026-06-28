"""Persisted outbound federation delivery queue — Phase 12.5.

The single-attempt :func:`theourgia.core.federation.outbound.deliver`
primitive sometimes fails — peer is temporarily down, transient network,
peer key cache stale. Phase 12 deferred queueing; Phase 12.5 lands it:

  1. Producers call :func:`enqueue` instead of :func:`deliver` directly
     when at-least-once semantics matter (hub posts, lineage attestations,
     follow accepts).
  2. The :func:`drain_delivery_queue` Celery task picks up pending rows
     with a small exponential backoff and retries each one.
  3. After ``max_attempts`` failures, the row is marked DEAD and an
     operator-visible audit event fires.

The table records the body verbatim so deliveries are exactly
reproducible across retries — the same bytes signed each time, never
re-serialised mid-flight.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin


__all__ = [
    "FederationDelivery",
    "FederationDeliveryStatus",
]


class FederationDeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    """Awaiting first attempt or scheduled retry."""

    DELIVERED = "delivered"
    """Peer accepted (HTTP 2xx)."""

    DEAD = "dead"
    """All retries exhausted; operator review needed."""


class FederationDelivery(IDMixin, TimestampMixin, table=True):
    __tablename__ = "federation_delivery"
    __table_args__ = (
        Index(
            "ix_federation_delivery_pending_next_attempt",
            "status",
            "next_attempt_at",
        ),
    )

    recipient_did: str = Field(
        sa_column=Column(String(255), nullable=False),
    )

    url: str = Field(
        sa_column=Column(String(500), nullable=False),
        description="Full HTTPS inbox URL of the peer.",
    )

    body_json: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False),
        description="The payload to deliver. Stored once; signed fresh each attempt.",
    )

    status: FederationDeliveryStatus = Field(
        default=FederationDeliveryStatus.PENDING,
        sa_column=Column(
            SQLEnum(
                FederationDeliveryStatus,
                name="federation_delivery_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    attempt_count: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
    )

    max_attempts: int = Field(
        default=6,
        sa_column=Column(Integer, nullable=False, server_default="6"),
        description="After this many failures, status → DEAD.",
    )

    next_attempt_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        description="Earliest time the worker should re-attempt.",
    )

    last_error: str | None = Field(
        default=None,
        sa_column=Column(String(1000), nullable=True),
    )

    delivered_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
