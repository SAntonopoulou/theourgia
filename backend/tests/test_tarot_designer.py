"""Deck + spread designer endpoints — b108-2hc.

Covers the endpoints added so the designer surface can add / edit /
remove cards on an existing deck and edit custom spreads after
creation. The pre-existing bulk create + delete flows are covered
in test_tarot_engine.py.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import tarot as tarot_module
from theourgia.api.routers.v1.tarot import (
    CardCreate,
    CardUpdate,
    SpreadUpdate,
)


# ── Router surface ────────────────────────────────────────────────


def test_new_router_paths_present() -> None:
    paths_methods = {
        (r.path, m)
        for r in tarot_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/tarot/decks/{deck_id}/cards", "POST") in paths_methods
    assert ("/tarot/cards/{card_id}", "PATCH") in paths_methods
    assert ("/tarot/cards/{card_id}", "DELETE") in paths_methods
    assert ("/tarot/spreads/{spread_id}", "GET") in paths_methods
    assert ("/tarot/spreads/{spread_id}", "PATCH") in paths_methods


def test_every_new_route_requires_auth() -> None:
    """Post-b108-2gt sweep: every write endpoint must depend on
    ``get_current_user``."""
    from theourgia.api.deps import get_current_user

    protected_paths = {
        ("/tarot/decks/{deck_id}/cards", "POST"),
        ("/tarot/cards/{card_id}", "PATCH"),
        ("/tarot/cards/{card_id}", "DELETE"),
        ("/tarot/spreads/{spread_id}", "GET"),
        ("/tarot/spreads/{spread_id}", "PATCH"),
    }
    for route in tarot_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        for m in route.methods or set():
            if (route.path, m) in protected_paths:
                deps = route.dependant.dependencies
                calls = [d.call for d in deps]
                sub_names = []
                for d in deps:
                    for sub in d.dependencies:
                        if hasattr(sub.call, "__name__"):
                            sub_names.append(sub.call.__name__)
                assert (
                    get_current_user in calls
                    or "get_current_user" in sub_names
                ), f"{route.path} does not require auth"


# ── Schema validation ────────────────────────────────────────────


def test_card_create_position_must_be_non_negative() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        CardCreate(position=-1, slug="the-fool", name="The Fool")


def test_card_update_all_fields_optional() -> None:
    """A completely empty PATCH is legal — used by the surface to
    save nothing yet still hit the endpoint (idempotent no-op)."""
    u = CardUpdate()
    assert u.model_dump(exclude_unset=True) == {}


def test_card_update_supports_partial_meaning_edit() -> None:
    u = CardUpdate(upright_meaning="Beginnings, faith, folly.")
    data = u.model_dump(exclude_unset=True)
    assert data == {"upright_meaning": "Beginnings, faith, folly."}


def test_spread_update_positions_reject_empty_list() -> None:
    """Positions is min_length=1 — the surface should keep at least
    one position for the spread to be usable."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        SpreadUpdate(positions=[])


def test_spread_update_supports_partial_rename() -> None:
    u = SpreadUpdate(name="Renamed")
    assert u.model_dump(exclude_unset=True) == {"name": "Renamed"}


def test_spread_update_supports_layout_json_only() -> None:
    """Layout-only edits (canvas size, background colour) are common
    when the user just changes visual chrome, not position semantics."""
    u = SpreadUpdate(layout_json={"canvas_width": 640, "canvas_height": 480})
    data = u.model_dump(exclude_unset=True)
    assert data == {
        "layout_json": {"canvas_width": 640, "canvas_height": 480},
    }
