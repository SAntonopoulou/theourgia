"""Moon void-of-course computation.

The traditional (Lilly / horary) definition: the Moon is void of
course from the moment of her last exact Ptolemaic aspect —
conjunction, sextile, square, trine, or opposition — to a classical
planet until she ingresses into the next sign.

Equivalently (and how we compute it): the Moon is void *right now*
iff NO exact Ptolemaic aspect to Sun, Mercury, Venus, Mars, Jupiter,
or Saturn perfects between now and her next sign ingress.

Implementation notes:

* The next ingress is found by scanning forward hourly (the Moon
  needs at most ~2.8 days to cross a sign) and bisecting the sign
  boundary — the same bracketing technique as
  :mod:`theourgia.core.astro.events`.
* Aspect perfection is detected by sampling the Moon-planet angular
  separation on a 30-minute grid between now and the ingress and
  watching for the separation to cross an exact aspect angle. The
  separation changes by well under a degree per sample step, so a
  crossing cannot be skipped.
* Everything runs on the bundled Moshier ephemeris (``FLG_MOSEPH``),
  matching the rest of the astro engine.

The outer planets are excluded on purpose — the classical VoC rule
predates their discovery, and including them would make void periods
vanishingly rare. This is the mainstream convention.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import swisseph as swe

__all__ = ["is_void_of_course", "moon_next_sign_ingress"]


#: Ptolemaic aspect angles as Moon-minus-planet longitude deltas in
#: [0, 360). 0/60/90/120/180 plus the mirror-image applying angles
#: (240 = trine, 270 = square, 300 = sextile on the far side).
_ASPECT_DELTAS: tuple[float, ...] = (
    0.0, 60.0, 90.0, 120.0, 180.0, 240.0, 270.0, 300.0,
)

#: The classical aspect partners for the VoC rule.
_VOC_BODIES: tuple[int, ...] = (
    swe.SUN,
    swe.MERCURY,
    swe.VENUS,
    swe.MARS,
    swe.JUPITER,
    swe.SATURN,
)

#: Sampling grid for aspect-perfection detection.
_SAMPLE_STEP = timedelta(minutes=30)

#: The Moon crosses a sign every <= ~2.8 days; 4 days is a safe cap.
_MAX_INGRESS_SCAN = timedelta(days=4)


def _to_jd(d: datetime) -> float:
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


def _longitude(jd: float, body: int) -> float:
    pos, _ = swe.calc_ut(jd, body, swe.FLG_MOSEPH)
    return float(pos[0]) % 360


def _ensure_utc(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        return moment.replace(tzinfo=UTC)
    return moment.astimezone(UTC)


def moon_next_sign_ingress(moment: datetime) -> datetime:
    """The instant the Moon next enters a new sign after ``moment``.

    Scans hourly for the integer sign index to change, then bisects
    the crossing to sub-second precision.
    """
    t = _ensure_utc(moment)
    prev_sign = int(_longitude(_to_jd(t), swe.MOON) // 30)
    step = timedelta(hours=1)
    deadline = t + _MAX_INGRESS_SCAN
    while t < deadline:
        t_next = t + step
        cur_sign = int(_longitude(_to_jd(t_next), swe.MOON) // 30)
        if cur_sign != prev_sign:
            jd_lo, jd_hi = _to_jd(t), _to_jd(t_next)
            for _ in range(40):
                jd_mid = (jd_lo + jd_hi) / 2
                if int(_longitude(jd_mid, swe.MOON) // 30) == prev_sign:
                    jd_lo = jd_mid
                else:
                    jd_hi = jd_mid
            return _from_jd(jd_hi)
        t = t_next
    # Unreachable in practice (the Moon always ingresses within the
    # cap); return the cap so callers never loop forever.
    return deadline


def _delta(jd: float, body: int) -> float:
    """Moon-minus-body ecliptic longitude delta in [0, 360).

    The Moon outpaces every VoC body, so this delta increases
    monotonically with time (wrapping 360 → 0) — which makes
    crossing detection a simple forward-arc containment test.
    """
    return (_longitude(jd, swe.MOON) - _longitude(jd, body)) % 360


def _crossed(a: float, b: float, target: float) -> bool:
    """Did the increasing circular delta pass ``target`` moving
    forward from ``a`` to ``b``?"""
    span = (b - a) % 360
    off = (target - a) % 360
    return 0 < off <= span


def is_void_of_course(moment: datetime) -> bool:
    """True iff the Moon is void of course at ``moment``.

    Checks whether any exact Ptolemaic aspect to a classical planet
    perfects between ``moment`` and the Moon's next sign ingress.
    """
    start = _ensure_utc(moment)
    ingress = moon_next_sign_ingress(start)

    prev = {body: _delta(_to_jd(start), body) for body in _VOC_BODIES}
    t = start
    while t < ingress:
        t_next = min(t + _SAMPLE_STEP, ingress)
        jd_next = _to_jd(t_next)
        for body in _VOC_BODIES:
            cur = _delta(jd_next, body)
            if any(
                _crossed(prev[body], cur, target)
                for target in _ASPECT_DELTAS
            ):
                # An exact aspect perfects inside this sample step,
                # before the ingress — the Moon is not void.
                return False
            prev[body] = cur
        t = t_next
    return True
