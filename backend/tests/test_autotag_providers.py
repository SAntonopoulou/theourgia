"""Tests for the LIVE synchronicity auto-tag providers (Day-1 batch).

Covers:

  * :class:`LiveAstroProvider` — frozen v1 snapshot shape, real
    ephemeris values for a known instant, honest "unknown" planetary
    hour without a location.
  * :class:`LiveCalendarProvider` — frozen v1 stamp shape, festival
    coverage, astronomical season.
  * The void-of-course engine's invariants.
  * The boot wiring: ``wire_live_autotag_providers`` swaps the
    synchronicities module's stubs for the live adapters (and the
    stubs remain the documented pre-boot default).
  * The stored-home-location fallback for geo-dependent astro fields.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from theourgia.core.analytics.autotag import autotag_synchronicity
from theourgia.core.analytics.providers import (
    LiveAstroProvider,
    LiveCalendarProvider,
    coarse_moon_phase,
)
from theourgia.core.astro.events import lunar_phases_in_range
from theourgia.core.astro.void_of_course import (
    is_void_of_course,
    moon_next_sign_ingress,
)

# A fixed, verifiable instant: Friday 2026-06-26 12:00 UTC.
MOMENT = datetime(2026, 6, 26, 12, 0, tzinfo=UTC)
ATHENS = {"latitude": 37.9838, "longitude": 23.7275}

_SIGNS = {
    "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra",
    "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
}
_PLANETS = {
    "saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon",
}


# ── coarse_moon_phase ────────────────────────────────────────────


def test_coarse_phase_cardinals() -> None:
    assert coarse_moon_phase(0.0) == "new"
    assert coarse_moon_phase(359.0) == "new"
    assert coarse_moon_phase(180.0) == "full"


def test_coarse_phase_waxing_waning() -> None:
    assert coarse_moon_phase(90.0) == "waxing"
    assert coarse_moon_phase(170.0) == "waxing"
    assert coarse_moon_phase(270.0) == "waning"
    assert coarse_moon_phase(200.0) == "waning"


# ── LiveAstroProvider ────────────────────────────────────────────


def test_astro_snapshot_has_frozen_v1_shape() -> None:
    snap = LiveAstroProvider().snapshot_at(MOMENT, **ATHENS)
    assert set(snap) == {
        "moon_phase",
        "planetary_hour",
        "planetary_day",
        "sun_sign",
        "moon_sign",
        "void_of_course",
    }
    assert snap["moon_phase"] in {"new", "waxing", "full", "waning"}
    assert snap["planetary_hour"] in _PLANETS
    assert snap["sun_sign"] in _SIGNS
    assert snap["moon_sign"] in _SIGNS
    assert isinstance(snap["void_of_course"], bool)


def test_astro_snapshot_real_values_for_known_instant() -> None:
    """2026-06-26 is a Friday (Venus day); the Sun is in Cancer."""
    snap = LiveAstroProvider().snapshot_at(MOMENT, **ATHENS)
    assert snap["planetary_day"] == "venus"
    assert snap["sun_sign"] == "cancer"


def test_astro_snapshot_without_location_is_honest() -> None:
    """No location → planetary hour is 'unknown' (it is anchored on
    local sunrise), while location-independent fields stay real."""
    snap = LiveAstroProvider().snapshot_at(MOMENT)
    assert snap["planetary_hour"] == "unknown"
    assert snap["sun_sign"] == "cancer"
    assert snap["planetary_day"] == "venus"
    assert snap["moon_phase"] in {"new", "waxing", "full", "waning"}


def test_astro_snapshot_never_serves_stub_unknown_signs() -> None:
    """The pre-Day-1 bug: the permanent stub answered 'unknown' for
    every field. The live provider must not."""
    snap = LiveAstroProvider().snapshot_at(MOMENT, **ATHENS)
    assert snap["sun_sign"] != "unknown"
    assert snap["moon_sign"] != "unknown"
    assert snap["moon_phase"] != "unknown"
    assert snap["planetary_hour"] != "unknown"


# ── LiveCalendarProvider ─────────────────────────────────────────


def test_calendar_stamp_has_frozen_v1_shape() -> None:
    stamp = LiveCalendarProvider().stamp_at(MOMENT)
    assert set(stamp) == {
        "iso_date",
        "weekday",
        "season",
        "festivals",
        "hellenic_day",
        "thelemic_day",
    }
    assert stamp["iso_date"] == "2026-06-26"
    assert stamp["weekday"] == "friday"
    assert isinstance(stamp["festivals"], list)


def test_calendar_stamp_astronomical_season() -> None:
    """Late June = Sun past the solstice point → summer (documented
    northern-hemisphere astronomical convention)."""
    assert LiveCalendarProvider().stamp_at(MOMENT)["season"] == "summer"
    assert (
        LiveCalendarProvider().stamp_at(
            datetime(2026, 1, 10, tzinfo=UTC),
        )["season"]
        == "winter"
    )


def test_calendar_stamp_finds_thelemic_solstice_feast() -> None:
    """The Feast of the Solstice (summer) covers the June solstice —
    a real festival instance, from the registry with provenance."""
    stamp = LiveCalendarProvider().stamp_at(
        datetime(2026, 6, 21, 12, 0, tzinfo=UTC),
    )
    assert "thel-summer-solstice" in stamp["festivals"]
    assert stamp["thelemic_day"] == "thel-summer-solstice"


def test_calendar_stamp_hellenic_day_tracks_dark_moon() -> None:
    """The Deipnon window (24h ending at the new moon) stamps
    hellenic_day — computed against the real new-moon instant."""
    new_moon = lunar_phases_in_range(
        datetime(2026, 6, 1, tzinfo=UTC),
        datetime(2026, 7, 1, tzinfo=UTC),
    )
    nm = next(e for e in new_moon if e.kind.value == "new-moon")
    stamp = LiveCalendarProvider().stamp_at(
        nm.instant - timedelta(hours=6),
    )
    assert stamp["hellenic_day"] == "deipnon"
    assert "deipnon" in stamp["festivals"]


# ── Void of course ───────────────────────────────────────────────


def test_moon_next_ingress_is_forward_and_bounded() -> None:
    ingress = moon_next_sign_ingress(MOMENT)
    assert MOMENT < ingress <= MOMENT + timedelta(days=4)


def test_moon_changes_sign_at_ingress() -> None:
    from theourgia.core.astro.void_of_course import _longitude, _to_jd
    import swisseph as swe

    ingress = moon_next_sign_ingress(MOMENT)
    before = int(_longitude(_to_jd(ingress - timedelta(minutes=5)), swe.MOON) // 30)
    after = int(_longitude(_to_jd(ingress + timedelta(minutes=5)), swe.MOON) // 30)
    assert before != after


def test_not_void_just_before_a_full_moon_in_same_sign() -> None:
    """Minutes before an exact Sun-Moon opposition that perfects
    before the Moon's next ingress, the Moon CANNOT be void — an
    exact Ptolemaic aspect lies ahead."""
    phases = lunar_phases_in_range(
        datetime(2026, 6, 1, tzinfo=UTC),
        datetime(2026, 9, 1, tzinfo=UTC),
    )
    checked = 0
    for full in (p for p in phases if p.kind.value == "full-moon"):
        probe = full.instant - timedelta(hours=1)
        if moon_next_sign_ingress(probe) > full.instant:
            assert is_void_of_course(probe) is False
            checked += 1
    assert checked >= 1, "no usable full moon found in three months"


def test_void_of_course_returns_bool() -> None:
    assert isinstance(is_void_of_course(MOMENT), bool)


# ── Boot wiring ──────────────────────────────────────────────────


def test_wire_live_autotag_providers_swaps_stubs() -> None:
    """The lifespan hook must replace the module-level stubs with the
    live adapters — set_providers with zero callers was the bug."""
    from theourgia.api.lifespan import wire_live_autotag_providers
    from theourgia.api.routers.v1 import synchronicities as sync_module

    try:
        wire_live_autotag_providers()
        assert isinstance(sync_module._ASTRO_PROVIDER, LiveAstroProvider)
        assert isinstance(
            sync_module._CALENDAR_PROVIDER, LiveCalendarProvider,
        )
        # No weather integration exists — honestly stays None.
        assert sync_module._WEATHER_PROVIDER is None
    finally:
        # Restore the documented pre-boot stubs for other tests.
        sync_module.set_providers(
            astro=sync_module._StubAstroProvider(),
            calendar=sync_module._StubCalendarProvider(),
        )


def test_lifespan_startup_calls_the_wiring() -> None:
    import inspect

    from theourgia.api import lifespan as lifespan_module

    src = inspect.getsource(lifespan_module.lifespan)
    assert "wire_live_autotag_providers()" in src


# ── Stored-home-location fallback ────────────────────────────────


class _RecordingAstroProvider:
    def __init__(self) -> None:
        self.calls: list[tuple[float | None, float | None]] = []

    def snapshot_at(self, moment, *, latitude=None, longitude=None):
        self.calls.append((latitude, longitude))
        return {"moon_phase": "waxing"}


class _NullCalendarProvider:
    def stamp_at(self, moment):
        return {"iso_date": moment.date().isoformat()}


def test_autotag_uses_home_location_when_event_has_none() -> None:
    astro = _RecordingAstroProvider()
    autotag_synchronicity(
        occurred_at=MOMENT,
        location_lat=None,
        location_lng=None,
        location_precision="hidden",
        astro_provider=astro,
        calendar_provider=_NullCalendarProvider(),
        fallback_astro_location=(37.98, 23.73),
    )
    assert astro.calls == [(37.98, 23.73)]


def test_autotag_event_location_beats_home_fallback() -> None:
    astro = _RecordingAstroProvider()
    autotag_synchronicity(
        occurred_at=MOMENT,
        location_lat=51.5,
        location_lng=-0.1,
        location_precision="exact",
        astro_provider=astro,
        calendar_provider=_NullCalendarProvider(),
        fallback_astro_location=(37.98, 23.73),
    )
    (lat, lng) = astro.calls[0]
    assert (round(lat, 1), round(lng, 1)) == (51.5, -0.1)


def test_autotag_home_fallback_never_written_to_row() -> None:
    """The home location feeds the astro provider only — the stored
    row lat/lng stay floored event values (None here)."""
    result = autotag_synchronicity(
        occurred_at=MOMENT,
        location_lat=None,
        location_lng=None,
        location_precision="hidden",
        astro_provider=_RecordingAstroProvider(),
        calendar_provider=_NullCalendarProvider(),
        fallback_astro_location=(37.98, 23.73),
    )
    assert result.location_lat is None
    assert result.location_lng is None


def test_autotag_without_fallback_keeps_provider_blind() -> None:
    """No stored home location + hidden precision → the provider
    still sees None/None (the original leak-proofing contract)."""
    astro = _RecordingAstroProvider()
    autotag_synchronicity(
        occurred_at=MOMENT,
        location_lat=37.97,
        location_lng=23.72,
        location_precision="hidden",
        astro_provider=astro,
        calendar_provider=_NullCalendarProvider(),
    )
    assert astro.calls == [(None, None)]


def test_sync_module_sig_source_documents_live_wiring() -> None:
    """The synchronicities module must document that the stubs are
    the pre-boot/no-data fallback, not the served behaviour."""
    import inspect

    from theourgia.api.routers.v1 import synchronicities as sync_module

    src = inspect.getsource(sync_module)
    assert "lifespan" in src
    assert "core.analytics.providers" in src
