"""Sect (*hairesis*) — the first thing determined about a chart.

A faithful port of ``astropractise/lib/domain/astrology/sect.dart``. Everything
downstream depends on it — which benefic helps most, which malefic does real
harm, which luminary leads. Get sect wrong and every benefic/malefic judgment
in the chart inverts.

⚠ Day/night is Brennan's ecliptic Ascendant/Descendant rule, NOT the Sun's
altitude and NOT the clock: the Sun is diurnal once it is in the half of the
ecliptic above the horizon — its arc from the Descendant, in zodiacal order,
under 180°. (An altitude rule folds in refraction and parallax the tradition
did not compute; whole-sign houses straddle the horizon and give a different
answer in the rising/setting sign. Both are wrong here.)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .bodies import Planet


class Sect(Enum):
    """Whether the chart is of the day or of the night."""

    DIURNAL = "day chart"
    NOCTURNAL = "night chart"

    @property
    def opposite(self) -> Sect:
        return Sect.NOCTURNAL if self is Sect.DIURNAL else Sect.DIURNAL


class SectStanding(Enum):
    """A planet's standing relative to the chart's sect."""

    # The luminary leading the sect in favour: the Sun by day, the Moon by night.
    SECT_LIGHT = "sect light"
    # Of the sect in favour — including the malefic of the sect, which does
    # correspondingly less harm.
    OF_SECT = "of sect"
    # Contrary to the sect — where the tradition locates real difficulty.
    CONTRARY_TO_SECT = "contrary to sect"


@dataclass(frozen=True, slots=True)
class SectDetermination:
    """The result of a sect determination, including whether it can be trusted."""

    sect: Sect
    # The Sun's arc in zodiacal order from the Descendant, 0-360°. Below 180°
    # places the Sun above the horizon.
    sun_arc_from_descendant: float
    # ⚠ The Sun is close enough to an angle that the determination is not safe.
    # No ancient source resolves this case; the widely repeated "3-5° is mixed
    # sect" advice has no primary basis. The engine does not decide here — it
    # flags, and lets the divergence be seen. A flag only; nothing downstream
    # reads it to choose a sect.
    is_borderline: bool


# How close to an angle counts as borderline, in degrees of ecliptic longitude
# either side. Ours, not the tradition's — a flagging threshold, never a
# decision rule. One degree is roughly four minutes of birth time.
BORDERLINE_DEGREES = 1.0


def _norm(d: float) -> float:
    return ((d % 360.0) + 360.0) % 360.0


def _arc_distance(a: float, b: float) -> float:
    """Shortest angular distance between two longitudes, 0-180°."""
    d = _norm(a - b)
    return 360.0 - d if d > 180.0 else d


def determine(sun_longitude: float, ascendant: float) -> SectDetermination:
    """Determine the sect of a chart from the Sun's longitude and the Ascendant.

    Diurnal as soon as the Sun rises above the exact degree of the Ascendant,
    nocturnal once it sets below the Descendant. Degree-based — not by sign, not
    by house number, not by clock.
    """
    descendant = _norm(ascendant + 180.0)
    # Houses run in zodiacal order from the Ascendant: 1-6 below the horizon,
    # 7-12 above. The Sun is above the horizon exactly when its arc from the
    # Descendant, in zodiacal order, is under 180°.
    arc = _norm(sun_longitude - descendant)
    above = arc < 180.0
    nearest = min(_arc_distance(sun_longitude, descendant), _arc_distance(sun_longitude, ascendant))
    return SectDetermination(
        sect=Sect.DIURNAL if above else Sect.NOCTURNAL,
        sun_arc_from_descendant=arc,
        is_borderline=nearest <= BORDERLINE_DEGREES,
    )


def light_of(sect: Sect) -> Planet:
    """The luminary leading the sect in favour."""
    return Planet.SUN if sect is Sect.DIURNAL else Planet.MOON


def benefic_of(sect: Sect) -> Planet:
    """The benefic of the sect — the one whose help actually lands."""
    return Planet.JUPITER if sect is Sect.DIURNAL else Planet.VENUS


def malefic_of(sect: Sect) -> Planet:
    """The malefic *of* the sect — still a malefic, but its difficulties are
    ones the native can overcome."""
    return Planet.SATURN if sect is Sect.DIURNAL else Planet.MARS


def malefic_contrary_to(sect: Sect) -> Planet:
    """The malefic *contrary to* the sect — where the real difficulty sits."""
    return Planet.MARS if sect is Sect.DIURNAL else Planet.SATURN


# Fixed sect membership, before Mercury. Diurnal: Sun, Jupiter, Saturn.
# Nocturnal: Moon, Venus, Mars. Complete agreement between both authorities.
_FIXED: dict[Planet, Sect] = {
    Planet.SUN: Sect.DIURNAL,
    Planet.JUPITER: Sect.DIURNAL,
    Planet.SATURN: Sect.DIURNAL,
    Planet.MOON: Sect.NOCTURNAL,
    Planet.VENUS: Sect.NOCTURNAL,
    Planet.MARS: Sect.NOCTURNAL,
}


def sect_of(body: Planet, *, mercury_is_morning_star: bool | None = None) -> Sect | None:
    """Which sect a planet belongs to; None for the nodes (points, not bodies).

    ⚠ Mercury is genuinely unsettled — five competing ancient rules. Implemented
    is the Ptolemy/Porphyry default (both authors'): morning star → diurnal,
    evening star → nocturnal. The variants belong behind an authority selector.
    Its sect should be weighted lightly in any condition rollup.
    """
    if body.is_node:
        return None
    if body is Planet.MERCURY:
        if mercury_is_morning_star is None:
            return None
        return Sect.DIURNAL if mercury_is_morning_star else Sect.NOCTURNAL
    return _FIXED.get(body)


def is_morning_star(planet_longitude: float, sun_longitude: float) -> bool:
    """Is a planet a morning star — rising ahead of (a lower longitude than) the
    Sun? The test is the arc from the planet to the Sun in zodiacal order: under
    180° and the planet is of the morning. (Invert this and every solar-phase
    judgment inverts, quietly.)"""
    arc = _norm(sun_longitude - planet_longitude)
    return 0 < arc < 180.0


def standing_of(
    body: Planet,
    chart_sect: Sect,
    *,
    mercury_is_morning_star: bool | None = None,
) -> SectStanding | None:
    """How a planet stands relative to the chart's sect; None for the nodes."""
    if body.is_node:
        return None
    if body is light_of(chart_sect):
        return SectStanding.SECT_LIGHT
    planet_sect = sect_of(body, mercury_is_morning_star=mercury_is_morning_star)
    if planet_sect is None:
        return None
    return SectStanding.OF_SECT if planet_sect is chart_sect else SectStanding.CONTRARY_TO_SECT
