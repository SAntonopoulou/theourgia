"""Subscriber model (B128).

Per ``plan/10-batches-backend.md`` § B128.

One row per (publisher, email). The status lifecycle:

  PENDING_CONFIRMATION  (default) — double-opt-in token issued,
                                    not yet clicked.
  ACTIVE                          — confirmed via token.
  FAILED_PAYMENT                  — Stripe webhook flipped this on
                                    invoice.payment_failed. The
                                    H07 Subscribers surface renders
                                    these rows in ``--warn``,
                                    NEVER ``--danger``.
  UNSUBSCRIBED                    — sticky; re-subscribe requires
                                    a fresh signup with a new token.

Honesty rules:
  * Double-opt-in is mandatory. The route NEVER auto-confirms.
  * Unsubscribe is sticky.
  * Per-publisher email uniqueness — one publisher cannot have
    duplicate subscribers with the same email.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, UniqueConstraint
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["Subscriber", "SubscriberStatus"]


class SubscriberStatus(str, enum.Enum):
    """The H07 Subscribers surface table column."""

    PENDING_CONFIRMATION = "pending_confirmation"
    ACTIVE = "active"
    FAILED_PAYMENT = "failed_payment"
    UNSUBSCRIBED = "unsubscribed"


class Subscriber(IDMixin, TimestampMixin, table=True):
    """One newsletter subscriber under one publisher's vault."""

    __tablename__ = "subscriber"
    __table_args__ = (
        Index("ix_subscriber_owner", "owner_id"),
        Index(
            "ix_subscriber_confirmation_token",
            "confirmation_token",
            unique=True,
        ),
        Index(
            "ix_subscriber_unsubscribe_token",
            "unsubscribe_token",
            unique=True,
        ),
        UniqueConstraint(
            "owner_id", "email", name="uq_subscriber_owner_email",
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    email: str = Field(max_length=480, nullable=False)
    tier_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("subscription_tier.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    status: SubscriberStatus = Field(
        default=SubscriberStatus.PENDING_CONFIRMATION,
        sa_column=Column(
            SQLEnum(
                SubscriberStatus,
                name="subscriber_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=SubscriberStatus.PENDING_CONFIRMATION.value,
        ),
    )
    confirmation_token: str = Field(max_length=128, nullable=False)
    confirmed_at: Optional[datetime] = Field(default=None)
    unsubscribe_token: str = Field(max_length=128, nullable=False)
    unsubscribed_at: Optional[datetime] = Field(default=None)
    stripe_subscription_id: Optional[str] = Field(
        default=None, max_length=64, unique=True,
    )
    last_failed_payment_at: Optional[datetime] = Field(default=None)
    last_confirmation_sent_at: Optional[datetime] = Field(default=None)
