"""Stripe Connect account model (B127).

Per ``plan/10-batches-backend.md`` § B127.

One ``StripeConnectAccount`` per practitioner. The standard Stripe
Connect account_id (``acct_…``) is issued by Stripe when the
practitioner completes onboarding. Payouts go directly to that
account; Theourgia takes no cut.
"""

from __future__ import annotations

import enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["StripeConnectAccount", "OnboardingStatus"]


class OnboardingStatus(str, enum.Enum):
    """The lifecycle of a Connect account from the publisher's side."""

    PENDING = "pending"
    ACTIVE = "active"
    RESTRICTED = "restricted"
    REJECTED = "rejected"
    DISCONNECTED = "disconnected"


class StripeConnectAccount(IDMixin, TimestampMixin, table=True):
    """One Stripe Connect standard account per practitioner."""

    __tablename__ = "stripe_connect_account"
    __table_args__ = (
        Index(
            "ix_stripe_account_owner",
            "owner_id",
            unique=True,
        ),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    stripe_account_id: Optional[str] = Field(
        default=None, max_length=64, unique=True,
    )
    onboarding_status: OnboardingStatus = Field(
        default=OnboardingStatus.PENDING,
        sa_column=Column(
            SQLEnum(
                OnboardingStatus,
                name="stripe_onboarding_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default=OnboardingStatus.PENDING.value,
        ),
    )
    payouts_enabled: bool = Field(default=False, nullable=False)
    charges_enabled: bool = Field(default=False, nullable=False)
