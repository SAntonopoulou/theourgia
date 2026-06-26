"""Synchronicity HTTP endpoints (B120).

Per ``plan/09-batches-backend.md`` § B120.

``GET    /api/v1/synchronicities``        — list
``POST   /api/v1/synchronicities``        — create
``GET    /api/v1/synchronicities/{id}``   — read
``PATCH  /api/v1/synchronicities/{id}``   — update
``DELETE /api/v1/synchronicities/{id}``   — soft delete
``POST   /api/v1/synchronicities/{id}/retag`` — re-run auto-tag

Honesty rules:
  * Auto-tagged on save with ``source: "auto"`` markers; user-supplied
    overrides preserve their existing markers (typically
    ``source: "manual"``).
  * Location precision honoured server-side; rows never hold finer
    precision than the floor allows.
  * Linked-id integrity validated against the owner's vault.
  * 401 for unauthenticated callers on every endpoint.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.analytics.autotag import (
    AstroProvider,
    CalendarProvider,
    WeatherProvider,
    apply_precision_floor,
    autotag_synchronicity,
)
from theourgia.models.entities import Entity
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.synchronicities import (
    Synchronicity,
    SynchronicityCategory,
)

__all__ = ["router", "set_providers"]

router = APIRouter()


# ── Provider injection ──────────────────────────────────────────────
#
# The auto-tag pipeline takes provider dependencies. Tests + the
# route hand in stubs through this module-level setter; the live
# Phase 03 integration replaces the stubs at app boot.


class _StubAstroProvider:
    def snapshot_at(
        self,
        moment: datetime,
        *,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> dict:
        return {
            "moon_phase": "unknown",
            "planetary_hour": "unknown",
            "sun_sign": "unknown",
            "moon_sign": "unknown",
            "void_of_course": False,
        }


class _StubCalendarProvider:
    def stamp_at(self, moment: datetime) -> dict:
        d = moment.date() if isinstance(moment, datetime) else moment
        return {
            "iso_date": d.isoformat(),
            "weekday": d.strftime("%A").lower(),
            "season": "unknown",
            "festivals": [],
        }


_ASTRO_PROVIDER: AstroProvider = _StubAstroProvider()
_CALENDAR_PROVIDER: CalendarProvider = _StubCalendarProvider()
_WEATHER_PROVIDER: WeatherProvider | None = None


def set_providers(
    *,
    astro: AstroProvider | None = None,
    calendar: CalendarProvider | None = None,
    weather: WeatherProvider | None = None,
) -> None:
    """Replace the in-process providers.

    Used at app boot to swap in the live Phase 03 implementations,
    and used by tests to swap in known-fixture stubs.
    """
    global _ASTRO_PROVIDER, _CALENDAR_PROVIDER, _WEATHER_PROVIDER
    if astro is not None:
        _ASTRO_PROVIDER = astro
    if calendar is not None:
        _CALENDAR_PROVIDER = calendar
    if weather is not None:
        _WEATHER_PROVIDER = weather


# ── Schemas ──────────────────────────────────────────────────────────


_PRECISIONS = ("exact", "1km", "10km", "country", "hidden")


class SyncRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    occurred_at: datetime
    description: str
    category: str
    intensity: int
    structured_data: dict
    astro_snapshot: dict | None
    calendar_stamp: dict | None
    weather_snapshot: dict | None
    location_lat: float | None
    location_lng: float | None
    location_precision: str
    linked_entry_ids: list[str]
    linked_entity_ids: list[str]
    linked_working_ids: list[str]
    created_at: datetime
    updated_at: datetime


class SyncCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1)
    category: SynchronicityCategory
    intensity: int = Field(default=5, ge=1, le=10)
    occurred_at: datetime | None = None
    structured_data: dict = Field(default_factory=dict)

    # Practitioner-supplied overrides; auto-tag fills any that are
    # absent. When supplied, the snapshot carries the caller's
    # source marker (typically "manual").
    astro_snapshot: dict | None = None
    calendar_stamp: dict | None = None
    weather_snapshot: dict | None = None

    location_lat: float | None = None
    location_lng: float | None = None
    location_precision: str = Field(default="hidden", max_length=16)

    linked_entry_ids: list[UUID] = Field(default_factory=list)
    linked_entity_ids: list[UUID] = Field(default_factory=list)
    linked_working_ids: list[UUID] = Field(default_factory=list)


class SyncUpdate(BaseModel):
    """Every field patchable except the linked-id integrity rules
    (validated separately) + the timestamps. ``occurred_at`` or
    location changes trigger a re-tag via ``/retag``."""

    model_config = ConfigDict(extra="forbid")

    description: str | None = Field(default=None, min_length=1)
    category: SynchronicityCategory | None = None
    intensity: int | None = Field(default=None, ge=1, le=10)
    occurred_at: datetime | None = None
    structured_data: dict | None = None

    astro_snapshot: dict | None = None
    calendar_stamp: dict | None = None
    weather_snapshot: dict | None = None

    location_lat: float | None = None
    location_lng: float | None = None
    location_precision: str | None = Field(default=None, max_length=16)

    linked_entry_ids: list[UUID] | None = None
    linked_entity_ids: list[UUID] | None = None
    linked_working_ids: list[UUID] | None = None


# ── Helpers ──────────────────────────────────────────────────────────


def _to_sync_read(row: Synchronicity) -> SyncRead:
    return SyncRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        occurred_at=row.occurred_at,
        description=row.description,
        category=row.category.value,
        intensity=row.intensity,
        structured_data=dict(row.structured_data or {}),
        astro_snapshot=row.astro_snapshot,
        calendar_stamp=row.calendar_stamp,
        weather_snapshot=row.weather_snapshot,
        location_lat=row.location_lat,
        location_lng=row.location_lng,
        location_precision=row.location_precision,
        linked_entry_ids=[str(x) for x in (row.linked_entry_ids or [])],
        linked_entity_ids=[str(x) for x in (row.linked_entity_ids or [])],
        linked_working_ids=[str(x) for x in (row.linked_working_ids or [])],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _validate_linked_entries(
    ids: list[UUID], db: AsyncSession, owner_id: UUID,
) -> None:
    """linked_entry_ids must be the caller's, non-deleted, and NOT
    sealed (sealed entries can't be linked from a synchronicity —
    the link would imply the synchronicity references content
    inside the seal)."""
    if not ids:
        return
    stmt = (
        select(Entry.id, Entry.encryption_mode, Entry.owner_id)
        .where(Entry.id.in_(ids))
        .where(Entry.deleted_at.is_(None))
    )
    rows = (await db.execute(stmt)).all()
    if len(rows) != len(set(ids)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "One or more linked_entry_ids are not in your vault.",
        )
    for _id, enc_mode, eid_owner in rows:
        if eid_owner != owner_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "One or more linked_entry_ids are not in your vault.",
            )
        if enc_mode == EncryptionMode.SEALED:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Sealed entries cannot be linked from a synchronicity.",
            )


async def _validate_linked_entities(
    ids: list[UUID], db: AsyncSession, owner_id: UUID,
) -> None:
    if not ids:
        return
    stmt = (
        select(Entity.id)
        .where(Entity.id.in_(ids))
        .where(Entity.owner_id == owner_id)
    )
    rows = (await db.execute(stmt)).scalars().all()
    if len(rows) != len(set(ids)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "One or more linked_entity_ids are not in your vault.",
        )


def _validate_precision(precision: str) -> None:
    if precision not in _PRECISIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"location_precision must be one of {_PRECISIONS!r}.",
        )


# ── Routes ──────────────────────────────────────────────────────────


@router.get(
    "/synchronicities",
    response_model=list[SyncRead],
    tags=["synchronicities"],
)
async def list_synchronicities(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    from_: datetime | None = None,
    to: datetime | None = None,
    category: SynchronicityCategory | None = None,
    intensity_min: int | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[SyncRead]:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    stmt = (
        select(Synchronicity)
        .where(Synchronicity.owner_id == current_user.id)
        .where(Synchronicity.deleted_at.is_(None))
    )
    if from_ is not None:
        stmt = stmt.where(Synchronicity.occurred_at >= from_)
    if to is not None:
        stmt = stmt.where(Synchronicity.occurred_at <= to)
    if category is not None:
        stmt = stmt.where(Synchronicity.category == category)
    if intensity_min is not None:
        stmt = stmt.where(Synchronicity.intensity >= intensity_min)
    stmt = (
        stmt.order_by(Synchronicity.occurred_at.desc())
        .offset(max(0, offset))
        .limit(min(max(1, limit), 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_sync_read(r) for r in rows]


@router.post(
    "/synchronicities",
    response_model=SyncRead,
    status_code=status.HTTP_201_CREATED,
    tags=["synchronicities"],
)
async def create_synchronicity(
    payload: SyncCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> SyncRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    _validate_precision(payload.location_precision)
    await _validate_linked_entries(
        payload.linked_entry_ids, db, current_user.id,
    )
    await _validate_linked_entities(
        payload.linked_entity_ids, db, current_user.id,
    )

    occurred_at = payload.occurred_at or datetime.now(tz=timezone.utc)

    # Auto-tag any snapshot the caller didn't supply.
    tag = autotag_synchronicity(
        occurred_at=occurred_at,
        location_lat=payload.location_lat,
        location_lng=payload.location_lng,
        location_precision=payload.location_precision,
        astro_provider=_ASTRO_PROVIDER,
        calendar_provider=_CALENDAR_PROVIDER,
        weather_provider=_WEATHER_PROVIDER,
    )

    astro = payload.astro_snapshot or tag.astro_snapshot
    calendar = payload.calendar_stamp or tag.calendar_stamp
    weather = payload.weather_snapshot or tag.weather_snapshot

    row = Synchronicity(
        owner_id=current_user.id,
        occurred_at=occurred_at,
        description=payload.description,
        category=payload.category,
        intensity=payload.intensity,
        structured_data=dict(payload.structured_data),
        astro_snapshot=astro,
        calendar_stamp=calendar,
        weather_snapshot=weather,
        location_lat=tag.location_lat,
        location_lng=tag.location_lng,
        location_precision=payload.location_precision,
        linked_entry_ids=[str(x) for x in payload.linked_entry_ids],
        linked_entity_ids=[str(x) for x in payload.linked_entity_ids],
        linked_working_ids=[str(x) for x in payload.linked_working_ids],
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_sync_read(row)


@router.get(
    "/synchronicities/{sync_id}",
    response_model=SyncRead,
    tags=["synchronicities"],
)
async def get_synchronicity(
    sync_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> SyncRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(Synchronicity, sync_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != current_user.id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Synchronicity not found.",
        )
    return _to_sync_read(row)


@router.patch(
    "/synchronicities/{sync_id}",
    response_model=SyncRead,
    tags=["synchronicities"],
)
async def update_synchronicity(
    sync_id: UUID,
    payload: SyncUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> SyncRead:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(Synchronicity, sync_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != current_user.id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Synchronicity not found.",
        )

    data = payload.model_dump(exclude_unset=True)
    if "location_precision" in data:
        _validate_precision(data["location_precision"])
    if "linked_entry_ids" in data and data["linked_entry_ids"] is not None:
        await _validate_linked_entries(
            data["linked_entry_ids"], db, current_user.id,
        )
        data["linked_entry_ids"] = [str(x) for x in data["linked_entry_ids"]]
    if "linked_entity_ids" in data and data["linked_entity_ids"] is not None:
        await _validate_linked_entities(
            data["linked_entity_ids"], db, current_user.id,
        )
        data["linked_entity_ids"] = [
            str(x) for x in data["linked_entity_ids"]
        ]
    if (
        "linked_working_ids" in data
        and data["linked_working_ids"] is not None
    ):
        data["linked_working_ids"] = [
            str(x) for x in data["linked_working_ids"]
        ]

    # If location or precision changed, re-quantize lat/lng.
    new_precision = data.get("location_precision", row.location_precision)
    new_lat = data.get("location_lat", row.location_lat)
    new_lng = data.get("location_lng", row.location_lng)
    if (
        "location_precision" in data
        or "location_lat" in data
        or "location_lng" in data
    ):
        q_lat, q_lng = apply_precision_floor(new_lat, new_lng, new_precision)
        data["location_lat"] = q_lat
        data["location_lng"] = q_lng

    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_sync_read(row)


@router.delete(
    "/synchronicities/{sync_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["synchronicities"],
)
async def delete_synchronicity(
    sync_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(Synchronicity, sync_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != current_user.id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Synchronicity not found.",
        )
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/synchronicities/{sync_id}/retag",
    response_model=SyncRead,
    tags=["synchronicities"],
)
async def retag_synchronicity(
    sync_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> SyncRead:
    """Re-run the auto-tag pipeline.

    The row's current occurred_at + location are fed to the providers
    again; the resulting snapshots replace any existing ones tagged
    ``source: "auto"``. Practitioner-edited snapshots (``source:
    "manual"``) are PRESERVED."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(Synchronicity, sync_id)
    if (
        row is None
        or row.deleted_at is not None
        or row.owner_id != current_user.id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Synchronicity not found.",
        )

    tag = autotag_synchronicity(
        occurred_at=row.occurred_at,
        location_lat=row.location_lat,
        location_lng=row.location_lng,
        location_precision=row.location_precision,
        astro_provider=_ASTRO_PROVIDER,
        calendar_provider=_CALENDAR_PROVIDER,
        weather_provider=_WEATHER_PROVIDER,
    )

    def _replace_if_auto(
        existing: dict | None, replacement: dict | None,
    ) -> dict | None:
        if existing is None:
            return replacement
        # Preserve manual edits.
        if existing.get("source") == "manual":
            return existing
        return replacement

    row.astro_snapshot = _replace_if_auto(
        row.astro_snapshot, tag.astro_snapshot,
    )
    row.calendar_stamp = _replace_if_auto(
        row.calendar_stamp, tag.calendar_stamp,
    )
    row.weather_snapshot = _replace_if_auto(
        row.weather_snapshot, tag.weather_snapshot,
    )

    await db.commit()
    await db.refresh(row)
    return _to_sync_read(row)
