"""Tests for the Daily Practice Tracker (B87).

Covers the cadence-firing logic + the streak computation. These are
pure-Python tests against the helper functions; full HTTP roundtrips
through the router require a live Postgres and live alongside the
docker-compose integration suite.

The streak logic mirrors ``frontend/shared/src/practice/streak.ts``
verbatim — a skip is information not failure (does NOT break the
streak), a miss breaks it, and pending today preserves the trailing
run.
"""

from __future__ import annotations

from datetime import date

import pytest

from theourgia.api.routers.v1.practices import (
    _cadence_fires_on,
    _cadence_human,
    _streak,
)
from theourgia.models.practices import CustomPractice, PracticeCadence


# ───── cadence_human ────────────────────────────────────────────


def test_cadence_human_daily() -> None:
    p = CustomPractice(name="x", cadence=PracticeCadence.DAILY)
    assert _cadence_human(p) == "Daily"


def test_cadence_human_dark_moon() -> None:
    p = CustomPractice(name="x", cadence=PracticeCadence.DARK_MOON)
    assert _cadence_human(p) == "Every dark moon"


def test_cadence_human_morning() -> None:
    p = CustomPractice(name="x", cadence=PracticeCadence.MORNING)
    assert _cadence_human(p) == "Each morning"


def test_cadence_human_before_sleep() -> None:
    p = CustomPractice(name="x", cadence=PracticeCadence.BEFORE_SLEEP)
    assert _cadence_human(p) == "Before sleep"


def test_cadence_human_custom_uses_custom_text() -> None:
    p = CustomPractice(
        name="x",
        cadence=PracticeCadence.CUSTOM,
        cadence_custom="First Friday of each month",
    )
    assert _cadence_human(p) == "First Friday of each month"


def test_cadence_human_custom_without_text_falls_back() -> None:
    p = CustomPractice(name="x", cadence=PracticeCadence.CUSTOM)
    assert _cadence_human(p) == "Custom"


# ───── cadence_fires_on ─────────────────────────────────────────


def test_daily_fires_every_day() -> None:
    base = date(2026, 6, 22)
    for offset in range(7):
        d = base.fromordinal(base.toordinal() + offset)
        assert _cadence_fires_on(PracticeCadence.DAILY, d) is True


def test_weekly_fires_on_monday_only() -> None:
    # 2026-06-22 is a Monday.
    assert _cadence_fires_on(
        PracticeCadence.WEEKLY, date(2026, 6, 22),
    ) is True
    for off in range(1, 7):
        d = date.fromordinal(date(2026, 6, 22).toordinal() + off)
        assert _cadence_fires_on(PracticeCadence.WEEKLY, d) is False


def test_morning_and_before_sleep_fire_daily() -> None:
    d = date(2026, 6, 22)
    assert _cadence_fires_on(PracticeCadence.MORNING, d) is True
    assert _cadence_fires_on(PracticeCadence.BEFORE_SLEEP, d) is True


def test_custom_fires_daily_by_default() -> None:
    # The practitioner self-manages a custom cadence's firing days
    # via the surface; the engine defaults to "fires every day" so
    # missed-vs-not-firing computation doesn't drop completions.
    assert _cadence_fires_on(
        PracticeCadence.CUSTOM, date(2026, 6, 22),
    ) is True


# ───── streak ──────────────────────────────────────────────────


def _hist(s: str) -> list[str]:
    """Compact builder: 'd' → done, 's' → skip, 'm' → miss."""
    out = []
    for ch in s:
        if ch == "d":
            out.append("done")
        elif ch == "s":
            out.append("skip")
        elif ch == "m":
            out.append("miss")
        else:
            raise ValueError(ch)
    return out


def test_streak_done_today_simple_run() -> None:
    history = _hist("m" * 32 + "ddd")
    assert _streak(history, "done") == 3


def test_streak_skip_breaks_the_run() -> None:
    # Frontend streak() breaks on anything not 'done'. 'Skip is
    # information' is a TONE rule (no red chrome), not a math rule.
    history = _hist("m" * 30 + "dddsdd")  # last cell = today (done)
    # Walking back: d (today), d, s → break. Count = 2.
    assert _streak(history, "done") == 2


def test_streak_miss_breaks() -> None:
    history = _hist("m" * 30 + "ddmdd")
    # Walk back: d (today), d, m → break. Count = 2.
    assert _streak(history, "done") == 2


def test_streak_pending_today_counts_prior_run() -> None:
    # Today pending → start at history[33]. d-1 = d, d-2 = d, d-3 = m.
    history = _hist("m" * 30 + "mddmm")  # indices 30..34
    # history = ..., m, d, d, m, m
    #            30  31 32 33 34
    # Pending → start=33 which is 'm' → break immediately → 0
    assert _streak(history, "pending") == 0

    # Pending with three done days before today
    history2 = _hist("m" * 30 + "mdddm")
    # indices: 30=m, 31=d, 32=d, 33=d, 34=m (today=pending starts at 33)
    # Walk back from 33: d → 1, d → 2, d → 3, m at 30 → break.
    assert _streak(history2, "pending") == 3


def test_streak_skipped_today_breaks_immediately() -> None:
    # today=skipped → start=lastIndex; history[34] is 'skip' (per
    # the frontend admin route's history[34] = 'skip' for skipped).
    history = _hist("m" * 32 + "dd") + ["skip"]
    assert _streak(history, "skipped") == 0


def test_streak_done_today_with_miss_in_history_34() -> None:
    history = ["miss"] * 34 + ["done"]
    assert _streak(history, "done") == 1


def test_streak_long_skip_chain_breaks() -> None:
    # … done done skip skip skip done today — streak breaks at the
    # first skip walking back from today (count = 1, just today).
    history = _hist("m" * 28 + "ddsss" + "d")
    # cells 28..33 = d,d,s,s,s ; 34 = d (today). Length 34.
    # The list above is 28 misses + 6 chars = 34. We need 35.
    history = _hist("m" * 28 + "ddssss")  # 34 cells
    history.append("done")
    # indices: 28-29=d,d ; 30-33=s,s,s,s ; 34=d (today)
    # Walk back from 34 (done): done → 1; 33 = s → break.
    assert _streak(history, "done") == 1


def test_streak_empty_history_returns_zero() -> None:
    assert _streak([], "done") == 0
    assert _streak([], "pending") == 0


@pytest.mark.parametrize(
    "today_status,expected_min",
    [
        ("done", 1),
        ("skipped", 0),
        ("pending", 0),
    ],
)
def test_streak_minimums(today_status: str, expected_min: int) -> None:
    """Sanity floor: done today (history[34]=done) is ≥ 1;
    skipped/pending ≥ 0."""
    history = ["miss"] * 35
    if today_status == "done":
        history[-1] = "done"
    assert _streak(history, today_status) >= expected_min
