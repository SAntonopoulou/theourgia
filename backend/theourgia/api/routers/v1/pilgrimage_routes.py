"""Pilgrimage routes — ordered sequences of pilgrimage_sites.

b108-2gx · FEATURES §13.

Routes:
- GET    /api/v1/pilgrimage-routes        list owned routes
- POST   /api/v1/pilgrimage-routes        create
- GET    /api/v1/pilgrimage-routes/{id}   read (with stops)
- PATCH  /api/v1/pilgrimage-routes/{id}   update name/description/visibility
- DELETE /api/v1/pilgrimage-routes/{id}   soft delete

Stops:
- POST   /api/v1/pilgrimage-routes/{id}/stops           append/insert
- PATCH  /api/v1/pilgrimage-routes/{id}/stops/{stopId}  notes
- DELETE /api/v1/pilgrimage-routes/{id}/stops/{stopId}
- POST   /api/v1/pilgrimage-routes/{id}/reorder         reorder by stopIds
"""

from __future__ import annotations

from datetime import datetime, UTC
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.pilgrimage_route import (
    PilgrimageRoute,
    PilgrimageRouteStop,
)
from theourgia.models.pilgrimage_sites import PilgrimageSite

__all__ = ["router"]

router = APIRouter()


Visibility = Literal["personal", "viewer", "network", "public"]


class RouteStopIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    site_id: UUID
    order_index: int | None = None
    notes: str | None = Field(default=None, max_length=4000)


class RouteStopRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    site_id: str
    order_index: int
    notes: str | None


class RouteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=8000)
    visibility: Visibility = "personal"
    stops: list[RouteStopIn] = Field(default_factory=list)


class RouteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=8000)
    visibility: Visibility | None = None


class RouteRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    description: str | None
    visibility: Visibility
    stops: list[RouteStopRead]
    created_at: str
    updated_at: str


class ReorderInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stop_ids: list[UUID] = Field(min_length=1)


def _read_stop(row: PilgrimageRouteStop) -> RouteStopRead:
    return RouteStopRead(
        id=str(row.id),
        site_id=str(row.site_id),
        order_index=row.order_index,
        notes=row.notes,
    )


