"""Zodiacal releasing — Valens' periods, matching practiseapp exactly.

The life is divided into periods, one sign at a time, each as many years as
Valens gives that sign. The sign holding the period is the time lord; the
period opposite the one releasing began from is the **loosing of the bond**.

⚠ Ported from `practiseapp/lib/domain/astrology/time_lords.dart` and held to
vectors that code emitted while running — see `tests/vectors/README.md`. The
phone is the source of truth.

## ⚠ A period is a whole number of DAYS, and the rounding matters

`round(years * 365.2422)`. Fifteen years of Aries is **5479 days**, not
5478.633. A site computing in float years would drift a day per period and be
a fortnight out by the end of a life — and every period boundary after the
first would fall on a different date from the phone's.

## ⚠ Three readings of the loosing, and the app does not pick for you

`BondRule.NONE` marks the period and changes nothing. It is the default, and
the phone's comment gives the reason: it is *the only one that adds nothing*,
so somebody who has not chosen has not been given a jump they did not ask for.
Riley's footnote to Valens IV.5 supports it — the passage describes what to
expect interpretively at the handoff and prescribes no jump at all.

`BondRule.SKIP` passes over the opposite sign. `BondRule.TO_START` returns to
the sign releasing began from once the loosed period ends.

⚠ They produce **visibly different lives**: from Leo over 160 years, `NONE`
gives ten periods, `TO_START` nine, and `SKIP` eleven with no loosing at all.
Anything that reports a time lord must say which rule it used.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Final

__all__ = ["SIGN_PERIODS", "BondRule", "ReleasingPeriod", "first_level"]


#: Valens' years per sign. ⚠ The table, not a formula — the numbers are not
#: derivable from anything and are the tradition's own.
SIGN_PERIODS: Final[dict[int, int]] = {
    1: 15,  # Aries
    2: 8,  # Taurus
    3: 20,  # Gemini
    4: 25,  # Cancer
    5: 19,  # Leo
    6: 20,  # Virgo
    7: 8,  # Libra
    8: 15,  # Scorpio
    9: 12,  # Sagittarius
    10: 27,  # Capricorn
    11: 30,  # Aquarius
    12: 12,  # Pisces
}

#: ⚠ The tropical year the phone uses. Not 365.25, and not 365 — changing it
#: moves every period boundary in every chart.
DAYS_IN_YEAR: Final[float] = 365.2422


class BondRule(str, Enum):
    """What happens at the loosing of the bond. See the module note."""

    NONE = "none"
    SKIP = "skip"
    TO_START = "toStart"


@dataclass(frozen=True, slots=True)
class ReleasingPeriod:
    level: int
    sign: int
    start: datetime
    until: datetime
    is_loosing_of_the_bond: bool


def _length(sign: int) -> timedelta:
    """⚠ Whole days, rounded — see the module note."""
    return timedelta(days=round(SIGN_PERIODS[sign] * DAYS_IN_YEAR))


def first_level(
    born: datetime,
    start_sign: int,
    *,
    years: int = 120,
    bond: BondRule = BondRule.NONE,
) -> list[ReleasingPeriod]:
    """The first-level periods from ``start_sign``, covering ``years``.

    ⚠ The window is `round(years * 365.2422)` days from birth, and a period is
    included when it BEGINS inside it — so the last one commonly runs past the
    end. That is the shape of the technique rather than an off-by-one: a period
    is not truncated by the question being asked in the middle of it.
    """
    if start_sign not in SIGN_PERIODS:
        raise ValueError(f"start_sign must be 1..12; got {start_sign}.")
    if born.tzinfo is None:
        raise ValueError("born must be timezone-aware (a naive one has no instant)")

    born_utc = born.astimezone(UTC)
    ends = born_utc + timedelta(days=round(years * DAYS_IN_YEAR))
    opposite = ((start_sign - 1 + 6) % 12) + 1

    periods: list[ReleasingPeriod] = []
    at = born_utc
    sign = start_sign

    while at < ends:
        if bond is BondRule.SKIP and sign == opposite and periods:
            # ⚠ Skipped WITHOUT advancing time — the next sign takes the
            # period, it does not begin late.
            sign = (sign % 12) + 1
            continue

        loosed = sign == opposite
        until = at + _length(sign)
        periods.append(
            ReleasingPeriod(
                level=1,
                sign=sign,
                start=at,
                until=until,
                is_loosing_of_the_bond=loosed,
            )
        )
        at = until
        sign = start_sign if (loosed and bond is BondRule.TO_START) else (sign % 12) + 1

    return periods
