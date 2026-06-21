"""Rune engine tests — determinism, symmetric-rune orientation,
Elder Futhark bundle integrity, router payload shape.

Pure-Python tests; DB-integration via deploy path.
"""

from __future__ import annotations

import pytest

from theourgia.core.divination.runes import (
    DrawnRune,
    RuneOrientation,
    RuneSet,
    draw_runes,
    runes_cast,
    shuffle_runes,
)
from theourgia.core.divination.runes.bundles import (
    BUILTIN_RUNE_SETS,
    ELDER_FUTHARK,
    runeset_by_value,
)


# ───── Determinism ───────────────────────────────────────────────────


def test_shuffle_is_a_permutation() -> None:
    indices = shuffle_runes(24, seed="test")
    assert sorted(indices) == list(range(24))
    assert len(indices) == 24


def test_same_seed_yields_same_shuffle() -> None:
    a = shuffle_runes(24, seed="hekate")
    b = shuffle_runes(24, seed="hekate")
    assert a == b


def test_different_seeds_diverge() -> None:
    a = shuffle_runes(24, seed="a")
    b = shuffle_runes(24, seed="b")
    assert a != b


def test_shuffle_rejects_nonpositive_set_size() -> None:
    with pytest.raises(ValueError):
        shuffle_runes(0, seed="x")


def test_runes_cast_matches_draw_runes() -> None:
    a = runes_cast(set_size=24, position_count=3, seed="match")
    b = draw_runes(set_size=24, position_count=3, seed="match")
    assert a == b


def test_draw_returns_correct_count_and_position_indices() -> None:
    drawn = draw_runes(24, position_count=9, seed="x")
    assert len(drawn) == 9
    for i, d in enumerate(drawn):
        assert isinstance(d, DrawnRune)
        assert d.position_index == i


def test_draw_indices_are_unique_within_reading() -> None:
    drawn = draw_runes(24, position_count=9, seed="x")
    rune_indices = [d.rune_index for d in drawn]
    assert len(set(rune_indices)) == len(rune_indices)


def test_draw_rejects_drawing_more_than_set_size() -> None:
    with pytest.raises(ValueError):
        draw_runes(24, position_count=25, seed="x")


def test_draw_rejects_nonpositive_position_count() -> None:
    with pytest.raises(ValueError):
        draw_runes(24, position_count=0, seed="x")


def test_allow_reversals_false_keeps_all_upright() -> None:
    drawn = draw_runes(24, position_count=10, seed="x", allow_reversals=False)
    assert all(d.orientation == RuneOrientation.UPRIGHT for d in drawn)


# ───── Symmetric runes ───────────────────────────────────────────────


def test_symmetric_runes_never_reversed_even_with_reversals_on() -> None:
    """If `reversible_flags[i] = False`, no orientation flip can land
    on rune i."""
    # Build a flag set where only rune 0 is reversible.
    flags = tuple([True] + [False] * 23)
    # Draw enough rounds across many seeds — every time the engine
    # picks any rune other than 0, it must come up upright.
    saw_other_runes = False
    for i in range(50):
        drawn = draw_runes(
            24, position_count=24, seed=f"sym-{i}",
            reversible_flags=flags,
        )
        for d in drawn:
            if d.rune_index != 0:
                saw_other_runes = True
                assert d.orientation == RuneOrientation.UPRIGHT
    assert saw_other_runes, "test didn't exercise non-zero runes"


def test_reversible_flags_length_must_match_set_size() -> None:
    with pytest.raises(ValueError):
        draw_runes(
            24, position_count=3, seed="x", reversible_flags=(True,) * 5,
        )


def test_reversal_probability_with_all_reversible() -> None:
    """With every rune reversible, some draws over many seeds must
    flip."""
    flags = tuple([True] * 24)
    saw_reversed = False
    for i in range(50):
        drawn = draw_runes(
            24, position_count=3, seed=f"flip-{i}", reversible_flags=flags,
        )
        if any(d.orientation == RuneOrientation.REVERSED for d in drawn):
            saw_reversed = True
            break
    assert saw_reversed


# ───── Elder Futhark bundle ──────────────────────────────────────────


def test_elder_futhark_has_24_runes() -> None:
    assert ELDER_FUTHARK.size == 24


def test_elder_futhark_runes_are_indexed_0_to_23() -> None:
    indices = [r.index for r in ELDER_FUTHARK.runes]
    assert indices == list(range(24))


def test_elder_futhark_aetts_split_8_8_8() -> None:
    from collections import Counter

    aetts = Counter(r.aett for r in ELDER_FUTHARK.runes)
    assert aetts[1] == 8
    assert aetts[2] == 8
    assert aetts[3] == 8


def test_elder_futhark_known_runes_present() -> None:
    names = {r.name for r in ELDER_FUTHARK.runes}
    # Aett 1 anchors
    assert "Fehu" in names
    assert "Wunjo" in names
    # Aett 2 anchors
    assert "Hagalaz" in names
    assert "Sowilo" in names
    # Aett 3 anchors
    assert "Tiwaz" in names
    assert "Othala" in names


