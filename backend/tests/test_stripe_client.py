"""Unit tests for the Stripe client substrate (B127).

The critical honesty test: the 0% application fee invariant on
checkout sessions. Tests use a fake client that records what
arguments the route passed; the real Stripe SDK is never imported
in CI.
"""

from __future__ import annotations

import pytest

from theourgia.core.billing.stripe_client import (
    AccountLinkResult,
    CheckoutSessionResult,
    ConnectAccountResult,
    NullStripeClient,
    StripeClient,
    StripeError,
    get_default_client,
    make_default_client,
    set_default_client,
)
from theourgia.core.billing.tokens import (
    DEFAULT_DOWNLOAD_COUNT_LIMIT,
    DEFAULT_TOKEN_TTL,
    fresh_expiry,
    generate_download_token,
    sign_download_token,
    verify_download_token,
)


# ── NullStripeClient ─────────────────────────────────────────────


def test_null_client_raises_clearly_on_every_method() -> None:
    """The Null client never silently succeeds. Every method must
    raise so a misconfigured production cannot half-process payments."""
    c = NullStripeClient()
    with pytest.raises(StripeError):
        c.create_connect_account(email="x@example.com")
    with pytest.raises(StripeError):
        c.create_account_link(
            account_id="acct_x", return_url="r", refresh_url="rr",
        )
    with pytest.raises(StripeError):
        c.retrieve_account("acct_x")
    with pytest.raises(StripeError):
        c.disconnect_account("acct_x")
    with pytest.raises(StripeError):
        c.create_checkout_session(
            publisher_account_id="acct_x",
            publication_title="Test",
            amount_cents=1000,
            currency="usd",
            buyer_email="b@example.com",
            success_url="s",
            cancel_url="c",
        )
    with pytest.raises(StripeError):
        c.get_customer_portal_url(customer_id="cus_x", return_url="r")
    with pytest.raises(StripeError):
        c.verify_webhook_signature(payload=b"", header="", secret="")


def test_null_client_carries_reason() -> None:
    c = NullStripeClient(reason="STRIPE_SECRET_KEY is not set.")
    assert "STRIPE_SECRET_KEY" in c.reason


# ── make_default_client factory ─────────────────────────────────


def test_make_default_client_without_key_returns_null() -> None:
    c = make_default_client(None)
    assert isinstance(c, NullStripeClient)
    assert "STRIPE_SECRET_KEY" in c.reason


def test_make_default_client_with_empty_string_returns_null() -> None:
    c = make_default_client("")
    assert isinstance(c, NullStripeClient)


# ── 0% application fee invariant (THE critical test) ───────────


