"""Zodiacal releasing (*aphesis*) — Valens' periods, canonical (AstroPractise).

The life is divided into periods, one sign at a time, each as many years as
Valens gives that sign. The sign holding the period is the time lord; a
subperiod sequence, having walked all twelve signs, jumps to the sign opposite
its start — the **loosing of the bond**.

⚠ Reconciled to AstroPractise (``lib/domain/astrology/releasing.dart``), the
canonical engine, and held to the shared vectors the phone emits from the same
model — see ``tests/vectors/README.md``. Phone and site compute the identical
result.

## ⚠ Arithmetic in whole minutes, from the birth instant — the 360-day year

Every unit is a whole number of minutes: 518400 (a 360-day general year), 43200
(a 30-day month), 3600 (2½ days), 300 (5 hours). Every level is exactly one
twelfth of the one above, so nothing rounds and the two devices cannot drift
apart. This is NOT ``round(years * 365.2422)`` days — the idealised year is the
one the technique is counted in, and one worked case in the literature turns on
a two-day margin.

## ⚠ The general period never looses

A loosing at level one is a modern addition made for mundane work; Valens never
prescribes it. The general period walks strictly forward in zodiacal order. The
loosing of the bond is a **subperiod** rule: it fires once, when a subperiod
sequence would return to the sign it began from, jumping instead to the sign
opposite that start. Coming round a second time it returns to the start without
a second jump — the completion period.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Final

__all__ = [
    "RELEASING_CYCLE_TOTAL",
    "SIGN_PERIODS",
    "UNIT_MINUTES",
    "ReleasingPeriod",
    "contains_loosing",
    "first_level",
    "high_point",
    "is_peak_sign",
    "loosing_signs",
    "period_at",
    "second_level",
    "sub_level",
]


#: Valens' years per sign. ⚠ The table, not a formula — the numbers are the
#: tradition's own, and they sum to 211 (a full level-2 cycle in months).
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

#: A full level-2 cycle is 211 months — 17 years 7 months — the same number the
#: periods sum to. It decides which general periods are long enough to loose.
RELEASING_CYCLE_TOTAL: Final[int] = 211

#: One unit at each level, in whole minutes: a 360-day year, a 30-day month,
#: 2½ days, 5 hours. Every level is exactly one twelfth of the one above.
UNIT_MINUTES: Final[dict[int, int]] = {
    1: 518_400,  # 360 days
    2: 43_200,  # 30 days
    3: 3_600,  # 2½ days
    4: 300,  # 5 hours
}


@dataclass(frozen=True, slots=True)
class ReleasingPeriod:
    level: int
    sign: int  # 1..12
    start: datetime
    until: datetime
    is_loosing_of_the_bond: bool
    is_completion_period: bool = False
    is_truncated: bool = False
    is_peak: bool = False


def _next(sign: int) -> int:
    return (sign % 12) + 1


def _opposite(sign: int) -> int:
    return ((sign - 1 + 6) % 12) + 1


def contains_loosing(sign: int) -> bool:
    """Whether a general period in ``sign`` is long enough to contain a full
    level-2 cycle, and so to have a loosing inside it — its months exceed 211."""
    return SIGN_PERIODS[sign] * 12 > RELEASING_CYCLE_TOTAL


def loosing_signs() -> list[int]:
    """The signs whose general periods contain a loosing, derived not listed."""
    return [s for s in range(1, 13) if contains_loosing(s)]


def is_peak_sign(sign: int, fortune: int) -> bool:
    """Whether ``sign`` is angular from Fortune — the 1st, 4th, 7th or 10th
    counting from Fortune's own sign. ⚠ Counted from Fortune, not the Ascendant."""
    distance = (sign - fortune) % 12
    return distance in (0, 3, 6, 9)


def high_point(fortune: int) -> int:
    """The 10th sign from Fortune — the high point of the scheme."""
    return ((fortune - 1 + 9) % 12) + 1


