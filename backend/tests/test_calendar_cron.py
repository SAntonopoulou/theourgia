"""Unit tests for the pure-Python cron evaluator (iCal custom toggle)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from theourgia.core.calendar.cron import (
    CronParseError,
    cron_occurrences,
    parse_cron,
)

START = datetime(2026, 7, 1, 0, 0, tzinfo=UTC)  # a Wednesday
END = datetime(2026, 7, 31, 23, 59, tzinfo=UTC)


# ── parse_cron ───────────────────────────────────────────────────


def test_parse_wildcards() -> None:
    s = parse_cron("* * * * *")
    assert s.minutes == frozenset(range(60))
    assert s.hours == frozenset(range(24))
    assert s.days_of_month == frozenset(range(1, 32))
    assert s.months == frozenset(range(1, 13))
    assert s.days_of_week == frozenset(range(7))
    assert s.dom_is_wildcard
    assert s.dow_is_wildcard


def test_parse_single_values() -> None:
    s = parse_cron("30 6 1 7 0")
    assert s.minutes == frozenset({30})
    assert s.hours == frozenset({6})
    assert s.days_of_month == frozenset({1})
    assert s.months == frozenset({7})
    assert s.days_of_week == frozenset({0})


def test_parse_ranges_lists_and_steps() -> None:
    s = parse_cron("0,30 9-17 * * 1-5")
    assert s.minutes == frozenset({0, 30})
    assert s.hours == frozenset(range(9, 18))
    assert s.days_of_week == frozenset({1, 2, 3, 4, 5})
    s2 = parse_cron("*/15 */6 * * *")
    assert s2.minutes == frozenset({0, 15, 30, 45})
    assert s2.hours == frozenset({0, 6, 12, 18})


def test_parse_folds_sunday_seven_to_zero() -> None:
    assert parse_cron("0 0 * * 7").days_of_week == frozenset({0})


@pytest.mark.parametrize(
    "expr",
    [
        "",
        "not a cron",
        "* * * *",  # 4 fields
        "* * * * * *",  # 6 fields
        "60 * * * *",  # minute out of range
        "* 24 * * *",  # hour out of range
        "* * 0 * *",  # dom out of range
        "* * * 13 *",  # month out of range
        "* * * * 8",  # dow out of range
        "5-1 * * * *",  # inverted range
        "*/0 * * * *",  # zero step
        "a * * * *",
    ],
)
def test_parse_rejects_bad_expressions(expr: str) -> None:
    with pytest.raises(CronParseError):
        parse_cron(expr)


# ── cron_occurrences ─────────────────────────────────────────────


def test_occurrences_weekly() -> None:
    occ = cron_occurrences(parse_cron("30 6 * * 1"), START, END)
    assert [o.day for o in occ] == [6, 13, 20, 27]  # July 2026 Mondays
    assert all(o.weekday() == 0 for o in occ)
    assert all((o.hour, o.minute) == (6, 30) for o in occ)


def test_occurrences_monthly_dom() -> None:
    occ = cron_occurrences(parse_cron("0 12 15 * *"), START, END)
    assert len(occ) == 1
    assert occ[0] == datetime(2026, 7, 15, 12, 0, tzinfo=UTC)


def test_occurrences_vixie_or_rule() -> None:
    """When BOTH dom and dow are restricted, either match fires."""
    # 15th of the month OR every Monday.
    occ = cron_occurrences(parse_cron("0 12 15 * 1"), START, END)
    days = {o.day for o in occ}
    assert days == {6, 13, 15, 20, 27}


def test_occurrences_respects_bounds_inclusive() -> None:
    occ = cron_occurrences(
        parse_cron("0 0 * * *"),
        datetime(2026, 7, 1, 0, 0, tzinfo=UTC),
        datetime(2026, 7, 3, 0, 0, tzinfo=UTC),
    )
    assert len(occ) == 3


def test_occurrences_capped_by_limit() -> None:
    occ = cron_occurrences(parse_cron("* * * * *"), START, END, limit=17)
    assert len(occ) == 17


def test_occurrences_requires_tz_aware() -> None:
    naive = datetime(2026, 7, 1)  # noqa: DTZ001 — naive on purpose
    with pytest.raises(ValueError, match="tz-aware"):
        cron_occurrences(parse_cron("* * * * *"), naive, END)
