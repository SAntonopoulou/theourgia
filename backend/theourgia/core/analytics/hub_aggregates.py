"""Cross-vault DP aggregates for hubs — v1-033 (Tier 3 #20).

Wires the b108-2hr differential-privacy substrate
(:mod:`theourgia.core.analytics.differential_privacy`) to real
cross-vault data. The cohort is a hub's OPTED-IN membership
(:class:`~theourgia.models.hub_aggregate.HubAggregateOptIn`) — data
from anyone else never enters the computation.

Honesty rules wired:

  · The cohort minimum is checked BEFORE any vault is queried — a
    too-small cohort refuses outright (:class:`CohortTooSmall`),
    never returns a noised answer, and never touches member data.
  · Per-member contributions are clipped BEFORE aggregation
    (``ENTRY_CLIP_HIGH``) so the sensitivity — and therefore the
    privacy guarantee — is bounded.
  · Only the :class:`NoisyAggregate` leaves this module: the true
    values never cross the API boundary.

v1 metric set (per-member journal activity in a trailing window):

  ``entries_total``     — noised sum of per-member entry counts.
  ``entries_per_member`` — noised mean of per-member entry counts.
  ``active_members``    — noised count of members with >= 1 entry
                          (each member contributes at most 1;
                          sensitivity 1).
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from typing import Final
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.analytics.differential_privacy import (
    NoisyAggregate,
    check_cohort_size,
    noisy_count,
    noisy_mean,
    noisy_sum,
)
from theourgia.models.entries import Entry

__all__ = [
    "ENTRY_CLIP_HIGH",
    "HUB_AGGREGATE_METRICS",
    "compute_hub_aggregate",
    "member_entry_counts",
]


HUB_AGGREGATE_METRICS: Final[tuple[str, ...]] = (
    "entries_total",
    "entries_per_member",
    "active_members",
)

# One member contributes at most this many entries to a sum / mean.
# Bounds the sensitivity: an outlier journaling 400 times in a window
# moves the aggregate no further than a member journaling 50 times.
ENTRY_CLIP_HIGH: Final[float] = 50.0


async def member_entry_counts(
    db: AsyncSession,
    member_ids: Iterable[UUID],
    *,
    since: datetime,
    until: datetime,
) -> list[float]:
    """Per-member entry counts in ``[since, until)``.

    One grouped query; members with no entries contribute 0.0 so the
    cohort size equals the opt-in count, not the active count.
    """
    ids = list(member_ids)
    if not ids:
        return []
    rows = (
        await db.execute(
            select(Entry.owner_id, func.count())
            .where(
                Entry.owner_id.in_(ids),
                Entry.deleted_at.is_(None),
                Entry.created_at >= since,
                Entry.created_at < until,
            )
            .group_by(Entry.owner_id)
        )
    ).all()
    by_owner = {owner_id: float(count) for owner_id, count in rows}
    return [by_owner.get(member_id, 0.0) for member_id in ids]


async def compute_hub_aggregate(
    db: AsyncSession,
    *,
    member_ids: list[UUID],
    metric: str,
    window_days: int,
    epsilon: float,
    min_cohort: int,
    now: datetime | None = None,
) -> NoisyAggregate:
    """Compute one noised hub aggregate.

    Raises :class:`CohortTooSmall` (before touching any vault data)
    when fewer than ``min_cohort`` members opted in, and
    :class:`ValueError` for an unknown metric.
    """
    if metric not in HUB_AGGREGATE_METRICS:
        msg = f"unknown hub aggregate metric: {metric!r}"
        raise ValueError(msg)

    # Refuse BEFORE querying member data — a too-small cohort must
    # leave no trace of anyone's counts, not even in memory.
    check_cohort_size(len(member_ids), min_cohort)

    now = now or datetime.now(tz=UTC)
    since = now - timedelta(days=window_days)
    counts = await member_entry_counts(
        db, member_ids, since=since, until=now,
    )

    if metric == "entries_total":
        return noisy_sum(
            counts,
            epsilon,
            clip_low=0.0,
            clip_high=ENTRY_CLIP_HIGH,
            min_cohort=min_cohort,
        )
    if metric == "entries_per_member":
        return noisy_mean(
            counts,
            epsilon,
            clip_low=0.0,
            clip_high=ENTRY_CLIP_HIGH,
            min_cohort=min_cohort,
        )
    # active_members — each member contributes at most 1.
    active = sum(1 for count in counts if count > 0)
    return noisy_count(
        active,
        epsilon,
        cohort_size=len(counts),
        min_cohort=min_cohort,
    )
