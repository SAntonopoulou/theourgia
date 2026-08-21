"""Sect — held to AstroPractise's own ``sect_test.dart`` cases.

Sect is the first consideration in any chart judgment, and getting it wrong
inverts every benefic and malefic — silently, because the chart still renders.
These cases are ported verbatim from the canonical engine's test so the Python
port is pinned to the same answers.
"""

from __future__ import annotations

import pytest

from theourgia.core.astro.hellenistic import sect as sect_rules
from theourgia.core.astro.hellenistic.bodies import Planet
from theourgia.core.astro.hellenistic.sect import Sect, SectStanding

# Ascendant 0° Cancer (90°) → Descendant 0° Capricorn (270°). The Sun is above
# the horizon between 270° and 90° (through Capricorn..Gemini).
_ASC = 90.0


def _sect(sun: float, asc: float = _ASC) -> Sect:
    return sect_rules.determine(sun, asc).sect


@pytest.mark.parametrize(
    ("sun", "expected"),
    [
        (271.0, Sect.DIURNAL),  # just past the Descendant — 7th place, still above
        (0.0, Sect.DIURNAL),  # 0° Aries — 10th place from Cancer
        (89.0, Sect.DIURNAL),  # 12th place — risen, not yet at the horizon
        (91.0, Sect.NOCTURNAL),  # 1st place — just below the eastern horizon
        (180.0, Sect.NOCTURNAL),  # 0° Libra — 4th place
        (269.0, Sect.NOCTURNAL),  # 6th place — just before the Descendant
    ],
)
def test_day_night_by_the_ascendant_descendant_axis(sun: float, expected: Sect) -> None:
    assert _sect(sun) == expected


def test_the_two_halves_partition_the_ecliptic_exactly() -> None:
    day = sum(1 for i in range(360) if _sect(0.5 + i) is Sect.DIURNAL)
    night = 360 - day
    assert day == night, "the horizon bisects the ecliptic"


def test_wraps_for_an_ascendant_near_0_aries() -> None:
    assert _sect(90.0, asc=1.0) is Sect.NOCTURNAL
    assert _sect(270.0, asc=1.0) is Sect.DIURNAL


def test_flags_the_borderline_the_sources_do_not_resolve() -> None:
    assert sect_rules.determine(90.5, _ASC).is_borderline
    assert sect_rules.determine(89.5, _ASC).is_borderline
    assert not sect_rules.determine(100.0, _ASC).is_borderline


def test_the_planets_of_each_sect() -> None:
    assert sect_rules.light_of(Sect.DIURNAL) is Planet.SUN
    assert sect_rules.light_of(Sect.NOCTURNAL) is Planet.MOON
    assert sect_rules.benefic_of(Sect.DIURNAL) is Planet.JUPITER
    assert sect_rules.benefic_of(Sect.NOCTURNAL) is Planet.VENUS
    assert sect_rules.malefic_of(Sect.DIURNAL) is Planet.SATURN
    assert sect_rules.malefic_of(Sect.NOCTURNAL) is Planet.MARS
    assert sect_rules.malefic_contrary_to(Sect.DIURNAL) is Planet.MARS
    assert sect_rules.malefic_contrary_to(Sect.NOCTURNAL) is Planet.SATURN


def test_fixed_membership_and_the_nodes() -> None:
    assert sect_rules.sect_of(Planet.SUN) is Sect.DIURNAL
    assert sect_rules.sect_of(Planet.SATURN) is Sect.DIURNAL
    assert sect_rules.sect_of(Planet.MARS) is Sect.NOCTURNAL
    assert sect_rules.sect_of(Planet.NORTH_NODE) is None  # a point, no sect


def test_mercury_follows_its_solar_phase() -> None:
    assert sect_rules.sect_of(Planet.MERCURY, mercury_is_morning_star=True) is Sect.DIURNAL
    assert sect_rules.sect_of(Planet.MERCURY, mercury_is_morning_star=False) is Sect.NOCTURNAL
    assert sect_rules.sect_of(Planet.MERCURY) is None  # unknown phase → undetermined


def test_morning_star_is_a_lower_longitude_than_the_sun() -> None:
    # Planet at 10°, Sun at 20°: the planet rises ahead — morning star.
    assert sect_rules.is_morning_star(planet_longitude=10.0, sun_longitude=20.0)
    # Planet at 30°, Sun at 20°: the planet trails — evening star.
    assert not sect_rules.is_morning_star(planet_longitude=30.0, sun_longitude=20.0)


def test_standing_relative_to_the_chart_sect() -> None:
    # A diurnal chart: the Sun leads, Jupiter is of the sect, Mars is contrary.
    assert sect_rules.standing_of(Planet.SUN, Sect.DIURNAL) is SectStanding.SECT_LIGHT
    assert sect_rules.standing_of(Planet.JUPITER, Sect.DIURNAL) is SectStanding.OF_SECT
    assert sect_rules.standing_of(Planet.SATURN, Sect.DIURNAL) is SectStanding.OF_SECT
    assert sect_rules.standing_of(Planet.MARS, Sect.DIURNAL) is SectStanding.CONTRARY_TO_SECT
    assert sect_rules.standing_of(Planet.NORTH_NODE, Sect.DIURNAL) is None
