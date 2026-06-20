"""Tests for the clock substrate."""

from __future__ import annotations

import time as _stdlib_time
from datetime import UTC, datetime, timedelta, timezone

import pytest

from theourgia.core.clock import (
    Clock,
    FakeClock,
    SystemClock,
    configure_clock,
    get_clock,
    monotonic,
    now,
    reset_clock,
)


@pytest.fixture(autouse=True)
def _reset_clock_between_tests() -> None:
    reset_clock()
    yield
    reset_clock()


# ── Protocol satisfaction ────────────────────────────────────────────


def test_system_clock_satisfies_protocol() -> None:
    clock: Clock = SystemClock()
    assert isinstance(clock, Clock)


def test_fake_clock_satisfies_protocol() -> None:
    clock: Clock = FakeClock()
    assert isinstance(clock, Clock)


# ── SystemClock ──────────────────────────────────────────────────────


def test_system_clock_now_returns_utc_aware() -> None:
    clock = SystemClock()
    when = clock.now()
    assert when.tzinfo is UTC or when.utcoffset() == timedelta(0)


def test_system_clock_monotonic_does_not_decrease() -> None:
    clock = SystemClock()
    a = clock.monotonic()
    b = clock.monotonic()
    assert b >= a


# ── FakeClock — basics ───────────────────────────────────────────────


def test_fake_clock_default_epoch() -> None:
    clock = FakeClock()
    assert clock.now() == datetime(2026, 1, 1, tzinfo=UTC)


def test_fake_clock_custom_start_utc() -> None:
    start = datetime(2030, 6, 15, 12, 0, 0, tzinfo=UTC)
    clock = FakeClock(start=start)
    assert clock.now() == start


def test_fake_clock_naive_start_treated_as_utc() -> None:
    """A naive datetime supplied as start gets UTC tacked on rather
    than crashing — production code passes UTC-aware times but tests
    sometimes get sloppy."""
    naive = datetime(2030, 6, 15, 12, 0, 0)
    clock = FakeClock(start=naive)
    assert clock.now().tzinfo is UTC


def test_fake_clock_aware_non_utc_start_normalized() -> None:
    """An aware datetime in another timezone is converted to UTC for
    storage — the FakeClock always returns UTC."""
    eastern = timezone(timedelta(hours=-5))
    start = datetime(2030, 6, 15, 7, 0, 0, tzinfo=eastern)
    clock = FakeClock(start=start)
    assert clock.now() == datetime(2030, 6, 15, 12, 0, 0, tzinfo=UTC)


def test_fake_clock_monotonic_starts_at_supplied_value() -> None:
    clock = FakeClock(monotonic_start=500.0)
    assert clock.monotonic() == 500.0


# ── FakeClock — advance ──────────────────────────────────────────────


def test_advance_with_timedelta() -> None:
    clock = FakeClock()
    before = clock.now()
    before_mono = clock.monotonic()
    clock.advance(timedelta(hours=2))
    assert clock.now() == before + timedelta(hours=2)
    assert clock.monotonic() == before_mono + 7200


def test_advance_with_named_components() -> None:
    clock = FakeClock()
    before = clock.now()
    clock.advance(hours=1, minutes=30, seconds=15)
    expected = before + timedelta(hours=1, minutes=30, seconds=15)
    assert clock.now() == expected


def test_advance_mixed_args_rejected() -> None:
    clock = FakeClock()
    with pytest.raises(ValueError, match="either delta"):
        clock.advance(timedelta(seconds=1), hours=2)


def test_advance_rejects_negative() -> None:
    clock = FakeClock()
    with pytest.raises(ValueError, match="cannot run backwards"):
        clock.advance(timedelta(seconds=-1))


def test_advance_zero_is_noop() -> None:
    clock = FakeClock()
    before = clock.now()
    before_mono = clock.monotonic()
    clock.advance()
    assert clock.now() == before
    assert clock.monotonic() == before_mono


# ── FakeClock — set_to / set_wall ────────────────────────────────────


def test_set_to_advances_wall_and_monotonic() -> None:
    clock = FakeClock()
    target = datetime(2026, 6, 1, tzinfo=UTC)
    before_mono = clock.monotonic()
    clock.set_to(target)
    assert clock.now() == target
    expected_delta = (target - datetime(2026, 1, 1, tzinfo=UTC)).total_seconds()
    assert clock.monotonic() == before_mono + expected_delta


def test_set_to_naive_treated_as_utc() -> None:
    clock = FakeClock()
    clock.set_to(datetime(2026, 6, 1))  # naive
    assert clock.now() == datetime(2026, 6, 1, tzinfo=UTC)


def test_set_to_backwards_rejected() -> None:
    clock = FakeClock(start=datetime(2026, 6, 1, tzinfo=UTC))
    with pytest.raises(ValueError, match="cannot run backwards"):
        clock.set_to(datetime(2026, 1, 1, tzinfo=UTC))


def test_set_wall_does_not_change_monotonic() -> None:
    """Wall-clock can jump without monotonic shifting — exercises the
    clock-skew scenario."""
    clock = FakeClock()
    before_mono = clock.monotonic()
    clock.set_wall(datetime(2026, 6, 1, tzinfo=UTC))
    assert clock.now() == datetime(2026, 6, 1, tzinfo=UTC)
    assert clock.monotonic() == before_mono


def test_set_wall_can_jump_backwards_for_clock_skew_tests() -> None:
    """Unlike set_to, set_wall lets you jump backwards — wall-clock
    skew tests need this."""
    clock = FakeClock(start=datetime(2026, 6, 1, tzinfo=UTC))
    clock.set_wall(datetime(2025, 12, 1, tzinfo=UTC))
    assert clock.now() == datetime(2025, 12, 1, tzinfo=UTC)


# ── Module-level configure / get / now / monotonic ───────────────────


def test_default_clock_is_system_clock() -> None:
    clock = get_clock()
    assert isinstance(clock, SystemClock)


def test_configure_swaps_the_clock() -> None:
    fake = FakeClock()
    configure_clock(fake)
    assert get_clock() is fake


def test_now_helper_uses_configured_clock() -> None:
    fake = FakeClock(start=datetime(2030, 1, 1, tzinfo=UTC))
    configure_clock(fake)
    assert now() == datetime(2030, 1, 1, tzinfo=UTC)


def test_monotonic_helper_uses_configured_clock() -> None:
    fake = FakeClock(monotonic_start=12345.0)
    configure_clock(fake)
    assert monotonic() == 12345.0


def test_reset_clock_restores_system_clock() -> None:
    configure_clock(FakeClock())
    reset_clock()
    assert isinstance(get_clock(), SystemClock)


def test_advance_affects_module_now() -> None:
    fake = FakeClock(start=datetime(2026, 1, 1, tzinfo=UTC))
    configure_clock(fake)
    assert now() == datetime(2026, 1, 1, tzinfo=UTC)
    fake.advance(days=10)
    assert now() == datetime(2026, 1, 11, tzinfo=UTC)
