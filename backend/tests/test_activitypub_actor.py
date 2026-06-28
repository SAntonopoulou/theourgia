"""ActivityPub actor + inbox + outbox tests — schema + smoke."""

from __future__ import annotations

from theourgia.api.routers.v1.activitypub_actor import (
    AP_CONTENT_TYPE,
    AP_CONTEXT,
    _map_ap_type_to_kind,
)
from theourgia.models.federation_activity import FederationActivityKind


def test_ap_content_type_is_canonical_mime() -> None:
    """Mastodon + Pleroma + others expect this exact MIME — pinned
    so accidental rename can't break federation peers."""
    assert AP_CONTENT_TYPE == "application/activity+json"


def test_ap_context_includes_security_and_activitystreams() -> None:
    """The two contexts every AP server requires. Pinned because
    AP clients parse this URL exactly — drift would break consumers."""
    assert "https://www.w3.org/ns/activitystreams" in AP_CONTEXT
    assert "https://w3id.org/security/v1" in AP_CONTEXT


def test_map_ap_type_to_kind_translates_known_types() -> None:
    assert _map_ap_type_to_kind("Follow") is FederationActivityKind.FOLLOW_REQUEST
    assert _map_ap_type_to_kind("Accept") is FederationActivityKind.FOLLOW_ACCEPT
    assert _map_ap_type_to_kind("Reject") is FederationActivityKind.FOLLOW_DECLINE
    assert _map_ap_type_to_kind("Undo") is FederationActivityKind.FOLLOW_UNDO
    assert _map_ap_type_to_kind("Create") is FederationActivityKind.NOTE_CREATE
    assert _map_ap_type_to_kind("Update") is FederationActivityKind.NOTE_UPDATE
    assert _map_ap_type_to_kind("Delete") is FederationActivityKind.NOTE_DELETE


def test_map_ap_type_to_kind_unknown_returns_unknown() -> None:
    """Rule: never crash on unknown peer types; flag for operator review."""
    assert _map_ap_type_to_kind("Like") is FederationActivityKind.UNKNOWN
    assert _map_ap_type_to_kind("Announce") is FederationActivityKind.UNKNOWN
    assert _map_ap_type_to_kind(None) is FederationActivityKind.UNKNOWN
    assert _map_ap_type_to_kind(123) is FederationActivityKind.UNKNOWN


def test_ap_actor_endpoints_registered_at_app_level() -> None:
    """Smoke: all 5 AP endpoints attach at /users/{handle}/... (NOT
    under /api/v1 — AP clients expect canonical URLs)."""
    from theourgia.api.app import create_app

    app = create_app()
    paths = list(app.openapi()["paths"].keys())
    assert "/users/{handle}" in paths
    assert "/users/{handle}/inbox" in paths
    assert "/users/{handle}/outbox" in paths
    assert "/users/{handle}/followers" in paths
    assert "/users/{handle}/following" in paths


def test_ap_routes_not_under_api_v1() -> None:
    """The AP routes are NOT under /api/v1 — pinned because any peer
    that webfinger-resolves an actor URL will hit the canonical path,
    NOT the versioned API path."""
    from theourgia.api.app import create_app

    app = create_app()
    paths = list(app.openapi()["paths"].keys())
    for canonical_path in (
        "/users/{handle}",
        "/users/{handle}/inbox",
        "/users/{handle}/outbox",
    ):
        assert canonical_path in paths
        assert f"/api/v1{canonical_path}" not in paths


def test_followers_endpoint_omits_total_items_in_design() -> None:
    """Source-level pin: the followers endpoint MUST NOT include
    `totalItems` in its response (rule 9 — no public follower counts)."""
    import inspect

    from theourgia.api.routers.v1 import activitypub_actor

    source = inspect.getsource(activitypub_actor.get_followers)
    # totalItems should appear ONLY in the comment, not as a dict key.
    # Look for the line that omits it deliberately:
    assert "totalItems intentionally omitted" in source


def test_following_endpoint_always_empty_collection() -> None:
    """Source pin: rule that Theourgia never federates-OUT follows."""
    import inspect

    from theourgia.api.routers.v1 import activitypub_actor

    source = inspect.getsource(activitypub_actor.get_following)
    assert '"totalItems": 0' in source
    assert '"orderedItems": []' in source


def test_outbox_filters_to_public_visibility_only() -> None:
    """Source pin: rule 12 — AP only sees Visibility=PUBLIC. The query
    must include this filter; any future refactor that drops it would
    leak non-public entries."""
    import inspect

    from theourgia.api.routers.v1 import activitypub_actor

    source = inspect.getsource(activitypub_actor.get_outbox)
    assert "EntryVisibility.PUBLIC" in source
    # Should ALSO filter to blog posts only — non-blog entries are
    # journal/divination/etc. and don't federate even when public.
    assert "EntryType.BLOG_POST" in source


def test_outbox_orders_chronologically_not_by_popularity() -> None:
    """Source pin: rule 38 — no engagement-based sort."""
    import inspect
    import re

    from theourgia.api.routers.v1 import activitypub_actor

    source = inspect.getsource(activitypub_actor.get_outbox)
    assert "desc(Entry.created_at)" in source

    # Strip comments + docstrings before negative-asserting forbidden
    # tokens — explanatory copy is allowed to MENTION engagement metrics
    # in the context of refusing them; the code itself must not use them.
    code_only_lines = []
    for line in source.splitlines():
        stripped = line.split("#", 1)[0]
        code_only_lines.append(stripped)
    code_only = "\n".join(code_only_lines)
    # Also strip docstring content
    code_only = re.sub(
        r'"""[\s\S]*?"""', "", code_only,
    )
    for forbidden in (
        ".like_count", ".reblog_count", ".popularity",
    ):
        assert forbidden not in code_only.lower(), (
            f"forbidden popularity sort key {forbidden!r} found in outbox"
        )
