"""Liber Resh HTTP endpoints.

``GET    /api/v1/resh/today?lat=&lng=&date=&tz=``    — the four stations + per-station observed flag
``GET    /api/v1/resh/streak?lat=&lng=&tz=``          — current streak ending today
``POST   /api/v1/resh/adorations``                    — record an adoration
``GET    /api/v1/resh/adorations``                    — list (filter date range)
``DELETE /api/v1/resh/adorations/{id}``               — soft delete

Composes `core/resh/` for the transition computation; the table
stores observed adorations so streaks + Today-card status survive
restarts.
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.resh import (
    AdorationLog,
    Transition,
    adoration_for_transition,
    compute_transitions,
    streak_at_date,
)
from theourgia.models.resh import Adoration as AdorationModel
from theourgia.models.resh import ReshTransition

__all__ = ["router"]

router = APIRouter()


TransitionLiteral = Literal["sunrise", "noon", "sunset", "midnight"]


class StationRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transition: TransitionLiteral
    at: datetime | None
    godform: str
    direction: str
    short_invocation: str
    observed_at: datetime | None
    note: str | None


class ReshToday(BaseModel):
    model_config = ConfigDict(extra="forbid")

    civil_date: date_cls
    stations: list[StationRead]
    streak_days: int = Field(
        description="Consecutive days ending today with all four (or polar two) observed.",
    )


class AdorationRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    civil_date: date_cls
    transition: TransitionLiteral
    observed_at: datetime
    note: str | None
    location_label: str | None
    entry_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class AdorationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transition: TransitionLiteral
    civil_date: date_cls | None = Field(
        default=None,
        description="Local civil date. Defaults to today (UTC) — pass an explicit date for backfill or for non-UTC observers.",
    )
    observed_at: datetime | None = Field(
        default=None,
        description="When the adoration was performed. Defaults to server time at receipt.",
    )
    note: str | None = None
    location_label: str | None = Field(default=None, max_length=256)
    entry_id: UUID | None = None


def _to_read(row: AdorationModel) -> AdorationRead:
    return AdorationRead(
        id=str(row.id),
        civil_date=row.civil_date,
        transition=row.transition.value,
        observed_at=row.observed_at,
        note=row.note,
        location_label=row.location_label,
        entry_id=str(row.entry_id) if row.entry_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/resh/today", response_model=ReshToday, tags=["resh"])
async def today(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    on_date: date_cls | None = Query(
        default=None,
        description="Civil date; defaults to current UTC date.",
        alias="date",
    ),
    tz: str | None = Query(
        default=None,
        description="IANA timezone for resolving 'today'; falls back to UTC.",
    ),
) -> ReshToday:
    """Four stations for the day + per-station observed marker + streak."""
    if on_date is None:
        if tz:
            try:
                zone = ZoneInfo(tz)
            except Exception as exc:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"unknown timezone: {tz}",
                ) from exc
            on_date = datetime.now(tz=zone).date()
        else:
            on_date = datetime.now(tz=UTC).date()

    transitions = compute_transitions(on_date, lat, lng)
    pairs = dict(transitions.as_pairs())

    # Pull any persisted adorations for today (this user only).
    stmt = (
        select(AdorationModel)
        .where(AdorationModel.deleted_at.is_(None))
        .where(AdorationModel.civil_date == on_date)
    )
    if current_user is not None:
        stmt = stmt.where(AdorationModel.owner_id == current_user.id)
    observed_rows = (await db.execute(stmt)).scalars().all()
    by_transition = {row.transition: row for row in observed_rows}

    stations: list[StationRead] = []
    for t in (Transition.SUNRISE, Transition.NOON, Transition.SUNSET, Transition.MIDNIGHT):
        meta = adoration_for_transition(t)
        instant = pairs.get(t)  # None when polar fallback ate sunrise/sunset
        observed = by_transition.get(ReshTransition(t.value))
        stations.append(
            StationRead(
                transition=t.value,
                at=instant,
                godform=meta.godform,
                direction=meta.direction,
                short_invocation=meta.short_invocation,
                observed_at=observed.observed_at if observed else None,
                note=observed.note if observed else None,
            )
        )

    # Streak: walk back from today's date over the last 60 days.
    streak_log_stmt = (
        select(AdorationModel)
        .where(AdorationModel.deleted_at.is_(None))
        .where(AdorationModel.civil_date >= on_date - timedelta(days=60))
    )
    if current_user is not None:
        streak_log_stmt = streak_log_stmt.where(
            AdorationModel.owner_id == current_user.id,
        )
    streak_rows = (await db.execute(streak_log_stmt)).scalars().all()
    streak_log = [
        AdorationLog(
            civil_date=row.civil_date,
            transition=Transition(row.transition.value),
            observed_at=row.observed_at,
            note=row.note or "",
        )
        for row in streak_rows
    ]
    streak = streak_at_date(streak_log, on_date)

    return ReshToday(civil_date=on_date, stations=stations, streak_days=streak)


@router.post(
    "/resh/adorations",
    response_model=AdorationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["resh"],
)
async def create_adoration(
    payload: AdorationCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> AdorationRead:
    now = datetime.now(tz=UTC)
    civil_date = payload.civil_date or now.date()
    row = AdorationModel(
        civil_date=civil_date,
        transition=ReshTransition(payload.transition),
        observed_at=payload.observed_at or now,
        note=payload.note,
        location_label=payload.location_label,
        entry_id=payload.entry_id,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/resh/adorations", response_model=list[AdorationRead], tags=["resh"])
async def list_adorations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    since: date_cls | None = None,
    until: date_cls | None = None,
    transition: TransitionLiteral | None = None,
    limit: int = 200,
) -> list[AdorationRead]:
    stmt = select(AdorationModel).where(AdorationModel.deleted_at.is_(None))
    if since is not None:
        stmt = stmt.where(AdorationModel.civil_date >= since)
    if until is not None:
        stmt = stmt.where(AdorationModel.civil_date <= until)
    if transition is not None:
        stmt = stmt.where(AdorationModel.transition == ReshTransition(transition))
    stmt = stmt.order_by(AdorationModel.observed_at.desc()).limit(min(limit, 1000))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.delete(
    "/resh/adorations/{adoration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["resh"],
)
async def delete_adoration(
    adoration_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(AdorationModel, adoration_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Adoration not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
