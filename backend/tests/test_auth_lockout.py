"""Tests for the account-lockout exponential backoff ladder."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from theourgia.core.auth.lockout import (
    LOCKOUT_LADDER,
    MAX_LOCKOUT,
    compute_lockout,
    is_locked,
)


def test_no_lockout_below_threshold() -> None:
    for count in (0, 1, 2, 3, 4):
        assert compute_lockout(count) is None


def test_lockout_at_first_threshold() -> None:
    """At 5 failed attempts: 60 seconds."""
    assert compute_lockout(5) == LOCKOUT_LADDER[5]
    assert compute_lockout(5) == timedelta(seconds=60)


def test_lockout_escalates_through_ladder() -> None:
    assert compute_lockout(9) == LOCKOUT_LADDER[5]  # still on first rung
    assert compute_lockout(10) == LOCKOUT_LADDER[10]
    assert compute_lockout(14) == LOCKOUT_LADDER[10]
    assert compute_lockout(15) == LOCKOUT_LADDER[15]
    assert compute_lockout(19) == LOCKOUT_LADDER[15]
    assert compute_lockout(20) == LOCKOUT_LADDER[20]


def test_lockout_beyond_top_threshold_escalates_to_cap() -> None:
    """Past the top of the ladder, each extra failure adds bonus time up to MAX_LOCKOUT."""
    top = max(LOCKOUT_LADDER)  # 20
    # One past the top: small bonus
    d_21 = compute_lockout(top + 1)
    d_40 = compute_lockout(top + 20)
    d_huge = compute_lockout(top + 1000)
    assert d_21 is not None
    assert d_40 is not None
    assert d_huge is not None
    assert d_21 < d_40
    # Cap holds at MAX_LOCKOUT (with possible round-off near the boundary)
    assert d_40 == MAX_LOCKOUT
    assert d_huge == MAX_LOCKOUT


def test_lockout_ladder_is_monotonic() -> None:
    """Each threshold's duration is strictly greater than the previous."""
    sorted_thresholds = sorted(LOCKOUT_LADDER)
    for prev, nxt in zip(sorted_thresholds, sorted_thresholds[1:], strict=False):
        assert LOCKOUT_LADDER[prev] < LOCKOUT_LADDER[nxt]


def test_is_locked_false_when_locked_until_is_none() -> None:
    assert is_locked(None, datetime.now(tz=UTC)) is False


def test_is_locked_true_when_now_before_locked_until() -> None:
    now = datetime.now(tz=UTC)
    later = now + timedelta(minutes=5)
    assert is_locked(later, now) is True


def test_is_locked_false_when_now_at_or_after_locked_until() -> None:
    now = datetime.now(tz=UTC)
    earlier = now - timedelta(seconds=1)
    assert is_locked(earlier, now) is False
    assert is_locked(now, now) is False


def test_negative_failed_count_yields_no_lockout() -> None:
    # Defensive: should never happen, but the function handles it
    assert compute_lockout(-1) is None
    assert compute_lockout(-100) is None
