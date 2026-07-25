"""Minimal POSIX cron evaluator (pure Python, UTC).

Supports the classic five-field expression the iCal feed's
``custom_cron`` column stores::

    ┌───────── minute        (0-59)
    │ ┌─────── hour          (0-23)
    │ │ ┌───── day of month  (1-31)
    │ │ │ ┌─── month         (1-12)
    │ │ │ │ ┌─ day of week   (0-7; 0 and 7 = Sunday)
    │ │ │ │ │
    * * * * *

Field syntax: ``*``, single values, ranges (``a-b``), steps
(``*/n``, ``a-b/n``), and comma lists. Names (``jan``, ``mon``) are
NOT supported — the settings surface stores numeric expressions.

Semantics follow Vixie cron: when BOTH day-of-month and day-of-week
are restricted (neither is ``*``), a timestamp matches if EITHER
field matches; otherwise both act as plain filters.

No external dependency on purpose — same stance as the pure-Python
RFC 5545 serializer next door.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

__all__ = ["CronParseError", "CronSchedule", "cron_occurrences", "parse_cron"]


class CronParseError(ValueError):
    """The expression is not a valid five-field cron string."""


_FIELD_BOUNDS: tuple[tuple[str, int, int], ...] = (
    ("minute", 0, 59),
    ("hour", 0, 23),
    ("day of month", 1, 31),
    ("month", 1, 12),
    ("day of week", 0, 7),
)


def _parse_field(raw: str, name: str, lo: int, hi: int) -> tuple[frozenset[int], bool]:
    """Parse one field. Returns ``(values, is_wildcard)``."""
    if raw == "*":
        return frozenset(range(lo, hi + 1)), True
    values: set[int] = set()
    for item in raw.split(","):
        if not item:
            raise CronParseError(f"{name}: empty list item in {raw!r}")
        step = 1
        body = item
        if "/" in item:
            body, _, step_raw = item.partition("/")
            if not step_raw.isdigit() or int(step_raw) < 1:
                raise CronParseError(f"{name}: bad step in {raw!r}")
            step = int(step_raw)
        if body == "*":
            start, end = lo, hi
        elif "-" in body:
            a, _, b = body.partition("-")
            if not (a.isdigit() and b.isdigit()):
                raise CronParseError(f"{name}: bad range in {raw!r}")
            start, end = int(a), int(b)
        elif body.isdigit():
            start = end = int(body)
        else:
            raise CronParseError(f"{name}: bad value in {raw!r}")
        if start > end or start < lo or end > hi:
            raise CronParseError(
                f"{name}: {raw!r} outside {lo}-{hi}",
            )
        values.update(range(start, end + 1, step))
    return frozenset(values), False


@dataclass(frozen=True, slots=True)
class CronSchedule:
    """A parsed five-field cron expression."""

    minutes: frozenset[int]
    hours: frozenset[int]
    days_of_month: frozenset[int]
    months: frozenset[int]
    days_of_week: frozenset[int]  # 0 = Sunday .. 6 = Saturday
    dom_is_wildcard: bool
    dow_is_wildcard: bool

    def matches_date(self, d: datetime) -> bool:
        """Does the date part (dom / month / dow) match ``d``?"""
        if d.month not in self.months:
            return False
        dom_ok = d.day in self.days_of_month
        # Python: Monday=0..Sunday=6 → cron: Sunday=0..Saturday=6.
        dow_ok = ((d.weekday() + 1) % 7) in self.days_of_week
        if not self.dom_is_wildcard and not self.dow_is_wildcard:
            return dom_ok or dow_ok  # Vixie OR rule
        return dom_ok and dow_ok


def parse_cron(expression: str) -> CronSchedule:
    """Parse ``expression`` or raise :class:`CronParseError`."""
    fields = expression.split()
    if len(fields) != 5:
        raise CronParseError(
            f"expected 5 fields, got {len(fields)}: {expression!r}",
        )
    parsed = [
        _parse_field(raw, name, lo, hi)
        for raw, (name, lo, hi) in zip(fields, _FIELD_BOUNDS, strict=True)
    ]
    dow_values = {v % 7 for v in parsed[4][0]}  # fold 7 → 0 (Sunday)
    return CronSchedule(
        minutes=parsed[0][0],
        hours=parsed[1][0],
        days_of_month=parsed[2][0],
        months=parsed[3][0],
        days_of_week=frozenset(dow_values),
        dom_is_wildcard=parsed[2][1],
        dow_is_wildcard=parsed[4][1],
    )


def cron_occurrences(
    schedule: CronSchedule,
    start: datetime,
    end: datetime,
    *,
    limit: int = 500,
) -> list[datetime]:
    """Every firing instant in ``[start, end]``, capped at ``limit``.

    Timestamps carry ``start``'s tzinfo. Day-major iteration keeps an
    every-minute expression over a ten-week window cheap.
    """
    if start.tzinfo is None or end.tzinfo is None:
        raise ValueError("cron_occurrences requires tz-aware datetimes")
    out: list[datetime] = []
    day = start.replace(hour=0, minute=0, second=0, microsecond=0)
    hours = sorted(schedule.hours)
    minutes = sorted(schedule.minutes)
    while day <= end and len(out) < limit:
        if schedule.matches_date(day):
            for hour in hours:
                for minute in minutes:
                    t = day.replace(hour=hour, minute=minute)
                    if start <= t <= end:
                        out.append(t)
                        if len(out) >= limit:
                            return out
        day += timedelta(days=1)
    return out
