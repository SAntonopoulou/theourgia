"""Hub cross-vault DP aggregates — /api/v1/hubs/{id}/aggregates (v1-033).

Tier 3 #20 / FEATURES §9. Wires the b108-2hr differential-privacy
substrate to real hub-scoped, cross-vault data.

::

  GET    /hubs/{id}/aggregates/opt-in    caller's consent + cohort size
  PUT    /hubs/{id}/aggregates/opt-in    consent (idempotent)
  DELETE /hubs/{id}/aggregates/opt-in    withdraw consent (idempotent)
  POST   /hubs/{id}/aggregates/query     run one noised aggregate
  GET    /hubs/{id}/aggregates/log       the query audit trail

Honesty rules wired:

  · **Opt-in only.** No consent row → a member's data never enters an
    aggregate. Consent withdrawal takes effect on the next query — the
    cohort is recomputed from live rows every time.
  · **Contribute to see.** Querying (and reading the query log)
    requires the caller be an opted-in hub member — nobody consumes
    the cohort's statistics without being part of it.
  · **Cohort minimum before noise.** Below the configured minimum the
    query is refused outright with ``cohort_too_small`` — no noised
    value, no member data touched. The refusal is audit-logged too.
  · **Server-fixed epsilon.** Callers cannot choose the privacy
    budget; the instance-configured epsilon is used and surfaced
    verbatim, with cohort size + noise scale, so readers can judge
    how much to trust the number (NoisyAggregate contract).
  · **Every query is logged and visible to contributors** (FEATURES
    §9 "network analytics audit log") — the append-only audit_event
    table records actor, metric, window, and outcome; the log
    endpoint replays it to opted-in members.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.analytics.differential_privacy import CohortTooSmall
from theourgia.core.analytics.hub_aggregates import compute_hub_aggregate
from theourgia.core.authz.audit import AuditLogger
from theourgia.core.config import get_settings
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.hub_aggregate import HubAggregateOptIn
from theourgia.models.identity import Hub, Membership

__all__ = ["router"]


router = APIRouter()


_AUDIT_ACTION = "hub.aggregate.query"


# ── Schemas ─────────────────────────────────────────────────────────


MetricName = Literal[
    "entries_total", "entries_per_member", "active_members",
]


class OptInStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    opted_in: bool
    cohort_size: int
    min_cohort: int


class AggregateQueryPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    metric: MetricName
    window_days: int = Field(default=30, ge=1, le=365)


class AggregateResult(BaseModel):
    """One noised aggregate. All four NoisyAggregate fields surface
    so the reader can judge the noise (b108-2hr honesty rule)."""

    model_config = ConfigDict(extra="forbid")

    metric: MetricName
    window_days: int
    value: float
    epsilon: float
    cohort_size: int
    noise_scale: float
    generated_at: datetime


class AggregateLogEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queried_at: datetime
    actor_id: str | None
    outcome: str
    metric: str | None
    window_days: int | None
    epsilon: float | None
    cohort_size: int | None


# ── Helpers ────────────────────────────────────────────────────────


async def _load_hub(db: AsyncSession, hub_id: UUID) -> Hub:
    hub = (
        await db.execute(
            select(Hub).where(Hub.id == hub_id, Hub.deleted_at.is_(None))
        )
    ).scalars().first()
    if hub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hub not found.",
        )
    return hub


async def _require_member(
    db: AsyncSession, hub_id: UUID, user_id: UUID,
) -> None:
    membership = (
        await db.execute(
            select(Membership).where(
                Membership.hub_id == hub_id,
                Membership.user_id == user_id,
            )
        )
    ).scalars().first()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only hub members may use hub aggregates.",
        )


async def _optin_row(
    db: AsyncSession, hub_id: UUID, user_id: UUID,
) -> HubAggregateOptIn | None:
    return (
        await db.execute(
            select(HubAggregateOptIn).where(
                HubAggregateOptIn.hub_id == hub_id,
                HubAggregateOptIn.user_id == user_id,
            )
        )
    ).scalars().first()


async def _cohort_member_ids(
    db: AsyncSession, hub_id: UUID,
) -> list[UUID]:
    return list(
        (
            await db.execute(
                select(HubAggregateOptIn.user_id).where(
                    HubAggregateOptIn.hub_id == hub_id,
                )
            )
        ).scalars().all()
    )


# ── Consent endpoints ──────────────────────────────────────────────


@router.get(
    "/hubs/{hub_id}/aggregates/opt-in",
    response_model=OptInStatus,
    summary="The caller's aggregate consent state",
)
async def get_opt_in(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OptInStatus:
    await _load_hub(db, hub_id)
    await _require_member(db, hub_id, user.id)
    row = await _optin_row(db, hub_id, user.id)
    cohort = await _cohort_member_ids(db, hub_id)
    return OptInStatus(
        opted_in=row is not None,
        cohort_size=len(cohort),
        min_cohort=get_settings().analytics_dp_min_cohort,
    )


@router.put(
    "/hubs/{hub_id}/aggregates/opt-in",
    response_model=OptInStatus,
    summary="Consent to the hub's aggregate analytics",
)
async def opt_in(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> OptInStatus:
    await _load_hub(db, hub_id)
    await _require_member(db, hub_id, user.id)
    row = await _optin_row(db, hub_id, user.id)
    if row is None:
        db.add(
            HubAggregateOptIn(
                hub_id=hub_id,
                user_id=user.id,
                opted_in_at=datetime.now(tz=UTC),
            )
        )
        await db.commit()
    cohort = await _cohort_member_ids(db, hub_id)
    return OptInStatus(
        opted_in=True,
        cohort_size=len(cohort),
        min_cohort=get_settings().analytics_dp_min_cohort,
    )


@router.delete(
    "/hubs/{hub_id}/aggregates/opt-in",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Withdraw aggregate consent",
)
async def opt_out(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    await _load_hub(db, hub_id)
    await _require_member(db, hub_id, user.id)
    row = await _optin_row(db, hub_id, user.id)
    if row is not None:
        await db.delete(row)
        await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Query + log ────────────────────────────────────────────────────


@router.post(
    "/hubs/{hub_id}/aggregates/query",
    response_model=AggregateResult,
    summary="Run one DP-noised cross-vault aggregate",
)
async def run_aggregate_query(
    hub_id: UUID,
    payload: AggregateQueryPayload,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> AggregateResult:
    await _load_hub(db, hub_id)
    await _require_member(db, hub_id, user.id)
    if await _optin_row(db, hub_id, user.id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Aggregates are contribute-to-see: opt in to the "
                "cohort before querying it."
            ),
        )

    settings = get_settings()
    member_ids = await _cohort_member_ids(db, hub_id)
    audit = AuditLogger(db)
    now = datetime.now(tz=UTC)

    try:
        aggregate = await compute_hub_aggregate(
            db,
            member_ids=member_ids,
            metric=payload.metric,
            window_days=payload.window_days,
            epsilon=settings.analytics_dp_epsilon,
            min_cohort=settings.analytics_dp_min_cohort,
            now=now,
        )
    except CohortTooSmall:
        await audit.log(
            kind=AuditEventKind.FEDERATION,
            action=_AUDIT_ACTION,
            outcome=AuditOutcome.DENIED,
            actor_id=user.id,
            hub_id=hub_id,
            detail={
                "metric": payload.metric,
                "window_days": payload.window_days,
                "cohort_size": len(member_ids),
                "min_cohort": settings.analytics_dp_min_cohort,
            },
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "cohort_too_small: this hub has "
                f"{len(member_ids)} opted-in members; aggregates "
                f"need at least {settings.analytics_dp_min_cohort}. "
                "No value — noised or otherwise — is returned below "
                "the minimum."
            ),
        ) from None

    await audit.log(
        kind=AuditEventKind.FEDERATION,
        action=_AUDIT_ACTION,
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        hub_id=hub_id,
        detail={
            "metric": payload.metric,
            "window_days": payload.window_days,
            "epsilon": aggregate.epsilon,
            "cohort_size": aggregate.cohort_size,
        },
    )
    await db.commit()

    return AggregateResult(
        metric=payload.metric,
        window_days=payload.window_days,
        value=aggregate.value,
        epsilon=aggregate.epsilon,
        cohort_size=aggregate.cohort_size,
        noise_scale=aggregate.noise_scale,
        generated_at=now,
    )


@router.get(
    "/hubs/{hub_id}/aggregates/log",
    response_model=list[AggregateLogEntry],
    summary="The hub's aggregate-query audit trail",
)
async def list_aggregate_log(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = 100,
) -> list[AggregateLogEntry]:
    """Every aggregate query against this hub, newest first — visible
    to opted-in members (FEATURES §9: logged AND visible to the
    people whose data is in the cohort)."""
    await _load_hub(db, hub_id)
    await _require_member(db, hub_id, user.id)
    if await _optin_row(db, hub_id, user.id) is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "The query log is visible to cohort contributors — "
                "opt in to see who queries your hub's aggregates."
            ),
        )
    limit = max(1, min(limit, 500))
    rows = (
        await db.execute(
            select(AuditEvent)
            .where(
                AuditEvent.hub_id == hub_id,
                AuditEvent.action == _AUDIT_ACTION,
            )
            .order_by(AuditEvent.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    entries: list[AggregateLogEntry] = []
    for row in rows:
        detail = row.detail or {}
        window_days = detail.get("window_days")
        epsilon = detail.get("epsilon")
        cohort_size = detail.get("cohort_size")
        metric = detail.get("metric")
        entries.append(
            AggregateLogEntry(
                queried_at=row.created_at,
                actor_id=str(row.actor_id) if row.actor_id else None,
                outcome=row.outcome.value,
                metric=metric if isinstance(metric, str) else None,
                window_days=(
                    window_days if isinstance(window_days, int) else None
                ),
                epsilon=(
                    float(epsilon)
                    if isinstance(epsilon, (int, float))
                    else None
                ),
                cohort_size=(
                    cohort_size if isinstance(cohort_size, int) else None
                ),
            )
        )
    return entries
