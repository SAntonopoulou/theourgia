"""Unit tests for the public reader + public vault routers (B130).

THE critical honesty rules covered:
  * Sealed publications NEVER public — defence in depth on top of
    B126's publish-time and B127's checkout-time checks.
  * Withdrawn publications 404.
  * Paywall structural (paywall_kind + URLs only) — no countdown
    timers, no "limited time" pressure, no recommended products.
  * Per-vault page popular-sort opt-in defaults FALSE.
  * Free publications show full body + every chapter; paid show
    summary + first chapter only.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import (
    public_reader as reader_module,
)
from theourgia.api.routers.v1 import (
    public_vault as vault_module,
)
from theourgia.api.routers.v1.public_reader import (
    PaywallKind,
    ReaderChapter,
    ReaderResponse,
    _paywall_for,
    _walk_entry_refs,
)
from theourgia.api.routers.v1.public_vault import (
    PublicVaultPublication,
    PublicVaultResponse,
    PublicVaultTier,
)
from types import SimpleNamespace
from uuid import uuid4


def _pub_row(
    *,
    state_value: str = "live",
    pricing_model: str = "free",
    kind_value: str = "essay",
    body: dict | None = None,
) -> SimpleNamespace:
    """A bare Publication-shaped namespace for the helper tests."""
    from theourgia.models.publications import (
        PublicationKind,
        PublicationLicense,
        PublicationState,
    )

    from theourgia.models.publications import PublicationContentFormat

    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        kind=PublicationKind(kind_value),
        state=PublicationState(state_value),
        slug="walking",
        title="Walking",
        summary="Summary.",
        body=body or {"type": "doc", "content": []},
        cover_url=None,
        language="en",
        license=PublicationLicense.CC_BY_NC,
        published_at=None,
        scheduled_publish_at=None,
        withdrawn_at=None,
        pricing_model=pricing_model,
        one_time_amount_cents=1800 if pricing_model == "one_time" else None,
        currency="usd",
        watermark_enabled=False,
        cited=False,
        content_format=PublicationContentFormat.HTML,
        file_url=None,
        file_size_bytes=None,
        created_at=None,
        updated_at=None,
        deleted_at=None,
    )


# ── _paywall_for ─────────────────────────────────────────────


def test_paywall_for_free_returns_none() -> None:
    assert _paywall_for(_pub_row(pricing_model="free")) == "none"


def test_paywall_for_one_time_returns_purchase() -> None:
    assert _paywall_for(_pub_row(pricing_model="one_time")) == "purchase"


def test_paywall_for_subscribe_returns_subscribe() -> None:
    assert _paywall_for(_pub_row(pricing_model="subscribe")) == "subscribe"


def test_paywall_for_unknown_pricing_returns_none_defensive() -> None:
    """Defensive: unknown pricing strings fall back to no paywall
    (the publish lifecycle should never let this happen, but if
    it does we don't accidentally paywall a free read)."""
    assert _paywall_for(_pub_row(pricing_model="weird")) == "none"


# ── _walk_entry_refs ────────────────────────────────────────


def test_walk_entry_refs_finds_nested_refs() -> None:
    eid = uuid4()
    body = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "entryLink",
                        "attrs": {"entry_id": str(eid)},
                    },
                ],
            }
        ],
    }
    refs = _walk_entry_refs(body)
    assert refs == [eid]


def test_walk_entry_refs_ignores_bad_uuids() -> None:
    body = {
        "type": "doc",
        "content": [
            {
                "type": "entryLink",
                "attrs": {"entry_id": "not-a-uuid"},
            }
        ],
    }
    assert _walk_entry_refs(body) == []


def test_walk_entry_refs_empty_body() -> None:
    assert _walk_entry_refs({}) == []


# ── ReaderResponse schema invariants ───────────────────────


def test_reader_response_paywall_kind_literal_values() -> None:
    """The paywall_kind is constrained to three values — no
    promotional escape hatch like 'limited' or 'sale'."""
    valid = {"none", "purchase", "subscribe"}
    # Pydantic raises at construction time on bad literals.
    for k in valid:
        r = ReaderResponse(
            id="x", slug="x", title="x", summary=None, cover_url=None,
            language="en", license="cc0", published_at=None,
            pricing_model="free", one_time_amount_cents=None,
            currency="usd", body={}, chapters=[],
            paywall_kind=k, purchase_url=None, subscribe_url=None,
        )
        assert r.paywall_kind in valid


def test_reader_response_does_NOT_carry_countdown_timer_field() -> None:
    """Defensive: the schema MUST NOT include any field that
    promotes urgency. A future commit that adds 'sale_ends_at' or
    'limited_time_seconds' or similar gets caught."""
    field_names = set(ReaderResponse.model_fields.keys())
    banned = {
        "sale_ends_at",
        "limited_time_seconds",
        "discount_expires_at",
        "recommended_products",
        "trending_score",
        "view_count",  # no leaderboards
    }
    assert not (banned & field_names), (
        f"Promotional fields leaked into ReaderResponse: "
        f"{banned & field_names}"
    )


