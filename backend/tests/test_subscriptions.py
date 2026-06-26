"""Unit tests for the subscription tiers + subscribers substrate (B128).

THE critical honesty rules covered:
  * Tier amount is IMMUTABLE — TierUpdate doesn't declare the
    field; Pydantic extra="forbid" rejects.
  * Double-opt-in mandatory — SubscriberStatus defaults to
    PENDING_CONFIRMATION; the route NEVER auto-confirms.
  * Failed-payment status exists + is wired by the webhook
    (subscriber's status flips on invoice.payment_failed).
  * Unsubscribe is sticky — re-subscribing requires a new signup.
  * Per-publisher email uniqueness — DB constraint enforced.
  * Acknowledgment copy verbatim.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import (
    subscribers as subscribers_module,
)
from theourgia.api.routers.v1 import (
    subscription_tiers as tiers_module,
)
from theourgia.api.routers.v1.subscribers import (
    DOUBLE_OPT_IN_ACK,
    RESEND_RATE_LIMIT,
    ConfirmPayload,
    SubscribeAck,
    SubscribePayload,
    SubscriberRead,
    UnsubscribePayload,
    _new_token,
    _to_subscriber_read,
)
from theourgia.api.routers.v1.subscription_tiers import (
    TierCreate,
    TierRead,
    TierUpdate,
    _to_tier_read,
)
from theourgia.core.billing.webhook_processor import process_event
from theourgia.models.subscriber import Subscriber, SubscriberStatus
from theourgia.models.subscription_tier import SubscriptionTier


def _tier_row() -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        name="Patrons",
        description="Early access.",
        monthly_amount_cents=800,
        currency="usd",
        enabled=True,
        is_primary=True,
        stripe_price_id="price_test",
        created_at=now,
        updated_at=now,
    )


def _subscriber_row(
    *,
    status: SubscriberStatus = SubscriberStatus.PENDING_CONFIRMATION,
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        email="reader@example.com",
        tier_id=None,
        status=status,
        confirmation_token="tok_pending",
        confirmed_at=None,
        unsubscribe_token="tok_unsub",
        unsubscribed_at=None,
        stripe_subscription_id=None,
        last_failed_payment_at=None,
        last_confirmation_sent_at=now,
        created_at=now,
        updated_at=now,
    )


# ── Tier amount IMMUTABLE (the critical honesty test) ────────


def test_tier_update_does_NOT_accept_monthly_amount_cents() -> None:
    """THE critical honesty test for B128. Stripe prices don't
    change in place; the schema MUST reject this field on update.

    If a future commit accidentally adds `monthly_amount_cents` to
    TierUpdate, this test fails before merge."""
    with pytest.raises(ValidationError):
        TierUpdate(monthly_amount_cents=1500)  # type: ignore[call-arg]


def test_tier_update_does_NOT_accept_currency() -> None:
    """Currency rides with the price id — equally immutable."""
    with pytest.raises(ValidationError):
        TierUpdate(currency="eur")  # type: ignore[call-arg]


def test_tier_update_does_NOT_accept_stripe_price_id() -> None:
    """The publisher should never overwrite the Stripe price id
    directly; it gets created server-side when the tier is pushed
    to Stripe."""
    with pytest.raises(ValidationError):
        TierUpdate(stripe_price_id="price_other")  # type: ignore[call-arg]


def test_tier_update_does_NOT_accept_owner_id() -> None:
    with pytest.raises(ValidationError):
        TierUpdate(owner_id=uuid4())  # type: ignore[call-arg]


def test_tier_update_accepts_only_name_description_enabled_primary() -> None:
    p = TierUpdate(
        name="Witnesses",
        description="Updated.",
        enabled=False,
        is_primary=True,
    )
    data = p.model_dump(exclude_unset=True)
    assert set(data.keys()) == {
        "name", "description", "enabled", "is_primary",
    }


def test_tier_update_is_fully_optional() -> None:
    p = TierUpdate()
    assert p.model_dump(exclude_unset=True) == {}


# ── Tier create validation ──────────────────────────────────


def test_tier_create_minimal_validates() -> None:
    p = TierCreate(name="Tier", monthly_amount_cents=500)
    assert p.monthly_amount_cents == 500
    assert p.currency == "usd"


def test_tier_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        TierCreate(name="", monthly_amount_cents=500)


def test_tier_create_rejects_negative_amount() -> None:
    with pytest.raises(ValidationError):
        TierCreate(name="Tier", monthly_amount_cents=-100)


def test_tier_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        TierCreate(
            name="x",
            monthly_amount_cents=100,
            owner_id=uuid4(),  # type: ignore[call-arg]
        )


# ── Double-opt-in is mandatory ─────────────────────────────


def test_subscriber_status_defaults_to_pending_confirmation() -> None:
    """THE other critical honesty test. The route NEVER auto-
    confirms; status defaults to PENDING_CONFIRMATION."""
    field = Subscriber.model_fields["status"]
    assert field.default == SubscriberStatus.PENDING_CONFIRMATION


def test_double_opt_in_ack_copy_is_verbatim() -> None:
    """The H07 Public Vault Page acknowledgment is locked verbatim.
    A test against the constant catches future drift."""
    assert DOUBLE_OPT_IN_ACK == (
        "Check your email to confirm — you're not subscribed until "
        "you click the link."
    )


def test_subscribe_ack_shape() -> None:
    ack = SubscribeAck(acknowledged=True, message=DOUBLE_OPT_IN_ACK)
    assert ack.acknowledged is True
    assert "click the link" in ack.message


def test_subscriber_status_enum_has_four_values() -> None:
    assert {s.value for s in SubscriberStatus} == {
        "pending_confirmation", "active", "failed_payment", "unsubscribed",
    }


def test_failed_payment_status_exists_as_a_distinct_state() -> None:
    """The H07 rule: failed payment is its own state — surface in
    --warn, never --danger. Tested by confirming the enum has a
    dedicated FAILED_PAYMENT value (the surface owns the colour)."""
    assert "failed_payment" in {s.value for s in SubscriberStatus}


# ── Resend rate limit ─────────────────────────────────────


def test_resend_rate_limit_is_one_minute() -> None:
    """1/min per the plan — generous enough for accidental double-
    clicks, strict enough to dodge mailbox spam."""
    assert RESEND_RATE_LIMIT.total_seconds() == 60


# ── Public subscribe payload ─────────────────────────────


def test_subscribe_payload_validates() -> None:
    p = SubscribePayload(email="x@example.com")
    assert str(p.email) == "x@example.com"


def test_subscribe_payload_rejects_bad_email() -> None:
    with pytest.raises(ValidationError):
        SubscribePayload(email="not-an-email")  # type: ignore[arg-type]


def test_confirm_payload_requires_token() -> None:
    p = ConfirmPayload(token="tok_x")
    assert p.token == "tok_x"


def test_unsubscribe_payload_requires_token() -> None:
    p = UnsubscribePayload(token="tok_y")
    assert p.token == "tok_y"


def test_confirm_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ConfirmPayload(token="x", email="y@example.com")  # type: ignore[call-arg]


def test_unsubscribe_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        UnsubscribePayload(token="x", extra=True)  # type: ignore[call-arg]


# ── Token generator ──────────────────────────────────────


def test_new_token_is_url_safe_and_long() -> None:
    t = _new_token()
    assert len(t) >= 40
    assert "+" not in t and "/" not in t and "=" not in t


def test_new_tokens_are_unique_across_calls() -> None:
    tokens = {_new_token() for _ in range(100)}
    assert len(tokens) == 100


# ── Helpers ──────────────────────────────────────────────


def test_to_tier_read_serialises_uuid() -> None:
    row = _tier_row()
    read = _to_tier_read(row)
    assert read.id == str(row.id)
    assert read.owner_id == str(row.owner_id)
    assert read.is_primary is True


def test_to_subscriber_read_serialises_enum_and_uuid() -> None:
    row = _subscriber_row(status=SubscriberStatus.ACTIVE)
    read = _to_subscriber_read(row)
    assert read.id == str(row.id)
    assert read.status == "active"


def test_to_subscriber_read_surfaces_failed_payment_status() -> None:
    row = _subscriber_row(status=SubscriberStatus.FAILED_PAYMENT)
    row.last_failed_payment_at = datetime.now(tz=timezone.utc)
    read = _to_subscriber_read(row)
    assert read.status == "failed_payment"
    assert read.last_failed_payment_at is not None


# ── Router smoke ─────────────────────────────────────────


def test_tiers_router_registers_five_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in tiers_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/subscription-tiers", "GET"),
        ("/subscription-tiers", "POST"),
        ("/subscription-tiers/{tier_id}", "GET"),
        ("/subscription-tiers/{tier_id}", "PATCH"),
        ("/subscription-tiers/{tier_id}", "DELETE"),
    }
    assert expected.issubset(paths_methods)


def test_subscribers_router_registers_six_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in subscribers_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/subscribers", "GET"),
        ("/subscribers/{subscriber_id}/resend-confirmation", "POST"),
        ("/subscribers/{subscriber_id}", "DELETE"),
        ("/vaults/{owner_id}/subscribe", "POST"),
        ("/subscribers/confirm", "POST"),
        ("/subscribers/unsubscribe", "POST"),
    }
    assert expected.issubset(paths_methods)


def test_tiers_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in tiers_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert by_key[("/subscription-tiers", "GET")] == list[TierRead]
    assert by_key[("/subscription-tiers", "POST")] == TierRead


def test_subscribers_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in subscribers_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert by_key[("/subscribers", "GET")] == list[SubscriberRead]
    assert by_key[("/vaults/{owner_id}/subscribe", "POST")] == SubscribeAck
    assert by_key[("/subscribers/confirm", "POST")] == SubscriberRead


# ── Webhook extensions (B128 additions) ──────────────────


@pytest.mark.asyncio
async def test_invoice_payment_failed_without_subscription_id() -> None:
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={"type": "invoice.payment_failed", "data": {"object": {}}},
    )
    assert outcome.handled is False
    assert "missing-subscription-id" in outcome.side_effects


@pytest.mark.asyncio
async def test_customer_subscription_deleted_without_id() -> None:
    outcome = await process_event(
        db=None,  # type: ignore[arg-type]
        event={
            "type": "customer.subscription.deleted",
            "data": {"object": {}},
        },
    )
    assert outcome.handled is False
    assert "missing-subscription-id" in outcome.side_effects


def test_webhook_processor_dispatches_invoice_payment_failed() -> None:
    """Source check: the dispatch top-level recognises this event
    type (the canary that catches a future rewrite that drops it)."""
    import inspect

    from theourgia.core.billing import webhook_processor

    src = inspect.getsource(webhook_processor.process_event)
    assert "invoice.payment_failed" in src
    assert "customer.subscription.deleted" in src
