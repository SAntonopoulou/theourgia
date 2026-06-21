"""House systems.

Houses divide the celestial sphere into twelve segments based on the
moment + location of the chart. Different schools use different
division methods, with substantive interpretive consequences. This
batch ships **Placidus** (modern Western default) and **Whole Sign**
(Hellenistic + traditional default). The remaining seven systems
listed in `plan/03-time-and-cosmos.md` §2 land in later batches; the
substrate stays the same.

Whole Sign is conceptually different: the rising sign IS the first
house. So house cusps coincide with sign boundaries — there's no
ambiguity at high latitudes. Placidus, by contrast, is time-based
(it divides diurnal/nocturnal arcs into 6 each) and is undefined
above the Arctic Circle.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

import swisseph as swe

__all__ = ["HouseSystem", "Houses", "compute_houses"]


class HouseSystem(str, Enum):
    """The two house systems shipped this batch."""

    PLACIDUS = "placidus"
    WHOLE_SIGN = "whole-sign"


_SWE_CODES: dict[HouseSystem, bytes] = {
    HouseSystem.PLACIDUS: b"P",
    HouseSystem.WHOLE_SIGN: b"W",
}


@dataclass(frozen=True, slots=True)
class Houses:
    """The twelve house cusps and the four angles.

    Cusps are 1-indexed: ``cusps[1]`` is the Ascendant / 1st house.
    ``cusps[0]`` is unused (placeholder so the indexing reads
    naturally in chart-rendering code).
    """

    system: HouseSystem
    cusps: tuple[float, ...]  # length 13: cusps[0] unused, cusps[1..12]
    ascendant: float
    midheaven: float
    armc: float
    vertex: float


def compute_houses(
    julian_day: float,
    latitude: float,
    longitude: float,
    system: HouseSystem,
) -> Houses:
    """Compute house cusps + angles for the chart instant + location.

    Latitude and longitude are decimal degrees. Returns the result
    in tropical longitudes; sidereal callers offset by the ayanāṃśa
    themselves to keep this function tradition-agnostic.
    """
    code = _SWE_CODES[system]
    cusps_array, ascmc = swe.houses(julian_day, latitude, longitude, code)
    return Houses(
        system=system,
        cusps=(0.0, *cusps_array),
        ascendant=ascmc[0],
        midheaven=ascmc[1],
        armc=ascmc[2],
        vertex=ascmc[3],
    )
