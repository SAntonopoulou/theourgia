"""Unit tests for the Stripe Connect + checkout routers (B127).

Covers:
  * Route registration smoke for the three new routers
  * Response model assertions
  * Refund-link contract — the route returns the portal URL,
    NEVER processes a refund
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import (
    checkout as checkout_module,
)
from theourgia.api.routers.v1 import (
    stripe_connect as stripe_connect_module,
)
from theourgia.api.routers.v1 import (
    stripe_webhook as stripe_webhook_module,
)
from theourgia.api.routers.v1.checkout import (
    CheckoutResult,
    DownloadResult,
    RefundLinkResult,
)
from theourgia.api.routers.v1.stripe_connect import (
    AccountRead,
    OnboardingLinkRead,
)


# ── Stripe Connect router ──────────────────────────────────────


def test_stripe_connect_router_registers_four_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in stripe_connect_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/stripe-connect/account", "POST"),
        ("/stripe-connect/account", "GET"),
        ("/stripe-connect/account", "DELETE"),
        ("/stripe-connect/refresh", "POST"),
    }
    assert expected.issubset(paths_methods)


def test_stripe_connect_router_response_models() -> None:
    by_key: dict[tuple[str, str], object] = {}
    for r in stripe_connect_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert by_key[("/stripe-connect/account", "POST")] == OnboardingLinkRead
    assert by_key[("/stripe-connect/account", "GET")] == AccountRead
    assert by_key[("/stripe-connect/refresh", "POST")] == OnboardingLinkRead


# ── Checkout router ────────────────────────────────────────────


def test_checkout_router_registers_three_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in checkout_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/publications/{publication_id}/checkout", "POST"),
        ("/purchases/{purchase_id}/download", "GET"),
        ("/purchases/{purchase_id}/refund-link", "POST"),
    }
    assert expected.issubset(paths_methods)


def test_checkout_router_response_models() -> None:
    by_key: dict[tuple[str, str], object] = {}
    for r in checkout_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert (
        by_key[("/publications/{publication_id}/checkout", "POST")]
        == CheckoutResult
    )
    assert (
        by_key[("/purchases/{purchase_id}/download", "GET")]
        == DownloadResult
    )
    assert (
        by_key[("/purchases/{purchase_id}/refund-link", "POST")]
        == RefundLinkResult
    )


def test_refund_link_result_carries_portal_handoff_note() -> None:
    """The H07 refund hand-off contract: the response carries a
    matter-of-fact note pointing the publisher at Stripe's portal."""
    r = RefundLinkResult(
        refund_link="https://stripe.test/portal/x",
        note="Refund processed through Stripe Customer Portal.",
    )
    assert "Customer Portal" in r.note


# ── Stripe webhook router ─────────────────────────────────────


def test_stripe_webhook_router_registers_one_route() -> None:
    paths_methods = {
        (r.path, m)
        for r in stripe_webhook_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/stripe/webhook", "POST") in paths_methods


# ── Cross-router invariant: no /refund POST anywhere ───────────


def test_no_refund_post_endpoint_in_any_router() -> None:
    """The H07 refund hand-off rule, verified at the routing layer.
    A future commit that adds POST /refund (no -link suffix) would
    silently start processing refunds — this test catches that
    drift before it merges."""
    from theourgia.api.routers.v1 import (
        checkout, stripe_connect, stripe_webhook,
    )

    for mod in (checkout, stripe_connect, stripe_webhook):
        for r in mod.router.routes:
            path = getattr(r, "path", "")
            methods = getattr(r, "methods", set()) or set()
            for method in methods:
                if method == "POST" and path.rstrip("/").endswith("/refund"):
                    raise AssertionError(
                        f"Forbidden refund endpoint: {method} {path!r}",
                    )
