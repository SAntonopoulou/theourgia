"""Comments router tests — b108-2gw."""

from __future__ import annotations

import pytest
from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import comments as comments_module
from theourgia.api.routers.v1.comments import (
    CommentCreate,
    CommentModerate,
    CommentPublicRead,
    CommentModeratorRead,
    router,
)
from theourgia.models.comment import (
    Comment,
    CommentState,
    CommentTargetKind,
)


# ── Schemas ────────────────────────────────────────────────


def test_comment_target_kinds_are_two() -> None:
    assert set(CommentTargetKind) == {
        CommentTargetKind.ENTRY,
        CommentTargetKind.PUBLICATION,
    }


def test_comment_states_are_four() -> None:
    assert set(CommentState) == {
        CommentState.PENDING,
        CommentState.APPROVED,
        CommentState.REJECTED,
        CommentState.SPAM,
    }


def test_comment_create_rejects_empty_body() -> None:
    with pytest.raises(Exception):  # pydantic ValidationError
        CommentCreate(
            target_kind="publication",
            target_id="00000000-0000-0000-0000-000000000000",  # type: ignore[arg-type]
            author_name="Anon",
            body="",
        )


def test_comment_create_accepts_honeypot_as_bot_signal() -> None:
    """The website_ref honeypot is a plain optional field; the router
    checks it, but the schema still accepts it. This test guards
    against a future refactor removing the field silently."""
    payload = CommentCreate(
        target_kind="publication",
        target_id="00000000-0000-0000-0000-000000000000",  # type: ignore[arg-type]
        author_name="Bot",
        body="spam",
        website_ref="http://spam.example.com/link",
    )
    assert payload.website_ref == "http://spam.example.com/link"


def test_comment_moderate_allows_partial_updates() -> None:
    m1 = CommentModerate(state="approved")
    assert m1.state == "approved"
    assert m1.moderator_note is None
    m2 = CommentModerate(moderator_note="rude language")
    assert m2.state is None
    assert m2.moderator_note == "rude language"


def test_public_read_never_exposes_email_or_state() -> None:
    """The public projection is deliberately narrower than the
    moderator projection. Guard against a refactor that widens it."""
    field_names = set(CommentPublicRead.model_fields.keys())
    banned = {"author_email", "state", "moderator_note", "ip_address"}
    assert not (banned & field_names), (
        f"Public projection leaked private fields: {banned & field_names}"
    )


def test_moderator_read_includes_privates() -> None:
    field_names = set(CommentModeratorRead.model_fields.keys())
    for f in ("author_email", "state", "moderator_note", "ip_address"):
        assert f in field_names


# ── Router smoke ──────────────────────────────────────────


def test_router_registers_all_five_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in comments_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/comments", "POST") in paths_methods
    assert (
        "/comments/target/{target_kind}/{target_id}",
        "GET",
    ) in paths_methods
    assert ("/comments/queue", "GET") in paths_methods
    assert ("/comments/{comment_id}", "PATCH") in paths_methods
    assert ("/comments/{comment_id}", "DELETE") in paths_methods


def test_moderation_routes_require_auth() -> None:
    """The three owner routes must be typed with CurrentUser so
    OptionalCookieUser can never sneak in.

    We introspect the dependency names because the deps are wrapped
    by Annotated + Depends and Python's typing doesn't surface them
    directly.
    """
    from theourgia.api.deps import get_current_user

    auth_required_paths = {
        "/comments/queue",
        "/comments/{comment_id}",  # PATCH + DELETE
    }
    seen: set[str] = set()
    for r in comments_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        if r.path in auth_required_paths:
            deps = [d.call for d in r.dependant.dependencies]
            # get_current_user is included exactly once — either directly
            # or through the CurrentUser type-alias unwrap.
            names = {getattr(d, "__name__", "") for d in deps}
            assert "get_current_user" in names, (
                f"{r.path} {r.methods} is missing get_current_user dep"
            )
            seen.add(r.path)
    assert seen == auth_required_paths
