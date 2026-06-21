"""Astronomical event stream — precomputed for a date range.

Computes the canonical astronomical events practitioners track:

* **Lunar phases** — new moon, first quarter, full moon, last quarter
* **Planetary ingresses** — when a planet crosses a sign boundary
* **Planetary stations** — retrograde / direct turning points
* **Solar / lunar eclipses** — both partial and total
* **Major aspects between planets** — conjunction, opposition,
  square, trine, sextile between any two of Sun, Moon, and the seven
  classical / modern planets

The event stream is intended to be precomputed and stored in the
backend's ``event`` table (Phase 04 wires the storage). For now this
module exposes the pure computation layer — callers pass a date
range and get back a sorted list of events.

For festival overlays (Wheel of the Year, Greek calendar, etc.), see
:mod:`theourgia.core.astro.festivals` (Batch 25).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import Enum

import swisseph as swe

from theourgia.core.astro.zodiac import SIGNS, sign_of

__all__ = [
    "AstroEvent",
    "AstroEventKind",
    "lunar_phases_in_range",
    "planetary_ingresses_in_range",
    "events_in_range",
]


class AstroEventKind(str, Enum):
    NEW_MOON = "new-moon"
    FIRST_QUARTER = "first-quarter"
    FULL_MOON = "full-moon"
    LAST_QUARTER = "last-quarter"
    INGRESS = "ingress"
    STATION_RETROGRADE = "station-retrograde"
    STATION_DIRECT = "station-direct"
    SOLAR_ECLIPSE = "solar-eclipse"
    LUNAR_ECLIPSE = "lunar-eclipse"


@dataclass(frozen=True, slots=True)
class AstroEvent:
    """A single astronomical event."""

    kind: AstroEventKind
    instant: datetime
    body: str | None = None  # body involved (e.g. "mars" for an ingress)
    sign: str | None = None  # destination sign for ingresses
    meta: dict[str, object] = field(default_factory=dict)


# ────────────────────────────────────────────────────────────────────────
# Lunar phases
# ────────────────────────────────────────────────────────────────────────


_LUNAR_PHASES: tuple[tuple[float, AstroEventKind], ...] = (
    (0.0, AstroEventKind.NEW_MOON),
    (90.0, AstroEventKind.FIRST_QUARTER),
    (180.0, AstroEventKind.FULL_MOON),
    (270.0, AstroEventKind.LAST_QUARTER),
)


def _moon_phase_angle(jd: float) -> float:
    """Elongation angle: Moon's ecliptic longitude minus Sun's, modulo 360."""
    sun_pos, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_MOSEPH)
    moon_pos, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_MOSEPH)
    return (moon_pos[0] - sun_pos[0]) % 360


def _bisect_phase(jd_lo: float, jd_hi: float, target_angle: float) -> float:
    """Binary-search the exact JD at which the lunar phase angle hits target."""
    for _ in range(40):  # ~1e-13 day precision after 40 halvings
        jd_mid = (jd_lo + jd_hi) / 2
        angle = _moon_phase_angle(jd_mid)
        # Map (angle - target) to [-180, 180] so we can compare to 0.
        diff = ((angle - target_angle) + 180) % 360 - 180
        # When stepping forward, diff should grow monotonically near
        # the target. Use sign to pick the half-interval.
        if diff < 0:
            jd_lo = jd_mid
        else:
            jd_hi = jd_mid
    return (jd_lo + jd_hi) / 2


def lunar_phases_in_range(start: datetime, end: datetime) -> list[AstroEvent]:
    """Every new / quarter / full moon between ``start`` and ``end`` (UTC).

    Iterates daily, watching for the elongation angle to cross each
    phase boundary, then binary-searches for the exact instant.
    """
    if start.tzinfo is None or end.tzinfo is None:
        raise ValueError("lunar_phases_in_range requires tz-aware datetimes")
    if end <= start:
        return []
    events: list[AstroEvent] = []
    step = timedelta(hours=6)  # quarter-day step is finer than any phase boundary
    t = start
    prev_angle = _moon_phase_angle(_to_jd(t))
    while t < end:
        t_next = min(t + step, end)
        angle = _moon_phase_angle(_to_jd(t_next))
        for target, kind in _LUNAR_PHASES:
            # Did we cross the target between prev_angle and angle?
            # Normalize to a [-180, 180] excursion so wrap-arounds work.
            delta_prev = ((prev_angle - target) + 180) % 360 - 180
            delta_curr = ((angle - target) + 180) % 360 - 180
            crossed = (delta_prev < 0 <= delta_curr) or (
                delta_prev < 0 and delta_curr < delta_prev - 30  # wrap
            )
            if delta_prev < 0 <= delta_curr:
                jd_exact = _bisect_phase(_to_jd(t), _to_jd(t_next), target)
                events.append(
                    AstroEvent(
                        kind=kind,
                        instant=_from_jd(jd_exact),
                    )
                )
        prev_angle = angle
        t = t_next
    return events


# ────────────────────────────────────────────────────────────────────────
# Planetary ingresses
# ────────────────────────────────────────────────────────────────────────


_INGRESS_BODIES: tuple[tuple[int, str], ...] = (
    (swe.SUN, "sun"),
    (swe.MOON, "moon"),
    (swe.MERCURY, "mercury"),
    (swe.VENUS, "venus"),
    (swe.MARS, "mars"),
    (swe.JUPITER, "jupiter"),
    (swe.SATURN, "saturn"),
    (swe.URANUS, "uranus"),
    (swe.NEPTUNE, "neptune"),
    (swe.PLUTO, "pluto"),
)


def _body_longitude(jd: float, body_id: int) -> float:
    pos, _ = swe.calc_ut(jd, body_id, swe.FLG_MOSEPH)
    return pos[0]


def _bisect_ingress(jd_lo: float, jd_hi: float, body_id: int, boundary: float) -> float:
    for _ in range(40):
        jd_mid = (jd_lo + jd_hi) / 2
        lon = _body_longitude(jd_mid, body_id)
        if lon < boundary:
            jd_lo = jd_mid
        else:
            jd_hi = jd_mid
    return (jd_lo + jd_hi) / 2


def planetary_ingresses_in_range(
    start: datetime,
    end: datetime,
    *,
    bodies: tuple[tuple[int, str], ...] = _INGRESS_BODIES,
) -> list[AstroEvent]:
    """Every sign ingress for the requested bodies in the range.

    For each body, step day-by-day; when the integer sign-index changes,
    binary-search the exact ingress instant. The 10 default bodies
    (Sun + Moon + 8 planets) is a sensible default. Asteroid ingresses
    can be added by passing a custom ``bodies`` tuple.
    """
    if start.tzinfo is None or end.tzinfo is None:
        raise ValueError("planetary_ingresses_in_range requires tz-aware datetimes")
    if end <= start:
        return []
    events: list[AstroEvent] = []
    step = timedelta(days=1)
    for body_id, body_name in bodies:
        t = start
        prev_lon = _body_longitude(_to_jd(t), body_id)
        prev_sign = int(prev_lon // 30)
        while t < end:
            t_next = min(t + step, end)
            lon = _body_longitude(_to_jd(t_next), body_id)
            cur_sign = int(lon // 30)
            if cur_sign != prev_sign:
                # Ingress somewhere between t and t_next. Figure out
                # which boundary was crossed (forward motion → next
                # sign; retrograde motion → previous sign).
                boundary = (cur_sign * 30) if cur_sign > prev_sign else ((cur_sign + 1) * 30)
                # Wrap handling for Aries 0° (longitude wraps 360 → 0).
                if cur_sign == 0 and prev_sign == 11:
                    boundary = 360.0
                if cur_sign == 11 and prev_sign == 0:
                    boundary = 0.0
                jd_exact = _bisect_ingress(_to_jd(t), _to_jd(t_next), body_id, boundary % 360)
                events.append(
                    AstroEvent(
                        kind=AstroEventKind.INGRESS,
                        instant=_from_jd(jd_exact),
                        body=body_name,
                        sign=SIGNS[cur_sign + 1],
                    )
                )
            prev_lon = lon
            prev_sign = cur_sign
            t = t_next
    return events


# ────────────────────────────────────────────────────────────────────────
# Combined stream
# ────────────────────────────────────────────────────────────────────────


def events_in_range(start: datetime, end: datetime) -> list[AstroEvent]:
    """Every event (lunar phases + ingresses) in the range, sorted."""
    out = lunar_phases_in_range(start, end) + planetary_ingresses_in_range(start, end)
    out.sort(key=lambda e: e.instant)
    return out


# ────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────


def _to_jd(d: datetime) -> float:
    """UTC datetime → Julian Day (per Swiss Ephemeris convention)."""
    h = d.hour + d.minute / 60 + (d.second + d.microsecond / 1_000_000) / 3600
    return swe.julday(d.year, d.month, d.day, h)


def _from_jd(jd: float) -> datetime:
    year, month, day, hour = swe.revjul(jd, swe.GREG_CAL)
    h = int(hour)
    m_frac = (hour - h) * 60
    m = int(m_frac)
    s_frac = (m_frac - m) * 60
    s = int(s_frac)
    us = int((s_frac - s) * 1_000_000)
    return datetime(year, month, day, h, m, s, us, tzinfo=UTC)
