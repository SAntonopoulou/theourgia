"""Islamic calendar — civil (tabular) arithmetic variant. v1-016.

Pure-Python implementation of the arithmetic ("tabular", type II)
Islamic calendar following Reingold & Dershowitz, *Calendrical
Calculations* 4th ed., Ch. 7: a 30-year cycle with 11 leap years
(years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29), months alternating
30/29 days, and Dhu al-Hijjah taking 30 days in leap years. Epoch:
1 Muharram 1 AH = 16 July 622 CE **Julian** (19 July proleptic
Gregorian) — the civil (Friday) epoch, R.D. 227015.

**Honesty note**: this is the arithmetic calendar, not the observed
one. Real-world Islamic practice starts each month at the sighting of
the new crescent moon, which regional authorities determine locally —
dates can differ from the tabular calendar by a day or two either
way. The display name says "civil (tabular)" so no false precision is
claimed; treat these dates as bookkeeping approximations, not
liturgical rulings.

Like the Hebrew calendar, the Islamic day begins at sunset. We
present the civil-style date for the UTC civil day; the precise
sunset boundary belongs to the astronomy engine, same caveat as
hebrew.py.
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)
from theourgia.core.calendars.rd import gregorian_to_rd, rd_to_gregorian


ISLAMIC_EPOCH = 227015  # R.D. of 1 Muharram 1 AH (16 Jul 622 Julian, civil epoch).
# Verified against Reingold & Dershowitz and the widely documented
# anchor 1 Jan 2000 = 24 Ramadan 1420 AH — see test_islamic_* in
# tests/test_calendars_v1.py.


ISLAMIC_MONTH_NAMES = (
    "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
    "Jumada al-Ula", "Jumada al-Akhira", "Rajab", "Shaban",
    "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah",
)


def _is_islamic_leap(year: int) -> bool:
    """11 leap years per 30-year cycle: (11y + 14) mod 30 < 11."""
    return (11 * year + 14) % 30 < 11


def _last_day_of_islamic_month(year: int, month: int) -> int:
    if month % 2 == 1:
        return 30
    if month == 12 and _is_islamic_leap(year):
        return 30
    return 29


def _islamic_to_rd(year: int, month: int, day: int) -> int:
    return (
        ISLAMIC_EPOCH
        - 1
        + (year - 1) * 354
        + (3 + 11 * year) // 30
        + 29 * (month - 1)
        + month // 2
        + day
    )


def _rd_to_islamic(rd: int) -> tuple[int, int, int]:
    year = (30 * (rd - ISLAMIC_EPOCH) + 10_646) // 10_631
    for m in range(1, 13):
        if _islamic_to_rd(year, m, 1) + _last_day_of_islamic_month(year, m) > rd:
            day = rd - _islamic_to_rd(year, m, 1) + 1
            return year, m, day
    raise RuntimeError(f"R.D. {rd} not located in Islamic year {year}")


class IslamicCalendar:
    id: str = "islamic"
    name: str = "Islamic (civil)"
    family: str = "lunar"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Islamic.from_instant requires a tz-aware datetime")
        d = instant.astimezone(UTC).date()
        rd = gregorian_to_rd(d.year, d.month, d.day)
        y, m, day = _rd_to_islamic(rd)
        month_name = ISLAMIC_MONTH_NAMES[m - 1]

        long_str = f"{day} {month_name} {y} AH"
        short_str = f"{day} {month_name.split()[0][:3]} {y}"
        numeric = f"{y:04d}-{m:02d}-{day:02d}"

        return CalendarDate(
            calendar_id=self.id,
            year=y,
            month=m,
            day=day,
            long=long_str,
            short=short_str,
            numeric=numeric,
            with_day_name=long_str,
            locale=locale,
            raw={
                "month_name": month_name,
                "is_leap_year": _is_islamic_leap(y),
                "variant": "civil (tabular)",
                "rd": rd,
            },
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Islamic.",
            )
        rd = _islamic_to_rd(date.year, date.month, date.day)
        gy, gm, gd = rd_to_gregorian(rd)
        return datetime(gy, gm, gd, tzinfo=UTC)


register_calendar(IslamicCalendar())