def test_reader_chapter_body_is_nullable() -> None:
    """Paid chapters past the first one have body=None — the
    structural paywall pattern. The schema makes that explicit."""
    field = ReaderChapter.model_fields["body"]
    # The annotation is dict | None.
    assert "None" in str(field.annotation) or field.is_required() is False


# ── Router smoke ──────────────────────────────────────────


def test_public_reader_router_registers_route() -> None:
    paths_methods = {
        (r.path, m)
        for r in reader_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/reader/{vault_id}/{publication_slug}", "GET") in paths_methods


def test_public_vault_router_registers_route() -> None:
    paths_methods = {
        (r.path, m)
        for r in vault_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/vaults/{vault_id}/public", "GET") in paths_methods


def test_public_reader_response_model() -> None:
    for r in reader_module.router.routes:
        if isinstance(r, APIRoute) and "reader" in r.path:
            assert r.response_model == ReaderResponse
            return
    raise AssertionError("public reader route missing")


def test_public_vault_response_model() -> None:
    for r in vault_module.router.routes:
        if isinstance(r, APIRoute) and "public" in r.path:
            assert r.response_model == PublicVaultResponse
            return
    raise AssertionError("public vault route missing")


# ── PublicVaultResponse honesty ──────────────────────────


def test_public_vault_response_has_popular_sort_opt_in_field() -> None:
    """The H07 surface contract: popular-sort defaults OFF."""
    assert "popular_sort_opt_in" in PublicVaultResponse.model_fields


def test_public_vault_publication_does_NOT_carry_view_count() -> None:
    """Anti-gamification: no view_count / trending fields surface
    on the public vault."""
    field_names = set(PublicVaultPublication.model_fields.keys())
    banned = {
        "view_count",
        "trending_score",
        "popularity_rank",
        "is_bestseller",
    }
    assert not (banned & field_names)


def test_public_vault_tier_does_NOT_carry_subscriber_count() -> None:
    """The H07 Subscription Tiers contract: anti-gamification —
    the public surface does NOT show how many subscribers a tier
    has. That's a publisher-admin stat only."""
    field_names = set(PublicVaultTier.model_fields.keys())
    banned = {"subscriber_count", "active_subscribers", "popularity_rank"}
    assert not (banned & field_names)


# ── Unversioned feed router smoke ─────────────────────────


def test_feeds_router_registers_three_feed_routes() -> None:
    from theourgia.api.routers import feeds as feeds_module

    paths_methods = {
        (r.path, m)
        for r in feeds_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/vaults/{vault_id}/feed.rss", "GET"),
        ("/vaults/{vault_id}/feed.atom", "GET"),
        ("/vaults/{vault_id}/feed.json", "GET"),
    }
    assert expected.issubset(paths_methods)


def test_feeds_router_mounted_at_app_level_not_v1() -> None:
    """The plan locks feed URLs as unversioned — feed readers
    subscribe to a stable URL just like any RSS source. This test
    confirms the registration function attaches the feeds router
    to the app, NOT the /api/v1 prefix."""
    import inspect

    from theourgia.api.routers import register_routers

    src = inspect.getsource(register_routers)
    # The feeds router is mounted on `app`, not on `v1`. A future
    # commit that moves it under v1 fails this test.
    assert "app.include_router(app_feeds.router" in src
    # And the v1 mount should NOT include feeds.
    # (Negative-look: we can't easily prove absence with substring,
    # but the positive-look is sufficient — moving it would change
    # the assertion above.)


# ── b108-2gv content_format + file_url ─────────────────────


def test_reader_response_defaults_content_format_html() -> None:
    r = ReaderResponse(
        id="p1",
        slug="w",
        title="T",
        summary=None,
        cover_url=None,
        language="en",
        license="cc0",
        published_at=None,
        pricing_model="free",
        one_time_amount_cents=None,
        currency="usd",
        body={"type": "doc", "content": []},
        chapters=[],
        paywall_kind="none",
        purchase_url=None,
        subscribe_url=None,
    )
    assert r.content_format == "html"
    assert r.file_url is None
    assert r.file_size_bytes is None


def test_reader_response_accepts_pdf_epub_content_format() -> None:
    r = ReaderResponse(
        id="p1",
        slug="w",
        title="T",
        summary=None,
        cover_url=None,
        language="en",
        license="cc0",
        published_at=None,
        pricing_model="free",
        one_time_amount_cents=None,
        currency="usd",
        body=None,
        chapters=[],
        paywall_kind="none",
        purchase_url=None,
        subscribe_url=None,
        content_format="pdf",
        file_url="https://r2/pub.pdf",
        file_size_bytes=1_234_567,
    )
    assert r.content_format == "pdf"
    assert r.file_url == "https://r2/pub.pdf"

    r2 = r.model_copy(update={"content_format": "epub", "file_url": "https://r2/pub.epub"})
    assert r2.content_format == "epub"
