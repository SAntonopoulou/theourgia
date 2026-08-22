"""Live auto-tag providers — adapters over the Phase 03 engines.

Implements the :class:`~theourgia.core.analytics.autotag.AstroProvider`
and :class:`~theourgia.core.analytics.autotag.CalendarProvider`
protocols with the real Swiss Ephemeris + festival engines from
:mod:`theourgia.core.astro` and :mod:`theourgia.core.festivals`.

Wired in at app boot via
:func:`theourgia.api.lifespan.wire_live_autotag_providers`, replacing
the in-module stubs the synchronicities router ships with (the stubs
remain the documented pre-boot / test fallback).

Honesty rules:

* Location-independent fields (moon phase, signs, void-of-course,
  planetary day) are always computed for real.
* ``planetary_hour`` genuinely needs a location (it is anchored on
  local sunrise/sunset). With no location it is reported as
  ``"unknown"`` — never a fabricated Greenwich hour.
* No weather provider ships — Theourgia has no outbound weather
  integration, so ``weather_snapshot`` stays honestly ``None``.
"""

from __future__ import annotations

from datetime import UTC, datetime
from functools import lru_cache

import swisseph as swe

from theourgia.core.astro.planetary_hours import (
    current_planetary_hour,
    day_ruler,
)
from theourgia.core.astro.void_of_course import is_void_of_course
from theourgia.core.astro.zodiac import sign_of
from theourgia.core.festivals import (
    FestivalInstance,
    Tradition,
    festivals_for_year,
    get_festival,
)

__all__ = ["LiveAstroProvider", "LiveCalendarProvider", "coarse_moon_phase"]


def _ensure_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment.astimezone(UTC)


def _julian_day(utc: datetime) -> float:
    decimal_hour = (
        utc.hour
        + utc.minute / 60.0
        + (utc.second + utc.microsecond / 1_000_000) / 3600.0
    )
    return swe.julday(utc.year, utc.month, utc.day, decimal_hour)


def _longitude(jd: float, body: int) -> float:
    pos, _ = swe.calc_ut(jd, body, swe.FLG_MOSEPH)
    return float(pos[0]) % 360


def coarse_moon_phase(elongation_deg: float) -> str:
    """The four-value moon phase the frozen v1 astro snapshot uses.

    ``new`` / ``full`` get the same ~1.5° cardinal tolerance as the
    eight-phase name in :mod:`theourgia.core.entries.autostamp`;
    everything else is ``waxing`` (elongation < 180°) or ``waning``.
    """
    angle = elongation_deg % 360
    if angle < 1.5 or angle >= 358.5:
        return "new"
    if 178.5 <= angle < 181.5:
        return "full"
    if angle < 180:
        return "waxing"
    return "waning"


class LiveAstroProvider:
    """Real astro snapshots (frozen v1 shape + ``planetary_day``)."""

    def snapshot_at(
        self,
        moment: datetime,
        *,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> dict:
        utc = _ensure_utc(moment)
        jd = _julian_day(utc)

        sun_lon = _longitude(jd, swe.SUN)
        moon_lon = _longitude(jd, swe.MOON)
        elongation = (moon_lon - sun_lon) % 360

        if latitude is not None and longitude is not None:
            planetary_hour = current_planetary_hour(
                utc, latitude, longitude,
            ).ruler.value
        else:
            # Planetary hours are anchored on local sunrise/sunset —
            # with no location the honest answer is "unknown".
            planetary_hour = "unknown"

        return {
            "moon_phase": coarse_moon_phase(elongation),
            "planetary_hour": planetary_hour,
            "planetary_day": day_ruler(utc).value,
            "sun_sign": sign_of(sun_lon).sign_name.lower(),
            "moon_sign": sign_of(moon_lon).sign_name.lower(),
            # The ledger-default rule (Hellenistic thirty degrees). This
            # stamp has no user in scope; when it gains one, it should read
            # the practitioner's astro.doctrine instead of the default.
            "void_of_course": is_void_of_course(utc),
        }


# ── Calendar provider ─────────────────────────────────────────────


@lru_cache(maxsize=8)
def _festival_instances(year: int) -> tuple[FestivalInstance, ...]:
    """Cached per-year festival instances (lunar computations are the
    expensive part; a synchronicity burst should not recompute them)."""
    return tuple(festivals_for_year(year))


def _instances_covering(moment: datetime) -> list[FestivalInstance]:
    instances = list(_festival_instances(moment.year))
    if moment.month == 1:
        # Late-December multi-day festivals can spill into January.
        instances.extend(_festival_instances(moment.year - 1))
    return [i for i in instances if i.start <= moment < i.end]


def _astronomical_season(sun_longitude: float) -> str:
    """Season from the Sun's ecliptic longitude (equinox/solstice
    boundaries). Northern-hemisphere naming — the calendar stamp has
    no location input, so the convention is documented rather than
    guessed per-user."""
    if sun_longitude < 90:
        return "spring"
    if sun_longitude < 180:
        return "summer"
    if sun_longitude < 270:
        return "autumn"
    return "winter"


class LiveCalendarProvider:
    """Real calendar stamps (frozen v1 shape)."""

    def stamp_at(self, moment: datetime) -> dict:
        utc = _ensure_utc(moment)
        jd = _julian_day(utc)
        sun_lon = _longitude(jd, swe.SUN)

        covering = _instances_covering(utc)
        hellenic_day: str | None = None
        thelemic_day: str | None = None
        for instance in covering:
            tradition = get_festival(instance.festival_id).tradition
            if hellenic_day is None and tradition in (
                Tradition.GREEK, Tradition.HEKATEAN,
            ):
                hellenic_day = instance.festival_id
            if thelemic_day is None and tradition is Tradition.THELEMIC:
                thelemic_day = instance.festival_id

        return {
            "iso_date": utc.date().isoformat(),
            "weekday": utc.strftime("%A").lower(),
            "season": _astronomical_season(sun_lon),
            "festivals": [i.festival_id for i in covering],
            "hellenic_day": hellenic_day,
            "thelemic_day": thelemic_day,
        }
