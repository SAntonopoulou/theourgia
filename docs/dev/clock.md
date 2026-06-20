# Clock — developer guide

Testable time. Production code calls `now()` / `monotonic()` from this substrate instead of `datetime.now(tz=UTC)` / `time.monotonic()` directly; tests swap in a `FakeClock` and advance it deterministically.

## The substrate at a glance

```
core/clock/
└── clock.py    # Clock Protocol + SystemClock + FakeClock + module helpers
```

## Pattern: production code

```python
from theourgia.core.clock import now, monotonic

# Wall-clock for persistence / expiry decisions
session.last_used_at = now()
session.expires_at = now() + timedelta(hours=1)

# Monotonic for measuring elapsed time
started = monotonic()
result = await do_thing()
elapsed_seconds = monotonic() - started
```

Always use this substrate for any time check that:

- Determines whether a session / token / cache entry is expired
- Computes a TTL or retry-after value
- Measures elapsed time inside a request
- Records audit timestamps
- Validates federation signature ages
- Decides whether a scheduled job should run

## Pattern: tests

```python
import pytest
from datetime import UTC, datetime, timedelta
from theourgia.core.clock import FakeClock, configure_clock, reset_clock


@pytest.fixture
def clock():
    fake = FakeClock(start=datetime(2026, 1, 1, tzinfo=UTC))
    configure_clock(fake)
    yield fake
    reset_clock()


@pytest.mark.asyncio
async def test_session_expires_after_one_hour(clock):
    session = create_session(ttl=timedelta(hours=1))
    assert is_valid(session)

    clock.advance(hours=2)
    assert not is_valid(session)
```

`FakeClock` defaults to `2026-01-01T00:00:00Z` so tests are deterministic regardless of when they run.

## FakeClock API

```python
fake = FakeClock(start=..., monotonic_start=...)

# Advance both wall + monotonic together
fake.advance(timedelta(hours=1))
fake.advance(seconds=30)
fake.advance(hours=2, minutes=15)

# Jump wall + monotonic to a specific UTC moment
fake.set_to(datetime(2030, 6, 1, tzinfo=UTC))

# Move wall ONLY (for clock-skew tests)
fake.set_wall(datetime(2025, 12, 1, tzinfo=UTC))   # can even go backwards
```

`advance` rejects negative deltas; `set_to` rejects times before the current moment. `set_wall` permits going backwards — that's the whole point of having two methods. Tests that exercise NTP-corrected clock jumps use `set_wall`; tests that simulate "time passes" use `advance`.

## Why two clock streams (wall + monotonic)?

- **Wall** answers "what time / date is it?" Used for stored timestamps, expiry checks against absolute deadlines, audit records.
- **Monotonic** answers "how long since X?" Used for retry backoff, timeout calculation, performance measurement. Never decreases, immune to NTP adjustments.

Most existing Phase 01 code uses wall via `datetime.now(tz=UTC)`. Rate-limit windows use `time.monotonic()`. Going forward, both flow through the clock substrate.

## Retrofit guidance

Phase 01 code that calls `datetime.now(tz=UTC)` directly will keep working — the clock substrate is purely additive. As features touch existing call sites, migrate them to `from theourgia.core.clock import now`. New code should use the substrate from the start.

A future audit pass can mechanically replace remaining direct `datetime.now(tz=UTC)` calls with the substrate, but it's not blocking.

## Anti-patterns

**Don't** import datetime.now inside production code:

```python
# WRONG — untestable
from datetime import datetime, UTC
session.expires_at = datetime.now(tz=UTC) + timedelta(hours=1)
```

**Do** use the substrate:

```python
# RIGHT — tests can advance the clock
from theourgia.core.clock import now
session.expires_at = now() + timedelta(hours=1)
```

**Don't** sleep in tests to wait for expiry:

```python
# WRONG — slow, flaky
await asyncio.sleep(3601)
assert not is_valid(session)
```

**Do** advance the fake clock:

```python
# RIGHT — instant, deterministic
clock.advance(hours=1, seconds=1)
assert not is_valid(session)
```

## A note about asyncio.sleep

The clock substrate does NOT replace `asyncio.sleep`. Code that actually waits for an event-loop tick (yielding to the scheduler, polling external state) still uses asyncio's facilities. The substrate is about reading the clock, not about scheduling.

For tests that need to fast-forward both "the clock said an hour passed" AND "any pending asyncio.sleeps resolved instantly" — that's a different concern (pytest-asyncio's clock-mocking utilities or `anyio.move_on_after` patterns). The clock substrate gets you part of the way; full sleep mocking lands when a feature genuinely needs it.
