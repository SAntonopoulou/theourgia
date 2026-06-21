"""Julian calendar — for historical references.

Computed as a delta from the proleptic Gregorian via Julian day number
arithmetic. Algorithm from Meeus, *Astronomical Algorithms* 2nd ed.
(Ch. 7) — public-domain, the canonical reference.

The Julian calendar matters because many historical sources (most
patristic texts, classical astrology, much of pre-1582 Europe) are
dated by it. Showing both alongside is the simplest way to reconcile
"the equinox fell on 25 March in 350 AD" without doing the math
inline.
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)


def _gregorian_to_jdn(year: int, month: int, day: int) -> int:
    """Convert a proleptic Gregorian date to a Julian Day Number.

    Meeus Ch. 7 §7.1. JDN is the count of days since the Julian epoch
    (4713 BC Jan 1 noon proleptic Julian).
    """
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


def _jdn_to_julian(jdn: int) -> tuple[int, int, int]:
    """Convert a Julian Day Number to a proleptic Julian (y, m, d) tuple.

    Meeus Ch. 7 §7.4. Works for the entire ephemeris range.
    """
    c = jdn + 32082
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153
    day = e - (153 * m + 2) // 5 + 1
    month = m + 3 - 12 * (m // 10)
    year = d - 4800 + m // 10
    return year, month, day


MONTH_NAMES = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)


class JulianCalendar:
    id: str = "julian"
    name: str = "Julian"
    family: str = "solar"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Julian.from_instant requires a tz-aware datetime")
        d = instant.astimezone(UTC).date()
        jdn = _gregorian_to_jdn(d.year, d.month, d.day)
        y, m, day = _jdn_to_julian(jdn)
        month_name = MONTH_NAMES[m - 1]

        long_str = f"{day} {month_name} {y} (OS)"
        short_str = f"{day:02d}.{m:02d}.{y:04d} OS"
        numeric = f"{y:04d}-{m:02d}-{day:02d}"

        return CalendarDate(
            calendar_id=self.id,
            year=y,
            month=m,
            day=day,
            long=long_str,
            short=short_str,
            numeric=numeric,
            # No native day-name yet; consumers can layer Greek/Roman
            # naming when they ship those traditions in later batches.
            with_day_name=long_str,
            locale=locale,
            raw={"jdn": jdn, "month_name_en": month_name},
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Julian.",
            )
        # Inverse: convert (y, m, d) Julian → JDN → proleptic Gregorian.
        a = (14 - date.month) // 12
        y = date.year + 4800 - a
        m = date.month + 12 * a - 3
        jdn = date.day + (153 * m + 2) // 5 + 365 * y + y // 4 - 32083
        # Now JDN → proleptic Gregorian.
        f = jdn + 1401 + (((4 * jdn + 274277) // 146097) * 3) // 4 - 38
        e = 4 * f + 3
        g = (e % 1461) // 4
        h = 5 * g + 2
        gd = (h % 153) // 5 + 1
        gm = (h // 153 + 2) % 12 + 1
        gy = e // 1461 - 4716 + (12 + 2 - gm) // 12
        return datetime(gy, gm, gd, tzinfo=UTC)


register_calendar(JulianCalendar())
