"""Tests for the timezone-aware time helpers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

import pytest

from theourgia.core.timeutil import to_iso, utc_from_iso, utcnow


def test_utcnow_returns_tz_aware_utc() -> None:
    now = utcnow()
    assert now.tzinfo is not None
    assert now.utcoffset() == timedelta(0)


def test_utc_from_iso_accepts_z_suffix() -> None:
    dt = utc_from_iso("2026-06-20T13:30:00Z")
    assert dt.tzinfo == UTC
    assert dt.year == 2026
    assert dt.month == 6
    assert dt.day == 20
    assert dt.hour == 13
    assert dt.minute == 30


def test_utc_from_iso_accepts_explicit_offset() -> None:
    dt = utc_from_iso("2026-06-20T13:30:00+00:00")
    assert dt.tzinfo == UTC


def test_utc_from_iso_converts_non_utc_offset() -> None:
    # 14:30 in +01:00 == 13:30 UTC
    dt = utc_from_iso("2026-06-20T14:30:00+01:00")
    assert dt.tzinfo == UTC
    assert dt.hour == 13


def test_utc_from_iso_promotes_naive_to_utc() -> None:
    dt = utc_from_iso("2026-06-20T13:30:00")
    assert dt.tzinfo == UTC


def test_to_iso_includes_utc_offset() -> None:
    dt = datetime(2026, 6, 20, 13, 30, tzinfo=UTC)
    result = to_iso(dt)
    assert result.endswith("+00:00") or result.endswith("Z")
    assert "2026-06-20T13:30:00" in result


def test_to_iso_converts_non_utc_to_utc() -> None:
    plus_one = timezone(timedelta(hours=1))
    dt = datetime(2026, 6, 20, 14, 30, tzinfo=plus_one)
    result = to_iso(dt)
    # Converted to UTC, the hour drops by 1
    assert "13:30" in result
    assert "+00:00" in result


def test_to_iso_rejects_naive_datetime() -> None:
    naive = datetime(2026, 6, 20, 13, 30)
    with pytest.raises(ValueError, match="naive datetime"):
        to_iso(naive)
