"""Four-station daily rite (Liber Resh) tests."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from theourgia.core.resh import (
    DEFAULT_MINIMUM_VIABLE_STATION,
    DEFAULT_PRESET,
    PRESETS,
    AdorationLog,
    Transition,
    adoration_for_transition,
    compute_transitions,
    station_for_transition,
    stations_for_preset,
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


# ───── Presets ──────────────────────────────────────────────────────────


def test_default_preset_is_hellenic() -> None:
    assert DEFAULT_PRESET == "hellenic"
    assert set(PRESETS) == {"hellenic", "thelemic"}


def test_hellenic_preset_stations() -> None:
    """The operator's set: Hekate Phosphoros / Apollo / Hekate Enodia
    Kleidouchos / Persephone."""
    stations = stations_for_preset("hellenic")
    assert stations[Transition.SUNRISE].godform == "Hekate Phosphoros — the Return"
    assert stations[Transition.NOON].godform == "Apollo — the Good / the Augoeides"
    assert stations[Transition.SUNSET].godform == "Hekate Enodia, Kleidouchos — the Descent"
    assert stations[Transition.MIDNIGHT].godform == "Persephone — the Journey"


def test_thelemic_preset_matches_canonical_adorations() -> None:
    stations = stations_for_preset("thelemic")
    for t in Transition:
        assert stations[t] == adoration_for_transition(t)


def test_every_preset_covers_all_four_transitions() -> None:
    for preset, stations in PRESETS.items():
        assert set(stations) == set(Transition), preset
        for t, station in stations.items():
            assert station.transition is t
            assert station.godform
            assert station.direction
            assert station.short_invocation


def test_station_for_transition_defaults_to_hellenic() -> None:
    a = station_for_transition(Transition.SUNSET)
    assert "Enodia" in a.godform


def test_stations_for_preset_rejects_unknown() -> None:
    with pytest.raises(KeyError):
        stations_for_preset("golden-dawn")


# ───── Streak (minimum-viable-station rule) ─────────────────────────────


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


def test_default_minimum_viable_station_is_dusk() -> None:
    assert DEFAULT_MINIMUM_VIABLE_STATION is Transition.SUNSET


def test_streak_counts_day_with_only_the_anchor_station() -> None:
    """The minimum-viable-station rule: dusk alone keeps the day."""
    log = _log(date(2026, 6, 21), [Transition.SUNSET])
    assert streak_at_date(log, date(2026, 6, 21)) == 1


def test_streak_breaks_when_anchor_station_missing() -> None:
    """Three of four observed — but not dusk — breaks the streak."""
    log: list[AdorationLog] = []
    log.extend(_log(date(2026, 6, 20), list(Transition)))  # complete
    log.extend(_log(
        date(2026, 6, 21),
        [Transition.SUNRISE, Transition.NOON, Transition.MIDNIGHT],
    ))
    assert streak_at_date(log, date(2026, 6, 21)) == 0


def test_streak_other_stations_carry_no_penalty() -> None:
    """Dusk-only days and full days chain equally."""
    log: list[AdorationLog] = []
    log.extend(_log(date(2026, 6, 19), list(Transition)))  # full day
    log.extend(_log(date(2026, 6, 20), [Transition.SUNSET]))  # dusk only
    log.extend(_log(date(2026, 6, 21), [Transition.SUNSET, Transition.NOON]))
    assert streak_at_date(log, date(2026, 6, 21)) == 3


def test_streak_with_custom_anchor_station() -> None:
    """The anchor is configurable — e.g. midnight-keepers."""
    log: list[AdorationLog] = []
    log.extend(_log(date(2026, 6, 20), [Transition.MIDNIGHT]))
    log.extend(_log(date(2026, 6, 21), [Transition.MIDNIGHT]))
    assert streak_at_date(
        log, date(2026, 6, 21),
        minimum_viable_station=Transition.MIDNIGHT,
    ) == 2
    # Under the dusk default the same log scores zero.
    assert streak_at_date(log, date(2026, 6, 21)) == 0


def test_streak_allows_polar_fallback_noon_and_midnight() -> None:
    """When neither horizon transition exists (polar day/night), noon +
    midnight is enough to maintain a horizon-anchored streak.
    """
    log = _log(date(2026, 6, 21), [Transition.NOON, Transition.MIDNIGHT])
    assert streak_at_date(log, date(2026, 6, 21)) == 1


def test_polar_fallback_not_applied_for_meridian_anchor() -> None:
    """A noon anchor gets no fallback — noon either happened or not."""
    log = _log(date(2026, 6, 21), [Transition.MIDNIGHT])
    assert streak_at_date(
        log, date(2026, 6, 21),
        minimum_viable_station=Transition.NOON,
    ) == 0
