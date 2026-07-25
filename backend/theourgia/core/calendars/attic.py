"""Attic lunar calendar — astronomical reckoning for display.

An Attic-style lunisolar month/day reckoning: the month begins at
Noumenia (the day after the astronomical new moon, when the first
crescent is typically visible) and the day-of-month counts from it
(1 = Noumenia). The year begins at the first Noumenia after the
(northern) summer solstice, per the Athenian convention. Month order:

  1. Hekatombaion   ~ July / August
  2. Metageitnion   ~ August / September
  3. Boedromion     ~ September / October
  4. Pyanepsion     ~ October / November
  5. Maimakterion   ~ November / December
  6. Poseideon      ~ December / January
  7. Gamelion       ~ January / February
  8. Anthesterion   ~ February / March
  9. Elaphebolion   ~ March / April
  10. Mounichion    ~ April / May
  11. Thargelion    ~ May / June
  12. Skirophorion  ~ June / July

**Intercalation.** When thirteen lunations fall between one
post-solstice Noumenia and the next, we insert an intercalary month
— **Poseideon II** — after Poseideon, the placement most often
attested for Athens. This is an *arithmetic lunisolar approximation*:
the intercalary month falls out of the astronomy (13 new moons in
the year) rather than an archon's decree.

**Honesty caveat.** This is astronomical reckoning, NOT the
historical Athenian civic calendar. The ancient calendar was run by
observation and by magistrates who intercalated (and even repeated
or skipped days) for civic and military convenience; no algorithm
reproduces it. What this module gives the practitioner is a
consistent, location-independent lunar reckoning aligned with the
Deipnon / Noumenia / Agathos Daimon observance cycle computed in
:mod:`theourgia.core.festivals.hekatean` — the same astronomical
new-moon convention, so day 1 here is always the Noumenia day there.

The per-day observances surface in ``raw["observance"]``:
``"noumenia"`` (day 1), ``"agathos_daimon"`` (day 2), ``"deipnon"``
(the last day of the month — the dark-moon day before the next
Noumenia), else ``None``.

Attic years have no canonical era number; ``year`` carries the
Gregorian year in which the Attic year began, and ``raw["year_span"]``
the human "2026/2027" form.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date as date_cls, datetime, timedelta
from functools import lru_cache

import swisseph as swe

from theourgia.core.calendars.base import (
    CalendarDate,
    register_calendar,
)

# Reuse the tested new-moon search (same convention greek.py uses so
# festival dates and calendar days can never disagree).
from theourgia.core.festivals.hekatean import _find_new_moons_in_year

__all__ = [
    "ATTIC_MONTH_NAMES",
    "AtticCalendar",
    "AtticDayContext",
    "attic_context",
]


ATTIC_MONTH_NAMES: tuple[str, ...] = (
    "Hekatombaion",
    "Metageitnion",
    "Boedromion",
    "Pyanepsion",
    "Maimakterion",
    "Poseideon",
    "Gamelion",
    "Anthesterion",
    "Elaphebolion",
    "Mounichion",
    "Thargelion",
    "Skirophorion",
)

# Poseideon is month 6; the intercalary Poseideon II slots in after it.
_INTERCALARY_AFTER = 6
_INTERCALARY_NAME = "Poseideon II"


@lru_cache(maxsize=64)
def _new_moons(year: int) -> tuple[datetime, ...]:
    """Cached per-year new-moon instants (the expensive part)."""
    return tuple(_find_new_moons_in_year(year))


def _sun_longitude(jd: float) -> float:
    pos, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_MOSEPH)
    return pos[0]


def _to_jd(d: datetime) -> float:
    h = d.hour + d.minute / 60 + (d.second + d.microsecond / 1_000_000) / 3600
    return swe.julday(d.year, d.month, d.day, h)


def _from_jd(jd: float) -> datetime:
    year, month, day, hour = swe.revjul(jd, swe.GREG_CAL)
    h = int(hour)
    m_frac = (hour - h) * 60
    m = int(m_frac)
    s = int((m_frac - m) * 60)
    return datetime(year, month, day, h, m, s, tzinfo=UTC)


@lru_cache(maxsize=64)
def _summer_solstice(year: int) -> datetime:
    """The instant the Sun reaches 90° ecliptic longitude (Cancer
    ingress) — the northern summer solstice for the given year."""
    jd_lo = _to_jd(datetime(year, 6, 1, tzinfo=UTC))
    jd_hi = _to_jd(datetime(year, 7, 10, tzinfo=UTC))
    for _ in range(40):
        jd_mid = (jd_lo + jd_hi) / 2
        if _sun_longitude(jd_mid) < 90.0:
            jd_lo = jd_mid
        else:
            jd_hi = jd_mid
    return _from_jd((jd_lo + jd_hi) / 2)


def _noumenia_date(new_moon: datetime) -> date_cls:
    """The civil (UTC) date of the Noumenia following a new moon —
    the day after the new-moon instant, matching the hekatean
    festival convention."""
    return (new_moon + timedelta(days=1)).date()


@lru_cache(maxsize=64)
def _attic_year(start_year: int) -> tuple[tuple[str, date_cls], ...]:
    """The months of the Attic year beginning after the summer
    solstice of ``start_year``: ordered ``(month_name, first_day)``
    pairs. 12 entries in a common year, 13 (with Poseideon II) in an
    intercalary year."""
    solstice = _summer_solstice(start_year)
    next_solstice = _summer_solstice(start_year + 1)
    moons = _new_moons(start_year) + _new_moons(start_year + 1)
    first = next(nm for nm in moons if nm > solstice)
    next_first = next(nm for nm in moons if nm > next_solstice)
    month_moons = [nm for nm in moons if first <= nm < next_first]
    count = len(month_moons)
    if count == 12:
        names = list(ATTIC_MONTH_NAMES)
    elif count == 13:
        names = (
            list(ATTIC_MONTH_NAMES[:_INTERCALARY_AFTER])
            + [_INTERCALARY_NAME]
            + list(ATTIC_MONTH_NAMES[_INTERCALARY_AFTER:])
        )
    else:  # pragma: no cover — 12/13 lunations per tropical year always
        raise RuntimeError(
            f"Attic year {start_year} resolved to {count} lunations."
        )
    return tuple(
        (name, _noumenia_date(nm))
        for name, nm in zip(names, month_moons, strict=True)
    )


def _year_start_date(start_year: int) -> date_cls:
    return _attic_year(start_year)[0][1]


@dataclass(frozen=True, slots=True)
class AtticDayContext:
    """One Gregorian day resolved onto the Attic reckoning."""

    gregorian_date: date_cls
    year: int  # Gregorian year the Attic year began
    year_span: str  # "2026/2027"
    month: int  # 1..12 (13 in an intercalary year)
    month_name: str
    day: int  # 1 = Noumenia
    month_length: int  # 29 or 30
    is_intercalary_year: bool
    observance: str | None  # "deipnon" | "noumenia" | "agathos_daimon" | None


def attic_context(d: date_cls) -> AtticDayContext:
    """Resolve a civil (UTC) date to its Attic month / day / observance."""
    start_year = d.year if d >= _year_start_date(d.year) else d.year - 1
    months = _attic_year(start_year)
    index = 0
    for i, (_, first_day) in enumerate(months):
        if first_day <= d:
            index = i
        else:
            break
    month_name, first_day = months[index]
    if index + 1 < len(months):
        next_first = months[index + 1][1]
    else:
        next_first = _year_start_date(start_year + 1)
    day = (d - first_day).days + 1
    month_length = (next_first - first_day).days

    observance: str | None = None
    if day == 1:
        observance = "noumenia"
    elif day == 2:
        observance = "agathos_daimon"
    elif day == month_length:  # dark-moon day before the next Noumenia
        observance = "deipnon"

    return AtticDayContext(
        gregorian_date=d,
        year=start_year,
        year_span=f"{start_year}/{start_year + 1}",
        month=index + 1,
        month_name=month_name,
        day=day,
        month_length=month_length,
        is_intercalary_year=len(months) == 13,
        observance=observance,
    )


class AtticCalendar:
    id: str = "attic"
    name: str = "Attic"
    family: str = "lunisolar"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Attic.from_instant requires a tz-aware datetime")
        ctx = attic_context(instant.astimezone(UTC).date())

        long_str = f"{ctx.day} {ctx.month_name} {ctx.year_span}"
        short_str = f"{ctx.day} {ctx.month_name[:4]} {ctx.year}"
        numeric = f"{ctx.year:04d}-{ctx.month:02d}-{ctx.day:02d}"

        return CalendarDate(
            calendar_id=self.id,
            year=ctx.year,
            month=ctx.month,
            day=ctx.day,
            long=long_str,
            short=short_str,
            numeric=numeric,
            with_day_name=long_str,
            locale=locale,
            raw={
                "month_name": ctx.month_name,
                "year_span": ctx.year_span,
                "month_length": ctx.month_length,
                "is_intercalary_year": ctx.is_intercalary_year,
                "observance": ctx.observance,
            },
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Attic.",
            )
        months = _attic_year(date.year)
        if not (1 <= date.month <= len(months)):
            raise ValueError(
                f"Attic year {date.year} has {len(months)} months; "
                f"got month {date.month}.",
            )
        first_day = months[date.month - 1][1]
        d = first_day + timedelta(days=date.day - 1)
        return datetime(d.year, d.month, d.day, tzinfo=UTC)


register_calendar(AtticCalendar())
