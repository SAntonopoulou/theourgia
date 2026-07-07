"""Offerings + recurring offerings HTTP endpoints.

``GET    /api/v1/offerings``                    — list (filter ``?entity_id=`` / ``?working_id=``)
``POST   /api/v1/offerings``                    — record one offering
``GET    /api/v1/offerings/{id}``               — fetch one
``PATCH  /api/v1/offerings/{id}``               — update (reception, outcome, notes)
``DELETE /api/v1/offerings/{id}``               — soft delete

``GET    /api/v1/recurring-offerings``          — list active + paused recurring schedules
``POST   /api/v1/recurring-offerings``          — create a recurring schedule
``GET    /api/v1/recurring-offerings/{id}``     — fetch one
``PATCH  /api/v1/recurring-offerings/{id}``     — update / pause / resume
``DELETE /api/v1/recurring-offerings/{id}``     — soft delete

Per ``plan/05-magical-beings.md`` §2.
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
from theourgia.models.offerings import (
    Offering,
    OfferingReception,
    RecurringOffering,
)

__all__ = ["router"]

router = APIRouter()


OfferingReceptionLiteral = Literal[
    "none", "faint", "clear", "strong", "overwhelming",
]


# ───── Offering ────────────────────────────────────────────────────────


class OfferingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    entity_id: str
    working_id: str | None
    offered_at: datetime
    location: str | None
    location_lat: float | None
    location_lon: float | None
    items: list[dict[str, object]]
    intention: str | None
    reception_perceived: OfferingReceptionLiteral | None
    outcome_notes: str | None
    astro_snapshot: str | None
    calendar_snapshot: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class OfferingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entity_id: UUID
    working_id: UUID | None = None
    offered_at: datetime
    location: str | None = Field(default=None, max_length=256)
    location_lat: float | None = None
    location_lon: float | None = None
    items: list[dict[str, object]] = Field(default_factory=list)
    intention: str | None = None
    reception_perceived: OfferingReceptionLiteral | None = None
    outcome_notes: str | None = None
    astro_snapshot: str | None = None
    calendar_snapshot: str | None = None


class OfferingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: str | None = Field(default=None, max_length=256)
    location_lat: float | None = None
    location_lon: float | None = None
    items: list[dict[str, object]] | None = None
    intention: str | None = None
    reception_perceived: OfferingReceptionLiteral | None = None
    outcome_notes: str | None = None


def _offering_to_read(row: Offering) -> OfferingRead:
    return OfferingRead(
        id=str(row.id),
        entity_id=str(row.entity_id),
        working_id=str(row.working_id) if row.working_id else None,
        offered_at=row.offered_at,
        location=row.location,
        location_lat=row.location_lat,
        location_lon=row.location_lon,
        items=list(row.items) if row.items else [],
        intention=row.intention,
        reception_perceived=row.reception_perceived.value if row.reception_perceived else None,
        outcome_notes=row.outcome_notes,
        astro_snapshot=row.astro_snapshot,
        calendar_snapshot=row.calendar_snapshot,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/offerings", response_model=list[OfferingRead], tags=["offerings"])
async def list_offerings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    entity_id: UUID | None = None,
    working_id: UUID | None = None,
    limit: int = 100,
) -> list[OfferingRead]:
    stmt = select(Offering).where(
        Offering.deleted_at.is_(None),
        Offering.owner_id == current_user.id,
    )
    if entity_id is not None:
        stmt = stmt.where(Offering.entity_id == entity_id)
    if working_id is not None:
        stmt = stmt.where(Offering.working_id == working_id)
    stmt = stmt.order_by(Offering.offered_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_offering_to_read(row) for row in rows]


@router.post(
    "/offerings",
    response_model=OfferingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["offerings"],
)
async def create_offering(
    payload: OfferingCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> OfferingRead:
    row = Offering(
        entity_id=payload.entity_id,
        working_id=payload.working_id,
        offered_at=payload.offered_at,
        location=payload.location,
        location_lat=payload.location_lat,
        location_lon=payload.location_lon,
        items=payload.items,
        intention=payload.intention,
        reception_perceived=(
            OfferingReception(payload.reception_perceived)
            if payload.reception_perceived
            else None
        ),
        outcome_notes=payload.outcome_notes,
        astro_snapshot=payload.astro_snapshot,
        calendar_snapshot=payload.calendar_snapshot,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _offering_to_read(row)


@router.get("/offerings/{offering_id}", response_model=OfferingRead, tags=["offerings"])
async def get_offering(
    offering_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> OfferingRead:
    row = await db.get(Offering, offering_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offering not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offering not found.")
    return _offering_to_read(row)


@router.patch("/offerings/{offering_id}", response_model=OfferingRead, tags=["offerings"])
async def update_offering(
    offering_id: UUID,
    payload: OfferingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> OfferingRead:
    row = await db.get(Offering, offering_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offering not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offering not found.")
    data = payload.model_dump(exclude_unset=True)
    if "reception_perceived" in data and data["reception_perceived"] is not None:
        data["reception_perceived"] = OfferingReception(data["reception_perceived"])
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _offering_to_read(row)


@router.delete(
    "/offerings/{offering_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["offerings"],
)
async def delete_offering(
    offering_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Offering, offering_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offering not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offering not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── RecurringOffering ───────────────────────────────────────────────


class RecurringOfferingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    entity_id: str
    label: str
    cadence: str
    items_template: list[dict[str, object]]
    next_due_at: datetime | None
    is_active: bool
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class RecurringOfferingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entity_id: UUID
    label: str = Field(min_length=1, max_length=256)
    cadence: str = Field(min_length=1, max_length=128)
    items_template: list[dict[str, object]] = Field(default_factory=list)
    next_due_at: datetime | None = None
    is_active: bool = True


class RecurringOfferingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str | None = Field(default=None, min_length=1, max_length=256)
    cadence: str | None = Field(default=None, min_length=1, max_length=128)
    items_template: list[dict[str, object]] | None = None
    next_due_at: datetime | None = None
    is_active: bool | None = None


def _recurring_to_read(row: RecurringOffering) -> RecurringOfferingRead:
    return RecurringOfferingRead(
        id=str(row.id),
        entity_id=str(row.entity_id),
        label=row.label,
        cadence=row.cadence,
        items_template=list(row.items_template) if row.items_template else [],
        next_due_at=row.next_due_at,
        is_active=row.is_active,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "/recurring-offerings",
    response_model=list[RecurringOfferingRead],
    tags=["offerings"],
)
async def list_recurring_offerings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    entity_id: UUID | None = None,
    is_active: bool | None = None,
) -> list[RecurringOfferingRead]:
    stmt = select(RecurringOffering).where(
        RecurringOffering.deleted_at.is_(None),
        RecurringOffering.owner_id == current_user.id,
    )
    if entity_id is not None:
        stmt = stmt.where(RecurringOffering.entity_id == entity_id)
    if is_active is not None:
        stmt = stmt.where(RecurringOffering.is_active == is_active)
    stmt = stmt.order_by(RecurringOffering.next_due_at.asc().nullslast())
    rows = (await db.execute(stmt)).scalars().all()
    return [_recurring_to_read(row) for row in rows]


@router.post(
    "/recurring-offerings",
    response_model=RecurringOfferingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["offerings"],
)
async def create_recurring_offering(
    payload: RecurringOfferingCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> RecurringOfferingRead:
    row = RecurringOffering(
        entity_id=payload.entity_id,
        label=payload.label,
        cadence=payload.cadence,
        items_template=payload.items_template,
        next_due_at=payload.next_due_at,
        is_active=payload.is_active,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _recurring_to_read(row)


@router.get(
    "/recurring-offerings/{rec_id}",
    response_model=RecurringOfferingRead,
    tags=["offerings"],
)
async def get_recurring_offering(
    rec_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> RecurringOfferingRead:
    row = await db.get(RecurringOffering, rec_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurring offering not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurring offering not found.")
    return _recurring_to_read(row)


@router.patch(
    "/recurring-offerings/{rec_id}",
    response_model=RecurringOfferingRead,
    tags=["offerings"],
)
async def update_recurring_offering(
    rec_id: UUID,
    payload: RecurringOfferingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> RecurringOfferingRead:
    row = await db.get(RecurringOffering, rec_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurring offering not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurring offering not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _recurring_to_read(row)


@router.delete(
    "/recurring-offerings/{rec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["offerings"],
)
async def delete_recurring_offering(
    rec_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(RecurringOffering, rec_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurring offering not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recurring offering not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
