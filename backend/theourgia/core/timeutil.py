"""Timezone-aware time helpers.

All timestamps in Theourgia are timezone-aware and stored in UTC. This
module provides the small helpers needed to enforce that consistently.
Local-time conversions happen at the edges (user input, display
rendering); the data layer never sees naive datetimes.

The Ruff ``DTZ`` rule set is enabled project-wide to catch accidental
naive-datetime usage.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

__all__ = ["utcnow", "utc_from_iso", "to_iso"]


def utcnow() -> datetime:
    """Return the current time in UTC as a timezone-aware datetime.

    Prefer this over ``datetime.utcnow()`` (deprecated, naive) and
    ``datetime.now()`` (uses local time by default).
    """
    return datetime.now(tz=UTC)


def utc_from_iso(value: str) -> datetime:
    """Parse an ISO 8601 string into a timezone-aware UTC datetime.

    Accepts both 'Z' suffix and explicit '+00:00'. If the input has no
    offset, it is assumed to be UTC (the responsibility of converting
    local time to UTC belongs to the caller / edge).
    """
    if value.endswith("Z"):
        value = f"{value[:-1]}+00:00"
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def to_iso(dt: datetime) -> str:
    """Format a datetime as ISO 8601 with explicit UTC offset.

    Naive datetimes are rejected — this is intentional. If you have one,
    decide where it came from and convert correctly at that edge.
    """
    if dt.tzinfo is None:
        msg = "to_iso: refusing to serialize a naive datetime; supply a tz-aware value"
        raise ValueError(msg)
    return dt.astimezone(UTC).isoformat()


# Re-export timedelta for convenience callers
__all__.append("timedelta")
