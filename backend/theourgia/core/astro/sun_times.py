"""Sunrise / sunset / twilight times via Swiss Ephemeris.

Wraps ``swe.rise_trans`` to compute the canonical four ritual moments
of the day (sunrise, solar noon, sunset, midnight) at a given
latitude and longitude. These power planetary-hour computation,
Liber Resh transitions, and the lunar-phase / festival event stream
to follow.

A note on convention: "midnight" here means *solar midnight* (the
moment the Sun crosses the lower meridian), not 00:00 local clock
time. For an observer at high latitude in summer, solar midnight can
fall well after sunrise of the previous civil day; the Liber Resh
adoration scheme assumes solar midnight regardless.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import swisseph as swe

__all__ = ["SunTimes", "compute_sun_times"]


@dataclass(frozen=True, slots=True)
class SunTimes:
    """The four Sun transitions for one civil day at one location.

    All four are UTC instants. ``None`` for arctic conditions (no
    sunrise/sunset within the 24-hour window — the Sun stays up or
    stays down). Callers handle the polar case by falling back to
    the day's solar noon / midnight, which are always defined.
    """

    sunrise: datetime | None
    solar_noon: datetime
    sunset: datetime | None
    solar_midnight: datetime


_RISE_FLAGS = swe.FLG_MOSEPH
_SUN = swe.SUN
_CALC_RISE = swe.CALC_RISE | swe.BIT_DISC_CENTER | swe.BIT_NO_REFRACTION
_CALC_SET = swe.CALC_SET | swe.BIT_DISC_CENTER | swe.BIT_NO_REFRACTION
_CALC_MTRANSIT = swe.CALC_MTRANSIT  # upper meridian (solar noon)
_CALC_ITRANSIT = swe.CALC_ITRANSIT  # lower meridian (solar midnight)


def _jd_to_dt(jd: float) -> datetime:
    """Convert a Julian Day to a UTC ``datetime``."""
    year, month, day, hour = swe.revjul(jd, swe.GREG_CAL)
    h = int(hour)
    m_frac = (hour - h) * 60
    m = int(m_frac)
    s_frac = (m_frac - m) * 60
    s = int(s_frac)
    us = int((s_frac - s) * 1_000_000)
    return datetime(year, month, day, h, m, s, us, tzinfo=UTC)


def _rise_trans(jd_start: float, latitude: float, longitude: float, flag: int) -> datetime | None:
    """Look up the next transit (rise/set/noon/midnight) after ``jd_start``."""
    # pyswisseph signature:
    #   rise_trans(tjdut, body, rsmi, geopos, atpress=0.0, attemp=0.0, flags=...)
    # Geopos = (lon, lat, alt). East-positive longitude, North-positive lat.
    rc, tret = swe.rise_trans(
        jd_start,
        _SUN,
        flag,
        (longitude, latitude, 0.0),
        0.0,
        0.0,
        flags=_RISE_FLAGS,
    )
    if rc < 0:
        return None
    return _jd_to_dt(tret[0])


def compute_sun_times(
    civil_date: datetime,
    latitude: float,
    longitude: float,
) -> SunTimes:
    """Sunrise / solar noon / sunset / solar midnight for the given date.

    ``civil_date`` is interpreted as a UTC date; the day boundaries
    are 00:00 UTC start, 24:00 UTC end. For practitioners whose local
    midnight differs significantly from UTC midnight, the
    Liber Resh layer rebases via the user's timezone.
    """
    if civil_date.tzinfo is None:
        raise ValueError("compute_sun_times requires a tz-aware datetime")
    day_start = civil_date.astimezone(UTC).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    jd_start = swe.julday(day_start.year, day_start.month, day_start.day, 0.0)

    sunrise = _rise_trans(jd_start, latitude, longitude, _CALC_RISE)
    sunset = _rise_trans(jd_start, latitude, longitude, _CALC_SET)
    noon = _rise_trans(jd_start, latitude, longitude, _CALC_MTRANSIT)
    midnight = _rise_trans(jd_start, latitude, longitude, _CALC_ITRANSIT)

    # Solar noon and solar midnight are always defined (the Sun crosses
    # the meridian even when it never rises/sets), but the Swiss
    # Ephemeris API still returns them through the same dispatch — so
    # we fall back to noon UTC / midnight UTC defensively if it ever
    # fails.
    if noon is None:
        noon = day_start.replace(hour=12)
    if midnight is None:
        midnight = day_start

    return SunTimes(
        sunrise=sunrise,
        solar_noon=noon,
        sunset=sunset,
        solar_midnight=midnight,
    )
