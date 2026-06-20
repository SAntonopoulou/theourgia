"""Clock substrate — testable time.

Production code calls :func:`now` or :func:`monotonic` instead of
:func:`datetime.now` / :func:`time.monotonic` directly. Tests swap in
a :class:`FakeClock` so time-dependent behaviour is deterministic.

Why this matters: sessions, TOTP, rate-limit windows, idempotency
record TTL, federation signature ages, backup retention, scheduled
jobs — all depend on the current time. Tests that need to exercise
"the session is now expired" or "the rate-limit window has rolled
over" should not need ``asyncio.sleep`` or process clock manipulation;
they advance a fake clock.

The canonical call points::

    from theourgia.core.clock import now, monotonic

    expires_at = now() + timedelta(hours=1)
    started = monotonic()
    ...
    elapsed = monotonic() - started

Tests::

    from theourgia.core.clock import FakeClock, configure_clock

    clock = FakeClock()
    configure_clock(clock)
    clock.advance(hours=2)
    # Now session lookups consider the row expired
"""

from __future__ import annotations

from theourgia.core.clock.clock import (
    Clock,
    FakeClock,
    SystemClock,
    configure_clock,
    get_clock,
    monotonic,
    now,
    reset_clock,
)

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
