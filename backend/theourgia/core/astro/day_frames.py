"""Day-frame boundaries — the practitioner's day, not the calendar's.

The phone groups the record by the practitioner's chosen frame: a day may
run moonrise to moonrise or sunrise to sunrise, which is how a lunar
practice actually experiences its days. The record page mirrors that
grouping, and these boundaries are what it groups by.

⚠ Computed with this server's ephemeris under MOSEPH, disc-centre, no
refraction — the same conventions ``sun_times`` established. The phone
computes its own boundaries with its own ephemeris files; a keeping
within a minute or two of a boundary can therefore sit on a different
day here than in the app, and the page says so rather than pretending
the two clocks are one.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import swisseph as swe

__all__ = ["frame_boundaries"]

_RISE_FLAGS = swe.FLG_MOSEPH
_CALC_RISE = swe.CALC_RISE | swe.BIT_DISC_CENTER | swe.BIT_NO_REFRACTION

_BODIES = {
    "sunrise": swe.SUN,
    "moonrise": swe.MOON,
}


def _jd(at: datetime) -> float:
    at = at.astimezone(UTC)
    return swe.julday(
        at.year,
        at.month,
        at.day,
        at.hour + at.minute / 60 + at.second / 3600,
    )


def _from_jd(jd: float) -> datetime:
    year, month, day, hour = swe.revjul(jd)
    whole = int(hour)
    minutes = (hour - whole) * 60
    second = round((minutes - int(minutes)) * 60)
    dt = datetime(year, month, day, whole, int(minutes), 0, tzinfo=UTC)
    return dt + timedelta(seconds=second)


def frame_boundaries(
    frame: str,
    start: datetime,
    end: datetime,
    latitude: float,
    longitude: float,
) -> list[datetime]:
    """Every rise of the frame's body from just before ``start`` to ``end``.

    The walk begins a day and a half early so the boundary that OPENS the
    first day is included — an entry at 03:00 under a moonrise frame
    belongs to a day that began the previous afternoon.

    A rise the ephemeris cannot give (the Moon neither rising nor setting
    in a polar window) is stepped over by a day rather than erred on: the
    days simply run longer there, which is what the sky did.
    """
    if frame not in _BODIES:
        raise ValueError(f"frame must be one of {sorted(_BODIES)}; got {frame!r}")
    if start.tzinfo is None or end.tzinfo is None:
        raise ValueError("start and end must be timezone-aware")

    body = _BODIES[frame]
    boundaries: list[datetime] = []
    jd = _jd(start - timedelta(hours=36))
    jd_end = _jd(end)

    while jd < jd_end:
        rc, tret = swe.rise_trans(
            jd,
            body,
            _CALC_RISE,
            (longitude, latitude, 0.0),
            0.0,
            0.0,
            flags=_RISE_FLAGS,
        )
        if rc < 0:
            jd += 1.0
            continue
        found = tret[0]
        if found >= jd_end:
            break
        boundaries.append(_from_jd(found))
        # A minute past the found rise: enough to move off it, never enough
        # to step over the next one (they are ~a day apart).
        jd = found + 1.0 / 1440.0

    return boundaries
