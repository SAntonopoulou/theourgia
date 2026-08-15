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
:func:`theourgia.core.astro.chart.compute_chart`) and the birth moment.

## ⚠ THE YEAR TURNS AT AN INSTANT, NOT AT MIDNIGHT

A profection turns on the Sun's return to its own degree — the birthday
*within a day*, and never the first of January. That return happens at a
moment, so :func:`profection_at` takes two ``datetime``s and is the one to
use.

:func:`profection_for_date` is kept for callers who genuinely hold nothing
but a date, and it is **lossy**: it assumes midnight, so for anyone born in
the evening it advances the lord of the year up to a day early. Two people
asking at the same instant from Auckland and Los Angeles also get different
dates, and therefore different lords.

⚠ **practiseapp is the source of truth and it counts from the instant**
(`lib/domain/astrology/time_lords.dart`). The two implementations were found
to disagree by a whole year — different house, different lord — for up to a
day around every birthday; see `tests/vectors/README.md`. `profection_at`
exists so this side can agree.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date as date_cls
from datetime import datetime
from datetime import UTC
from typing import Final

from theourgia.core.astro.planetary_hours import Planet
from theourgia.core.astro.zodiac import SIGNS

__all__ = [
    "Profection",
    "TRADITIONAL_RULERS",
    "age_at",
    "completed_years",
    "profection_at",
    "profection_for_date",
]


# Sign index (1 = Aries) → traditional (pre-modern) domicile ruler.
TRADITIONAL_RULERS: Final[dict[int, Planet]] = {
    1: Planet.MARS,  # Aries
    2: Planet.VENUS,  # Taurus
    3: Planet.MERCURY,  # Gemini
    4: Planet.MOON,  # Cancer
    5: Planet.SUN,  # Leo
    6: Planet.MERCURY,  # Virgo
    7: Planet.VENUS,  # Libra
    8: Planet.MARS,  # Scorpio
    9: Planet.JUPITER,  # Sagittarius
    10: Planet.SATURN,  # Capricorn
    11: Planet.SATURN,  # Aquarius
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
        raise ValueError(f"on_date {on_date} precedes birth_date {birth_date}.")
    years = on_date.year - birth_date.year
    if (on_date.month, on_date.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def completed_years(born: datetime, at: datetime) -> int:
    """Completed years between two MOMENTS.

    ⚠ The one that matches practiseapp. Somebody born at 18:00 has not
    completed another year at 09:00 on their birthday, and their lord of the
    year has not changed yet — which is what the doctrine says and what the
    phone implements.

    Both arguments must be timezone-aware; comparing an aware moment with a
    naive one is the bug this refuses rather than guesses at.
    """
    if born.tzinfo is None or at.tzinfo is None:
        msg = "both moments must be timezone-aware (a naive one has no instant)"
        raise ValueError(msg)
    born_utc = born.astimezone(UTC)
    at_utc = at.astimezone(UTC)
    if at_utc < born_utc:
        raise ValueError(f"at {at_utc} precedes birth {born_utc}.")
    years = at_utc.year - born_utc.year
    if (at_utc.month, at_utc.day, at_utc.hour, at_utc.minute, at_utc.second) < (
        born_utc.month,
        born_utc.day,
        born_utc.hour,
        born_utc.minute,
        born_utc.second,
    ):
        years -= 1
    return years


def profection_at(
    born: datetime,
    at: datetime,
    ascendant_sign: int,
) -> Profection:
    """The annual profection in force at the moment ``at``.

    ⚠ **Use this one.** It counts from the birth instant, so it agrees with
    practiseapp — see the module note for the disagreement that made it
    necessary and `tests/test_astro_vectors.py` for the fixture that holds
    the two together.

    ``ascendant_sign`` is the natal Ascendant's whole-sign index
    (1 = Aries … 12 = Pisces), i.e. the natal 1st house.
    """
    if not (1 <= ascendant_sign <= 12):
        raise ValueError(f"ascendant_sign must be 1..12; got {ascendant_sign}.")
    age = completed_years(born, at)
    sign = ((ascendant_sign - 1 + age) % 12) + 1
    return Profection(
        age=age,
        profected_house=(age % 12) + 1,
        profected_sign=sign,
        # ⚠ SIGNS is 1-INDEXED: SIGNS[0] is a placeholder so SIGNS[1] is Aries.
        profected_sign_name=SIGNS[sign],
        year_lord=TRADITIONAL_RULERS[sign],
    )


def profection_for_date(
    birth_date: date_cls,
    on_date: date_cls,
    ascendant_sign: int,
) -> Profection:
    """The annual profection on ``on_date``, counting whole days.

    ⚠ **LOSSY, and kept only for callers holding nothing but a date.** It
    assumes the year turns at midnight, so for anyone born in the evening it
    advances the lord of the year up to a day early — and it disagrees with
    practiseapp for exactly that long, every birthday. Prefer
    :func:`profection_at`.

    ``ascendant_sign`` is the natal Ascendant's whole-sign index
    (1 = Aries … 12 = Pisces), i.e. the natal 1st house.
    """
    if not (1 <= ascendant_sign <= 12):
        raise ValueError(f"ascendant_sign must be 1..12; got {ascendant_sign}.")
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
