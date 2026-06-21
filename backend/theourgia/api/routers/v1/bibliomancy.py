"""Bibliomancy HTTP endpoints.

``POST   /api/v1/bibliomancy/cast``                — pick a passage from a source
``GET    /api/v1/bibliomancy/readings``            — list
``GET    /api/v1/bibliomancy/readings/{id}``       — fetch one
``PATCH  /api/v1/bibliomancy/readings/{id}``       — update interpretation
``DELETE /api/v1/bibliomancy/readings/{id}``       — soft delete

The caller supplies the source text directly (paste / clipboard /
file). When ``book_id`` is supplied, the response includes the book
metadata; the source text itself still comes through the request
body. The Book model doesn't carry full-text storage at this batch.

Per ``plan/06-divination-and-practice.md`` §6.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.divination.bibliomancy import (
    Passage,
    PassageKind,
    bibliomancy_cast,
)
from theourgia.core.divination.tarot.engine import make_seed
from theourgia.models.divination_lite import (
    BibliomancyPassageKind,
    BibliomancyReading,
)
from theourgia.models.library import Book

__all__ = ["router"]

router = APIRouter()


KindLiteral = Literal["line", "sentence", "paragraph"]


class CastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str | None = None
    source_text: str = Field(min_length=1)
    source_label: str = Field(
        min_length=1,
        max_length=512,
        description='Human label for the source — e.g. "Iliad Book IV" or "User-supplied passage".',
    )
    book_id: UUID | None = None
    passage_kind: KindLiteral = "paragraph"
    seed: str | None = None
    entry_id: UUID | None = None


class ReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    question: str | None
    book_id: str | None
    source_label: str
    passage_kind: KindLiteral
    seed: str
    drawn_at: datetime
    drawn_passage: str
    start_offset: int
    passage_index: int
    total_passages: int
    interpretation: str | None
    entry_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class ReadingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interpretation: str | None = None
    entry_id: UUID | None = None


def _to_read(row: BibliomancyReading) -> ReadingRead:
    return ReadingRead(
        id=str(row.id),
        question=row.question,
        book_id=str(row.book_id) if row.book_id else None,
        source_label=row.source_label,
        passage_kind=row.passage_kind.value,
        seed=row.seed,
        drawn_at=row.drawn_at,
        drawn_passage=row.drawn_passage,
        start_offset=row.start_offset,
        passage_index=row.passage_index,
        total_passages=row.total_passages,
        interpretation=row.interpretation,
        entry_id=str(row.entry_id) if row.entry_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "/bibliomancy/cast",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["bibliomancy"],
)
async def cast(
    payload: CastRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> ReadingRead:
    # Validate the book FK if supplied — the source label can still
    # be free-form, but if `book_id` is provided it must point to a
    # real book.
    if payload.book_id is not None:
        book = await db.get(Book, payload.book_id)
        if book is None or book.deleted_at is not None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Source book not found.",
            )

    now = datetime.now(tz=UTC)
    seed = payload.seed or make_seed(
        now.isoformat(), payload.question or "", uuid4().hex,
    )

    try:
        passage: Passage = bibliomancy_cast(
            source=payload.source_text,
            seed=seed,
            kind=PassageKind(payload.passage_kind),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    row = BibliomancyReading(
        question=payload.question,
        book_id=payload.book_id,
        source_label=payload.source_label,
        passage_kind=BibliomancyPassageKind(payload.passage_kind),
        seed=seed,
        drawn_at=now,
        drawn_passage=passage.text,
        start_offset=passage.start_offset,
        passage_index=passage.index,
        total_passages=passage.total,
        entry_id=payload.entry_id,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/bibliomancy/readings",
    response_model=list[ReadingRead],
    tags=["bibliomancy"],
)
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    book_id: UUID | None = None,
    limit: int = 100,
) -> list[ReadingRead]:
    stmt = select(BibliomancyReading).where(BibliomancyReading.deleted_at.is_(None))
    if book_id is not None:
        stmt = stmt.where(BibliomancyReading.book_id == book_id)
    stmt = stmt.order_by(BibliomancyReading.drawn_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/bibliomancy/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["bibliomancy"],
)
async def get_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ReadingRead:
    row = await db.get(BibliomancyReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    return _to_read(row)


@router.patch(
    "/bibliomancy/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["bibliomancy"],
)
async def update_reading(
    reading_id: UUID,
    payload: ReadingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ReadingRead:
    row = await db.get(BibliomancyReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/bibliomancy/readings/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["bibliomancy"],
)
async def delete_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(BibliomancyReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
