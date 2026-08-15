"""The moment the Sun returns to its natal degree.

⚠ Ported from `practiseapp/lib/domain/astrology/solar_return.dart` and held to
vectors that code emitted while running — see `tests/vectors/README.md`.

## ⚠ Searched for, never added

A tropical year is not 365 days, nor exactly 365.2422 for any particular year:
the Sun's motion is not uniform and the return falls up to a day either side of
the birthday. Adding a mean year puts the chart out by hours and the Ascendant
out by a whole sign — and a return chart is read *entirely from its angles*, so
that is the one error the technique cannot survive.

## ⚠ The ephemeris is injected, and that is what makes this testable

`sun_longitude_at` is a callable. The vectors drive it with a **linear Sun** —
one degree a day from a known epoch — so the fixture pins the SEARCH rather
than the ephemeris files. Pinning a real return instant would make the fixture
break the day the `.se1` files are updated, for a reason that is not a
disagreement between the two implementations.

That the two sides read the same real ephemeris is a separate guarantee with
its own check: `EPHEMERIS_SOURCE` in `chart.py`.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta

__all__ = ["nearest_return", "return_for_age"]

#: ⚠ The phone's bracket, and its widening. Six days holds the return whatever
#: the year does; twenty is the fallback when the guess was worse than that.
#: Beyond it the search REFUSES — see the note in `_refine`.
_BRACKET = timedelta(days=3)
_WIDE_BRACKET = timedelta(days=10)

#: ⚠ One second, and forty halvings. Twenty days halved forty times is
#: microseconds, so the iteration cap is a backstop rather than the limit.
_TOLERANCE = timedelta(seconds=1)
_MAX_ITERATIONS = 40


def _signed_separation(longitude: float, target: float) -> float:
    """How far the Sun is from the target, folded into ±180.

    ⚠ Signed, so which way to go is readable from it — and folded, so a target
    at 359° and a Sun at 1° are two degrees apart rather than 358.
    """
    difference = (longitude - target) % 360
    if difference > 180:
        difference -= 360
    if difference < -180:
        difference += 360
    return difference


def _sign(value: float) -> float:
    """Dart's `double.sign`. ⚠ **Zero is its own sign**, not a positive.

    The phone compares `atMiddle.sign == atLow.sign`, and Dart gives `0.0` for
    zero — so a separation of exactly nought matches NEITHER end and takes the
    else branch. Writing this as `value < 0` on both sides, which is the
    obvious Python, folds zero in with the positives and takes the other
    branch. It only bites when a probe lands exactly on the target degree,
    which is rare and is precisely the case somebody would trust most.
    """
    if value == 0:
        return 0.0
    return 1.0 if value > 0 else -1.0


def _refine(
    sun_longitude_at: Callable[[datetime], float],
    target: float,
    around: datetime,
) -> datetime:
    """Narrow on the instant the Sun holds ``target``.

    ⚠ **Refuses rather than answers** when the bracket never changes sign. The
    Sun moves about a degree a day, so over twenty days it moves twenty; if the
    separation has the same sign at both ends the guess was wrong by more than
    that, and returning the nearest end would be a confident wrong answer.
    """
    low = around - _BRACKET
    high = around + _BRACKET
    at_low = _sign(_signed_separation(sun_longitude_at(low), target))
    at_high = _sign(_signed_separation(sun_longitude_at(high), target))

    if at_low == at_high:
        low = around - _WIDE_BRACKET
        high = around + _WIDE_BRACKET
        at_low = _sign(_signed_separation(sun_longitude_at(low), target))
        at_high = _sign(_signed_separation(sun_longitude_at(high), target))
        if at_low == at_high:
            msg = "The Sun did not reach that degree near then."
            raise ValueError(msg)

    for _ in range(_MAX_ITERATIONS):
        # ⚠ Integer microseconds, truncated — the phone's `~/ 2` on a Duration.
        # Python's `(high - low) / 2` rounds to the nearest EVEN microsecond
        # instead, so on an odd span the two sides pick midpoints a microsecond
        # apart and every subsequent halving inherits it.
        middle = low + timedelta(microseconds=(high - low) // timedelta(microseconds=1) // 2)
        if high - low <= _TOLERANCE:
            return middle
        at_middle = _sign(_signed_separation(sun_longitude_at(middle), target))
        if at_middle == at_low:
            low, at_low = middle, at_middle
        else:
            high, at_high = middle, at_middle
    return low


def _birthday_in(born: datetime, year: int) -> datetime:
    """The same date in another year.

    ⚠ **Seconds, and no finer.** The phone builds this with
    `DateTime.utc(year, month, day, hour, minute, second)`, which discards
    milliseconds and microseconds. Keeping them here would start the search
    from a different instant — harmless in itself, since it is only a guess,
    but the bisection's midpoints are derived from it and the answers would
    then differ in their last digits for no reason anyone could see.
    """
    born_utc = born.astimezone(UTC)
    try:
        return datetime(
            year,
            born_utc.month,
            born_utc.day,
            born_utc.hour,
            born_utc.minute,
            born_utc.second,
            tzinfo=UTC,
        )
    except ValueError:
        # ⚠ 29 February in a common year. Dart does not raise here — it
        # NORMALISES, and `DateTime.utc(2027, 2, 29)` is the first of March.
        # This branch is that rollover written out, not a policy of our own.
        return datetime(
            year,
            3,
            1,
            born_utc.hour,
            born_utc.minute,
            born_utc.second,
            tzinfo=UTC,
        )


def return_for_age(
    sun_longitude_at: Callable[[datetime], float],
    *,
    born: datetime,
    natal_sun: float,
    age: int,
) -> datetime:
    """The solar return that opens the year beginning at ``age``."""
    return _refine(sun_longitude_at, natal_sun, _birthday_in(born, born.astimezone(UTC).year + age))


def nearest_return(
    sun_longitude_at: Callable[[datetime], float],
    *,
    born: datetime,
    natal_sun: float,
    at: datetime,
) -> datetime:
    """The return governing the moment ``at``.

    ⚠ The year before, where the birthday has not yet come round. A return
    falling on the third of January governs from that instant, so the first of
    January belongs to the one before it.
    """
    moment = at.astimezone(UTC)
    guess = _birthday_in(born, moment.year)
    if guess > moment:
        guess = _birthday_in(born, moment.year - 1)
    return _refine(sun_longitude_at, natal_sun, guess)
