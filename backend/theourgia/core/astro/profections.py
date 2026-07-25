"""Annual profections — whole-sign time-lord arithmetic.

The Hellenistic annual profection advances the Ascendant one
whole-sign house per year of life: at age 0 the year belongs to the
1st house (the natal Ascendant sign), at age 1 the 2nd, wrapping
every 12 years. The sign the year lands in is the *profected sign*;
its **traditional** ruler is the *lord of the year* — the planet
whose condition (natally and by transit) colors the year.

Traditional rulerships only (Mars rules Scorpio, Saturn rules
Aquarius, Jupiter rules Pisces — no modern outer-planet rulers), per
the Hellenistic sources (Vettius Valens, *Anthology* IV; Paulus
Alexandrinus, *Introduction* 31).

Pure arithmetic — the caller supplies the natal Ascendant sign (from
:func:`theourgia.core.astro.chart.compute_chart`) and the birth date.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date as date_cls
from typing import Final

from theourgia.core.astro.planetary_hours import Planet
from theourgia.core.astro.zodiac import SIGNS

__all__ = [
    "Profection",
    "TRADITIONAL_RULERS",
    "age_at",
    "profection_for_date",
]


# Sign index (1 = Aries) → traditional (pre-modern) domicile ruler.
TRADITIONAL_RULERS: Final[dict[int, Planet]] = {
    1: Planet.MARS,      # Aries
    2: Planet.VENUS,     # Taurus
    3: Planet.MERCURY,   # Gemini
    4: Planet.MOON,      # Cancer
    5: Planet.SUN,       # Leo
    6: Planet.MERCURY,   # Virgo
    7: Planet.VENUS,     # Libra
    8: Planet.MARS,      # Scorpio
    9: Planet.JUPITER,   # Sagittarius
    10: Planet.SATURN,   # Capricorn
    11: Planet.SATURN,   # Aquarius
    12: Planet.JUPITER,  # Pisces
}


@dataclass(frozen=True, slots=True)
class Profection:
    """One year's profection."""

    age: int  # completed years at the queried date
    profected_house: int  # 1..12 (age mod 12, from the 1st)
    profected_sign: int  # 1..12 (1 = Aries)
    profected_sign_name: str
    year_lord: Planet  # traditional ruler of the profected sign


def age_at(birth_date: date_cls, on_date: date_cls) -> int:
    """Completed years of life at ``on_date``.

    Standard birthday arithmetic; a Feb-29 birth counts its birthday
    on Mar 1 in common years (the astrological year turns when the
    full year has elapsed).
    """
    if on_date < birth_date:
        raise ValueError(
            f"on_date {on_date} precedes birth_date {birth_date}."
        )
    years = on_date.year - birth_date.year
    if (on_date.month, on_date.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def profection_for_date(
    birth_date: date_cls,
    on_date: date_cls,
    ascendant_sign: int,
) -> Profection:
    """The annual profection in effect at ``on_date``.

    ``ascendant_sign`` is the natal Ascendant's whole-sign index
    (1 = Aries … 12 = Pisces), i.e. the natal 1st house.
    """
    if not (1 <= ascendant_sign <= 12):
        raise ValueError(
            f"ascendant_sign must be 1..12; got {ascendant_sign}."
        )
    age = age_at(birth_date, on_date)
    house = (age % 12) + 1
    sign = ((ascendant_sign - 1 + age) % 12) + 1
    return Profection(
        age=age,
        profected_house=house,
        profected_sign=sign,
        profected_sign_name=SIGNS[sign],
        year_lord=TRADITIONAL_RULERS[sign],
    )
