"""Clock — the production and test implementations.

Three pieces:

- :class:`Clock` — Protocol with ``now()`` and ``monotonic()``.
- :class:`SystemClock` — the production implementation. Wraps stdlib.
- :class:`FakeClock` — the test implementation. Manually controlled.

Plus a module-level singleton accessor (:func:`get_clock`) that
production code uses transparently, and the convenience functions
:func:`now` and :func:`monotonic` for the common case.
"""

from __future__ import annotations

import time as _time
from datetime import UTC, datetime, timedelta
from typing import Final, Protocol, runtime_checkable

__all__ = [
    "Clock",
    "FakeClock",
    "SystemClock",
    "configure_clock",
    "get_clock",
    "monotonic",
    "now",
    "reset_clock",
]


@runtime_checkable
class Clock(Protocol):
    """The time interface every Theourgia component depends on.

    Implementations must always return timezone-aware datetimes from
    ``now()`` (UTC); naive datetimes break audit logging, JWT
    validation, and federation signature checks."""

    def now(self) -> datetime:
        """Return the current UTC-aware wall-clock time."""
        ...

    def monotonic(self) -> float:
        """Return monotonic seconds since an arbitrary epoch.

        For measuring elapsed time during request handling, retry
        backoff, etc. Never decreases."""
        ...


class SystemClock:
    """Production clock — delegates to stdlib."""

    name = "system"

    def now(self) -> datetime:
        return datetime.now(tz=UTC)

    def monotonic(self) -> float:
        return _time.monotonic()


class FakeClock:
    """Test clock — manually advanced.

    Construction defaults to a fixed reference time (``2026-01-01T00:00:00Z``)
    so tests are deterministic regardless of when they run.

    Both wall-clock and monotonic are advanced together via
    :meth:`advance` / :meth:`set_to`. Wall-clock can also be set
    independently (some tests want to assert that monotonic-based
    timing isn't influenced by wall-clock jumps); see :meth:`set_wall`.
    """

    name = "fake"

    _DEFAULT_EPOCH: Final[datetime] = datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC)

    def __init__(
        self,
        *,
        start: datetime | None = None,
        monotonic_start: float = 1000.0,
    ) -> None:
        wall = start if start is not None else self._DEFAULT_EPOCH
        if wall.tzinfo is None:
            wall = wall.replace(tzinfo=UTC)
        else:
            wall = wall.astimezone(UTC)
        self._wall: datetime = wall
        self._monotonic: float = monotonic_start

    def now(self) -> datetime:
        return self._wall

    def monotonic(self) -> float:
        return self._monotonic

    def advance(
        self,
        delta: timedelta | None = None,
        *,
        seconds: float = 0,
        minutes: float = 0,
        hours: float = 0,
        days: float = 0,
    ) -> None:
        """Advance both wall-clock and monotonic.

        Either pass a single ``delta`` or any combination of named
        components. Mixing both is an error."""
        if delta is not None and (seconds or minutes or hours or days):
            raise ValueError(
                "pass either delta=... OR named components, not both"
            )
        if delta is None:
            delta = timedelta(
                seconds=seconds, minutes=minutes, hours=hours, days=days
            )
        if delta.total_seconds() < 0:
            raise ValueError("FakeClock cannot run backwards")
        self._wall = self._wall + delta
        self._monotonic = self._monotonic + delta.total_seconds()

    def set_to(self, when: datetime) -> None:
        """Set wall clock to ``when`` and synchronously advance
        monotonic by the same delta."""
        if when.tzinfo is None:
            when = when.replace(tzinfo=UTC)
        else:
            when = when.astimezone(UTC)
        if when < self._wall:
            raise ValueError("FakeClock cannot run backwards")
        delta = (when - self._wall).total_seconds()
        self._wall = when
        self._monotonic = self._monotonic + delta

    def set_wall(self, when: datetime) -> None:
        """Set ONLY the wall clock without touching monotonic.

        For tests that exercise the wall/monotonic divergence — e.g.
        verifying that a clock-skew jump doesn't break monotonic
        timers."""
        if when.tzinfo is None:
            when = when.replace(tzinfo=UTC)
        else:
            when = when.astimezone(UTC)
        self._wall = when


# ── Process-wide clock ───────────────────────────────────────────────

_configured: Clock = SystemClock()


def configure_clock(clock: Clock) -> None:
    """Install ``clock`` as the process-wide clock.

    Tests construct a :class:`FakeClock` and pass it here; production
    leaves the default :class:`SystemClock` in place."""
    global _configured
    _configured = clock


def reset_clock() -> None:
    """Restore the default :class:`SystemClock`. Tests call this at
    teardown."""
    global _configured
    _configured = SystemClock()


def get_clock() -> Clock:
    """Return the process-wide clock."""
    return _configured


def now() -> datetime:
    """Shortcut for ``get_clock().now()``.

    Use this anywhere code currently calls
    ``datetime.now(tz=UTC)``."""
    return _configured.now()


def monotonic() -> float:
    """Shortcut for ``get_clock().monotonic()``."""
    return _configured.monotonic()
