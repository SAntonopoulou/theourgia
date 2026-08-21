"""Zodiacal releasing — held to AstroPractise's own ``releasing_test.dart``.

Everything modern practice knows about this technique comes from Valens,
Anthology IV; there is no second witness. The checks below are anchored on
things outside any one reading: the four arithmetic statements the source makes
about its own 211-unit cycle, and the structural rules stated in prose. They are
ported from the canonical engine's test so the Python port is pinned to the same
answers.

⚠ The engine this replaced jumped the *general* period to the opposite sign
whenever it passed a sign longer than 17½ years — so most L1 sequences were
wrong from that point on, and the old tests encoded the same misreading. The
loosing is a SUBperiod rule; the general period never looses.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from theourgia.core.astro.releasing import (
    RELEASING_CYCLE_TOTAL,
    SIGN_PERIODS,
    UNIT_MINUTES,
    contains_loosing,
    first_level,
    high_point,
    is_peak_sign,
    loosing_signs,
    period_at,
    second_level,
    sub_level,
)

_BIRTH = datetime(1990, 1, 1, tzinfo=UTC)

# Sign numbers, 1-indexed, for readability.
ARIES, TAURUS, GEMINI, CANCER, LEO, VIRGO = 1, 2, 3, 4, 5, 6
LIBRA, SCORPIO, SAGITTARIUS, CAPRICORN, AQUARIUS, PISCES = 7, 8, 9, 10, 11, 12


def _years(n: float) -> datetime:
    """A span of ``n`` 360-day years from birth, the unit the technique speaks."""
    return _BIRTH + timedelta(minutes=round(n * UNIT_MINUTES[1]))


# ── the 211 checksum, four ways ──────────────────────────────────────────────


def test_the_twelve_periods_sum_to_211() -> None:
    assert sum(SIGN_PERIODS.values()) == RELEASING_CYCLE_TOTAL
    assert SIGN_PERIODS[CAPRICORN] == 27  # not 30 — the variant fails the checks


def test_a_full_cycle_is_17_years_7_months() -> None:
    assert RELEASING_CYCLE_TOTAL // 12 == 17
    assert RELEASING_CYCLE_TOTAL % 12 == 7


def test_capricorn_at_30_fails_the_month_checksum() -> None:
    wrong = 214
    assert not (wrong // 12 == 17 and wrong % 12 == 7)


def test_every_level_is_one_twelfth_of_the_one_above_in_whole_minutes() -> None:
    assert UNIT_MINUTES[1] == 360 * 24 * 60
    assert UNIT_MINUTES[1] // 12 == UNIT_MINUTES[2]
    assert UNIT_MINUTES[2] // 12 == UNIT_MINUTES[3]
    assert UNIT_MINUTES[3] // 12 == UNIT_MINUTES[4]
    for level in (1, 2, 3):
        assert UNIT_MINUTES[level] % 12 == 0  # nothing rounds anywhere


# ── the general period NEVER looses — the bug this replaced ──────────────────


def test_releasing_from_cancer_goes_to_leo_not_capricorn() -> None:
    periods = first_level(_BIRTH, CANCER, years=60)
    assert periods[0].sign == CANCER
    assert periods[1].sign == LEO  # the L1 sequence steps forward


def test_no_l1_period_is_ever_a_loosing_even_over_400_years() -> None:
    periods = first_level(_BIRTH, GEMINI, years=400)
    assert len(periods) > 12
    assert not any(p.is_loosing_of_the_bond for p in periods)


def test_the_l1_sequence_is_strictly_zodiacal_order_throughout() -> None:
    periods = first_level(_BIRTH, CAPRICORN, years=200)
    for i in range(1, len(periods)):
        assert periods[i].sign == (periods[i - 1].sign % 12) + 1, f"out of order at {i}"


# ── the loosing fires at the subperiod level, where it belongs ───────────────


def test_a_general_period_long_enough_to_hold_a_full_l2_cycle_contains_one() -> None:
    # Cancer is 25 years — 300 months, more than the 211-month cycle.
    assert contains_loosing(CANCER)
    first = first_level(_BIRTH, CANCER, years=30)[0]
    l2 = second_level(first)
    loosings = [p for p in l2 if p.is_loosing_of_the_bond]
    assert len(loosings) == 1
    # ⚠ It jumps to the sign OPPOSITE the sub-sequence's start (Cancer).
    assert loosings[0].sign == CAPRICORN


def test_a_short_general_period_contains_no_loosing() -> None:
    # Taurus is 8 years — 96 months, well short of 211.
    assert not contains_loosing(TAURUS)
    first = first_level(_BIRTH, TAURUS, years=9)[0]
    assert not any(p.is_loosing_of_the_bond for p in second_level(first))


def test_the_six_loosing_signs_fall_out_of_the_arithmetic() -> None:
    signs = loosing_signs()
    assert len(signs) == 6
    assert set(signs) == {GEMINI, CANCER, LEO, VIRGO, CAPRICORN, AQUARIUS}
    for s in signs:
        assert SIGN_PERIODS[s] * 12 > RELEASING_CYCLE_TOTAL


def test_the_first_period_of_a_level_is_never_a_loosing() -> None:
    for s in loosing_signs():
        first = first_level(_BIRTH, s, years=5)[0]
        assert not first.is_loosing_of_the_bond
        assert not second_level(first)[0].is_loosing_of_the_bond


def test_after_the_loosing_the_sequence_completes_back_at_its_start() -> None:
    # Aquarius is 30 years — long enough for its L2 to loose (to Leo) and come
    # all the way round again, returning to Aquarius as the completion period.
    first = first_level(_BIRTH, AQUARIUS, years=31)[0]
    l2 = second_level(first)
    loosing = next(i for i, p in enumerate(l2) if p.is_loosing_of_the_bond)
    assert l2[loosing].sign == LEO  # opposite of Aquarius
    completion = next(p for p in l2 if p.is_completion_period)
    assert completion.sign == AQUARIUS
    assert l2.index(completion) > loosing


# ── sub-periods truncate at the parent, and that is normal ───────────────────


def test_the_last_child_of_a_period_ends_exactly_when_the_parent_does() -> None:
    first = first_level(_BIRTH, ARIES, years=60)[0]
    l2 = second_level(first)
    assert l2[-1].until == first.until
    assert l2[-1].is_truncated


def test_every_level_begins_at_its_parents_sign() -> None:
    first = first_level(_BIRTH, VIRGO, years=60)[0]
    l2 = second_level(first)
    assert l2[0].sign == first.sign
    l3 = sub_level(l2[0])
    assert l3[0].sign == l2[0].sign


def test_no_gaps_and_no_overlaps_at_any_level() -> None:
    first = first_level(_BIRTH, ARIES, years=90)[0]
    l2 = second_level(first)
    cursor = first.start
    for p in l2:
        assert p.start == cursor, "a life has no unallocated time"
        assert p.until > p.start
        cursor = p.until
    assert cursor == first.until


# ── peaks are counted from FORTUNE, not the Ascendant ────────────────────────


def test_the_four_angles_from_fortune_are_peaks() -> None:
    fortune = TAURUS
    for s in (TAURUS, LEO, SCORPIO, AQUARIUS):
        assert is_peak_sign(s, fortune)
    assert not is_peak_sign(GEMINI, fortune)


def test_the_tenth_from_fortune_is_the_high_point() -> None:
    assert high_point(TAURUS) == AQUARIUS


def test_peaks_are_marked_on_the_periods_themselves() -> None:
    periods = first_level(_BIRTH, ARIES, years=90, fortune_sign=TAURUS)
    assert any(p.is_peak for p in periods)
    for p in periods:
        assert p.is_peak == is_peak_sign(p.sign, TAURUS)


# ── finding the period in force ──────────────────────────────────────────────


def test_the_period_in_force_at_a_moment_can_be_found() -> None:
    periods = first_level(_BIRTH, SAGITTARIUS, years=120)
    moment = _years(20.0)
    found = period_at(periods, moment)
    assert found is not None
    assert found.start <= moment < found.until


def test_a_naive_moment_is_refused_rather_than_guessed_at() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        first_level(datetime(1990, 1, 1), ARIES)  # noqa: DTZ001 — the point of the test
