"""I Ching engine tests — determinism, distribution shape, hexagram
lookup, bundle integrity.

Pure-Python tests; DB-integration round-trip is covered by the
deploy path.
"""

from __future__ import annotations

from collections import Counter

import pytest

from theourgia.core.divination.iching import (
    CastMethod,
    CastResult,
    LineKind,
    cast_three_coins,
    cast_yarrow_stalks,
    hexagram_for_lines,
    iching_cast,
    lines_for_hexagram,
)
from theourgia.core.divination.iching.bundles import (
    BUILTIN_HEXAGRAMS,
    TRIGRAM_PATTERNS,
    BuiltinHexagram,
    hexagram_by_number,
    trigram_for_lines,
)
from theourgia.models.iching import Trigram


# ───── Line kind invariants ──────────────────────────────────────────


def test_line_kind_polarity_classification() -> None:
    assert LineKind.YOUNG_YANG.is_yang is True
    assert LineKind.OLD_YANG.is_yang is True
    assert LineKind.YOUNG_YIN.is_yang is False
    assert LineKind.OLD_YIN.is_yang is False


def test_only_old_lines_are_changing() -> None:
    assert LineKind.OLD_YIN.is_changing is True
    assert LineKind.OLD_YANG.is_changing is True
    assert LineKind.YOUNG_YIN.is_changing is False
    assert LineKind.YOUNG_YANG.is_changing is False


def test_line_value_numbers_match_tradition() -> None:
    assert LineKind.OLD_YIN.value_number == 6
    assert LineKind.YOUNG_YANG.value_number == 7
    assert LineKind.YOUNG_YIN.value_number == 8
    assert LineKind.OLD_YANG.value_number == 9


# ───── Determinism ───────────────────────────────────────────────────


def test_three_coins_is_deterministic_for_same_seed() -> None:
    a = cast_three_coins("test-seed")
    b = cast_three_coins("test-seed")
    assert a == b
    assert len(a) == 6


def test_yarrow_is_deterministic_for_same_seed() -> None:
    a = cast_yarrow_stalks("test-seed")
    b = cast_yarrow_stalks("test-seed")
    assert a == b
    assert len(a) == 6


def test_different_seeds_yield_different_casts() -> None:
    # Vanishingly small collision probability over 6 lines each with 4
    # outcomes (4^6 = 4096 possible casts).
    a = cast_three_coins("seed-a")
    b = cast_three_coins("seed-b")
    assert a != b


def test_iching_cast_method_dispatches_correctly() -> None:
    a = iching_cast(seed="x", method=CastMethod.THREE_COINS)
    b = iching_cast(seed="x", method="three_coins")
    c = iching_cast(seed="x", method=CastMethod.YARROW_STALKS)
    assert a == b
    # Same seed but different distribution → different lines expected
    # in practice; not strictly guaranteed but a regression check.
    assert a != c


# ───── Distribution shape ────────────────────────────────────────────


def _draw_many(cast_fn, n: int) -> Counter[LineKind]:
    counter: Counter[LineKind] = Counter()
    for i in range(n):
        for line in cast_fn(f"sample-{i}"):
            counter[line] += 1
    return counter


def test_three_coin_distribution_shape() -> None:
    """Over many seeds the empirical distribution matches the canonical
    (6: 1/8, 7: 3/8, 8: 3/8, 9: 1/8). Wide tolerance to keep the test
    stable while still failing on real drift."""
    counts = _draw_many(cast_three_coins, 1000)
    total = sum(counts.values())
    p_6 = counts[LineKind.OLD_YIN] / total
    p_7 = counts[LineKind.YOUNG_YANG] / total
    p_8 = counts[LineKind.YOUNG_YIN] / total
    p_9 = counts[LineKind.OLD_YANG] / total
    assert 0.10 <= p_6 <= 0.16, f"P(6) = {p_6}; expected ~1/8"
    assert 0.32 <= p_7 <= 0.43, f"P(7) = {p_7}; expected ~3/8"
    assert 0.32 <= p_8 <= 0.43, f"P(8) = {p_8}; expected ~3/8"
    assert 0.10 <= p_9 <= 0.16, f"P(9) = {p_9}; expected ~1/8"


def test_yarrow_distribution_shape() -> None:
    """Yarrow distribution: (6: 1/16, 7: 5/16, 8: 7/16, 9: 3/16).
    Static yin most common; the two changing lines together
    less common than under coins."""
    counts = _draw_many(cast_yarrow_stalks, 1000)
    total = sum(counts.values())
    p_6 = counts[LineKind.OLD_YIN] / total
    p_7 = counts[LineKind.YOUNG_YANG] / total
    p_8 = counts[LineKind.YOUNG_YIN] / total
    p_9 = counts[LineKind.OLD_YANG] / total
    assert 0.04 <= p_6 <= 0.10, f"P(6) = {p_6}; expected ~1/16"
    assert 0.27 <= p_7 <= 0.36, f"P(7) = {p_7}; expected ~5/16"
    assert 0.39 <= p_8 <= 0.48, f"P(8) = {p_8}; expected ~7/16"
    assert 0.15 <= p_9 <= 0.22, f"P(9) = {p_9}; expected ~3/16"
    # Static yin is strictly more common than static yang under yarrow.
    assert p_8 > p_7


