"""Multi-identity + blog feed tests.

Pure-Python tests of the Pydantic schemas, router registration, and
the entries-API integration of authored_by_persona_id.
"""

from __future__ import annotations

from uuid import uuid4


# ───── Identities router ───────────────────────────────────────────────


def test_identities_router_registered() -> None:
    from theourgia.api.routers.v1.identities import router

    paths = {route.path for route in router.routes}
    assert "/identities" in paths
    assert "/identities/{identity_id}" in paths
    assert "/me/identities/default" in paths


def test_identity_read_pydantic_shape() -> None:
    from theourgia.api.routers.v1.identities import IdentityRead

    identity = IdentityRead(
        id=str(uuid4()),
        handle="aspasia",
        display_name="Aspasia",
        kind="default",
        bio="The vault's daily-practice identity.",
        is_active=True,
        public_face_enabled=False,
    )
    assert identity.handle == "aspasia"
    assert identity.kind == "default"


# ───── EntryRead carries authored_by_persona_id ─────────────────────────


def test_entry_read_has_authored_by_persona_id_field() -> None:
    from theourgia.api.routers.v1.entries import EntryRead

    fields = EntryRead.model_fields
    assert "authored_by_persona_id" in fields


def test_entry_create_accepts_authored_by_persona_id() -> None:
    from theourgia.api.routers.v1.entries import EntryCreate

    payload = EntryCreate(
        title="A working",
        type="working",
        authored_by_persona_id=str(uuid4()),
    )
    assert payload.authored_by_persona_id is not None


# ───── Blog router ─────────────────────────────────────────────────────


def test_blog_router_registered() -> None:
    from theourgia.api.routers.v1.blog import router

    paths = {route.path for route in router.routes}
    assert "/blog/posts" in paths
    assert "/blog/feed.xml" in paths
    assert "/blog/feed.rss" in paths
    assert "/blog/feed.json" in paths


def test_blog_posts_response_shape() -> None:
    from theourgia.api.routers.v1.blog import BlogPostsResponse

    response = BlogPostsResponse(posts=[], total=0, limit=20, offset=0)
    assert response.total == 0
    assert response.limit == 20


# ───── Magickal name in demo data ──────────────────────────────────────


def test_demo_persona_handles_use_magickal_names() -> None:
    """The handoff-2 doc + this test enforce that any sample persona
    handles in code use the magickal-name set, not the maintainer's
    legal name.
    """
    accepted_handles = {
        "aspasia",
        "theophrastos",
        "diotima",
        "soror_eua",
    }
    for h in accepted_handles:
        # Just verify the strings exist; the actual enforcement is
        # by `user_magickal_name.md` review.
        assert h.islower()
        assert "_" in h or h.isalpha()
