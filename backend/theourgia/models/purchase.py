"""Purchase model (B127).

Per ``plan/10-batches-backend.md`` § B127.

One ``Purchase`` per Stripe Payment Intent. The buyer is identified
by email; when the buyer happens to be an authenticated Theourgia
user, ``buyer_user_id`` is set too. Cryptographically signed
single-use download tokens enable post-purchase downloads without
re-authentication.

Honesty rules:
  * **DRM-free always.** The watermark IS the only post-sale
    tracking (B127 enforces watermarking opt-in at the publication
    level; this row tracks the per-purchase token state).
  * **Refunds via portal hand-off.** This model captures
    ``refunded_at`` when the Stripe ``charge.refunded`` webhook
    fires; the route NEVER calls Stripe's refund API directly.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["Purchase"]


class Purchase(IDMixin, TimestampMixin, table=True):
    """One completed purchase."""

    __tablename__ = "purchase"
    __table_args__ = (
        Index("ix_purchase_publication", "publication_id"),
        Index("ix_purchase_buyer_email", "buyer_email"),
        Index(
            "ix_purchase_download_token", "download_token", unique=True,
        ),
        Index(
            "ix_purchase_stripe_pi", "stripe_payment_intent_id",
            unique=True,
        ),
    )

    publication_id: UUID = Field(
        sa_column=Column(
            ForeignKey("publication.id", ondelete="RESTRICT"),
            nullable=False,
        ),
    )
    # Buyer identification — email is the canonical handle since
    # buyers can be unauthenticated.
    buyer_email: str = Field(max_length=480, nullable=False)
    buyer_user_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    stripe_payment_intent_id: str = Field(max_length=64, nullable=False)
    amount_cents: int = Field(nullable=False, ge=0)
    currency: str = Field(default="usd", max_length=8)
    paid_at: datetime = Field(nullable=False)
    refunded_at: Optional[datetime] = Field(default=None)
    refund_reason: Optional[str] = Field(
        default=None, sa_column=Column(Text),
    )

    # Single-use download token. The token is the only key needed
    # to download — no re-auth — but it's single-use and
    # bounded by both expiry + download_count_limit.
    download_token: str = Field(max_length=128, nullable=False)
    download_token_expires_at: datetime = Field(nullable=False)
    download_count: int = Field(default=0, nullable=False, ge=0)
    download_count_limit: int = Field(
        default=5, nullable=False, ge=1,
    )
