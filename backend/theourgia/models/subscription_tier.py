"""Subscription tier model (B128).

Per ``plan/10-batches-backend.md`` § B128.

One ``SubscriptionTier`` per per-vault paid tier. The publisher
creates tiers; the Stripe recurring price id is set when the
publisher pushes the tier to Stripe.

Honesty rule:
  * ``monthly_amount_cents`` is IMMUTABLE. Stripe prices don't
    change in place; to raise a tier's price the publisher creates
    a new tier. The API layer (B128 router) enforces this; the
    schema doesn't even declare the field on the update payload.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = ["SubscriptionTier"]


class SubscriptionTier(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One paid tier in a publisher's subscription menu."""

    __tablename__ = "subscription_tier"
    __table_args__ = (
        Index("ix_subscription_tier_owner", "owner_id"),
    )

    owner_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    name: str = Field(max_length=80, nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    monthly_amount_cents: int = Field(ge=0, nullable=False)
    currency: str = Field(default="usd", max_length=8)
    enabled: bool = Field(default=True, nullable=False)
    is_primary: bool = Field(default=False, nullable=False)
    stripe_price_id: Optional[str] = Field(default=None, max_length=64)