def first_level(
    born: datetime,
    start_sign: int,
    *,
    years: int = 120,
    fortune_sign: int | None = None,
) -> list[ReleasingPeriod]:
    """The first-level periods from ``start_sign``, covering ``years`` from birth.

    ⚠ The general period never looses: the sequence walks strictly forward. The
    last period is truncated to the query window, which is normal and reported.
    """
    if start_sign not in SIGN_PERIODS:
        raise ValueError(f"start_sign must be 1..12; got {start_sign}.")
    if born.tzinfo is None:
        raise ValueError("born must be timezone-aware (a naive one has no instant)")

    born_utc = born.astimezone(UTC)
    unit = UNIT_MINUTES[1]
    ends = born_utc + timedelta(minutes=years * unit)

    periods: list[ReleasingPeriod] = []
    at = born_utc
    sign = start_sign
    # A bound, not `while True`: a bug is a finite list rather than a hang.
    for _ in range(4000):
        if at >= ends:
            break
        end = at + timedelta(minutes=SIGN_PERIODS[sign] * unit)
        truncated = end > ends
        if truncated:
            end = ends
        periods.append(
            ReleasingPeriod(
                level=1,
                sign=sign,
                start=at,
                until=end,
                is_loosing_of_the_bond=False,  # ⚠ never at level one
                is_truncated=truncated,
                is_peak=fortune_sign is not None and is_peak_sign(sign, fortune_sign),
            )
        )
        at = end
        sign = _next(sign)  # strictly forward
    return periods


def _sub_sequence(
    parent: ReleasingPeriod,
    *,
    fortune_sign: int | None = None,
) -> list[ReleasingPeriod]:
    """The shared subperiod walk for levels two and below — where the loosing of
    the bond lives. Walk forward from the parent's sign; when the sequence would
    return to that sign, jump once to its opposite (the loosing), then on the
    next full circuit return to the start as the completion period."""
    level = parent.level + 1
    unit = UNIT_MINUTES.get(level)
    if unit is None:  # levels five and deeper are neither computed nor read
        return []

    start_sign = parent.sign
    periods: list[ReleasingPeriod] = []
    at = parent.start
    sign = start_sign
    loosed = False
    arrived_by_loosing = False
    arrived_by_completion = False

    for _ in range(4000):
        if at >= parent.until:
            break
        end = at + timedelta(minutes=SIGN_PERIODS[sign] * unit)
        truncated = end > parent.until
        # Cut to the parent: a sub-period cannot outlive the period it is inside.
        if truncated:
            end = parent.until
        periods.append(
            ReleasingPeriod(
                level=level,
                sign=sign,
                start=at,
                until=end,
                is_loosing_of_the_bond=arrived_by_loosing,
                is_completion_period=arrived_by_completion,
                is_truncated=truncated,
                is_peak=fortune_sign is not None and is_peak_sign(sign, fortune_sign),
            )
        )
        at = end
        arrived_by_loosing = False
        arrived_by_completion = False

        nxt = _next(sign)
        if nxt == start_sign:
            if not loosed:
                # ⚠⚠ THE LOOSING — a jump to the sign opposite the start.
                nxt = _opposite(start_sign)
                loosed = True
                arrived_by_loosing = True
            else:
                # Come round a second time: back to the start, no second jump.
                arrived_by_completion = True
        sign = nxt
    return periods


def second_level(
    parent: ReleasingPeriod,
    *,
    fortune_sign: int | None = None,
) -> list[ReleasingPeriod]:
    """The second-level periods inside ``parent`` — the months. The first level
    at which the loosing of the bond can fire."""
    return _sub_sequence(parent, fortune_sign=fortune_sign)


def sub_level(
    parent: ReleasingPeriod,
    *,
    fortune_sign: int | None = None,
) -> list[ReleasingPeriod]:
    """The periods one level deeper than ``parent`` — third inside second,
    fourth inside third. Same shape as the second level."""
    if parent.level < 2:
        raise ValueError(
            "sub_level deepens a second-level period or below; use second_level inside a first"
        )
    return _sub_sequence(parent, fortune_sign=fortune_sign)


def period_at(periods: list[ReleasingPeriod], moment: datetime) -> ReleasingPeriod | None:
    """The period in force at ``moment``, from a list."""
    t = moment.astimezone(UTC)
    for period in periods:
        if period.start <= t < period.until:
            return period
    return None
