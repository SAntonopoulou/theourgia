"""Horary HTTP endpoints — astrology at the moment of question.

``POST   /api/v1/horary/cast``                — cast a chart at asked_at + lat/lon
``GET    /api/v1/horary/readings``            — list
``GET    /api/v1/horary/readings/{id}``       — fetch
``PATCH  /api/v1/horary/readings/{id}``       — update interpretation
``DELETE /api/v1/horary/readings/{id}``       — soft delete

Composes the Phase 03 :func:`theourgia.core.astro.compute_chart`
engine. The chart snapshot is persisted as JSON so list reads
don't have to rerun ephemeris.

Per ``plan/06-divination-and-practice.md`` §7.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.astro import ChartRequest, ChartResult, compute_chart
from theourgia.models.divination_lite import HoraryReading

__all__ = ["router"]

router = APIRouter()


class CastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    asked_at: datetime | None = Field(
        default=None,
        description="The chart instant. Defaults to server time at receipt.",
    )
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_label: str | None = Field(default=None, max_length=256)
    significator_querent: str | None = Field(default=None, max_length=64)
    significator_quesited: str | None = Field(default=None, max_length=64)
    entry_id: UUID | None = None
    entity_id: UUID | None = None


class ReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    question: str
    asked_at: datetime
    latitude: float
    longitude: float
    location_label: str | None
    chart_snapshot: dict[str, object]
    significator_querent: str | None
    significator_quesited: str | None
    perfection_notes: str | None
    interpretation: str | None
    retrospective_rating: int | None
    retrospective_notes: str | None
    entry_id: str | None
    entity_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class ReadingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    significator_querent: str | None = Field(default=None, max_length=64)
    significator_quesited: str | None = Field(default=None, max_length=64)
    perfection_notes: str | None = None
    interpretation: str | None = None
    retrospective_rating: int | None = Field(default=None, ge=1, le=5)
    retrospective_notes: str | None = None
    entry_id: UUID | None = None
    entity_id: UUID | None = None


def _chart_to_snapshot(chart: ChartResult) -> dict[str, Any]:
    """Compact JSON projection of a chart for fast list reads."""
    return {
        "instant": chart.request.instant.isoformat(),
        "latitude": chart.request.latitude,
        "longitude": chart.request.longitude,
        "ascendant": {
            "sign": chart.ascendant.sign.value,
            "degree": chart.ascendant.degree_in_sign,
            "longitude": chart.ascendant.absolute_longitude,
        }
        if hasattr(chart.ascendant, "sign")
        else {
            "longitude": getattr(chart.ascendant, "longitude", None),
        },
        "midheaven": {
            "sign": chart.midheaven.sign.value,
            "degree": chart.midheaven.degree_in_sign,
            "longitude": chart.midheaven.absolute_longitude,
        }
        if hasattr(chart.midheaven, "sign")
        else {
            "longitude": getattr(chart.midheaven, "longitude", None),
        },
        "placements": [
            {
                "body": p.body.value if hasattr(p.body, "value") else str(p.body),
                "sign": p.tropical.sign.value
                if hasattr(p.tropical, "sign")
                else str(p.tropical),
                "degree": p.tropical.degree_in_sign
                if hasattr(p.tropical, "degree_in_sign")
                else None,
                "longitude": p.tropical.absolute_longitude
                if hasattr(p.tropical, "absolute_longitude")
                else None,
                "house": p.house,
                "retrograde": p.is_retrograde,
            }
            for p in chart.placements
        ],
        "houses": list(getattr(chart.houses, "cusps", ())),
        "aspects": [
            {
                "from": getattr(a.from_body, "value", str(a.from_body))
                if hasattr(a, "from_body")
                else None,
                "to": getattr(a.to_body, "value", str(a.to_body))
                if hasattr(a, "to_body")
                else None,
                "kind": getattr(a.kind, "value", str(a.kind))
                if hasattr(a, "kind")
                else None,
                "orb": getattr(a, "orb", None),
            }
            for a in chart.aspects
        ],
        "attribution": chart.attribution,
    }


def _to_read(row: HoraryReading) -> ReadingRead:
    return ReadingRead(
        id=str(row.id),
        question=row.question,
        asked_at=row.asked_at,
        latitude=row.latitude,
        longitude=row.longitude,
        location_label=row.location_label,
        chart_snapshot=dict(row.chart_snapshot) if row.chart_snapshot else {},
        significator_querent=row.significator_querent,
        significator_quesited=row.significator_quesited,
        perfection_notes=row.perfection_notes,
        interpretation=row.interpretation,
        retrospective_rating=row.retrospective_rating,
        retrospective_notes=row.retrospective_notes,
        entry_id=str(row.entry_id) if row.entry_id else None,
        entity_id=str(row.entity_id) if row.entity_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "/horary/cast",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["horary"],
)
async def cast(
    payload: CastRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> ReadingRead:
    asked_at = payload.asked_at or datetime.now(tz=UTC)
    try:
        chart = compute_chart(
            ChartRequest(
                instant=asked_at,
                latitude=payload.latitude,
                longitude=payload.longitude,
            )
        )
    except Exception as exc:  # pragma: no cover — ephemeris errors
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"chart computation failed: {exc}",
        ) from exc
    snapshot = _chart_to_snapshot(chart)

    row = HoraryReading(
        question=payload.question,
        asked_at=asked_at,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_label=payload.location_label,
        chart_snapshot=snapshot,
        significator_querent=payload.significator_querent,
        significator_quesited=payload.significator_quesited,
        entry_id=payload.entry_id,
        entity_id=payload.entity_id,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/horary/readings",
    response_model=list[ReadingRead],
    tags=["horary"],
)
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = 100,
) -> list[ReadingRead]:
    stmt = (
        select(HoraryReading)
        .where(HoraryReading.deleted_at.is_(None))
        .order_by(HoraryReading.asked_at.desc())
        .limit(min(limit, 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/horary/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["horary"],
)
async def get_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ReadingRead:
    row = await db.get(HoraryReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    return _to_read(row)


@router.patch(
    "/horary/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["horary"],
)
async def update_reading(
    reading_id: UUID,
    payload: ReadingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ReadingRead:
    row = await db.get(HoraryReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/horary/readings/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["horary"],
)
async def delete_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(HoraryReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
