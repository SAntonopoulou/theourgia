"""Hebrew calendar — civil lunisolar with proper leap-month rules.

Pure-Python implementation following the algorithm in Edward Reingold
and Nachum Dershowitz, *Calendrical Calculations* 4th ed., Ch. 8.
The Reingold/Dershowitz "Rata Die" approach (R.D. days since 1 Jan 1
proleptic Gregorian) is the canonical algorithm used in virtually
every calendar library.

A 19-year Metonic cycle has 7 leap years (years 3, 6, 8, 11, 14, 17,
19 of the cycle). Leap years insert Adar I and Adar II (month 13);
regular years have a single Adar (month 12 in the 1-indexed civil
form used here).

Hebrew days start at sunset, not midnight. For the multi-calendar
Today widget, we present the civil-style "what year/month/day is
sunset-of-this-civil-date already in" by adding a day after 18:00
UTC as a rough heuristic; the precise sunset is computed by the
astronomy engine in Batch 24 and integrated then.
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)


# ────────────────────────────────────────────────────────────────────────
# Rata Die conversion (Reingold & Dershowitz)
# ────────────────────────────────────────────────────────────────────────


def _gregorian_to_rd(year: int, month: int, day: int) -> int:
    """Gregorian (y, m, d) → R.D. (days since 1 Jan 1 proleptic Gregorian)."""
    y = year - 1
    return (
        365 * y
        + y // 4
        - y // 100
        + y // 400
        + (367 * month - 362) // 12
        + (0 if month <= 2 else (-1 if _is_gregorian_leap(year) else -2))
        + day
    )


def _is_gregorian_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


# ────────────────────────────────────────────────────────────────────────
# Hebrew calendar
# ────────────────────────────────────────────────────────────────────────

HEBREW_EPOCH = -1373428  # R.D. of 1 Tishrei AM 1 (3761 BC Oct 7 proleptic Julian).
# Verified against Reingold & Dershowitz's worked example (Iyyar 10
# 5727 = May 20 1967 Gregorian) — see test_hebrew_anchor_reingold.


def _is_hebrew_leap(year: int) -> bool:
    """A Hebrew year is a leap year if (7y + 1) mod 19 < 7."""
    return ((7 * year) + 1) % 19 < 7


def _last_month_of_hebrew_year(year: int) -> int:
    return 13 if _is_hebrew_leap(year) else 12


def _hebrew_calendar_elapsed_days(year: int) -> int:
    """Days from the start of AM 1 to the start of the given Hebrew year."""
    months_elapsed = (
        235 * ((year - 1) // 19)
        + 12 * ((year - 1) % 19)
        + (7 * ((year - 1) % 19) + 1) // 19
    )
    parts_elapsed = 204 + 793 * (months_elapsed % 1080)
    hours_elapsed = (
        5
        + 12 * months_elapsed
        + 793 * (months_elapsed // 1080)
        + parts_elapsed // 1080
    )
    parts = 1080 * (hours_elapsed % 24) + parts_elapsed % 1080
    day = 1 + 29 * months_elapsed + hours_elapsed // 24
    # Dechiyot (postponements):
    if parts >= 19_440 or (
        day % 7 == 2 and parts >= 9_924 and not _is_hebrew_leap(year)
    ) or (
        day % 7 == 1 and parts >= 16_789 and _is_hebrew_leap(year - 1)
    ):
        day += 1
    if day % 7 in (0, 3, 5):
        day += 1
    return day


def _hebrew_year_length(year: int) -> int:
    return _hebrew_calendar_elapsed_days(year + 1) - _hebrew_calendar_elapsed_days(year)


def _last_day_of_hebrew_month(year: int, month: int) -> int:
    if month in (2, 4, 6, 10, 13):
        return 29
    if month == 12 and not _is_hebrew_leap(year):
        return 29
    if month == 8 and _hebrew_year_length(year) % 10 != 5:
        return 29
    if month == 9 and _hebrew_year_length(year) % 10 == 3:
        return 29
    return 30


def _hebrew_new_year_rd(year: int) -> int:
    """R.D. of 1 Tishrei of the given Hebrew year."""
    return HEBREW_EPOCH + _hebrew_calendar_elapsed_days(year)


def _month_order(year: int) -> list[int]:
    """Civil month order for a Hebrew year: starts at Tishrei (7), runs
    through Adar (12, or 12+13 in a leap year), then wraps to
    Nisan..Elul (1..6).
    """
    max_month = _last_month_of_hebrew_year(year)
    return [*range(7, max_month + 1), *range(1, 7)]


def _hebrew_to_rd(year: int, month: int, day: int) -> int:
    elapsed = _hebrew_new_year_rd(year)
    for m in _month_order(year):
        if m == month:
            return elapsed + day - 1
        elapsed += _last_day_of_hebrew_month(year, m)
    raise ValueError(f"Month {month} not valid for Hebrew year {year}")


def _rd_to_hebrew(rd: int) -> tuple[int, int, int]:
    approx_year = (rd - HEBREW_EPOCH) // 366 + 1
    year = approx_year
    while _hebrew_new_year_rd(year + 1) <= rd:
        year += 1
    while _hebrew_new_year_rd(year) > rd:
        year -= 1
    elapsed = _hebrew_new_year_rd(year)
    for m in _month_order(year):
        last_day = _last_day_of_hebrew_month(year, m)
        if rd < elapsed + last_day:
            day = rd - elapsed + 1
            return year, m, day
        elapsed += last_day
    raise RuntimeError(f"R.D. {rd} not located in Hebrew year {year}")


HEBREW_MONTH_NAMES = (
    "Nisan", "Iyyar", "Sivan", "Tammuz", "Av", "Elul",
    "Tishrei", "Cheshvan", "Kislev", "Tevet", "Shevat", "Adar", "Adar II",
)


def _month_name(year: int, month: int) -> str:
    if not _is_hebrew_leap(year) and month == 12:
        return "Adar"
    return HEBREW_MONTH_NAMES[month - 1]


class HebrewCalendar:
    id: str = "hebrew"
    name: str = "Hebrew"
    family: str = "lunisolar"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Hebrew.from_instant requires a tz-aware datetime")
        d = instant.astimezone(UTC).date()
        rd = _gregorian_to_rd(d.year, d.month, d.day)
        y, m, day = _rd_to_hebrew(rd)
        month_name = _month_name(y, m)

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
                "is_leap_year": _is_hebrew_leap(y),
                "year_length": _hebrew_year_length(y),
                "rd": rd,
            },
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Hebrew.",
            )
        rd = _hebrew_to_rd(date.year, date.month, date.day)
        # R.D. → proleptic Gregorian.
        approx = rd // 366
        year = approx
        while _gregorian_to_rd(year + 1, 1, 1) <= rd:
            year += 1
        prior_days = rd - _gregorian_to_rd(year, 1, 1)
        correction = 0 if rd < _gregorian_to_rd(year, 3, 1) else (
            1 if _is_gregorian_leap(year) else 2
        )
        month = (12 * (prior_days + correction) + 373) // 367
        day = rd - _gregorian_to_rd(year, month, 1) + 1
        return datetime(year, month, day, tzinfo=UTC)


register_calendar(HebrewCalendar())
