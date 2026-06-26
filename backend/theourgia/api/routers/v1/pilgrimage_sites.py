"""Pilgrimage site endpoints (B134).

Per ``plan/11-batches-backend.md`` § B134.

The H07 surfaces driving these endpoints:
  * Pilgrimage Map (surface 18) — list + sealed-cluster
  * Sacred Site detail (surface 19) — read + requantize + linked workings
  * Add Place (surface 20) — POST

The defining rule is the **precision floor**:

  * On POST, the server applies ``apply_precision_floor`` BEFORE
    persisting. The stored lat/lng IS the quantized value.
  * ``/requantize`` can only LOWER precision (rank goes up). The
    previous coordinates are overwritten with the new quantized
    pair; the finer values are irreversibly lost.
  * ``PATCH`` does NOT touch location or precision — those are
    intentionally absent from the update schema.

Sealed sites never appear on the map data. The ``/sealed-cluster``
endpoint returns a COUNT only (no ids, no coords).

The H07 `‡` Nominatim attribution lives on the schema as a
constant string for the surface to render verbatim.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.analytics.autotag import apply_precision_floor
from theourgia.models.entries import Entry
from theourgia.models.pilgrimage_sites import (
    PRECISION_RANK,
    PilgrimageSite,
    SiteKind,
    is_lower_or_equal_precision,
)

__all__ = [
    "router",
    "NOMINATIM_ATTRIBUTION",
    "ALLOWED_PRECISIONS",
]

router = APIRouter()


# H07 verbatim attribution copy — the `‡` glyph is part of the line.
NOMINATIM_ATTRIBUTION = (
    "‡ Geocoding by Nominatim / © OpenStreetMap contributors."
)
ALLOWED_PRECISIONS = frozenset(PRECISION_RANK.keys())


# ── Schemas ─────────────────────────────────────────────────────


class PilgrimageSiteRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    kind: str
    name: str
    story: str | None
    location_lat: float | None
    location_lng: float | None
    stored_precision: str
    sealed: bool
    linked_working_ids: list
    created_at: datetime
    updated_at: datetime
    nominatim_acknowledgement: str = NOMINATIM_ATTRIBUTION


class PilgrimageSiteCard(BaseModel):
    """The map-list card. For sealed rows we'd NEVER emit one of
    these — they live behind the sealed-cluster count instead."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    kind: str
    name: str
    location_lat: float | None
    location_lng: float | None
    stored_precision: str


class PilgrimageSiteCreate(BaseModel):
    """POST shape. The precision floor IS applied to the
    (location_lat, location_lng) the caller submits BEFORE
    persistence."""

    model_config = ConfigDict(extra="forbid")

    kind: SiteKind
    name: str = Field(min_length=1, max_length=240)
    story: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    location_precision: str = Field(default="hidden")
    sealed: bool = False
    linked_working_ids: list = Field(default_factory=list)


