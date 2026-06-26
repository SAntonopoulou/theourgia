"""Analytics endpoints (B122 + B123).

Per ``plan/09-batches-backend.md`` § B122 + B123.

``POST /api/v1/analytics/query``       — run a full DSL query (B122)
``POST /api/v1/analytics/timeseries``  — bucket counts (B123)
``POST /api/v1/analytics/heatmap``     — 2-D count grid (B123)
``POST /api/v1/analytics/correlation`` — Pearson + Spearman (B123)
``GET  /api/v1/analytics/today``       — hero counts (B123)

Honesty rules:
  * Owner-scoped; 401 unauthenticated.
  * Sealed exclusion + sealed_excluded_count surfaced when the
    filter tree touches entry.body_text (executor).
  * Aggregate responses carry sample_size + small_sample flag.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.analytics.aggregates import (
    CORRELATION_MIN_SAMPLE,
    CorrelationResponse,
    HeatmapResponse,
    TimeseriesResponse,
    TodayResponse,
    compute_heatmap,
    compute_timeseries,
    compute_today,
    pearson,
    spearman,
)
from theourgia.core.analytics.executor import (
    ExecutionError,
    QueryExecutionResult,
    execute_query,
)
from theourgia.core.analytics.query_dsl import (
    DSLValidationError,
    parse as parse_query,
)

__all__ = ["router"]

router = APIRouter()


# ── Payload schemas ─────────────────────────────────────────────


class TimeseriesPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: Literal["entry", "synchronicity"]
    granularity: Literal["day", "week", "month"] = "day"
    from_: datetime | None = Field(default=None, alias="from")
    to: datetime | None = None


class HeatmapPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: Literal["synchronicity"] = "synchronicity"
    x_axis: Literal["weekday", "category"]
    y_axis: Literal["weekday", "category", "intensity_bucket"]
    value_axis: Literal["count"] = "count"


class CorrelationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: Literal["synchronicity"] = "synchronicity"
    # Cross numeric axes only. v1 supports a fixed set; expand later.
    axes: list[Literal["intensity", "weekday_num"]] = Field(
        default_factory=lambda: ["intensity", "weekday_num"],
        min_length=2,
    )


# ── /analytics/query ────────────────────────────────────────────


@router.post(
    "/analytics/query",
    response_model=QueryExecutionResult,
    tags=["analytics"],
)
async def analytics_query(
    payload: dict,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> QueryExecutionResult:
    """Run a query against the caller's vault and return the result
    without persisting a snapshot. Use ``POST /studies/{id}/run`` to
    persist."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    try:
        parsed = parse_query(payload)
    except DSLValidationError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid query: {exc}",
        )
    try:
        return await execute_query(
            db=db, owner_id=current_user.id, parsed=parsed,
        )
    except (DSLValidationError, ExecutionError) as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            str(exc),
        )


# ── /analytics/timeseries ───────────────────────────────────────


@router.post(
    "/analytics/timeseries",
    response_model=TimeseriesResponse,
    tags=["analytics"],
)
async def analytics_timeseries(
    payload: TimeseriesPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> TimeseriesResponse:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    return await compute_timeseries(
        db=db,
        owner_id=current_user.id,
        subject=payload.subject,
        granularity=payload.granularity,
        from_=payload.from_,
        to=payload.to,
    )


# ── /analytics/heatmap ──────────────────────────────────────────


@router.post(
    "/analytics/heatmap",
    response_model=HeatmapResponse,
    tags=["analytics"],
)
async def analytics_heatmap(
    payload: HeatmapPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> HeatmapResponse:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    return await compute_heatmap(
        db=db,
        owner_id=current_user.id,
        subject=payload.subject,
        x_axis=payload.x_axis,
        y_axis=payload.y_axis,
        value_axis=payload.value_axis,
    )


# ── /analytics/correlation ──────────────────────────────────────


@router.post(
    "/analytics/correlation",
    response_model=CorrelationResponse,
    tags=["analytics"],
)
async def analytics_correlation(
    payload: CorrelationPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> CorrelationResponse:
    """Pearson + Spearman matrix over a fixed set of numeric axes
    on the synchronicity subject. v1 ships only intensity +
    weekday_num; future revisions extend the axis catalog as new
    numeric columns are materialised."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")

    from sqlalchemy import select
    from theourgia.models.synchronicities import Synchronicity

    stmt = (
        select(Synchronicity.occurred_at, Synchronicity.intensity)
        .where(Synchronicity.owner_id == current_user.id)
        .where(Synchronicity.deleted_at.is_(None))
    )
    rows = (await db.execute(stmt)).all()

    # Build per-axis series.
    series: dict[str, list[float]] = {a: [] for a in payload.axes}
    for occurred_at, intensity in rows:
        if occurred_at is None:
            continue
        for a in payload.axes:
            if a == "intensity":
                series[a].append(float(intensity or 0))
            elif a == "weekday_num":
                series[a].append(float(occurred_at.weekday()))

    n = len(rows)
    axes = list(payload.axes)
    pearson_mx = [
        [pearson(series[i], series[j]) for j in axes] for i in axes
    ]
    spearman_mx = [
        [spearman(series[i], series[j]) for j in axes] for i in axes
    ]

    # Null-threshold warning: any axis whose non-null share is < 50%.
    null_warning = any(
        len(series[a]) < n / 2 for a in axes
    )

    return CorrelationResponse(
        axes=axes,
        pearson=pearson_mx,
        spearman=spearman_mx,
        sample_size=n,
        small_sample=n < CORRELATION_MIN_SAMPLE,
        null_threshold_warning=null_warning,
    )


# ── /analytics/today ────────────────────────────────────────────


@router.get(
    "/analytics/today",
    response_model=TodayResponse,
    tags=["analytics"],
)
async def analytics_today(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> TodayResponse:
    """Counts for the calendar day. The H06 Analytics Dashboard's
    hero strip wants these three numbers; the route caps the
    sample window at the current calendar day in UTC."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    return await compute_today(db=db, owner_id=current_user.id)
