"""Stripe webhook event processor (B127).

Per ``plan/10-batches-backend.md`` § B127.

Pure-ish: takes the parsed event dict + an async DB session, applies
the side effects, returns a summary. The HTTP receiver lives in
``routers/v1/stripe_webhook.py``.

Idempotency:
  * Every Stripe event carries an `id`. The processor checks for
    an existing Purchase or account-update side-effect before
    persisting; replaying the same event is a no-op.

Honesty rules:
  * The ``charge.refunded`` handler sets ``refunded_at`` + the
    refund reason — but the route never INITIATES a refund (those
    happen via Stripe's customer portal). This handler is the
    receive-side of that flow.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.billing.tokens import (
    DEFAULT_DOWNLOAD_COUNT_LIMIT,
    fresh_expiry,
    generate_download_token,
)
from theourgia.models.purchase import Purchase
from theourgia.models.stripe_account import (
    OnboardingStatus,
    StripeConnectAccount,
)

__all__ = [
    "WebhookOutcome",
    "process_event",
    "process_checkout_session_completed",
    "process_charge_refunded",
    "process_account_updated",
]


@dataclass(frozen=True)
class WebhookOutcome:
    """What the processor did.

    The HTTP receiver echoes this back to Stripe (which only cares
    about the 2xx response, but logging it is useful)."""

    handled: bool
    kind: str
    side_effects: tuple[str, ...]


async def process_event(
    *,
    db: AsyncSession,
    event: dict,
) -> WebhookOutcome:
    """Top-level dispatch. Unknown event types are recorded as
    ``handled=False`` — we don't fail the webhook on them
    (Stripe sends many events the app doesn't care about)."""
    event_type = str(event.get("type") or "")
    if event_type == "checkout.session.completed":
        return await process_checkout_session_completed(db=db, event=event)
    if event_type == "charge.refunded":
        return await process_charge_refunded(db=db, event=event)
    if event_type == "account.updated":
        return await process_account_updated(db=db, event=event)
    return WebhookOutcome(handled=False, kind=event_type, side_effects=())


async def process_checkout_session_completed(
    *,
    db: AsyncSession,
    event: dict,
) -> WebhookOutcome:
    """Persist a ``Purchase`` when a checkout session completes.

    Idempotent: if a Purchase already exists for the same
    ``stripe_payment_intent_id``, we skip.
    """
    obj = event.get("data", {}).get("object", {}) or {}
    pi_id = obj.get("payment_intent")
    if not pi_id:
        return WebhookOutcome(
            handled=False,
            kind="checkout.session.completed",
            side_effects=("missing-payment-intent",),
        )

    # Validate the payload BEFORE touching the DB — keeps the
    # processor cheap on hostile/malformed input and means tests
    # don't need a session for those branches.
    metadata = obj.get("metadata", {}) or {}
    publication_id_raw = metadata.get("publication_id")
    buyer_email = obj.get("customer_email") or metadata.get("buyer_email")
    if not publication_id_raw or not buyer_email:
        return WebhookOutcome(
            handled=False,
            kind="checkout.session.completed",
            side_effects=("missing-metadata",),
        )
    try:
        publication_id = UUID(str(publication_id_raw))
    except ValueError:
        return WebhookOutcome(
            handled=False,
            kind="checkout.session.completed",
            side_effects=("bad-publication-id",),
        )

    # Idempotency check — payload is shaped right at this point.
    existing = (
        await db.execute(
            select(Purchase).where(
                Purchase.stripe_payment_intent_id == pi_id,
            )
        )
    ).scalars().first()
    if existing is not None:
        return WebhookOutcome(
            handled=True,
            kind="checkout.session.completed",
            side_effects=("noop-duplicate",),
        )

    amount_cents = int(obj.get("amount_total", 0))
    currency = str(obj.get("currency", "usd")).lower()
    paid_at = datetime.now(tz=timezone.utc)

    purchase = Purchase(
        publication_id=publication_id,
        buyer_email=str(buyer_email),
        stripe_payment_intent_id=str(pi_id),
        amount_cents=amount_cents,
        currency=currency,
        paid_at=paid_at,
        download_token=generate_download_token(),
        download_token_expires_at=fresh_expiry(paid_at),
        download_count=0,
        download_count_limit=DEFAULT_DOWNLOAD_COUNT_LIMIT,
    )
    db.add(purchase)
    await db.commit()
    return WebhookOutcome(
        handled=True,
        kind="checkout.session.completed",
        side_effects=("purchase-created",),
    )


async def process_charge_refunded(
    *,
    db: AsyncSession,
    event: dict,
) -> WebhookOutcome:
    """Flag the Purchase as refunded.

    The Stripe ``charge.refunded`` event fires when the publisher
    issues a refund through their Customer Portal. We don't call
    Stripe to refund — we only receive notification."""
    obj = event.get("data", {}).get("object", {}) or {}
    pi_id = obj.get("payment_intent")
    if not pi_id:
        return WebhookOutcome(
            handled=False,
            kind="charge.refunded",
            side_effects=("missing-payment-intent",),
        )
    purchase = (
        await db.execute(
            select(Purchase).where(
                Purchase.stripe_payment_intent_id == pi_id,
            )
        )
    ).scalars().first()
    if purchase is None:
        return WebhookOutcome(
            handled=False,
            kind="charge.refunded",
            side_effects=("purchase-not-found",),
        )
    if purchase.refunded_at is not None:
        return WebhookOutcome(
            handled=True,
            kind="charge.refunded",
            side_effects=("noop-already-refunded",),
        )
    purchase.refunded_at = datetime.now(tz=timezone.utc)
    purchase.refund_reason = str(obj.get("refund_reason") or "")
    await db.commit()
    return WebhookOutcome(
        handled=True,
        kind="charge.refunded",
        side_effects=("purchase-refunded",),
    )


async def process_account_updated(
    *,
    db: AsyncSession,
    event: dict,
) -> WebhookOutcome:
    """Sync the publisher's onboarding status when Stripe reports
    a change on a Connect account."""
    obj = event.get("data", {}).get("object", {}) or {}
    account_id = obj.get("id")
    if not account_id:
        return WebhookOutcome(
            handled=False,
            kind="account.updated",
            side_effects=("missing-account-id",),
        )
    account = (
        await db.execute(
            select(StripeConnectAccount).where(
                StripeConnectAccount.stripe_account_id == account_id,
            )
        )
    ).scalars().first()
    if account is None:
        return WebhookOutcome(
            handled=False,
            kind="account.updated",
            side_effects=("account-not-found",),
        )

    account.charges_enabled = bool(obj.get("charges_enabled", False))
    account.payouts_enabled = bool(obj.get("payouts_enabled", False))
    # Translate Stripe's capability flags to our enum.
    requirements = obj.get("requirements", {}) or {}
    disabled_reason = requirements.get("disabled_reason")
    if disabled_reason == "rejected.fraud":
        account.onboarding_status = OnboardingStatus.REJECTED
    elif disabled_reason:
        account.onboarding_status = OnboardingStatus.RESTRICTED
    elif account.charges_enabled and account.payouts_enabled:
        account.onboarding_status = OnboardingStatus.ACTIVE
    else:
        account.onboarding_status = OnboardingStatus.PENDING
    await db.commit()
    return WebhookOutcome(
        handled=True,
        kind="account.updated",
        side_effects=("account-synced",),
    )
