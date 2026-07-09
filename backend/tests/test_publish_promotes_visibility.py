"""Publish + blog visibility promotion tests — b108-2ht.

Closes the "I published a post but it's not on the blog" bug.
Sophia hit this in production: she clicked Publish on an entry,
the Editor showed "Published", but the entry never appeared on
the public /blog surface because:

1. Publish only set ``published_at``; it never touched ``visibility``,
   which remained ``personal``
2. The blog query filtered to ``type == BLOG_POST`` but the Editor
   creates entries as ``type=observation`` and has no type-picker UI

This test file guards the fixes at the source-code level so a
future refactor cannot silently drop them.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import blog as blog_module
from theourgia.api.routers.v1 import entries as entries_module


# ── Publish promotes visibility ───────────────────────────────────


def test_publish_source_promotes_visibility_to_public() -> None:
    """Regression guard: publish must set visibility=PUBLIC in
    addition to published_at. Without this, the entry never
    appears on the /blog surface."""
    from inspect import getsource

    src = getsource(entries_module.publish_entry)
    assert "row.visibility != EntryVisibility.PUBLIC" in src
    assert "EntryVisibility.PUBLIC" in src


def test_publish_source_still_idempotent_on_timestamp() -> None:
    """Regression guard: idempotency preserved through the b108-2ht
    change — repeated Publish clicks keep the original timestamp."""
    from inspect import getsource

    src = getsource(entries_module.publish_entry)
    assert "row.published_at is None" in src


def test_publish_source_still_refuses_sealed() -> None:
    """The b108-2hm sealed guard must survive the b108-2ht change."""
    from inspect import getsource

    src = getsource(entries_module.publish_entry)
    assert "encryption_mode == EncryptionMode.SEALED" in src


# ── Blog query no longer filters by type ──────────────────────────


def test_blog_query_no_longer_requires_blog_post_type() -> None:
    """b108-2ht: removed the ``EntryType.BLOG_POST`` filter. Any
    visibility=public non-encrypted entry now surfaces on the blog.
    Regression guard so a future refactor doesn't reintroduce the
    over-restrictive filter that caused Sophia's post to vanish."""
    from inspect import getsource

    src = getsource(blog_module._fetch_published_posts)
    # These three filters MUST remain
    assert "Entry.deleted_at.is_(None)" in src
    assert "Entry.visibility == EntryVisibility.PUBLIC" in src
    assert "Entry.encryption_mode == EncryptionMode.NONE" in src
    # This filter MUST NOT be reintroduced
    assert "EntryType.BLOG_POST" not in src


# ── Blog detail endpoint ──────────────────────────────────────────


def test_blog_detail_route_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in blog_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/blog/posts/{post_id}", "GET") in paths_methods


def test_blog_detail_endpoint_applies_public_filter() -> None:
    """Regression guard: the single-post endpoint MUST apply the
    same public-visibility + non-encrypted filter as the list.
    Without it, /blog/posts/{id} would leak private entries."""
    from inspect import getsource

    src = getsource(blog_module.get_blog_post)
    assert "Entry.visibility == EntryVisibility.PUBLIC" in src
    assert "Entry.encryption_mode == EncryptionMode.NONE" in src
    assert "Entry.deleted_at.is_(None)" in src


def test_blog_detail_endpoint_returns_404_on_missing() -> None:
    """404, not 403 — don't disclose the existence of a private entry
    to an anonymous caller."""
    from inspect import getsource

    src = getsource(blog_module.get_blog_post)
    assert "HTTP_404_NOT_FOUND" in src


def test_blog_detail_endpoint_does_not_require_auth() -> None:
    """The blog is public; the detail endpoint MUST be reachable
    without a session cookie."""
    from theourgia.api.deps import get_current_user

    for route in blog_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path != "/blog/posts/{post_id}":
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = []
        for d in deps:
            for sub in d.dependencies:
                if hasattr(sub.call, "__name__"):
                    sub_names.append(sub.call.__name__)
        assert get_current_user not in calls
        assert "get_current_user" not in sub_names
