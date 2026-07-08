"""Tea-leaf reading endpoints + symbol dictionary tests — b108-2hj."""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import tea_leaves as tl_module
from theourgia.api.routers.v1.tea_leaves import (
    ObservedSymbol,
    TeaLeafReadingCreate,
    TeaLeafReadingUpdate,
)
from theourgia.core.reference.tea_leaves import (
    TEA_LEAF_SYMBOLS,
    symbol_by_key,
)


# ── Router surface ────────────────────────────────────────────────


def test_router_paths_present() -> None:
    paths_methods = {
        (r.path, m)
        for r in tl_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/reference/tea-leaf-symbols", "GET") in paths_methods
    assert ("/divination/tea-leaves", "GET") in paths_methods
    assert ("/divination/tea-leaves", "POST") in paths_methods
    assert ("/divination/tea-leaves/{reading_id}", "GET") in paths_methods
    assert ("/divination/tea-leaves/{reading_id}", "PATCH") in paths_methods
    assert ("/divination/tea-leaves/{reading_id}", "DELETE") in paths_methods


def test_every_route_requires_auth() -> None:
    from theourgia.api.deps import get_current_user

    for route in tl_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = []
        for d in deps:
            for sub in d.dependencies:
                if hasattr(sub.call, "__name__"):
                    sub_names.append(sub.call.__name__)
        assert (
            get_current_user in calls
            or "get_current_user" in sub_names
        ), f"{route.path} should require auth"


# ── Symbol dictionary ────────────────────────────────────────────


def test_symbols_have_stable_keys() -> None:
    keys = {s.key for s in TEA_LEAF_SYMBOLS}
    assert len(keys) == len(TEA_LEAF_SYMBOLS), "keys must be unique"


def test_symbols_are_slug_case() -> None:
    """Keys should be lowercase alphanumeric with underscores — no
    spaces, no upper case. Front-end can safely embed in URLs / class
    names without escaping."""
    import re

    pattern = re.compile(r"^[a-z0-9_]+$")
    for s in TEA_LEAF_SYMBOLS:
        assert pattern.match(s.key), f"bad key: {s.key!r}"


def test_symbol_by_key_returns_the_symbol() -> None:
    s = symbol_by_key("acorn")
    assert s is not None
    assert s.name == "Acorn"


def test_symbol_by_key_returns_none_for_unknown() -> None:
    assert symbol_by_key("no-such-symbol") is None


def test_symbols_at_least_thirty_shipped() -> None:
    """Tasseography traditions carry a large lexicon. Ship at least
    30 so the plugin is genuinely useful out of the box."""
    assert len(TEA_LEAF_SYMBOLS) >= 30


def test_symbol_position_notes_and_glyph_hint_are_populated() -> None:
    """Regression guard: every symbol carries positional + shape
    guidance — the whole point of the dictionary is to help the
    reader identify what they're seeing."""
    for s in TEA_LEAF_SYMBOLS:
        assert s.position_notes.strip(), f"{s.key} missing position_notes"
        assert s.glyph_hint.strip(), f"{s.key} missing glyph_hint"


# ── Schema validation ────────────────────────────────────────────


def test_observed_symbol_default_position_and_orientation() -> None:
    o = ObservedSymbol(key="star")
    assert o.position == "middle"
    assert o.orientation == "upright"


def test_observed_symbol_rejects_invalid_position() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ObservedSymbol(key="star", position="corner")  # type: ignore[arg-type]


def test_observed_symbol_rejects_invalid_orientation() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        ObservedSymbol(key="star", orientation="sideways")  # type: ignore[arg-type]


def test_reading_create_defaults_to_empty_symbols_list() -> None:
    r = TeaLeafReadingCreate()
    assert r.symbols_observed == []


def test_reading_create_carries_full_payload() -> None:
    r = TeaLeafReadingCreate(
        question="Should I take the trip?",
        tea_variety="Assam loose leaf",
        symbols_observed=[
            ObservedSymbol(key="ship", position="rim"),
            ObservedSymbol(key="anchor", position="bottom"),
        ],
        interpretation="Ship at the rim → journey imminent; anchor at bottom → the destination is stable.",
        intuitive_notes="Anchor felt safe; ship felt like anticipation, not warning.",
    )
    assert len(r.symbols_observed) == 2
    assert r.symbols_observed[0].position == "rim"


def test_reading_update_supports_partial_edit() -> None:
    u = TeaLeafReadingUpdate(interpretation="Revised.")
    data = u.model_dump(exclude_unset=True)
    assert data == {"interpretation": "Revised."}


def test_reading_update_supports_symbols_replacement() -> None:
    u = TeaLeafReadingUpdate(
        symbols_observed=[ObservedSymbol(key="heart")],
    )
    data = u.model_dump(exclude_unset=True)
    assert data["symbols_observed"][0]["key"] == "heart"
