"""Entry HTTP endpoints.

``GET    /api/v1/entries``           — list (optional ?type= filter)
``GET    /api/v1/entries/stats``     — counts + week-over-week deltas
``POST   /api/v1/entries``           — create
``GET    /api/v1/entries/{id}``      — single entry

Phase 02 NOTE: these endpoints are **unauthenticated** during foundations.
Anonymous read + write is intentional for the dev preview. They gain auth
gating when the auth HTTP routes ship in a later batch — that batch
should also flip ``Entry.owner_id`` to NOT NULL.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryType,
    EntryVisibility,
)

__all__ = ["router"]

router = APIRouter()


# Phase 04 expanded the discriminator to 17 kinds (5 legacy + 12 new).
# The literal here lists them all so OpenAPI clients see the full set.
EntryTypeLiteral = Literal[
    # Phase 02 legacy
    "observation", "ritual", "divination", "synchronicity", "capture",
    # Phase 04
    "note", "ritual_log", "dream", "working", "magical_record",
    "pathworking", "scrying", "body_practice", "meeting_note",
    "study_note", "liber_resh", "blog_post",
]

# The 5 legacy types — used by the existing stats endpoint that
# pre-dated the Phase 04 expansion. Phase 04 stats land in a future
# `EntryStatsV2` shape; this list stays narrow for back-compat.
_ALL_TYPES: tuple[EntryTypeLiteral, ...] = (
    "observation",
    "ritual",
    "divination",
    "synchronicity",
    "capture",
)


EntryVisibilityLiteral = Literal["personal", "viewer", "hub", "public"]
EncryptionModeLiteral = Literal["none", "sealed"]


class EntryRead(BaseModel):
    """Wire format for a single entry — mirrors frontend ``EntryRecord``.

    Phase 04 expands this with optional fields. Pre-Phase-04 clients
    that don't ask for the new fields keep working because every new
    column is `Optional` and `default=None`.
    """

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    title: str
    type: EntryTypeLiteral
    excerpt: str
    glyph: str
    created_at: datetime
    updated_at: datetime

    # Phase 04 extras (all optional for back-compat).
    body: str | None = None
    visibility: EntryVisibilityLiteral = "personal"
    encryption_mode: EncryptionModeLiteral = "none"
    occurred_at: datetime | None = None
    occurred_at_tz: str | None = None
    location_lat: float | None = None
    location_lon: float | None = None
    mood: int | None = None
    energy: int | None = None
    health_notes: str | None = None
    parent_id: str | None = None
    scheduled_publish_at: datetime | None = None
    # Multi-identity authoring (Batch 32).
    authored_by_persona_id: str | None = None


class EntryCreate(BaseModel):
    """Body for ``POST /api/v1/entries`` — mirrors frontend ``CreateEntryInput``.

    Phase 04 extras are optional; pre-Phase-04 client payloads still
    validate because every new field has a default.
    """

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=256)
    type: EntryTypeLiteral = "observation"
    excerpt: str = Field(default="", max_length=1024)
    glyph: str = Field(default="feather", max_length=64)
    body: str | None = None

    # Phase 04 extras.
    visibility: EntryVisibilityLiteral = "personal"
    occurred_at: datetime | None = None
    occurred_at_tz: str | None = Field(default=None, max_length=64)
    location_lat: float | None = Field(default=None, ge=-90.0, le=90.0)
    location_lon: float | None = Field(default=None, ge=-180.0, le=180.0)
    mood: int | None = Field(default=None, ge=1, le=10)
    energy: int | None = Field(default=None, ge=1, le=10)
    health_notes: str | None = None
    parent_id: str | None = None
    scheduled_publish_at: datetime | None = None
    # Multi-identity authoring (Batch 32).
    authored_by_persona_id: str | None = None


class EntryWindowCounts(BaseModel):
    """Counts in a time window — total + per-type breakdown."""

    model_config = ConfigDict(extra="forbid")

    total: int
    by_type: dict[EntryTypeLiteral, int]


class EntryStats(BaseModel):
    """Response of ``GET /api/v1/entries/stats``."""

    model_config = ConfigDict(extra="forbid")

    total: int
    by_type: dict[EntryTypeLiteral, int]
    this_week: EntryWindowCounts
    last_week: EntryWindowCounts


def _to_read(row: Entry) -> EntryRead:
    return EntryRead(
        id=str(row.id),
        title=row.title,
        type=row.type.value,
        excerpt=row.excerpt,
        glyph=row.glyph,
        created_at=row.created_at,
        updated_at=row.updated_at,
        body=row.body,
        visibility=row.visibility.value,
        encryption_mode=row.encryption_mode.value,
        occurred_at=row.occurred_at,
        occurred_at_tz=row.occurred_at_tz,
        location_lat=row.location_lat,
        location_lon=row.location_lon,
        mood=row.mood,
        energy=row.energy,
        health_notes=row.health_notes,
        parent_id=str(row.parent_id) if row.parent_id else None,
        scheduled_publish_at=row.scheduled_publish_at,
        authored_by_persona_id=(
            str(row.authored_by_persona_id)
            if row.authored_by_persona_id
            else None
        ),
    )


def _empty_by_type() -> dict[EntryTypeLiteral, int]:
    return {t: 0 for t in _ALL_TYPES}


@router.get(
    "/entries",
    summary="List entries",
    description="Returns non-deleted entries in reverse-chronological order. Optional ``?type=`` filter.",
    response_model=list[EntryRead],
)
async def list_entries(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    type: EntryTypeLiteral | None = None,
    limit: int = 50,
) -> list[EntryRead]:
    stmt = select(Entry).where(Entry.deleted_at.is_(None))
    if type is not None:
        stmt = stmt.where(Entry.type == EntryType(type))
    stmt = stmt.order_by(Entry.created_at.desc()).limit(min(limit, 200))
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/entries/stats",
    summary="Entry counts + week-over-week deltas",
    description=(
        "Returns total entry count, per-type breakdown, and counts for the "
        "current and previous UTC-week windows. Soft-deleted entries excluded."
    ),
    response_model=EntryStats,
)
async def get_entry_stats(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntryStats:
    now = datetime.now(tz=UTC)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    async def _counts(since: datetime | None = None, until: datetime | None = None) -> EntryWindowCounts:
        stmt = (
            select(Entry.type, func.count(Entry.id))
            .where(Entry.deleted_at.is_(None))
            .group_by(Entry.type)
        )
        if since is not None:
            stmt = stmt.where(Entry.created_at >= since)
        if until is not None:
            stmt = stmt.where(Entry.created_at < until)
        result = await session.execute(stmt)
        by_type = _empty_by_type()
        total = 0
        for row_type, row_count in result.all():
            literal = row_type.value if isinstance(row_type, EntryType) else str(row_type)
            count_int = int(row_count)
            by_type[literal] = count_int  # type: ignore[index]
            total += count_int
        return EntryWindowCounts(total=total, by_type=by_type)

    all_time = await _counts()
    this_week = await _counts(since=week_ago)
    last_week = await _counts(since=two_weeks_ago, until=week_ago)

    return EntryStats(
        total=all_time.total,
        by_type=all_time.by_type,
        this_week=this_week,
        last_week=last_week,
    )


@router.post(
    "/entries",
    summary="Create entry",
    description=(
        "Create a new entry. Phase 02: unauthenticated; ``owner_id`` is "
        "left NULL until auth routes ship."
    ),
    response_model=EntryRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_entry(
    payload: EntryCreate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> EntryRead:
    row = Entry(
        title=payload.title,
        type=EntryType(payload.type),
        excerpt=payload.excerpt,
        glyph=payload.glyph,
        body=payload.body,
        owner_id=current_user.id if current_user is not None else None,
        # Phase 04 extras. All optional; Entry defaults handle absent values.
        visibility=EntryVisibility(payload.visibility),
        occurred_at=payload.occurred_at,
        occurred_at_tz=payload.occurred_at_tz,
        location_lat=payload.location_lat,
        location_lon=payload.location_lon,
        mood=payload.mood,
        energy=payload.energy,
        health_notes=payload.health_notes,
        parent_id=UUID(payload.parent_id) if payload.parent_id else None,
        scheduled_publish_at=payload.scheduled_publish_at,
        authored_by_persona_id=(
            UUID(payload.authored_by_persona_id)
            if payload.authored_by_persona_id
            else None
        ),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


@router.get(
    "/entries/{entry_id}",
    summary="Get entry by id",
    response_model=EntryRead,
)
async def get_entry(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntryRead:
    stmt = select(Entry).where(Entry.id == entry_id, Entry.deleted_at.is_(None))
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    return _to_read(row)


class EntryUpdate(BaseModel):
    """Body for ``PATCH /api/v1/entries/{id}`` — every field optional."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=256)
    type: EntryTypeLiteral | None = None
    excerpt: str | None = Field(default=None, max_length=1024)
    glyph: str | None = Field(default=None, max_length=64)
    body: str | None = None


