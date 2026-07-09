"""Entry auto-stamp tests — b108-2hy.

FEATURES §"Core journaling" · auto-stamping of every entry with
multi-calendar date + astrological snapshot.

Regression guards for the fix Sophia reported: "why doesn't the
post show the stuff we said it would add by default like the
temperature, the moon position, the sun position?" — because the
scaffolded columns were never populated. This module + the
routers/v1/entries.py wiring populate them.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest

from theourgia.core.entries.autostamp import (
    AutoStampInput,
    compute_snapshots,
    moon_phase_name,
)


# ── Public API shape ──────────────────────────────────────────────


def test_compute_snapshots_requires_tz_aware_instant() -> None:
    with pytest.raises(ValueError):
        compute_snapshots(
            AutoStampInput(
                instant=datetime(2026, 7, 9, 12),  # naive
                latitude=37.98,
                longitude=23.72,
            )
        )


def test_compute_snapshots_returns_json_strings() -> None:
    result = compute_snapshots(
        AutoStampInput(
            instant=datetime(2026, 7, 9, 12, tzinfo=timezone.utc),
            latitude=37.98,
            longitude=23.72,
        )
    )
    assert isinstance(result.astro_snapshot, str)
    assert isinstance(result.calendar_snapshot, str)
    # And they parse as JSON.
    astro = json.loads(result.astro_snapshot)
    calendar = json.loads(result.calendar_snapshot)
    assert isinstance(astro, dict)
    assert isinstance(calendar, dict)


# ── Astro payload ─────────────────────────────────────────────────


def _stamp(**over) -> dict:
    result = compute_snapshots(
        AutoStampInput(
            instant=over.get(
                "instant", datetime(2026, 7, 9, 12, tzinfo=timezone.utc),
            ),
            latitude=over.get("latitude", 37.98),
            longitude=over.get("longitude", 23.72),
        )
    )
    return json.loads(result.astro_snapshot)


def test_astro_payload_carries_sun_position() -> None:
    astro = _stamp()
    assert "sun" in astro
    sun = astro["sun"]
    assert "sign" in sun and sun["sign"]
    assert "glyph" in sun and sun["glyph"]
    assert isinstance(sun["degree"], (int, float))
    assert 0 <= sun["degree"] < 30


def test_astro_payload_carries_moon_position_and_phase() -> None:
    astro = _stamp()
    moon = astro["moon"]
    assert "sign" in moon and moon["sign"]
    assert "glyph" in moon and moon["glyph"]
    assert "phase" in moon
    assert "illumination_pct" in moon
    assert 0 <= moon["illumination_pct"] <= 100


def test_astro_payload_carries_planets() -> None:
    """Mercury through Saturn all present with sign + degree."""
    astro = _stamp()
    for name in ("mercury", "venus", "mars", "jupiter", "saturn"):
        assert name in astro["planets"], f"missing {name}"
        p = astro["planets"][name]
        assert "sign" in p and p["sign"]
        assert isinstance(p["degree"], (int, float))


def test_astro_payload_records_location_and_ephemeris_attribution() -> None:
    astro = _stamp()
    assert astro["location"] == {"lat": 37.98, "lon": 23.72}
    assert "Swiss Ephemeris" in astro["ephemeris"]


def test_astro_payload_sun_on_july_9_is_in_cancer() -> None:
    """Sanity check: mid-July puts the Sun deep in Cancer (tropical)."""
    astro = _stamp(instant=datetime(2026, 7, 9, 12, tzinfo=timezone.utc))
    assert astro["sun"]["sign"] == "Cancer"


def test_astro_payload_sun_on_dec_25_is_in_capricorn() -> None:
    astro = _stamp(instant=datetime(2026, 12, 25, 12, tzinfo=timezone.utc))
    assert astro["sun"]["sign"] == "Capricorn"


# ── Moon phase naming ─────────────────────────────────────────────


def test_moon_phase_new_at_zero_elongation() -> None:
    assert moon_phase_name(0) == "New moon"


def test_moon_phase_first_quarter_near_ninety() -> None:
    assert moon_phase_name(90) == "First quarter"


def test_moon_phase_full_near_one_eighty() -> None:
    assert moon_phase_name(180) == "Full moon"


def test_moon_phase_last_quarter_near_two_seventy() -> None:
    assert moon_phase_name(270) == "Last quarter"


def test_moon_phase_waxing_crescent_in_first_octant() -> None:
    assert moon_phase_name(45) == "Waxing crescent"


def test_moon_phase_waxing_gibbous_between_quarter_and_full() -> None:
    assert moon_phase_name(135) == "Waxing gibbous"


def test_moon_phase_waning_gibbous_between_full_and_last_quarter() -> None:
    assert moon_phase_name(225) == "Waning gibbous"


def test_moon_phase_waning_crescent_in_final_octant() -> None:
    assert moon_phase_name(315) == "Waning crescent"


def test_moon_phase_names_are_stable_across_modulo() -> None:
    """A 720° elongation is a 360° elongation — same phase name."""
    assert moon_phase_name(720) == moon_phase_name(0)


# ── Calendar payload ─────────────────────────────────────────────


def _calendar(**over) -> dict:
    result = compute_snapshots(
        AutoStampInput(
            instant=over.get(
                "instant", datetime(2026, 7, 9, 12, tzinfo=timezone.utc),
            ),
            latitude=over.get("latitude", 37.98),
            longitude=over.get("longitude", 23.72),
        )
    )
    return json.loads(result.calendar_snapshot)


def test_calendar_payload_includes_gregorian() -> None:
    cal = _calendar()
    assert "gregorian" in cal
    greg = cal["gregorian"]
    assert greg.get("year") == 2026
    assert greg.get("month") == 7
    assert greg.get("day") == 9


def test_calendar_payload_includes_julian() -> None:
    cal = _calendar()
    assert "julian" in cal
    # Gregorian → Julian slips by 13 days in the 21st century.
    julian = cal["julian"]
    assert "year" in julian


def test_calendar_payload_includes_hebrew() -> None:
    cal = _calendar()
    assert "hebrew" in cal
    heb = cal["hebrew"]
    assert "year" in heb


def test_calendar_hebrew_payload_carries_month_name_and_long() -> None:
    """b108-2hz — regression guard for the "Tammuz shows as month"
    bug Sophia caught. The Hebrew calendar puts ``month_name`` inside
    ``raw`` rather than as a top-level attribute, so the serialiser
    must pull it up. Same for the pre-rendered ``long`` string.
    Publication of an entry on 2026-07-09 lands in Tammuz 5786."""
    cal = _calendar()
    heb = cal["hebrew"]
    assert "month_name" in heb
    assert heb["month_name"] == "Tammuz"
    # ``long`` also gets surfaced so the frontend can render it verbatim.
    assert "long" in heb
    assert "Tammuz" in heb["long"]


def test_calendar_payload_includes_thelemic() -> None:
    cal = _calendar()
    assert "thelemic" in cal


def test_calendar_payload_carries_instant() -> None:
    cal = _calendar()
    assert "instant_utc" in cal
    assert cal["instant_utc"].startswith("2026-07-09T12:00")


# ── Router-level regression guards ────────────────────────────────


def test_entry_router_source_wires_autostamp() -> None:
    """Source-level guard: create_entry MUST call compute_snapshots.
    Without this, entries revert to the pre-b108-2hx state where
    astro_snapshot + calendar_snapshot silently stay NULL."""
    from inspect import getsource

    from theourgia.api.routers.v1 import entries as entries_module

    src = getsource(entries_module.create_entry)
    assert "compute_snapshots" in src
    assert "AutoStampInput" in src


def test_entry_router_falls_back_to_user_location_when_absent() -> None:
    """Source-level guard: when the payload has no lat/lon, we look
    up the user's stored astro location instead of hard-coding
    Greenwich."""
    from inspect import getsource

    from theourgia.api.routers.v1 import entries as entries_module

    src = getsource(entries_module.create_entry)
    assert "astro.lat" in src
    assert "astro.lng" in src


def test_entry_router_never_fails_create_because_of_ephemeris() -> None:
    """Source-level guard: if the ephemeris hiccups, entry creation
    must still succeed with NULL snapshots — the entry itself is more
    valuable than the context it lacks."""
    from inspect import getsource

    from theourgia.api.routers.v1 import entries as entries_module

    src = getsource(entries_module.create_entry)
    assert "except Exception" in src
    assert "astro_snapshot = None" in src
    assert "calendar_snapshot = None" in src


def test_entry_read_exposes_snapshots() -> None:
    """The wire model must include both snapshot fields so the
    frontend can render them."""
    from theourgia.api.routers.v1.entries import EntryRead

    fields = EntryRead.model_fields
    assert "astro_snapshot" in fields
    assert "calendar_snapshot" in fields
