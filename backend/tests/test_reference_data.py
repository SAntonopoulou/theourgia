"""Reference-data tests — b108-2hh.

Covers the Egyptian decan table + Liber 777 correspondences +
their router surface.
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import reference as reference_module
from theourgia.core.reference.correspondences_777 import (
    CORRESPONDENCES_777,
)
from theourgia.core.reference.decans import EGYPTIAN_DECANS


# ── Router surface ────────────────────────────────────────────────


def test_reference_routes_registered() -> None:
    paths_methods = {
        (r.path, m)
        for r in reference_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/reference/egyptian-decans", "GET") in paths_methods
    assert ("/reference/egyptian-decans/{index}", "GET") in paths_methods
    assert ("/reference/correspondences-777", "GET") in paths_methods
    assert (
        "/reference/correspondences-777/{key_scale}",
        "GET",
    ) in paths_methods


def test_reference_routes_require_auth() -> None:
    from theourgia.api.deps import get_current_user

    for route in reference_module.router.routes:
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


# ── Egyptian decans ──────────────────────────────────────────────


def test_egyptian_decans_count() -> None:
    """The Egyptian zodiac has exactly 36 decans — 3 per sign × 12 signs."""
    assert len(EGYPTIAN_DECANS) == 36


def test_egyptian_decans_have_stable_indexes() -> None:
    """Every decan carries its position 0..35; nothing is skipped."""
    indexes = [d.index for d in EGYPTIAN_DECANS]
    assert indexes == list(range(36))


def test_egyptian_decans_three_per_sign() -> None:
    from collections import Counter

    counts = Counter(d.sign for d in EGYPTIAN_DECANS)
    for sign in [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius",
        "Pisces",
    ]:
        assert counts[sign] == 3


def test_egyptian_decans_ruler_is_chaldean() -> None:
    """Chaldean order: Mars-Sol-Venus-Mercury-Luna-Saturn-Jupiter,
    starting at 0° Aries."""
    expected = ("Mars", "Sol", "Venus", "Mercury", "Luna", "Saturn", "Jupiter")
    for d in EGYPTIAN_DECANS:
        assert d.ruler == expected[d.index % 7]


def test_egyptian_decans_extract_pgm_reference() -> None:
    """Chnoumis (decan 3, 0° Cancer) carries the PGM VII.586 note."""
    chnoumis = EGYPTIAN_DECANS[3]
    assert chnoumis.name == "Chnoumis"
    assert chnoumis.pgm_reference == "PGM VII.586"
    # The signification text no longer duplicates the parenthesised ref.
    assert "(PGM" not in chnoumis.signification


# ── 777 correspondences ───────────────────────────────────────────


def test_777_row_count() -> None:
    """10 sephiroth + 22 paths = 32 rows."""
    assert len(CORRESPONDENCES_777) == 32


def test_777_key_scales_are_1_through_32() -> None:
    keys = [r.key_scale for r in CORRESPONDENCES_777]
    assert keys == list(range(1, 33))


def test_777_sephira_count_ten() -> None:
    sephiroth = [r for r in CORRESPONDENCES_777 if r.row_kind == "sephira"]
    assert len(sephiroth) == 10
    # Kether is row 1, Malkuth is row 10.
    assert sephiroth[0].name == "Kether"
    assert sephiroth[-1].name == "Malkuth"


def test_777_path_count_twenty_two() -> None:
    paths = [r for r in CORRESPONDENCES_777 if r.row_kind == "path"]
    assert len(paths) == 22
    # Path 11 (Aleph) is The Fool; path 32 (Tau) is The Universe.
    assert paths[0].hebrew_letter == "Aleph"
    assert paths[0].name == "The Fool"
    assert paths[-1].hebrew_letter == "Tau"


def test_777_sephiroth_carry_no_hebrew_letter() -> None:
    """Hebrew letters are for the paths (Aleph → Tau), not the sephiroth."""
    for r in CORRESPONDENCES_777:
        if r.row_kind == "sephira":
            assert r.hebrew_letter is None
        else:
            assert r.hebrew_letter is not None


def test_777_tiphareth_attribution_is_sol() -> None:
    """Regression guard against attribution drift on the central sephira."""
    tiphareth = next(
        r for r in CORRESPONDENCES_777 if r.name == "Tiphareth"
    )
    assert tiphareth.attribution == "Sol"
    assert tiphareth.archangel == "Raphael"


def test_777_shin_attribution_is_fire_or_spirit() -> None:
    """The Aeon / Judgement path carries Fire (+ Spirit, per Crowley)."""
    shin = next(
        r for r in CORRESPONDENCES_777 if r.hebrew_letter == "Shin"
    )
    assert "Fire" in shin.attribution or "Spirit" in shin.attribution
