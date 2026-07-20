"""Memorial-mode state computation — shared by router + beat sweep.

b108-2hg computed the state inline in the router; v1-018 extracts it
here so the hourly Celery sweep (:mod:`theourgia.core.tasks.memorial`)
and the HTTP surface (:mod:`theourgia.api.routers.v1.memorial`) agree
on one definition and can never drift.

The state machine (all computed, nothing stored):

- ``memorialized`` — ``memorialized_at`` is set. Terminal until a
  reactivate.
- ``active`` — the check-in cadence has not lapsed (or cadence is 0,
  which disables expiry entirely).
- ``warning`` — the cadence lapsed but the warning window has not.
- ``memorial_pending`` — cadence + warning window both lapsed. The
  automatic trigger fires here (the sweep sets ``memorialized_at``).

Every function takes an optional ``now`` so tests can freeze the
clock; production callers omit it.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Protocol

__all__ = [
    "MemorialState",
    "compute_state",
    "days_until_pending",
    "days_until_warning",
]


MemorialState = Literal[
    "active",
    "warning",
    "memorial_pending",
    "memorialized",
]


class _MemorialConfigLike(Protocol):
    """The timestamp fields the computation reads — satisfied by
    :class:`theourgia.models.memorial.MemorialConfig` and by the
    SimpleNamespace fixtures the tests use."""

    memorialized_at: datetime | None
    check_in_cadence_days: int
    warning_window_days: int
    last_check_in_at: datetime | None
    created_at: datetime


def _origin(row: _MemorialConfigLike) -> datetime:
    """The timestamp the cadence counts from — last check-in, or the
    config's creation for a brand-new row with no check-in yet."""
    return row.last_check_in_at or row.created_at


def compute_state(
    row: _MemorialConfigLike, *, now: datetime | None = None,
) -> MemorialState:
    if row.memorialized_at is not None:
        return "memorialized"
    if row.check_in_cadence_days <= 0:
        # 0 disables expiry entirely.
        return "active"
    now = now or datetime.now(tz=timezone.utc)
    days_since_check_in = (now - _origin(row)).days
    if days_since_check_in <= row.check_in_cadence_days:
        return "active"
    if days_since_check_in <= row.check_in_cadence_days + row.warning_window_days:
        return "warning"
    return "memorial_pending"


def days_until_warning(
    row: _MemorialConfigLike, *, now: datetime | None = None,
) -> int | None:
    if row.memorialized_at is not None or row.check_in_cadence_days <= 0:
        return None
    now = now or datetime.now(tz=timezone.utc)
    days_since = (now - _origin(row)).days
    return row.check_in_cadence_days - days_since


def days_until_pending(
    row: _MemorialConfigLike, *, now: datetime | None = None,
) -> int | None:
    if row.memorialized_at is not None or row.check_in_cadence_days <= 0:
        return None
    now = now or datetime.now(tz=timezone.utc)
    days_since = (now - _origin(row)).days
    limit = row.check_in_cadence_days + row.warning_window_days
    return limit - days_since
