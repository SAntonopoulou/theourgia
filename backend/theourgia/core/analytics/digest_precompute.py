"""Tier-2 / tier-3 candidate pre-compute for the weekly digest.

The Phase 09 digest builder (B124) is pure: it consumes an
``AnalyticsSnapshot`` and surfaces the tiered observations whose
sample size clears the threshold. B124 shipped the route with
empty tier-2/3 candidate lists — every digest was tier-1 only.

This module fills that gap. Two real-data candidate sources today:

* :func:`precompute_category_frequencies` — tier-2 candidates. The
  most-active synchronicity categories in the period, with sample
  counts. Surfaces only when n ≥ 10.
* :func:`precompute_intensity_weekday_correlation` — tier-3
  candidate. Spearman correlation between synchronicity intensity
  and weekday (Monday=0 .. Sunday=6). Surfaces only when n ≥ 20.

The Phase 09 honesty rules carry forward in full:

* n < 10 is NEVER surfaced.
* No modal language in headlines — the digest_builder's
  ``assert_clean_headline`` runs on every emitted item.
* No sealed entry body text enters any candidate. The precompute
  reads only from the Synchronicity table (which carries no
  encrypted body fields).
* Correlation values are framed as observation, not causation.

Future candidate sources land here as new ``precompute_*`` helpers.
The shape is uniform: ``(db, owner_id, period_start, period_end) →
list[dict]`` where each dict carries at minimum ``n`` and a
candidate-specific kind discriminator.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.analytics.aggregates import spearman
from theourgia.models.synchronicities import Synchronicity

__all__ = [
    "precompute_category_frequencies",
    "precompute_intensity_weekday_correlation",
    "TIER2_CATEGORY_TEMPLATE",
    "TIER3_INTENSITY_WEEKDAY_TEMPLATE",
]


# New headline templates. These live HERE so the existing
# digest_builder.py templates stay unchanged for backwards
# compatibility — the route mixes both sources.
TIER2_CATEGORY_TEMPLATE = (
    "{category} synchronicities led the week · n={n}"
)
TIER3_INTENSITY_WEEKDAY_TEMPLATE = (
    "Synchronicity intensity and day-of-week correlate at "
    "{r:+.2f} · n={n}"
)


async def precompute_category_frequencies(
    *,
    db: AsyncSession,
    owner_id: UUID,
    period_start: datetime,
    period_end: datetime,
) -> list[dict]:
    """Return tier-2 candidate dicts ranked by frequency.

    Each dict is shaped ``{category, n}`` — the digest_builder's
    tier-2 gate (``n >= MIN_SAMPLE_PER_TIER_2``) filters to surfaces
    that clear the floor. We pre-rank by count so the digest's
    top-N selection is deterministic.
    """
    stmt = (
        select(
            Synchronicity.category,
            func.count().label("n"),
        )
        .where(Synchronicity.owner_id == owner_id)
        .where(Synchronicity.deleted_at.is_(None))
        .where(Synchronicity.occurred_at >= period_start)
        .where(Synchronicity.occurred_at < period_end)
        .group_by(Synchronicity.category)
        .order_by(func.count().desc())
    )
    rows = (await db.execute(stmt)).all()
    out: list[dict] = []
    for category, n in rows:
        # Enum or plain string — match the aggregates layer's
        # handling.
        cat_value = (
            category.value if hasattr(category, "value") else str(category)
        )
        out.append({"category": cat_value, "n": int(n or 0)})
    return out


async def precompute_intensity_weekday_correlation(
    *,
    db: AsyncSession,
    owner_id: UUID,
    period_start: datetime,
    period_end: datetime,
) -> list[dict]:
    """Compute Spearman correlation between intensity and weekday.

    Returns a 0- or 1-element list (one or zero candidate observations
    for this pair). The digest_builder's tier-3 gate filters by
    ``n >= MIN_SAMPLE_PER_TIER_3``.

    The dict shape matches the digest_builder's tier-3 correlation
    contract: ``{axis_a, axis_b, r, n}`` plus an optional
    ``confidence`` value (we don't yet compute a CI on Spearman
    — left as ``None``).
    """
    stmt = (
        select(Synchronicity.occurred_at, Synchronicity.intensity)
        .where(Synchronicity.owner_id == owner_id)
        .where(Synchronicity.deleted_at.is_(None))
        .where(Synchronicity.occurred_at >= period_start)
        .where(Synchronicity.occurred_at < period_end)
        .where(Synchronicity.intensity.is_not(None))
    )
    rows = (await db.execute(stmt)).all()
    xs: list[float] = []
    ys: list[float] = []
    for occurred_at, intensity in rows:
        if occurred_at is None or intensity is None:
            continue
        xs.append(float(occurred_at.weekday()))
        ys.append(float(intensity))
    n = len(xs)
    if n == 0:
        return []
    r = spearman(xs, ys)
    return [
        {
            "axis_a": "intensity",
            "axis_b": "weekday",
            "r": r,
            "n": n,
            "confidence": None,
        }
    ]