def test_symmetric_runes_are_canonical_set() -> None:
    """Gebo, Hagalaz, Isa, Jera, Ingwaz, Dagaz are symmetric; the
    other 18 are not."""
    symmetric_names = {r.name for r in ELDER_FUTHARK.runes if r.symmetric}
    assert symmetric_names == {
        "Gebo", "Hagalaz", "Isa", "Jera", "Ingwaz", "Dagaz",
    }


def test_symmetric_runes_have_placeholder_reversed_meaning() -> None:
    """Symmetric runes shouldn't carry a real reversed reading; the
    bundle marks them with the canonical placeholder."""
    for r in ELDER_FUTHARK.runes:
        if r.symmetric:
            assert "no reversed reading" in r.reversed_meaning.lower()


def test_reversible_property_inverts_symmetric() -> None:
    for r in ELDER_FUTHARK.runes:
        assert r.reversible == (not r.symmetric)


def test_reversible_flags_align_with_rune_order() -> None:
    flags = ELDER_FUTHARK.reversible_flags
    assert len(flags) == 24
    for i, flag in enumerate(flags):
        assert flag == ELDER_FUTHARK.runes[i].reversible


def test_every_rune_has_upright_meaning_and_element() -> None:
    for r in ELDER_FUTHARK.runes:
        assert r.upright_meaning, f"{r.name} missing upright_meaning"
        assert r.element, f"{r.name} missing element"
        assert r.glyph, f"{r.name} missing glyph"
        assert r.transliteration, f"{r.name} missing transliteration"


def test_runeset_by_value_lookup() -> None:
    found = runeset_by_value(RuneSet.ELDER_FUTHARK)
    assert found is ELDER_FUTHARK
    found_via_str = runeset_by_value("elder_futhark")
    assert found_via_str is ELDER_FUTHARK


def test_runeset_by_value_unknown_raises() -> None:
    with pytest.raises(KeyError):
        runeset_by_value(RuneSet.YOUNGER_FUTHARK)  # not yet bundled


# ───── Integration with bundle ───────────────────────────────────────


def test_elder_futhark_cast_via_engine() -> None:
    """End-to-end smoke: cast a three-rune spread using the bundle's
    reversible flags. Determinism + counts hold."""
    drawn_a = runes_cast(
        set_size=ELDER_FUTHARK.size,
        position_count=3,
        seed="hekate",
        reversible_flags=ELDER_FUTHARK.reversible_flags,
    )
    drawn_b = runes_cast(
        set_size=ELDER_FUTHARK.size,
        position_count=3,
        seed="hekate",
        reversible_flags=ELDER_FUTHARK.reversible_flags,
    )
    assert drawn_a == drawn_b
    assert len(drawn_a) == 3
    # All position indices are 0..2 in order.
    assert [d.position_index for d in drawn_a] == [0, 1, 2]
    # Every rune index is in 0..23.
    for d in drawn_a:
        assert 0 <= d.rune_index < 24


def test_symmetric_rune_drawn_is_always_upright() -> None:
    """Find a seed where one of the symmetric runes lands first; its
    orientation must be upright."""
    symmetric_indices = {
        r.index for r in ELDER_FUTHARK.runes if r.symmetric
    }
    found = False
    for i in range(200):
        drawn = runes_cast(
            set_size=ELDER_FUTHARK.size,
            position_count=1,
            seed=f"sym-search-{i}",
            reversible_flags=ELDER_FUTHARK.reversible_flags,
        )
        if drawn[0].rune_index in symmetric_indices:
            assert drawn[0].orientation == RuneOrientation.UPRIGHT
            found = True
    assert found, "no symmetric rune drawn first across 200 seeds"


# ───── Router payload class-shape ────────────────────────────────────


def test_cast_request_defaults() -> None:
    from theourgia.api.routers.v1.runes import CastRequest

    payload = CastRequest()
    assert payload.rune_set == "elder_futhark"
    assert payload.spread == "three_rune"
    assert payload.allow_reversals is True
    assert payload.seed is None


def test_reading_update_rating_must_be_one_to_five() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.runes import ReadingUpdate

    ReadingUpdate(retrospective_rating=4)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=0)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=6)


def test_builtin_spreads_have_expected_counts() -> None:
    """The three spreads ship with 1/3/9 positions respectively — the
    canonical rune spread shapes."""
    from theourgia.api.routers.v1.runes import _BUILTIN_SPREADS

    assert len(_BUILTIN_SPREADS["single"]) == 1
    assert len(_BUILTIN_SPREADS["three_rune"]) == 3
    assert len(_BUILTIN_SPREADS["nine_rune_wyrd"]) == 9


def test_at_least_one_runeset_bundled() -> None:
    assert len(BUILTIN_RUNE_SETS) >= 1
