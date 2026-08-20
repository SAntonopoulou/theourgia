"""Compute the four lunar stations of a day.

Same ``swe.rise_trans`` + Moshier-ephemeris approach as
:mod:`theourgia.core.astro.day_frames` (no data files needed). For each station
we ask the ephemeris for the *next* occurrence at or after the day's start; the
four together span one lunar day (~24h50m), so some may fall a little past
midnight — which is what the sky does.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import swisseph as swe

__all__ = ["STATION_KEYS", "STATION_LABELS", "LunarStation", "lunar_stations"]

_FLAGS = swe.FLG_MOSEPH
_RISE = swe.CALC_RISE | swe.BIT_DISC_CENTER | swe.BIT_NO_REFRACTION
_SET = swe.CALC_SET | swe.BIT_DISC_CENTER | swe.BIT_NO_REFRACTION

#: station key → the rise_trans mode that finds it.
_RSMI: dict[str, int] = {
    "moonrise": _RISE,
    "culmination": swe.CALC_MTRANSIT,  # upper meridian transit
    "moonset": _SET,
    "nadir": swe.CALC_ITRANSIT,  # lower meridian transit
}

STATION_KEYS: tuple[str, ...] = ("moonrise", "culmination", "moonset", "nadir")

STATION_LABELS: dict[str, str] = {
    "moonrise": "Moonrise",
    "culmination": "Culmination",
    "moonset": "Moonset",
    "nadir": "Nadir",
}


@dataclass(frozen=True, slots=True)
class LunarStation:
    key: str
    label: str
    #: UTC instant of the station, or ``None`` when the moon produces no such
    #: event in the window (polar latitudes).
    at: datetime | None


def _jd(at: datetime) -> float:
    at = at.astimezone(UTC)
    return swe.julday(at.year, at.month, at.day, at.hour + at.minute / 60 + at.second / 3600)


def _from_jd(jd: float) -> datetime:
    year, month, day, hour = swe.revjul(jd)
    whole = int(hour)
    minutes = (hour - whole) * 60
    second = round((minutes - int(minutes)) * 60)
    dt = datetime(year, month, day, whole, int(minutes), 0, tzinfo=UTC)
    return dt + timedelta(seconds=second)


def lunar_stations(day_start: datetime, latitude: float, longitude: float) -> list[LunarStation]:
    """The four lunar stations from ``day_start`` (a tz-aware datetime, usually
    the practitioner's local midnight), sorted by time. A station the ephemeris
    cannot give is returned with ``at=None`` and sorts last."""
    if day_start.tzinfo is None:
        raise ValueError("day_start must be timezone-aware")
    jd0 = _jd(day_start)
    found: list[LunarStation] = []
    for key in STATION_KEYS:
        rc, tret = swe.rise_trans(
            jd0, swe.MOON, _RSMI[key], (longitude, latitude, 0.0), 0.0, 0.0, flags=_FLAGS
        )
        found.append(
            LunarStation(
                key=key, label=STATION_LABELS[key], at=_from_jd(tret[0]) if rc >= 0 else None
            )
        )
    # Chronological, with the unfound (None) stations last.
    return sorted(found, key=lambda s: (s.at is None, s.at or day_start))