def _read_route(row: PilgrimageRoute, stops: list[PilgrimageRouteStop]) -> RouteRead:
    return RouteRead(
        id=str(row.id),
        name=row.name,
        description=row.description,
        visibility=row.visibility,  # type: ignore[arg-type]
        stops=[_read_stop(s) for s in stops],
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


async def _load_route(
    db: AsyncSession, route_id: UUID, owner_id: UUID
) -> PilgrimageRoute:
    row = (
        await db.execute(
            select(PilgrimageRoute).where(PilgrimageRoute.id == route_id)
        )
    ).scalar_one_or_none()
    if row is None or row.deleted_at is not None or row.owner_id != owner_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Route not found.")
    return row


async def _load_stops(
    db: AsyncSession, route_id: UUID
) -> list[PilgrimageRouteStop]:
    stmt = (
        select(PilgrimageRouteStop)
        .where(PilgrimageRouteStop.route_id == route_id)
        .order_by(PilgrimageRouteStop.order_index.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def _verify_site_ownership(
    db: AsyncSession, site_id: UUID, owner_id: UUID
) -> None:
    site = (
        await db.execute(
            select(PilgrimageSite).where(PilgrimageSite.id == site_id)
        )
    ).scalar_one_or_none()
    if (
        site is None
        or site.deleted_at is not None
        or site.owner_id != owner_id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Site not found."
        )


# ── Route CRUD ─────────────────────────────────────────


@router.get(
    "/pilgrimage-routes",
    response_model=list[RouteRead],
    summary="List owned routes",
)
async def list_routes(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[RouteRead]:
    stmt = (
        select(PilgrimageRoute)
        .where(PilgrimageRoute.owner_id == current_user.id)
        .where(PilgrimageRoute.deleted_at.is_(None))
        .order_by(PilgrimageRoute.created_at.desc())
    )
    rows = list((await db.execute(stmt)).scalars().all())
    out: list[RouteRead] = []
    for r in rows:
        out.append(_read_route(r, await _load_stops(db, r.id)))
    return out


@router.post(
    "/pilgrimage-routes",
    response_model=RouteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a route",
)
async def create_route(
    payload: RouteCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RouteRead:
    row = PilgrimageRoute(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        visibility=payload.visibility,
    )
    db.add(row)
    await db.flush()

    # Append seeded stops in the order they were sent.
    for i, stop in enumerate(payload.stops):
        await _verify_site_ownership(db, stop.site_id, current_user.id)
        db.add(
            PilgrimageRouteStop(
                route_id=row.id,
                site_id=stop.site_id,
                order_index=stop.order_index
                if stop.order_index is not None
                else i,
                notes=stop.notes,
            )
        )
    await db.commit()
    await db.refresh(row)
    return _read_route(row, await _load_stops(db, row.id))


@router.get(
    "/pilgrimage-routes/{route_id}",
    response_model=RouteRead,
    summary="Read one route",
)
async def read_route(
    route_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RouteRead:
    row = await _load_route(db, route_id, current_user.id)
    return _read_route(row, await _load_stops(db, row.id))


@router.patch(
    "/pilgrimage-routes/{route_id}",
    response_model=RouteRead,
    summary="Update route metadata",
)
async def update_route(
    route_id: UUID,
    payload: RouteUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RouteRead:
    row = await _load_route(db, route_id, current_user.id)
    if payload.name is not None:
        row.name = payload.name
    if payload.description is not None:
        row.description = payload.description
    if payload.visibility is not None:
        row.visibility = payload.visibility
    await db.commit()
    await db.refresh(row)
    return _read_route(row, await _load_stops(db, row.id))


@router.delete(
    "/pilgrimage-routes/{route_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a route",
)
async def delete_route(
    route_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    row = await _load_route(db, route_id, current_user.id)
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return None


# ── Route stops ────────────────────────────────────────


@router.post(
    "/pilgrimage-routes/{route_id}/stops",
    response_model=RouteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Append or insert a stop",
)
async def add_stop(
    route_id: UUID,
    payload: RouteStopIn,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RouteRead:
    route = await _load_route(db, route_id, current_user.id)
    await _verify_site_ownership(db, payload.site_id, current_user.id)
    existing = await _load_stops(db, route.id)
    order_index = (
        payload.order_index
        if payload.order_index is not None
        else len(existing)
    )
    # If inserting in the middle, shift later stops down by 1.
    for stop in existing:
        if stop.order_index >= order_index:
            stop.order_index += 1
    db.add(
        PilgrimageRouteStop(
            route_id=route.id,
            site_id=payload.site_id,
            order_index=order_index,
            notes=payload.notes,
        )
    )
    await db.commit()
    return _read_route(route, await _load_stops(db, route.id))


@router.patch(
    "/pilgrimage-routes/{route_id}/stops/{stop_id}",
    response_model=RouteRead,
    summary="Update stop notes",
)
async def update_stop(
    route_id: UUID,
    stop_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    notes: str | None = None,
) -> RouteRead:
    route = await _load_route(db, route_id, current_user.id)
    stop = (
        await db.execute(
            select(PilgrimageRouteStop).where(
                PilgrimageRouteStop.id == stop_id,
                PilgrimageRouteStop.route_id == route.id,
            )
        )
    ).scalar_one_or_none()
    if stop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stop not found.")
    if notes is not None:
        stop.notes = notes
    await db.commit()
    return _read_route(route, await _load_stops(db, route.id))


@router.delete(
    "/pilgrimage-routes/{route_id}/stops/{stop_id}",
    response_model=RouteRead,
    summary="Remove a stop",
)
async def delete_stop(
    route_id: UUID,
    stop_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RouteRead:
    route = await _load_route(db, route_id, current_user.id)
    await db.execute(
        delete(PilgrimageRouteStop).where(
            PilgrimageRouteStop.id == stop_id,
            PilgrimageRouteStop.route_id == route.id,
        )
    )
    # Compact indexes so the sequence stays contiguous.
    remaining = await _load_stops(db, route.id)
    for i, stop in enumerate(remaining):
        stop.order_index = i
    await db.commit()
    return _read_route(route, await _load_stops(db, route.id))


@router.post(
    "/pilgrimage-routes/{route_id}/reorder",
    response_model=RouteRead,
    summary="Reorder stops via full ordered id list",
)
async def reorder_stops(
    route_id: UUID,
    payload: ReorderInput,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RouteRead:
    route = await _load_route(db, route_id, current_user.id)
    stops = await _load_stops(db, route.id)
    stops_by_id = {stop.id: stop for stop in stops}
    if set(payload.stop_ids) != set(stops_by_id.keys()):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "stop_ids must be the exact set of the route's current stops.",
        )
    for i, sid in enumerate(payload.stop_ids):
        stops_by_id[sid].order_index = i
    await db.commit()
    return _read_route(route, await _load_stops(db, route.id))
