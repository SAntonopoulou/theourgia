"""French Republican calendar — arithmetic (Romme) variant. v1-016.

Pure-Python implementation following Reingold & Dershowitz,
*Calendrical Calculations* 4th ed., Ch. 17 (the arithmetic form).
Twelve months of 30 days (Vendémiaire through Fructidor) plus five
complementary days — six in leap years — the *sansculottides*,
treated here as a short thirteenth month. Epoch: 1 Vendémiaire An I =
22 September 1792 Gregorian (the proclamation of the Republic),
R.D. 654415.

**Honesty note**: the calendar as actually used (1793-1805) began
each year at the autumnal equinox observed at Paris, making years
III, VII, and XI the sextile (leap) years. This module implements
Romme's proposed arithmetic rule instead — leap when the year is
divisible by 4, except centuries not divisible by 400, except
year 4000 — which is regular and proleptic but can differ from
historical documents of the Revolutionary period by a day. The
``long`` form renders the year as a Roman numeral in the historical
style ("9 Thermidor An II").
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)
from theourgia.core.calendars.rd import gregorian_to_rd, rd_to_gregorian


FRENCH_EPOCH = 654415  # R.D. of 1 Vendémiaire An I (22 Sep 1792 Gregorian).


FRENCH_MONTH_NAMES = (
    "Vendémiaire", "Brumaire", "Frimaire", "Nivôse", "Pluviôse",
    "Ventôse", "Germinal", "Floréal", "Prairial", "Messidor",
    "Thermidor", "Fructidor", "Sansculottides",
)

# The five (six in leap years) complementary days each carry a name.
SANSCULOTTIDES_DAY_NAMES = (
    "Fête de la Vertu", "Fête du Génie", "Fête du Travail",
    "Fête de l'Opinion", "Fête des Récompenses", "Fête de la Révolution",
)


def _roman_upper(n: int) -> str:
    """Uppercase Roman numeral for 1..3999 — "An CCXXXIV" style."""
    if n <= 0:
        raise ValueError("Roman numerals require a positive integer.")
    table = [
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
        (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
        (10, "X"), (9, "IX"), (5, "V"), (4, "IV"),
        (1, "I"),
    ]
    out: list[str] = []
    for value, glyph in table:
        while n >= value:
            out.append(glyph)
            n -= value
    return "".join(out)


def _is_french_leap(year: int) -> bool:
    """Romme's arithmetic rule (R&D "arithmetic French")."""
    return (
        year % 4 == 0
        and year % 400 not in (100, 200, 300)
        and year % 4000 != 0
    )


def _french_to_rd(year: int, month: int, day: int) -> int:
    return (
        FRENCH_EPOCH
        - 1
        + 365 * (year - 1)
        + (year - 1) // 4
        - (year - 1) // 100
        + (year - 1) // 400
        - (year - 1) // 4000
        + 30 * (month - 1)
        + day
    )


def _rd_to_french(rd: int) -> tuple[int, int, int]:
    approx = (rd - FRENCH_EPOCH + 2) * 4000 // 1_460_969 + 1
    year = approx - 1 if rd < _french_to_rd(approx, 1, 1) else approx
    month = (rd - _french_to_rd(year, 1, 1)) // 30 + 1
    day = rd - _french_to_rd(year, month, 1) + 1
    return year, month, day


class FrenchRepublicanCalendar:
    id: str = "french-republican"
    name: str = "French Republican"
    family: str = "solar"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError(
                "FrenchRepublican.from_instant requires a tz-aware datetime",
            )
        d = instant.astimezone(UTC).date()
        rd = gregorian_to_rd(d.year, d.month, d.day)
        y, m, day = _rd_to_french(rd)
        month_name = FRENCH_MONTH_NAMES[m - 1]
        year_roman = _roman_upper(y)

        long_str = f"{day} {month_name} An {year_roman}"
        short_str = f"{day} {month_name[:4]} An {y}"
        numeric = f"{y:04d}-{m:02d}-{day:02d}"
        # The complementary days are festivals with proper names.
        with_day_name = (
            f"{SANSCULOTTIDES_DAY_NAMES[day - 1]}, An {year_roman}"
            if m == 13
            else long_str
        )

        return CalendarDate(
            calendar_id=self.id,
            year=y,
            month=m,
            day=day,
            long=long_str,
            short=short_str,
            numeric=numeric,
            with_day_name=with_day_name,
            locale=locale,
            raw={
                "month_name": month_name,
                "year_roman": year_roman,
                "is_leap_year": _is_french_leap(y),
                "variant": "arithmetic (Romme)",
                "rd": rd,
            },
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not "
                "French Republican.",
            )
        rd = _french_to_rd(date.year, date.month, date.day)
        gy, gm, gd = rd_to_gregorian(rd)
        return datetime(gy, gm, gd, tzinfo=UTC)


register_calendar(FrenchRepublicanCalendar())
