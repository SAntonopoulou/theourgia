"""Liber Resh tests."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from theourgia.core.resh import (
    AdorationLog,
    Transition,
    adoration_for_transition,
    compute_transitions,
    streak_at_date,
)


ATHENS_LAT = 37.9838
ATHENS_LON = 23.7275


# ───── Transitions ──────────────────────────────────────────────────────


def test_four_transitions_at_athens() -> None:
    """Athens at the summer solstice has all four transitions defined."""
    d = date(2026, 6, 21)
    t = compute_transitions(d, ATHENS_LAT, ATHENS_LON)
    assert t.sunrise is not None
    assert t.sunset is not None
    assert t.noon > t.sunrise
    assert t.sunset > t.noon


def test_transitions_pairs_chronological() -> None:
    d = date(2026, 6, 21)
    t = compute_transitions(d, ATHENS_LAT, ATHENS_LON)
    pairs = t.as_pairs()
    for prev, cur in zip(pairs, pairs[1:], strict=False):
        assert prev[1] <= cur[1]


# ───── Adorations ───────────────────────────────────────────────────────


def test_canonical_adorations_have_godform() -> None:
    for transition in Transition:
        adoration = adoration_for_transition(transition)
        assert adoration.godform
        assert adoration.direction


def test_sunrise_adoration_is_ra_hoor_khuit() -> None:
    a = adoration_for_transition(Transition.SUNRISE)
    assert "Ra Hoor Khuit" in a.godform
    assert a.direction == "East"


def test_midnight_adoration_is_khephra() -> None:
    a = adoration_for_transition(Transition.MIDNIGHT)
    assert a.godform == "Khephra"
    assert a.direction == "Below"


# ───── Streak ───────────────────────────────────────────────────────────


def _log(
    civil_date: date, transitions: list[Transition], note: str = "",
) -> list[AdorationLog]:
    return [
        AdorationLog(
            civil_date=civil_date,
            transition=t,
            observed_at=datetime.combine(civil_date, datetime.min.time(), tzinfo=UTC),
            note=note,
        )
        for t in transitions
    ]


def test_streak_zero_with_no_log() -> None:
    assert streak_at_date([], date(2026, 6, 21)) == 0


def test_streak_one_for_a_single_complete_day() -> None:
    log = _log(date(2026, 6, 21), list(Transition))
    assert streak_at_date(log, date(2026, 6, 21)) == 1


def test_streak_accumulates_consecutive_days() -> None:
    log: list[AdorationLog] = []
    for offset in range(5):
        log.extend(_log(date(2026, 6, 21) - timedelta(days=offset), list(Transition)))
    assert streak_at_date(log, date(2026, 6, 21)) == 5


def test_streak_resets_on_partial_day() -> None:
    """A day with only 2 of 4 adorations breaks the streak."""
    log: list[AdorationLog] = []
    log.extend(_log(date(2026, 6, 20), list(Transition)))  # complete
    log.extend(_log(date(2026, 6, 21), [Transition.NOON, Transition.SUNSET]))  # partial
    assert streak_at_date(log, date(2026, 6, 21)) == 0


def test_streak_allows_polar_fallback_noon_and_midnight() -> None:
    """When sunrise/sunset are skipped (polar fallback), noon + midnight
    is enough to maintain the streak.
    """
    log = _log(date(2026, 6, 21), [Transition.NOON, Transition.MIDNIGHT])
    assert streak_at_date(log, date(2026, 6, 21)) == 1