class PilgrimageSiteUpdate(BaseModel):
    """PATCH shape. Location + precision are INTENTIONALLY absent —
    those mutate only via /requantize (which can only lower)."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    story: str | None = None
    linked_working_ids: list | None = None


class RequantizePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    next_precision: str


class SealedClusterPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # The map bounds for the count query. Optional — when omitted,
    # the count is across the caller's whole vault.
    north: float | None = None
    south: float | None = None
    east: float | None = None
    west: float | None = None


class SealedClusterResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sealed_count: int


class ListResponse(BaseModel):
    """Map list response.

    Sealed rows are STRIPPED from the list — they're surfaced only
    via the standalone sealed-cluster count endpoint."""

    model_config = ConfigDict(extra="forbid")

    items: list[PilgrimageSiteCard]
    sealed_count: int
    nominatim_acknowledgement: str = NOMINATIM_ATTRIBUTION


# ── Helpers ─────────────────────────────────────────────────────


def _validate_precision(precision: str) -> None:
    if precision not in ALLOWED_PRECISIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                f"location_precision must be one of "
                f"{sorted(ALLOWED_PRECISIONS)!r}; got {precision!r}."
            ),
        )


async def _validate_linked_workings(
    db: AsyncSession,
    owner_id: UUID,
    linked_ids: list,
) -> None:
    """Linked workings must resolve to entries the caller OWNS.
    Sealed entries CAN be linked (the caller's own private
    references). Missing or wrong-owner ids raise 400."""
    if not linked_ids:
        return
    try:
        uuids = [UUID(str(x)) for x in linked_ids]
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "linked_working_ids must be UUID strings.",
        ) from exc
    rows = (
        await db.execute(
            select(Entry.id, Entry.owner_id)
            .where(Entry.id.in_(uuids))
        )
    ).all()
    found = {r.id for r in rows if r.owner_id == owner_id}
    missing = [str(u) for u in uuids if u not in found]
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                "linked_working_ids includes entries not owned by "
                f"the caller: {missing!r}"
            ),
        )


def _to_read(row: PilgrimageSite) -> PilgrimageSiteRead:
    return PilgrimageSiteRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        kind=row.kind.value,
        name=row.name,
        story=row.story,
        location_lat=row.location_lat,
        location_lng=row.location_lng,
        stored_precision=row.stored_precision,
        sealed=row.sealed,
        linked_working_ids=list(row.linked_working_ids or []),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_card(row: PilgrimageSite) -> PilgrimageSiteCard:
    return PilgrimageSiteCard(
        id=str(row.id),
        kind=row.kind.value,
        name=row.name,
        location_lat=row.location_lat,
        location_lng=row.location_lng,
        stored_precision=row.stored_precision,
    )


# ── List + sealed-cluster ────────────────────────────────────────


@router.get(
    "/pilgrimage-sites",
    response_model=ListResponse,
    tags=["pilgrimage"],
)
async def list_sites(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    kind: SiteKind | None = None,
    limit: int = 200,
    offset: int = 0,
) -> ListResponse:
    """Map data list. Sealed sites are STRIPPED here — they appear
    only as the count via ``/sealed-cluster``."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    sealed_total = (
        await db.execute(
            select(func.count())
            .select_from(PilgrimageSite)
            .where(PilgrimageSite.owner_id == current_user.id)
            .where(PilgrimageSite.deleted_at.is_(None))
            .where(PilgrimageSite.sealed.is_(True))
            .where(
                *((PilgrimageSite.kind == kind,) if kind is not None else ())
            )
        )
    ).scalar_one()

    stmt = (
        select(PilgrimageSite)
        .where(PilgrimageSite.owner_id == current_user.id)
        .where(PilgrimageSite.deleted_at.is_(None))
        .where(PilgrimageSite.sealed.is_(False))
    )
    if kind is not None:
        stmt = stmt.where(PilgrimageSite.kind == kind)
    stmt = (
        stmt.order_by(PilgrimageSite.created_at.desc())
        .offset(max(0, offset))
        .limit(min(max(1, limit), 1000))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return ListResponse(
        items=[_to_card(r) for r in rows],
        sealed_count=int(sealed_total or 0),
    )


@router.post(
    "/pilgrimage-sites/sealed-cluster",
    response_model=SealedClusterResponse,
    tags=["pilgrimage"],
)
async def sealed_cluster_count(
    payload: SealedClusterPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> SealedClusterResponse:
    """Count-only endpoint. Returns ONLY the number of sealed sites
    in the requested map bounds (no ids, no coords). The H07
    Pilgrimage Map's sealed-badge data source."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    stmt = (
        select(func.count())
        .select_from(PilgrimageSite)
        .where(PilgrimageSite.owner_id == current_user.id)
        .where(PilgrimageSite.deleted_at.is_(None))
        .where(PilgrimageSite.sealed.is_(True))
    )
    # Bounds filter — applied only when all four corners are supplied.
    if all(
        v is not None
        for v in (payload.north, payload.south, payload.east, payload.west)
    ):
        stmt = (
            stmt.where(PilgrimageSite.location_lat <= payload.north)
            .where(PilgrimageSite.location_lat >= payload.south)
            .where(PilgrimageSite.location_lng <= payload.east)
            .where(PilgrimageSite.location_lng >= payload.west)
        )
    n = (await db.execute(stmt)).scalar_one()
    return SealedClusterResponse(sealed_count=int(n or 0))


# ── CRUD ─────────────────────────────────────────────────────────


@router.post(
    "/pilgrimage-sites",
    response_model=PilgrimageSiteRead,
    status_code=status.HTTP_201_CREATED,
    tags=["pilgrimage"],
)
async def create_site(
    payload: PilgrimageSiteCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PilgrimageSiteRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    _validate_precision(payload.location_precision)
    await _validate_linked_workings(
        db, current_user.id, payload.linked_working_ids,
    )

    # Apply the precision floor BEFORE persistence. This is the
    # whole game.
    q_lat, q_lng = apply_precision_floor(
        payload.location_lat,
        payload.location_lng,
        payload.location_precision,
    )

    row = PilgrimageSite(
        owner_id=current_user.id,
        kind=payload.kind,
        name=payload.name,
        story=payload.story,
        location_lat=q_lat,
        location_lng=q_lng,
        stored_precision=payload.location_precision,
        sealed=payload.sealed,
        linked_working_ids=list(payload.linked_working_ids),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/pilgrimage-sites/{site_id}",
    response_model=PilgrimageSiteRead,
    tags=["pilgrimage"],
)
async def read_site(
    site_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PilgrimageSiteRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(PilgrimageSite, site_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found.")
    return _to_read(row)


@router.patch(
    "/pilgrimage-sites/{site_id}",
    response_model=PilgrimageSiteRead,
    tags=["pilgrimage"],
)
async def update_site(
    site_id: UUID,
    payload: PilgrimageSiteUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PilgrimageSiteRead:
    """PATCH does NOT touch location or precision — only name /
    story / linked_working_ids. The schema doesn't even expose the
    location fields."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(PilgrimageSite, site_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found.")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = data["name"]
    if "story" in data:
        row.story = data["story"]
    if "linked_working_ids" in data:
        await _validate_linked_workings(
            db, current_user.id, data["linked_working_ids"] or [],
        )
        row.linked_working_ids = list(data["linked_working_ids"] or [])
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/pilgrimage-sites/{site_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["pilgrimage"],
)
async def delete_site(
    site_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(PilgrimageSite, site_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found.")
    row.deleted_at = datetime.now(tz=timezone.utc)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Re-quantize (one-way: lower only) ────────────────────────────


@router.post(
    "/pilgrimage-sites/{site_id}/requantize",
    response_model=PilgrimageSiteRead,
    tags=["pilgrimage"],
)
async def requantize_site(
    site_id: UUID,
    payload: RequantizePayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PilgrimageSiteRead:
    """Lower the site's precision floor.

    REJECTS any transition that would make precision FINER. The
    previous lat/lng are overwritten with the new quantized values
    — the finer precision is irreversibly lost (the whole point)."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(PilgrimageSite, site_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found.")
    _validate_precision(payload.next_precision)
    if not is_lower_or_equal_precision(
        row.stored_precision, payload.next_precision,
    ):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                f"Precision cannot be raised — current is "
                f"{row.stored_precision!r}, next was "
                f"{payload.next_precision!r}. Re-quantize lowers only."
            ),
        )
    q_lat, q_lng = apply_precision_floor(
        row.location_lat,
        row.location_lng,
        payload.next_precision,
    )
    row.location_lat = q_lat
    row.location_lng = q_lng
    row.stored_precision = payload.next_precision
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


# ── Seal / unseal ────────────────────────────────────────────────


@router.post(
    "/pilgrimage-sites/{site_id}/seal",
    response_model=PilgrimageSiteRead,
    tags=["pilgrimage"],
)
async def seal_site(
    site_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PilgrimageSiteRead:
    """Flip ``sealed=True``. The site stops appearing on map data
    immediately. Unseal happens via the Mode B vault crypto path
    (B108) on the client; the server endpoint trusts the client
    state."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(PilgrimageSite, site_id)
    if (
        row is None
        or row.owner_id != current_user.id
        or row.deleted_at is not None
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site not found.")
    row.sealed = True
    await db.commit()
    await db.refresh(row)
    return _to_read(row)