# ───── King Wen lookup ──────────────────────────────────────────────


def test_hexagram_1_is_all_yang() -> None:
    assert lines_for_hexagram(1) == (True, True, True, True, True, True)
    assert hexagram_for_lines((True,) * 6) == 1


def test_hexagram_2_is_all_yin() -> None:
    assert lines_for_hexagram(2) == (False, False, False, False, False, False)
    assert hexagram_for_lines((False,) * 6) == 2


def test_hexagram_11_peace_is_heaven_below_earth() -> None:
    """Tài — earth above (000), heaven below (111). Bottom-up: 111 000."""
    expected = (True, True, True, False, False, False)
    assert lines_for_hexagram(11) == expected
    assert hexagram_for_lines(expected) == 11


def test_hexagram_63_after_completion_alternates_yang_yin() -> None:
    """Jì Jì — water above fire. Bottom-up: 101010."""
    expected = (True, False, True, False, True, False)
    assert lines_for_hexagram(63) == expected
    assert hexagram_for_lines(expected) == 63


def test_hexagram_64_before_completion_alternates_yin_yang() -> None:
    """Wèi Jì — fire above water. Bottom-up: 010101."""
    expected = (False, True, False, True, False, True)
    assert lines_for_hexagram(64) == expected
    assert hexagram_for_lines(expected) == 64


def test_hexagram_lookup_round_trip_for_all_64() -> None:
    """Every hexagram number maps back to its own number through the
    bool-tuple representation."""
    seen_patterns: set[tuple[bool, ...]] = set()
    for n in range(1, 65):
        lines = lines_for_hexagram(n)
        seen_patterns.add(lines)
        assert hexagram_for_lines(lines) == n
    assert len(seen_patterns) == 64  # all unique


def test_hexagram_lookup_accepts_line_kinds() -> None:
    """Six LineKinds are accepted directly, interpreted by current polarity."""
    lines = (
        LineKind.YOUNG_YANG, LineKind.YOUNG_YANG, LineKind.YOUNG_YANG,
        LineKind.YOUNG_YANG, LineKind.YOUNG_YANG, LineKind.YOUNG_YANG,
    )
    assert hexagram_for_lines(lines) == 1


def test_hexagram_lookup_uses_old_lines_pre_change() -> None:
    """An old_yin line is treated as yin for the *primary* hexagram
    lookup — the transformation hexagram is computed separately."""
    lines = (LineKind.OLD_YIN,) * 6
    assert hexagram_for_lines(lines) == 2  # all yin = Kūn


def test_lines_for_hexagram_rejects_out_of_range() -> None:
    with pytest.raises(ValueError):
        lines_for_hexagram(0)
    with pytest.raises(ValueError):
        lines_for_hexagram(65)


def test_hexagram_for_lines_rejects_wrong_length() -> None:
    with pytest.raises(ValueError):
        hexagram_for_lines((True, True, True))


# ───── Transformation hexagram ────────────────────────────────────────


def test_no_changing_lines_means_no_transformation() -> None:
    """A cast of all young lines has no transformation hexagram."""
    # Use a seed we know produces all-static under coins. Empirically
    # check; if no such seed found, the assertion below covers it.
    found = False
    for i in range(200):
        result = iching_cast(seed=f"static-search-{i}")
        if not result.changing_lines:
            found = True
            assert result.transformation_hexagram is None
            assert result.changing_lines == ()
            break
    assert found, "no all-static seed found in 200 tries — possible RNG bug"


def test_changing_lines_produce_transformation() -> None:
    """A cast with at least one changing line has a non-None
    transformation hexagram + non-empty changing_lines tuple."""
    found = False
    for i in range(20):
        result = iching_cast(seed=f"changing-search-{i}")
        if result.changing_lines:
            found = True
            assert result.transformation_hexagram is not None
            assert 1 <= result.transformation_hexagram <= 64
            # The transformation hexagram differs from the primary
            # unless the changing line(s) happened to flip back to
            # the same pattern (impossible).
            assert result.transformation_hexagram != result.primary_hexagram
            break
    assert found


