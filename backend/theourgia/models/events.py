"""Outbox event persistence.

One row per durable event waiting for the dispatcher. The
:class:`OutboxDispatcher` reads pending rows, hands them to the bus,
and updates each row's status.

RLS: admin-only by default — the outbox is operator-visible
infrastructure, not user-visible content.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, Index, Integer, String, Text
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["OutboxEvent", "OutboxStatus"]


class OutboxStatus(str, enum.Enum):
    """Lifecycle status of an outbox row."""

    PENDING = "pending"
    """Awaiting dispatch."""

    DELIVERED = "delivered"
    """Successfully published to the bus."""

    DEAD = "dead"
    """Exhausted retry budget; left for operator investigation."""


class OutboxEvent(IDMixin, TimestampMixin, table=True):
    """A durable event waiting for the dispatcher."""

    __tablename__ = "outbox_event"
    __table_args__ = (
        Index(
            "ix_outbox_pending_scheduled",
            "status",
            "scheduled_for",
        ),
        Index("ix_outbox_event_type", "event_type"),
    )

    event_id: UUID = Field(
        unique=True,
        description="Mirrors :attr:`DomainEvent.id` — used for dedup",
    )

    event_type: str = Field(
        sa_column=Column(String(128), nullable=False),
    )

    payload_json: str = Field(
        sa_column=Column(Text, nullable=False),
        description="JSON-serialized DomainEvent.to_dict() output",
    )

    status: OutboxStatus = Field(
        default=OutboxStatus.PENDING,
        sa_column=Column(
            SQLEnum(OutboxStatus, name="outbox_status"),
            nullable=False,
            server_default="pending",
        ),
    )

    scheduled_for: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        description="When the dispatcher should attempt this row",
    )

    delivered_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    attempts: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
    )

    last_error: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Most recent dispatcher error, truncated.",
    )

    actor_id: Optional[UUID] = Field(
        default=None,
        description="User who triggered the event, if any.",
    )
