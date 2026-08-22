"""Moon void-of-course computation, under either of the two doctrines.

The two rules are genuinely different doctrines, not two orbs on one
idea, and the practitioner chooses between them (``astro.doctrine``):

* ``thirtyDegrees`` — Hellenistic *kenodromia* (Anthology, B p. 304):
  the Moon completes no exact configuration, bodily or by degree,
  within her next THIRTY DEGREES OF TRAVEL, **regardless of sign
  boundaries**. Canon is explicit that the scan must not truncate at
  the sign's edge; voids are rare under this reading, and the rarity
  is the doctrine. This is the ledger default.
* ``signExit`` — the later (Lilly / horary) rule: void iff no exact
  Ptolemaic aspect to a classical planet perfects between now and her
  next sign ingress. This is what most modern software implements.

Implementation notes:

* The ingress (and the thirty-degree instant) are found by scanning
  forward hourly and bisecting the crossing — the same bracketing
  technique as :mod:`theourgia.core.astro.events`.
* Aspect perfection is detected by sampling the Moon-planet angular
  separation on a 30-minute grid up to the bound and watching for the
  separation to cross an exact aspect angle. The separation changes
  by well under a degree per sample step, so a crossing cannot be
  skipped.
* Everything runs on the bundled Moshier ephemeris (``FLG_MOSEPH``),
  matching the rest of the astro engine.

The outer planets are excluded on purpose — both rules predate their
discovery. The nodes are excluded too: they are points, not bodies,
and the sources do not have the Moon perfecting to them (the phone's
engines refuse them the same way).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import swisseph as swe

__all__ = [
    "is_void_of_course",
    "moon_next_sign_ingress",
    "moon_advances_by",
]


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


def moon_advances_by(moment: datetime, degrees: float) -> datetime:
    """The instant the Moon stands ``degrees`` forward of where she stood.

    Scanned hourly and bisected, like the ingress. The forward arc is
    monotone — the Moon never retrogrades — so a first-crossing search is
    sound. Thirty degrees takes at most ~61 hours; the four-day cap exists
    so a broken ephemeris cannot spin forever.
    """
    start = _ensure_utc(moment)
    start_lon = _longitude(_to_jd(start), swe.MOON)

    def arc_at(t: datetime) -> float:
        return (_longitude(_to_jd(t), swe.MOON) - start_lon) % 360

    step = timedelta(hours=1)
    deadline = start + _MAX_INGRESS_SCAN
    t = start
    while t < deadline:
        t_next = t + step
        if arc_at(t_next) >= degrees:
            lo, hi = t, t_next
            for _ in range(40):
                mid = lo + (hi - lo) / 2
                if arc_at(mid) < degrees:
                    lo = mid
                else:
                    hi = mid
            return hi
        t = t_next
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


def is_void_of_course(moment: datetime, rule: str = "thirtyDegrees") -> bool:
    """True iff the Moon is void of course at ``moment`` under ``rule``.

    ``thirtyDegrees`` (the ledger default) scans to the instant the Moon
    has travelled thirty degrees — straight across any sign boundary, as
    canon demands. ``signExit`` scans only to her next ingress. An unknown
    rule reads as the default rather than raising: the caller's stored
    doctrine may be older or newer than this build.
    """
    start = _ensure_utc(moment)
    if rule == "signExit":
        bound = moon_next_sign_ingress(start)
    else:
        bound = moon_advances_by(start, 30.0)

    prev = {body: _delta(_to_jd(start), body) for body in _VOC_BODIES}
    t = start
    while t < bound:
        t_next = min(t + _SAMPLE_STEP, bound)
        jd_next = _to_jd(t_next)
        for body in _VOC_BODIES:
            cur = _delta(jd_next, body)
            if any(
                _crossed(prev[body], cur, target)
                for target in _ASPECT_DELTAS
            ):
                # An exact aspect perfects inside this sample step,
                # before the bound — the Moon is not void.
                return False
            prev[body] = cur
        t = t_next
    return True
