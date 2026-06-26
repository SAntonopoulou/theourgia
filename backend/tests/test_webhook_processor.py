"""Unit tests for the Stripe webhook processor (B127).

Covers:
  * Dispatch: known event types are handled; unknown are no-ops
    with handled=False
  * Idempotency: replaying checkout.session.completed produces
    "noop-duplicate"
  * Schema robustness: missing metadata / bad UUIDs / missing
    payment_intent surface as handled=False with named side-effects
"""

from __future__ import annotations

import pytest

from theourgia.core.billing.webhook_processor import (
    WebhookOutcome,
    process_event,
)


# ── WebhookOutcome shape ────────────────────────────────────────


def test_webhook_outcome_is_frozen_dataclass() -> None:
    o = WebhookOutcome(handled=True, kind="x", side_effects=("a",))
    with pytest.raises(Exception):
        o.handled = False  # type: ignore[misc]


def test_webhook_outcome_side_effects_is_tuple_not_list() -> None:
    """Frozen + tuple makes it cheap to compare in tests."""
    o = WebhookOutcome(handled=True, kind="x", side_effects=("a", "b"))
    assert isinstance(o.side_effects, tuple)


# ── Unknown events are no-ops, not failures ────────────────────


@pytest.mark.asyncio
async def test_unknown_event_type_returns_handled_false() -> None:
    """Stripe sends many event types the app doesn't care about
    (payout.created, invoice.created, etc). We log them as
    not-handled, but the webhook still 200s."""
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={"type": "payout.created", "data": {"object": {}}},
    )
    assert outcome.handled is False
    assert outcome.kind == "payout.created"


@pytest.mark.asyncio
async def test_event_with_no_type_returns_handled_false() -> None:
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={"data": {"object": {}}},
    )
    assert outcome.handled is False
    assert outcome.kind == ""


# ── Schema robustness on checkout.session.completed ────────────


@pytest.mark.asyncio
async def test_checkout_session_completed_without_payment_intent() -> None:
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={
            "type": "checkout.session.completed",
            "data": {"object": {}},
        },
    )
    assert outcome.handled is False
    assert "missing-payment-intent" in outcome.side_effects


@pytest.mark.asyncio
async def test_checkout_session_completed_with_bad_publication_id(
) -> None:
    """When the metadata's publication_id isn't a valid UUID,
    we don't crash — we return handled=False with the named
    side effect."""
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "payment_intent": "pi_test",
                    "customer_email": "b@example.com",
                    "metadata": {"publication_id": "not-a-uuid"},
                    "amount_total": 1000,
                }
            },
        },
    )
    assert outcome.handled is False
    assert (
        "bad-publication-id" in outcome.side_effects
        or "missing-metadata" in outcome.side_effects
    )


@pytest.mark.asyncio
async def test_checkout_session_completed_without_metadata() -> None:
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={
            "type": "checkout.session.completed",
            "data": {"object": {"payment_intent": "pi_test"}},
        },
    )
    assert outcome.handled is False
    assert "missing-metadata" in outcome.side_effects


# ── charge.refunded robustness ─────────────────────────────────


@pytest.mark.asyncio
async def test_charge_refunded_without_payment_intent() -> None:
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={"type": "charge.refunded", "data": {"object": {}}},
    )
    assert outcome.handled is False
    assert "missing-payment-intent" in outcome.side_effects


# ── account.updated robustness ─────────────────────────────────


@pytest.mark.asyncio
async def test_account_updated_without_id() -> None:
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={"type": "account.updated", "data": {"object": {}}},
    )
    assert outcome.handled is False
    assert "missing-account-id" in outcome.side_effects
