"""Rata Die (fixed-day) conversion helpers — v1-016.

Shared arithmetic for the calendars that convert through R.D. day
numbers (days since 1 January 1 proleptic Gregorian), following
Edward Reingold and Nachum Dershowitz, *Calendrical Calculations*
4th ed., Ch. 2. Each calendar module keeps its own epoch constant
and month rules; this module owns only the Gregorian ↔ R.D. leg
every conversion shares.

(hebrew.py predates this module and carries a private copy of
``_gregorian_to_rd`` — consolidating it here is a no-behavior-change
cleanup left for a later batch so the b108-2hz-guarded code stays
untouched.)
"""

from __future__ import annotations

__all__ = ["gregorian_to_rd", "is_gregorian_leap", "rd_to_gregorian"]


def is_gregorian_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def gregorian_to_rd(year: int, month: int, day: int) -> int:
    """Proleptic Gregorian (y, m, d) → R.D. day number."""
    y = year - 1
    return (
        365 * y
        + y // 4
        - y // 100
        + y // 400
        + (367 * month - 362) // 12
        + (0 if month <= 2 else (-1 if is_gregorian_leap(year) else -2))
        + day
    )


def rd_to_gregorian(rd: int) -> tuple[int, int, int]:
    """R.D. day number → proleptic Gregorian (y, m, d).

    Reingold & Dershowitz ``gregorian-from-fixed``: locate the year by
    decomposing the day count into 400-/100-/4-/1-year cycles, then
    the month via the same 367/12 linearization the forward direction
    uses.
    """
    d0 = rd - 1
    n400, d1 = divmod(d0, 146_097)
    n100, d2 = divmod(d1, 36_524)
    n4, d3 = divmod(d2, 1_461)
    n1 = d3 // 365
    year = 400 * n400 + 100 * n100 + 4 * n4 + n1
    if n100 != 4 and n1 != 4:
        year += 1
    prior_days = rd - gregorian_to_rd(year, 1, 1)
    correction = (
        0
        if rd < gregorian_to_rd(year, 3, 1)
        else (1 if is_gregorian_leap(year) else 2)
    )
    month = (12 * (prior_days + correction) + 373) // 367
    day = rd - gregorian_to_rd(year, month, 1) + 1
    return year, month, day