def test_transformation_flips_only_changing_lines() -> None:
    """Hand-build a cast with one changing line; verify the transform
    flips only that position."""
    from theourgia.core.divination.iching.engine import (
        _BINARY_TO_NUMBER,
        _bool_lines_after_change,
    )

    # All yang except line 1 = old_yin (changes to yang).
    lines = (
        LineKind.OLD_YIN,
        LineKind.YOUNG_YANG,
        LineKind.YOUNG_YANG,
        LineKind.YOUNG_YANG,
        LineKind.YOUNG_YANG,
        LineKind.YOUNG_YANG,
    )
    pre = tuple(line.is_yang for line in lines)
    post = _bool_lines_after_change(lines)
    # Primary: 011111 bottom-up (line 1 = yin)
    assert pre == (False, True, True, True, True, True)
    # Transformation: 111111 → hexagram 1
    assert post == (True, True, True, True, True, True)
    pattern_after = "".join("1" if y else "0" for y in post)
    assert _BINARY_TO_NUMBER[pattern_after] == 1


# ───── Cast result invariants ────────────────────────────────────────


def test_cast_result_carries_method() -> None:
    a = iching_cast(seed="x", method="three_coins")
    b = iching_cast(seed="x", method="yarrow_stalks")
    assert a.method == CastMethod.THREE_COINS
    assert b.method == CastMethod.YARROW_STALKS


def test_changing_line_indices_are_one_based_bottom_up() -> None:
    found_examples = 0
    for i in range(100):
        result = iching_cast(seed=f"idx-{i}")
        for idx in result.changing_lines:
            assert 1 <= idx <= 6
            # The corresponding line must be a changing kind.
            assert result.lines[idx - 1].is_changing
        if result.changing_lines:
            found_examples += 1
        if found_examples >= 5:
            break
    assert found_examples >= 5


def test_changing_line_indices_are_sorted_ascending() -> None:
    for i in range(50):
        result = iching_cast(seed=f"sorted-{i}")
        assert list(result.changing_lines) == sorted(result.changing_lines)


# ───── Bundle integrity ──────────────────────────────────────────────


def test_64_hexagrams_bundled() -> None:
    assert len(BUILTIN_HEXAGRAMS) == 64


def test_bundle_numbers_are_1_through_64() -> None:
    numbers = [h.number for h in BUILTIN_HEXAGRAMS]
    assert numbers == list(range(1, 65))


def test_bundle_names_pinyin_are_unique() -> None:
    names = [h.name_pinyin for h in BUILTIN_HEXAGRAMS]
    # Hexagram 10 (Lǚ — Treading) and Hexagram 56 (Lǚ — Wanderer)
    # share romanization despite different tones / characters. Bundle
    # carries both — accept the collision and ensure English names
    # distinguish them.
    assert len(set(names)) >= 63
    english = [h.name_english for h in BUILTIN_HEXAGRAMS]
    assert len(set(english)) == 64


def test_bundle_binary_patterns_match_engine() -> None:
    for h in BUILTIN_HEXAGRAMS:
        assert lines_for_hexagram(h.number) == h.lines


def test_every_hexagram_has_judgment_summary() -> None:
    for h in BUILTIN_HEXAGRAMS:
        assert h.judgment_summary, f"hexagram {h.number} missing judgment_summary"


def test_every_hexagram_resolves_to_a_trigram_pair() -> None:
    """Lower + upper trigrams must each be one of the eight bagua."""
    for h in BUILTIN_HEXAGRAMS:
        assert isinstance(h.lower_trigram, Trigram)
        assert isinstance(h.upper_trigram, Trigram)


def test_trigram_patterns_are_all_8() -> None:
    """The bagua: eight 3-line patterns, one per Trigram value."""
    assert len(TRIGRAM_PATTERNS) == 8
    patterns = list(TRIGRAM_PATTERNS.values())
    assert len(set(patterns)) == 8  # all unique


def test_trigram_lookup_round_trip() -> None:
    for trigram, pattern in TRIGRAM_PATTERNS.items():
        assert trigram_for_lines(pattern) == trigram


def test_hexagram_by_number_lookup() -> None:
    assert hexagram_by_number(1).name_pinyin == "Qián"
    assert hexagram_by_number(64).name_english.startswith("Before Completion")


def test_hexagram_by_number_unknown_raises() -> None:
    with pytest.raises(KeyError):
        hexagram_by_number(0)
    with pytest.raises(KeyError):
        hexagram_by_number(65)


# ───── Router payload class-shape ────────────────────────────────────


def test_cast_request_defaults_to_three_coins() -> None:
    from theourgia.api.routers.v1.iching import CastRequest

    payload = CastRequest()
    assert payload.method == "three_coins"
    assert payload.seed is None
    assert payload.question is None


def test_reading_update_rating_must_be_one_to_five() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.iching import ReadingUpdate

    ReadingUpdate(retrospective_rating=3)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=0)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=6)