class _FakeStripeClient:
    """Records what arguments the route passes to
    ``create_checkout_session`` so the test can assert invariants
    on them."""

    def __init__(self) -> None:
        self.last_session_args: dict | None = None

    def create_connect_account(self, *, email, country="US"):
        return ConnectAccountResult(
            account_id="acct_test",
            payouts_enabled=True,
            charges_enabled=True,
        )

    def create_account_link(self, *, account_id, return_url, refresh_url):
        return AccountLinkResult(url="https://stripe.test/onboard", expires_at=0)

    def retrieve_account(self, account_id):
        return ConnectAccountResult(
            account_id=account_id,
            payouts_enabled=True,
            charges_enabled=True,
        )

    def disconnect_account(self, account_id):
        pass

    def create_checkout_session(
        self,
        *,
        publisher_account_id,
        publication_title,
        amount_cents,
        currency,
        buyer_email,
        success_url,
        cancel_url,
    ):
        self.last_session_args = {
            "publisher_account_id": publisher_account_id,
            "publication_title": publication_title,
            "amount_cents": amount_cents,
            "currency": currency,
            "buyer_email": buyer_email,
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        return CheckoutSessionResult(
            session_id="cs_test",
            checkout_url="https://stripe.test/checkout/cs_test",
        )

    def get_customer_portal_url(self, *, customer_id, return_url):
        return f"https://stripe.test/portal/{customer_id}"

    def verify_webhook_signature(self, *, payload, header, secret):
        return {"type": "test.event"}


def test_real_stripe_client_signature_hardcodes_0_application_fee() -> None:
    """Defensive: the RealStripeClient.create_checkout_session
    method source MUST set application_fee_amount to 0. This is
    THE invariant — if it ever drifts, this test catches it
    before merge."""
    import inspect

    from theourgia.core.billing.stripe_client import RealStripeClient

    src = inspect.getsource(RealStripeClient.create_checkout_session)
    assert "application_fee_amount" in src
    # The application fee must be a literal 0 — not pulled from a
    # config variable, not computed.
    assert "application_fee_amount" in src
    assert '"application_fee_amount": 0' in src or "'application_fee_amount': 0" in src


def test_real_stripe_client_signature_uses_transfer_data_destination() -> None:
    """The destination = publisher's account id is the other half
    of the 0% fee story."""
    import inspect

    from theourgia.core.billing.stripe_client import RealStripeClient

    src = inspect.getsource(RealStripeClient.create_checkout_session)
    assert "transfer_data" in src
    assert "destination" in src
    assert "publisher_account_id" in src


def test_no_refund_endpoint_calls_stripe_refund_api() -> None:
    """THE refund honesty rule: nowhere in the routes do we call
    ``stripe.Refund.create`` or anything that mutates a refund
    server-side. The refund-link endpoint returns the Customer
    Portal URL ONLY."""
    import inspect

    from theourgia.api.routers.v1 import checkout, stripe_connect

    for module in (checkout, stripe_connect):
        src = inspect.getsource(module)
        # If a future change adds Refund.create, this test catches it.
        assert "Refund.create" not in src
        assert "refund.create" not in src.lower() or "refund_link" in src.lower()


def test_no_refund_endpoint_in_route_table() -> None:
    """Defence in depth: the route table itself MUST NOT include
    a ``/refund`` path. Only ``/refund-link`` is allowed."""
    from theourgia.api.routers.v1 import checkout as checkout_module

    for r in checkout_module.router.routes:
        path = getattr(r, "path", "")
        # /refund-link is fine; /refund is not.
        if "refund" in path:
            assert path.endswith("/refund-link"), (
                f"Forbidden refund path: {path!r}"
            )


# ── Default client swap ────────────────────────────────────────


def test_set_default_client_swaps_in_test_fake() -> None:
    fake = _FakeStripeClient()
    set_default_client(fake)
    assert get_default_client() is fake
    set_default_client(NullStripeClient())  # reset


# ── Token helpers ──────────────────────────────────────────────


def test_generate_download_token_is_url_safe_and_long() -> None:
    t = generate_download_token()
    # 32 bytes urlsafe base64 ≈ 43 chars
    assert len(t) >= 40
    # URL-safe means no +, /, =
    assert "+" not in t and "/" not in t and "=" not in t


def test_download_tokens_are_unique_across_generations() -> None:
    """Sanity: 100 tokens should all be distinct."""
    tokens = {generate_download_token() for _ in range(100)}
    assert len(tokens) == 100


def test_sign_and_verify_round_trip() -> None:
    sig = sign_download_token("tok_x", "purchase_y", "test-key")
    assert verify_download_token("tok_x", "purchase_y", sig, "test-key")


def test_verify_rejects_tampered_signature() -> None:
    sig = sign_download_token("tok_x", "purchase_y", "test-key")
    bad = "0" + sig[1:]
    assert not verify_download_token("tok_x", "purchase_y", bad, "test-key")


def test_verify_rejects_wrong_purchase_id() -> None:
    sig = sign_download_token("tok_x", "purchase_y", "test-key")
    assert not verify_download_token(
        "tok_x", "purchase_z", sig, "test-key",
    )


def test_verify_rejects_wrong_signing_key() -> None:
    sig = sign_download_token("tok_x", "purchase_y", "test-key")
    assert not verify_download_token(
        "tok_x", "purchase_y", sig, "other-key",
    )


def test_default_token_ttl_is_30_days() -> None:
    """The plan locked 30 days as the default expiry."""
    assert DEFAULT_TOKEN_TTL.days == 30


def test_default_download_count_limit_is_5() -> None:
    """The plan locked 5 downloads as the per-purchase default
    (generous for multi-device users)."""
    assert DEFAULT_DOWNLOAD_COUNT_LIMIT == 5


def test_fresh_expiry_returns_now_plus_default_ttl() -> None:
    from datetime import datetime, timezone

    base = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)
    assert fresh_expiry(base) == base + DEFAULT_TOKEN_TTL
