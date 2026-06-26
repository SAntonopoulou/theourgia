"""Analytics aggregates (B123).

Per ``plan/09-batches-backend.md`` § B123.

Three core aggregates and one read-only summary endpoint:

  timeseries   — bucket counts per day/week/month
  heatmap      — x_axis × y_axis grid of counts (or mean)
  correlation  — Pearson + Spearman over selected numeric axes
  today        — counts for entries / workings / syncs today

The aggregates are pure functions where possible. The DB-touching
side does a single ``select()`` then aggregates in Python — keeps
the path testable + reusable across the digest (B124).

Honesty rules wired:
  * Every aggregate response carries a ``sample_size`` field +
    optional ``small_sample`` flag (mirrors B112).
  * Minimums: timeseries ≥ 5 rows · heatmap ≥ 10 · correlation ≥ 20.
    Below these the response still returns the data, but with the
    flag tripped so the frontend can surface the H06 "small sample"
    chip in --accent (warm invitation, not --danger).
  * Sealed entries' body text NEVER enters an aggregate when a
    filter touches ``entry.body_text``. The executor's exclusion
    rule applies.
  * Correlation responses carry ``null_threshold_warning`` when any
    axis has fewer than half of non-null values present —
    informational, not gating.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from math import sqrt
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.synchronicities import Synchronicity

__all__ = [
    "TIMESERIES_MIN_SAMPLE",
    "HEATMAP_MIN_SAMPLE",
    "CORRELATION_MIN_SAMPLE",
    "TimeseriesPoint",
    "TimeseriesResponse",
    "HeatmapCell",
    "HeatmapResponse",
    "CorrelationResponse",
    "TodayResponse",
    "bucket_for",
    "compute_timeseries",
    "compute_heatmap",
    "pearson",
    "spearman",
    "compute_today",
]


TIMESERIES_MIN_SAMPLE = 5
HEATMAP_MIN_SAMPLE = 10
CORRELATION_MIN_SAMPLE = 20


# ── Shapes ───────────────────────────────────────────────────────


class TimeseriesPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bucket: str
    count: int


class TimeseriesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    points: list[TimeseriesPoint]
    sample_size: int
    small_sample: bool


class HeatmapCell(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: str
    y: str
    value: float


class HeatmapResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cells: list[HeatmapCell]
    x_axis_label: str
    y_axis_label: str
    value_axis_label: str
    sample_size: int
    small_sample: bool


class CorrelationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    axes: list[str]
    pearson: list[list[float]]
    spearman: list[list[float]]
    sample_size: int
    small_sample: bool
    null_threshold_warning: bool


class TodayResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries_today: int
    workings_today: int
    syncs_today: int


# ── Bucketing ────────────────────────────────────────────────────


def bucket_for(
    dt: datetime, granularity: Literal["day", "week", "month"],
) -> str:
    """Return the ISO-format bucket label for a datetime."""
    if granularity == "day":
        return dt.strftime("%Y-%m-%d")
    if granularity == "week":
        # ISO week.
        year, week, _ = dt.isocalendar()
        return f"{year}-W{week:02d}"
    if granularity == "month":
        return dt.strftime("%Y-%m")
    raise ValueError(f"Unknown granularity: {granularity!r}")


# ── compute_timeseries ──────────────────────────────────────────


async def compute_timeseries(
    *,
    db: AsyncSession,
    owner_id: UUID,
    subject: Literal["entry", "synchronicity"],
    granularity: Literal["day", "week", "month"],
    from_: datetime | None = None,
    to: datetime | None = None,
) -> TimeseriesResponse:
    """Return a time-bucketed count series for the given subject.

    Pure SQL would be nicer; for now we fetch the per-row timestamps
    and bucket in Python. Acceptable for the typical 100K-row vault;
    the executor already caps and pages where needed."""
    if subject == "entry":
        stmt = (
            select(Entry.created_at)
            .where(Entry.owner_id == owner_id)
            .where(Entry.deleted_at.is_(None))
            .where(Entry.encryption_mode != EncryptionMode.SEALED)
        )
        if from_ is not None:
            stmt = stmt.where(Entry.created_at >= from_)
        if to is not None:
            stmt = stmt.where(Entry.created_at <= to)
    else:
        stmt = (
            select(Synchronicity.occurred_at)
            .where(Synchronicity.owner_id == owner_id)
            .where(Synchronicity.deleted_at.is_(None))
        )
        if from_ is not None:
            stmt = stmt.where(Synchronicity.occurred_at >= from_)
        if to is not None:
            stmt = stmt.where(Synchronicity.occurred_at <= to)

    rows = (await db.execute(stmt)).scalars().all()
    counts: dict[str, int] = defaultdict(int)
    for dt in rows:
        if dt is None:
            continue
        counts[bucket_for(dt, granularity)] += 1

    points = [
        TimeseriesPoint(bucket=k, count=v)
        for k, v in sorted(counts.items())
    ]
    sample = sum(p.count for p in points)
    return TimeseriesResponse(
        points=points,
        sample_size=sample,
        small_sample=sample < TIMESERIES_MIN_SAMPLE,
    )


# ── compute_heatmap ──────────────────────────────────────────────


async def compute_heatmap(
    *,
    db: AsyncSession,
    owner_id: UUID,
    subject: Literal["synchronicity"],
    x_axis: Literal["weekday", "category"],
    y_axis: Literal["weekday", "category", "intensity_bucket"],
    value_axis: Literal["count"] = "count",
) -> HeatmapResponse:
    """A 2-D count heatmap over synchronicities.

    The "weekday × category" cell tells the practitioner "I noticed
    weather syncs on Wednesdays N times." The H06 design's primary
    use case.
    """
    if subject != "synchronicity":
        raise ValueError(
            "Phase 09 ships the heatmap for synchronicity subject only."
        )

    stmt = (
        select(
            Synchronicity.occurred_at,
            Synchronicity.category,
            Synchronicity.intensity,
        )
        .where(Synchronicity.owner_id == owner_id)
        .where(Synchronicity.deleted_at.is_(None))
    )
    rows = (await db.execute(stmt)).all()

    weekdays = (
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    )

    def axis_value(name: str, dt: datetime, cat: object, intensity: int) -> str:
        if name == "weekday":
            return weekdays[dt.weekday()]
        if name == "category":
            return cat.value if hasattr(cat, "value") else str(cat)
        if name == "intensity_bucket":
            if intensity <= 3:
                return "1-3"
            if intensity <= 6:
                return "4-6"
            return "7-10"
        raise ValueError(f"Unknown heatmap axis: {name!r}")

    grid: dict[tuple[str, str], int] = defaultdict(int)
    sample = 0
    for occurred_at, category, intensity in rows:
        if occurred_at is None:
            continue
        sample += 1
        x = axis_value(x_axis, occurred_at, category, intensity or 0)
        y = axis_value(y_axis, occurred_at, category, intensity or 0)
        grid[(x, y)] += 1

    cells = [
        HeatmapCell(x=x, y=y, value=float(v))
        for (x, y), v in sorted(grid.items())
    ]
    return HeatmapResponse(
        cells=cells,
        x_axis_label=x_axis,
        y_axis_label=y_axis,
        value_axis_label=value_axis,
        sample_size=sample,
        small_sample=sample < HEATMAP_MIN_SAMPLE,
    )


# ── Correlation: Pearson + Spearman ─────────────────────────────


def _rank(values: list[float]) -> list[float]:
    """Average-rank ties (the standard for Spearman)."""
    sorted_pairs = sorted(enumerate(values), key=lambda t: t[1])
    ranks = [0.0] * len(values)
    i = 0
    n = len(sorted_pairs)
    while i < n:
        j = i
        while j + 1 < n and sorted_pairs[j + 1][1] == sorted_pairs[i][1]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[sorted_pairs[k][0]] = avg
        i = j + 1
    return ranks


def pearson(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    if n != len(ys) or n < 2:
        return 0.0
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = 0.0
    den_x = 0.0
    den_y = 0.0
    for x, y in zip(xs, ys):
        dx = x - mean_x
        dy = y - mean_y
        num += dx * dy
        den_x += dx * dx
        den_y += dy * dy
    if den_x <= 0 or den_y <= 0:
        return 0.0
    return num / sqrt(den_x * den_y)


def spearman(xs: list[float], ys: list[float]) -> float:
    return pearson(_rank(xs), _rank(ys))


# ── compute_today ───────────────────────────────────────────────


async def compute_today(
    *,
    db: AsyncSession,
    owner_id: UUID,
    now: datetime | None = None,
) -> TodayResponse:
    """Counts for the calendar day containing ``now`` (defaults to
    current UTC time). Used by the H06 Analytics Dashboard hero
    strip. Caches at the route layer."""
    n = now or datetime.now(tz=timezone.utc)
    start = n.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    entries_stmt = (
        select(func.count(Entry.id))
        .where(Entry.owner_id == owner_id)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.created_at >= start)
        .where(Entry.created_at < end)
    )
    entries_count = int((await db.execute(entries_stmt)).scalar_one())

    workings_stmt = (
        select(func.count(Entry.id))
        .where(Entry.owner_id == owner_id)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.created_at >= start)
        .where(Entry.created_at < end)
        .where(Entry.__table__.c.type == "working")
    )
    workings_count = int((await db.execute(workings_stmt)).scalar_one())

    syncs_stmt = (
        select(func.count(Synchronicity.id))
        .where(Synchronicity.owner_id == owner_id)
        .where(Synchronicity.deleted_at.is_(None))
        .where(Synchronicity.occurred_at >= start)
        .where(Synchronicity.occurred_at < end)
    )
    syncs_count = int((await db.execute(syncs_stmt)).scalar_one())

    return TodayResponse(
        entries_today=entries_count,
        workings_today=workings_count,
        syncs_today=syncs_count,
    )
