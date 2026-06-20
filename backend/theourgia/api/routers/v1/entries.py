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

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.models.entries import Entry, EntryType

__all__ = ["router"]

router = APIRouter()


EntryTypeLiteral = Literal["observation", "ritual", "divination", "synchronicity", "capture"]

_ALL_TYPES: tuple[EntryTypeLiteral, ...] = (
    "observation",
    "ritual",
    "divination",
    "synchronicity",
    "capture",
)


class EntryRead(BaseModel):
    """Wire format for a single entry — mirrors frontend ``EntryRecord``."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    title: str
    type: EntryTypeLiteral
    excerpt: str
    glyph: str
    created_at: datetime
    updated_at: datetime


class EntryCreate(BaseModel):
    """Body for ``POST /api/v1/entries`` — mirrors frontend ``CreateEntryInput``."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=256)
    type: EntryTypeLiteral = "observation"
    excerpt: str = Field(default="", max_length=1024)
    glyph: str = Field(default="feather", max_length=64)
    body: str | None = None


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
) -> EntryRead:
    row = Entry(
        title=payload.title,
        type=EntryType(payload.type),
        excerpt=payload.excerpt,
        glyph=payload.glyph,
        body=payload.body,
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
