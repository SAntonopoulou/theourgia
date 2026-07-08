"""Pilgrimage routes router tests — b108-2gx."""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import pilgrimage_routes as routes_module
from theourgia.api.routers.v1.pilgrimage_routes import (
    ReorderInput,
    RouteCreate,
    RouteRead,
    RouteStopIn,
    RouteUpdate,
)


def test_route_create_default_visibility_is_personal() -> None:
    r = RouteCreate(name="Eleusis")
    assert r.visibility == "personal"
    assert r.stops == []


def test_route_stops_can_seed_at_creation() -> None:
    r = RouteCreate(
        name="Athens Sacred Circuit",
        stops=[
            RouteStopIn(site_id="00000000-0000-0000-0000-000000000001"),  # type: ignore[arg-type]
            RouteStopIn(site_id="00000000-0000-0000-0000-000000000002"),  # type: ignore[arg-type]
        ],
    )
    assert len(r.stops) == 2


def test_route_update_allows_partial() -> None:
    u1 = RouteUpdate(name="renamed")
    assert u1.name == "renamed"
    assert u1.description is None
    assert u1.visibility is None
    u2 = RouteUpdate(visibility="public")
    assert u2.visibility == "public"


def test_reorder_requires_at_least_one_id() -> None:
    """The empty-list case would let a client zero-out the order
    indexes silently; require at least one."""
    import pytest
    with pytest.raises(Exception):
        ReorderInput(stop_ids=[])


def test_route_response_serialisation() -> None:
    """Confirms the RouteRead has the stops field + surface-side
    ordering of common query results."""
    fields = set(RouteRead.model_fields.keys())
    for f in ("id", "name", "description", "visibility", "stops"):
        assert f in fields


# ── Router smoke ──────────────────────────────────────────


def test_router_paths_present() -> None:
    paths_methods = {
        (r.path, m)
        for r in routes_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/pilgrimage-routes", "GET") in paths_methods
    assert ("/pilgrimage-routes", "POST") in paths_methods
    assert ("/pilgrimage-routes/{route_id}", "GET") in paths_methods
    assert ("/pilgrimage-routes/{route_id}", "PATCH") in paths_methods
    assert ("/pilgrimage-routes/{route_id}", "DELETE") in paths_methods
    assert (
        "/pilgrimage-routes/{route_id}/stops",
        "POST",
    ) in paths_methods
    assert (
        "/pilgrimage-routes/{route_id}/stops/{stop_id}",
        "PATCH",
    ) in paths_methods
    assert (
        "/pilgrimage-routes/{route_id}/stops/{stop_id}",
        "DELETE",
    ) in paths_methods
    assert (
        "/pilgrimage-routes/{route_id}/reorder",
        "POST",
    ) in paths_methods


def test_every_route_requires_auth() -> None:
    """Belt + suspenders: verify no route accidentally uses
    OptionalCookieUser after the b108-2gt sweep."""
    for r in routes_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        names = {
            getattr(d.call, "__name__", "") for d in r.dependant.dependencies
        }
        assert "get_current_user" in names, (
            f"{r.path} {r.methods} missing get_current_user"
        )
