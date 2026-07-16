"""Coptic calendar — Anno Martyrum. v1-016.

Pure-Python implementation following Reingold & Dershowitz,
*Calendrical Calculations* 4th ed., Ch. 4. Twelve months of 30 days
plus a short thirteenth month of epagomenal days ("Pi Kogi Enavot",
the little month) of 5 days — 6 in leap years (year mod 4 == 3), the
same quadrennial rhythm as the Julian calendar it tracks. Epoch:
1 Thout 1 AM = 29 August 284 CE Julian, R.D. 103605 — the accession
year of Diocletian, whose persecutions give the era its name
("Anno Martyrum", the Year of the Martyrs).

The Coptic New Year (Nayrouz, 1 Thout) falls on 11 September
Gregorian through 2099 — 12 September in the year preceding a Julian
leap year. Anchors verified: 1 Thout 1740 = 12 Sep 2023 · 1741 =
11 Sep 2024 · 1742 = 11 Sep 2025.
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)
from theourgia.core.calendars.rd import gregorian_to_rd, rd_to_gregorian


COPTIC_EPOCH = 103605  # R.D. of 1 Thout AM 1 (29 Aug 284 CE Julian).


COPTIC_MONTH_NAMES = (
    "Thout", "Paopi", "Hathor", "Koiak", "Tobi", "Meshir",
    "Paremhat", "Parmouti", "Pashons", "Paoni", "Epip", "Mesori",
    "Pi Kogi Enavot",
)


def _is_coptic_leap(year: int) -> bool:
    return year % 4 == 3


def _coptic_to_rd(year: int, month: int, day: int) -> int:
    return (
        COPTIC_EPOCH
        - 1
        + 365 * (year - 1)
        + year // 4
        + 30 * (month - 1)
        + day
    )


def _rd_to_coptic(rd: int) -> tuple[int, int, int]:
    year = (4 * (rd - COPTIC_EPOCH) + 1463) // 1461
    month = (rd - _coptic_to_rd(year, 1, 1)) // 30 + 1
    day = rd + 1 - _coptic_to_rd(year, month, 1)
    return year, month, day


class CopticCalendar:
    id: str = "coptic"
    name: str = "Coptic"
    family: str = "solar"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Coptic.from_instant requires a tz-aware datetime")
        d = instant.astimezone(UTC).date()
        rd = gregorian_to_rd(d.year, d.month, d.day)
        y, m, day = _rd_to_coptic(rd)
        month_name = COPTIC_MONTH_NAMES[m - 1]

        long_str = f"{day} {month_name} {y} AM"
        short_str = f"{day} {month_name[:3]} {y}"
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
                "era": "Anno Martyrum",
                "is_leap_year": _is_coptic_leap(y),
                "rd": rd,
            },
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Coptic.",
            )
        rd = _coptic_to_rd(date.year, date.month, date.day)
        gy, gm, gd = rd_to_gregorian(rd)
        return datetime(gy, gm, gd, tzinfo=UTC)


register_calendar(CopticCalendar())
