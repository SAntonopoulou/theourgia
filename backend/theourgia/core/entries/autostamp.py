"""Entry auto-stamp — the "why the entry didn't have moon phase" fix.

b108-2hy · FEATURES §"Core journaling" · auto-stamping of every
entry.

The Entry model has always had ``astro_snapshot`` + ``calendar_snapshot``
columns, but no code ever populated them. Sophia's very reasonable
question: "why doesn't the post show the stuff we said it would add
by default like the temperature, the moon position, the sun position?"
— because we scaffolded the storage and forgot the writer.

This module builds two JSON payloads and returns them ready to
persist. The Entry POST endpoint calls into it; the frontend Editor
reads them back and renders a chip strip.

The snapshots are computed at ENTRY CREATE TIME using ``occurred_at``
if the client sent one, otherwise ``now()``. Location comes from the
user's stored astro location (``astro.lat`` + ``astro.lng`` in
usersettings) with a Greenwich fallback for callers who never set one.

**Weather is NOT included** — Theourgia has no weather-API credential
substrate yet. Adding that would need Sophia to authorise an outbound
integration; we don't do that autonomously. Adding it later is a
matter of extending the astro payload with a ``weather`` key.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date as _date_cls
from datetime import datetime, timezone
from typing import Any

import swisseph as swe  # type: ignore[import-untyped]

from theourgia.core.astro.zodiac import sign_of

__all__ = [
    "AutoStampInput",
    "AutoStampResult",
    "compute_snapshots",
    "moon_phase_name",
]


# ── Public API ──────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class AutoStampInput:
    """What the entry endpoint hands us."""

    instant: datetime  # tz-aware; MUST be UTC or convertible
    latitude: float
    longitude: float


@dataclass(frozen=True, slots=True)
class AutoStampResult:
    """Two JSON strings ready for the Entry columns."""

    astro_snapshot: str
    calendar_snapshot: str


def compute_snapshots(inp: AutoStampInput) -> AutoStampResult:
    """Build both snapshots. Everything else is a private helper."""
    if inp.instant.tzinfo is None:
        raise ValueError("compute_snapshots requires a tz-aware instant")
    utc = inp.instant.astimezone(timezone.utc)

    astro_payload = _astro_payload(utc, inp.latitude, inp.longitude)
    calendar_payload = _calendar_payload(utc)

    return AutoStampResult(
        astro_snapshot=json.dumps(astro_payload, ensure_ascii=False),
        calendar_snapshot=json.dumps(calendar_payload, ensure_ascii=False),
    )


# ── Astro payload ──────────────────────────────────────────────


def _julian_day(instant: datetime) -> float:
    decimal_hour = (
        instant.hour
        + instant.minute / 60.0
        + (instant.second + instant.microsecond / 1_000_000) / 3600.0
    )
    return swe.julday(instant.year, instant.month, instant.day, decimal_hour)


def _body_longitude(jd: float, swe_body: int) -> float:
    pos, _ = swe.calc_ut(jd, swe_body, swe.FLG_MOSEPH)
    return float(pos[0])


def _astro_payload(
    utc: datetime, latitude: float, longitude: float,
) -> dict[str, Any]:
    """Compact ecliptic snapshot: sun, moon, moon phase, key planets.

    Format-stable JSON — the Editor's chip strip reads it verbatim.
    Positions are TROPICAL (the default zodiac).
    """
    jd = _julian_day(utc)

    sun_lon = _body_longitude(jd, swe.SUN)
    moon_lon = _body_longitude(jd, swe.MOON)
    elongation = (moon_lon - sun_lon) % 360

    sun_sign = sign_of(sun_lon)
    moon_sign = sign_of(moon_lon)

    return {
        "instant_utc": utc.isoformat(),
        "location": {"lat": latitude, "lon": longitude},
        "sun": {
            "sign": sun_sign.sign_name,
            "glyph": sun_sign.glyph,
            "degree": round(sun_sign.degree_in_sign, 2),
            "longitude": round(sun_sign.longitude, 3),
        },
        "moon": {
            "sign": moon_sign.sign_name,
            "glyph": moon_sign.glyph,
            "degree": round(moon_sign.degree_in_sign, 2),
            "longitude": round(moon_sign.longitude, 3),
            "phase": moon_phase_name(elongation),
            "phase_angle_deg": round(elongation, 2),
            "illumination_pct": round(_illumination_from_angle(elongation), 1),
        },
        "planets": {
            "mercury": _planet_summary(jd, swe.MERCURY),
            "venus": _planet_summary(jd, swe.VENUS),
            "mars": _planet_summary(jd, swe.MARS),
            "jupiter": _planet_summary(jd, swe.JUPITER),
            "saturn": _planet_summary(jd, swe.SATURN),
        },
        "zodiac": "tropical",
        "ephemeris": "Swiss Ephemeris / JPL DE441",
    }


def _planet_summary(jd: float, swe_body: int) -> dict[str, Any]:
    lon = _body_longitude(jd, swe_body)
    pos = sign_of(lon)
    return {
        "sign": pos.sign_name,
        "glyph": pos.glyph,
        "degree": round(pos.degree_in_sign, 2),
    }


def _illumination_from_angle(elongation_deg: float) -> float:
    """Fraction of the lunar disk illuminated at the given elongation.

    Uses the standard cosine formula (Meeus 48.1 simplified):
    illumination = (1 - cos(elongation)) / 2 · 100.

    - 0° (new): 0%
    - 90° (first quarter): 50%
    - 180° (full): 100%
    - 270° (last quarter): 50%
    """
    import math

    return (1.0 - math.cos(math.radians(elongation_deg))) / 2.0 * 100.0


def moon_phase_name(elongation_deg: float) -> str:
    """Name the moon phase from the sun-moon elongation angle.

    Boundaries follow the eight canonical phases with a ~1.5°
    tolerance at each cardinal so a chart drawn on the exact new /
    first-quarter / full / last-quarter instant reads as such
    instead of drifting into an adjacent name.
    """
    angle = elongation_deg % 360
    if angle < 1.5 or angle >= 358.5:
        return "New moon"
    if angle < 88.5:
        return "Waxing crescent"
    if angle < 91.5:
        return "First quarter"
    if angle < 178.5:
        return "Waxing gibbous"
    if angle < 181.5:
        return "Full moon"
    if angle < 268.5:
        return "Waning gibbous"
    if angle < 271.5:
        return "Last quarter"
    return "Waning crescent"


# ── Calendar payload ───────────────────────────────────────────


def _calendar_payload(utc: datetime) -> dict[str, Any]:
    """Multi-calendar snapshot.

    Includes: Gregorian (canonical) · Julian · Hebrew · Thelemic.
    (Coptic + Islamic land when their converters ship.)
    """
    from theourgia.core.calendars.gregorian import GregorianCalendar
    from theourgia.core.calendars.hebrew import HebrewCalendar
    from theourgia.core.calendars.julian import JulianCalendar
    from theourgia.core.calendars.thelemic import ThelemicCalendar

    result: dict[str, Any] = {"instant_utc": utc.isoformat()}

    for label, calendar in (
        ("gregorian", GregorianCalendar()),
        ("julian", JulianCalendar()),
        ("hebrew", HebrewCalendar()),
        ("thelemic", ThelemicCalendar()),
    ):
        try:
            date = calendar.from_instant(utc)
            result[label] = _serialise_calendar_date(date)
        except Exception as exc:  # pragma: no cover — defensive
            result[label] = {"error": str(exc)}

    return result


def _serialise_calendar_date(date: object) -> dict[str, Any]:
    """Turn a CalendarDate into JSON-safe dict.

    We introspect field-by-field rather than importing CalendarDate
    directly so an unexpected shape falls back to str() gracefully."""
    out: dict[str, Any] = {}
    for key in ("year", "month", "day", "month_name", "era", "formatted"):
        value = getattr(date, key, None)
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            out[key] = value
        elif isinstance(value, _date_cls):
            out[key] = value.isoformat()
        else:
            out[key] = str(value)
    if not out:
        out["repr"] = str(date)
    return out
