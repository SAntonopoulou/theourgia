"""Chart computation — the public entry point.

A :func:`compute_chart` call takes an instant + a location + a few
tradition parameters, asks Swiss Ephemeris for body positions, asks
the house engine for cusps, runs aspect detection, and returns a
:class:`ChartResult` carrying everything a renderer needs.

All longitudes in the result are **tropical** by convention. Sidereal
consumers apply the ayanāṃśa offset themselves so the underlying
ephemeris stays a single source of truth. The :class:`Placement`
exposes both forms for convenience.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Final

import swisseph as swe

from theourgia.core.astro.aspects import Aspect, detect_aspects
from theourgia.core.astro.attribution import ATTRIBUTION
from theourgia.core.astro.bodies import BODIES, Body
from theourgia.core.astro.houses import HouseSystem, Houses, compute_houses
from theourgia.core.astro.zodiac import (
    Ayanamsa,
    SignPosition,
    Zodiac,
    sign_of,
)

__all__ = ["ChartRequest", "ChartResult", "Placement", "compute_chart"]


_FLAGS: Final[int] = swe.FLG_MOSEPH | swe.FLG_SPEED
# FLG_MOSEPH uses the built-in Moshier analytical ephemeris (~arcsec
# accuracy, ample for astrology). FLG_SPEED returns velocities so the
# chart can flag retrograde bodies. When .se1 ephemeris files ship in
# `backend/data/ephe/`, this switches to FLG_SWIEPH for sub-arcsec
# precision — a later batch deliverable per plan/03 §"Implementation".

# Map our Ayanamsa enum onto Swiss Ephemeris ayanāṃśa codes.
_AYANAMSA_CODES: Final[dict[Ayanamsa, int]] = {
    Ayanamsa.LAHIRI: swe.SIDM_LAHIRI,
    Ayanamsa.KRISHNAMURTI: swe.SIDM_KRISHNAMURTI,
    Ayanamsa.FAGAN_BRADLEY: swe.SIDM_FAGAN_BRADLEY,
    Ayanamsa.RAMAN: swe.SIDM_RAMAN,
    Ayanamsa.YUKTESHWAR: swe.SIDM_YUKTESHWAR,
}


@dataclass(frozen=True, slots=True)
class ChartRequest:
    """Inputs for a chart computation.

    ``instant`` must be a timezone-aware UTC datetime; the substrate
    rejects naive datetimes (per the Ruff ``DTZ`` rule set we run).
    Latitude/longitude are decimal degrees (N + / S - / E + / W -).
    """

    instant: datetime
    latitude: float
    longitude: float
    zodiac: Zodiac = Zodiac.TROPICAL
    ayanamsa: Ayanamsa = Ayanamsa.LAHIRI
    house_system: HouseSystem = HouseSystem.PLACIDUS


@dataclass(frozen=True, slots=True)
class Placement:
    """A single body's position at the chart instant.

    ``tropical`` and ``sidereal`` both populate so a renderer can show
    either without re-querying. ``house`` is the 1-based house the
    body falls in given the request's house system.
    """

    body: Body
    tropical: SignPosition
    sidereal: SignPosition
    house: int
    speed: float  # ecliptic-longitude velocity (deg/day); <0 = retrograde
    is_retrograde: bool


@dataclass(frozen=True, slots=True)
class ChartResult:
    """Everything the renderer needs to draw a chart."""

    request: ChartRequest
    julian_day: float
    placements: tuple[Placement, ...]
    houses: Houses
    ascendant: SignPosition
    midheaven: SignPosition
    aspects: tuple[Aspect, ...]
    attribution: str = field(default=ATTRIBUTION)


def _julian_day(instant: datetime) -> float:
    """Convert a UTC ``datetime`` to a Julian Day for Swiss Ephemeris."""
    if instant.tzinfo is None:
        raise ValueError("compute_chart requires a tz-aware datetime")
    # Swiss Ephemeris julday expects UT (~UTC for our precision).
    decimal_hour = (
        instant.hour
        + instant.minute / 60.0
        + (instant.second + instant.microsecond / 1_000_000) / 3600.0
    )
    return swe.julday(instant.year, instant.month, instant.day, decimal_hour)


def _which_house(longitude: float, cusps: tuple[float, ...]) -> int:
    """House number for an ecliptic longitude given the cusps array."""
    # cusps[1..12] are house starts. House 1 = [cusps[1], cusps[2]),
    # etc., with wraparound at 360°. We compare angular distance from
    # cusps[1] (the ASC) modulo 360 to determine which slice.
    for i in range(1, 13):
        start = cusps[i] % 360
        end = cusps[i + 1] % 360 if i < 12 else cusps[1] % 360
        # Walk the arc from start to end the short way around.
        span_start = (longitude - start) % 360
        span_total = (end - start) % 360
        if span_total == 0:
            # Degenerate: shouldn't happen but be defensive.
            continue
        if span_start < span_total:
            return i
    return 1  # fallback — shouldn't reach here


def compute_chart(request: ChartRequest) -> ChartResult:
    """Compute every placement, house cusp, and aspect for the request."""
    jd = _julian_day(request.instant)

    # Configure sidereal mode for the ayanāṃśa lookup; chart bodies
    # come back in tropical (we'll do the sidereal conversion via a
    # separate per-request ayanāṃśa value to avoid global-state
    # contamination across concurrent requests).
    swe.set_sid_mode(_AYANAMSA_CODES[request.ayanamsa], 0, 0)
    ayanamsa_offset = swe.get_ayanamsa_ut(jd)

    houses = compute_houses(jd, request.latitude, request.longitude, request.house_system)

    placements: list[Placement] = []
    longitudes: dict[str, float] = {}

    for body in BODIES:
        try:
            pos, _ret_flag = swe.calc_ut(jd, body.swe_id, _FLAGS)
        except swe.Error:  # type: ignore[attr-defined]
            # Asteroids (Chiron, Ceres, Pallas, Vesta) require the
            # Astrodienst `seas_*.se1` files, which aren't part of
            # the Moshier built-in ephemeris. When those files
            # aren't installed, we skip the body rather than fail
            # the whole chart — the planet set is the core
            # deliverable and the asteroid pack lands when the
            # operator ships it via `backend/data/ephe/`.
            if body.category == "asteroid":
                continue
            raise
        tropical_lon = pos[0] % 360
        sidereal_lon = (tropical_lon - ayanamsa_offset) % 360
        speed = pos[3]
        placements.append(
            Placement(
                body=body,
                tropical=sign_of(tropical_lon),
                sidereal=sign_of(sidereal_lon),
                house=_which_house(tropical_lon, houses.cusps),
                speed=speed,
                is_retrograde=speed < 0,
            )
        )
        longitudes[body.id] = tropical_lon

    aspects = detect_aspects(longitudes)

    return ChartResult(
        request=request,
        julian_day=jd,
        placements=tuple(placements),
        houses=houses,
        ascendant=sign_of(houses.ascendant),
        midheaven=sign_of(houses.midheaven),
        aspects=tuple(aspects),
    )