@router.patch(
    "/entries/{entry_id}",
    summary="Update entry",
    description=(
        "Partial update — only supplied fields change. Phase 02: unauthenticated; "
        "ownership gating ships with the auth surface."
    ),
    response_model=EntryRead,
)
async def update_entry(
    entry_id: UUID,
    payload: EntryUpdate,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EntryRead:
    stmt = select(Entry).where(Entry.id == entry_id, Entry.deleted_at.is_(None))
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    if payload.title is not None:
        row.title = payload.title
    if payload.type is not None:
        row.type = EntryType(payload.type)
    if payload.excerpt is not None:
        row.excerpt = payload.excerpt
    if payload.glyph is not None:
        row.glyph = payload.glyph
    if payload.body is not None:
        row.body = payload.body
    await session.commit()
    await session.refresh(row)
    return _to_read(row)


@router.delete(
    "/entries/{entry_id}",
    summary="Archive entry (soft-delete)",
    description="Sets deleted_at. Entry no longer appears in lists or stats. Restorable via PATCH (Phase 03+).",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def archive_entry(
    entry_id: UUID,
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    from datetime import UTC, datetime as _dt
    stmt = select(Entry).where(Entry.id == entry_id, Entry.deleted_at.is_(None))
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    row.deleted_at = _dt.now(tz=UTC)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
