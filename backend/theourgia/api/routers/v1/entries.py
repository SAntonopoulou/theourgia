"""Entry HTTP endpoints.

``GET    /api/v1/entries``      — list (no pagination yet)
``POST   /api/v1/entries``      — create
``GET    /api/v1/entries/{id}`` — single entry

Phase 02 NOTE: these endpoints are **unauthenticated** during foundations.
Anonymous read + write is intentional for the dev preview. They gain auth
gating when the auth HTTP routes ship in a later batch — that batch
should also flip ``Entry.owner_id`` to NOT NULL.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.models.entries import Entry, EntryType

__all__ = ["router"]

router = APIRouter()


EntryTypeLiteral = Literal["observation", "ritual", "divination", "synchronicity", "capture"]


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


@router.get(
    "/entries",
    summary="List entries",
    description="Returns all non-deleted entries in reverse-chronological order.",
    response_model=list[EntryRead],
)
async def list_entries(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = 50,
) -> list[EntryRead]:
    stmt = (
        select(Entry)
        .where(Entry.deleted_at.is_(None))
        .order_by(Entry.created_at.desc())
        .limit(min(limit, 200))
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [_to_read(row) for row in rows]


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
