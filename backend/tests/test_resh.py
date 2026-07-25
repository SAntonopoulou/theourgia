"""Four-station daily rite (Liber Resh) tests."""

from __future__ import annotations

import json
import unicodedata
from datetime import UTC, date, datetime, timedelta
from importlib import resources

import pytest

from theourgia.core.resh import (
    DEFAULT_MINIMUM_VIABLE_STATION,
    DEFAULT_MODE,
    DEFAULT_PRESET,
    PRESETS,
    AdorationLog,
    Transition,
    adoration_for_transition,
    compute_transitions,
    invocation_for_mode,
    invocation_forms,
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


# ───── Liturgy forms (home / xenos) ─────────────────────────────────────


_STATION_KEYS = {
    Transition.SUNRISE: "dawn",
    Transition.NOON: "noon",
    Transition.SUNSET: "dusk",
    Transition.MIDNIGHT: "night",
}


def _shipped_liturgy() -> dict:
    raw = (
        resources.files("theourgia")
        .joinpath("data/hellenic_rite_liturgy.json")
        .read_text(encoding="utf-8")
    )
    return json.loads(raw)


def test_shipped_liturgy_carries_meta_and_caveats() -> None:
    """The data file is source-of-truth shipped data — provenance rides
    along (meta: source paths, mode definitions, caveats)."""
    data = _shipped_liturgy()
    assert "meta" in data
    assert data["meta"]["caveats"], "caveats must ship with the liturgy"
    assert set(data["meta"]["mode_definitions"]) == {"HOME", "XENOS"}
    assert set(data["stations"]) == {"dawn", "noon", "dusk", "night"}


def test_default_mode_is_home() -> None:
    assert DEFAULT_MODE == "home"


def test_hellenic_stations_carry_both_mode_forms() -> None:
    """Every hellenic station has distinct home and xenos forms."""
    for station in stations_for_preset("hellenic").values():
        forms = station.invocation_forms()
        assert set(forms) == {"home", "xenos"}
        assert forms["home"] != forms["xenos"]
        assert forms["home"].startswith("Χαῖρε")
        assert forms["xenos"].startswith("Χαῖρε")


def test_thelemic_single_form_stays_legal() -> None:
    """Backward compatibility: a plain-string invocation serves every
    mode unchanged."""
    for station in stations_for_preset("thelemic").values():
        assert isinstance(station.short_invocation, str)
        forms = station.invocation_forms()
        assert forms["home"] == forms["xenos"] == station.short_invocation
        assert station.invocation_for("xenos") == station.short_invocation


def test_invocation_for_mode_normalizes_at_read() -> None:
    # Plain string: legal, mode-independent.
    assert invocation_for_mode("one line", "xenos") == "one line"
    # Mapping: resolved per mode.
    both = {"home": "at the altar", "xenos": "whispered abroad"}
    assert invocation_for_mode(both, "home") == "at the altar"
    assert invocation_for_mode(both, "xenos") == "whispered abroad"
    # Unknown / missing mode falls back to home.
    assert invocation_for_mode(both, "travelling") == "at the altar"
    assert invocation_for_mode({"home": "only home"}, "xenos") == "only home"
    assert invocation_forms({"home": "h"}) == {"home": "h", "xenos": "h"}


def test_hellenic_invocations_match_shipped_liturgy_byte_exact() -> None:
    """All four stations, both modes: exactly the operator's lines,
    codepoint for codepoint."""
    data = _shipped_liturgy()
    stations = stations_for_preset("hellenic")
    for transition, key in _STATION_KEYS.items():
        forms = stations[transition].invocation_forms()
        for mode in ("home", "xenos"):
            expected = data["stations"][key][mode]["invocation"]
            served = forms[mode]
            assert [ord(c) for c in served] == [ord(c) for c in expected], (
                f"{key}/{mode} drifted from the shipped liturgy"
            )


def test_dusk_home_line_byte_exact_with_ancient_anchors() -> None:
    """The dusk HOME line survives round-trip byte-exact: the ancient
    anchor ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ and the polytonic Χαῖρε opening,
    with no NFC/NFD drift (codepoint comparison, not equivalence)."""
    served = station_for_transition(Transition.SUNSET).invocation_for("home")
    expected = _shipped_liturgy()["stations"]["dusk"]["home"]["invocation"]

    assert [ord(c) for c in served] == [ord(c) for c in expected]
    assert "ΑΠΟ ΠΑΝΤΟΣ ΚΑΚΟΔΑΙΜΟΝΟΣ" in served
    # Polytonic Χαῖρε with the PRECOMPOSED iota-perispomeni (U+1FD6) —
    # exactly these five codepoints, in order. Escapes, not literals,
    # so no editor/tooling normalization of THIS file can weaken it.
    chaire = "\u03a7\u03b1\u1fd6\u03c1\u03b5"  # Χαῖρε
    assert chaire in served
    # No decomposition drift: the combining perispomeni (U+0342) never
    # appears; the text is identical to its NFC form and NFD would
    # change it (so any normalization pass would be caught).
    assert "\u0342" not in served
    assert unicodedata.normalize("NFC", served) == served
    assert unicodedata.normalize("NFD", served) != served


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
