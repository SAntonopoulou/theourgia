"""Library HTTP endpoints — Phase 02 minimal slice.

``GET    /api/v1/books``        list (with optional ?tradition= filter)
``POST   /api/v1/books``        create (auth populates owner_id)
``GET    /api/v1/books/{id}``   single
``PATCH  /api/v1/books/{id}``   partial update
``DELETE /api/v1/books/{id}``   soft-delete

Same anonymous-writes policy as entries during Phase 02; gating ships
with the auth surface.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.library import Book

__all__ = ["router"]

router = APIRouter()


class BookRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    title: str
    author: str
    year: int | None
    isbn: str
    tradition: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class BookCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=512)
    author: str = Field(default="", max_length=256)
    year: int | None = None
    isbn: str = Field(default="", max_length=32)
    tradition: str = Field(default="", max_length=64)
    notes: str | None = None


class BookUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=512)
    author: str | None = Field(default=None, max_length=256)
    year: int | None = None
    isbn: str | None = Field(default=None, max_length=32)
    tradition: str | None = Field(default=None, max_length=64)
    notes: str | None = None


def _to_read(row: Book) -> BookRead:
    return BookRead(
        id=str(row.id),
        title=row.title,
        author=row.author,
        year=row.year,
        isbn=row.isbn,
        tradition=row.tradition,
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/books", summary="List books", response_model=list[BookRead])
async def list_books(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    tradition: str | None = None,
    limit: int = 100,
) -> list[BookRead]:
    stmt = select(Book).where(
        Book.deleted_at.is_(None),
        Book.owner_id == current_user.id,
    )
    if tradition:
        stmt = stmt.where(Book.tradition == tradition)
    stmt = stmt.order_by(Book.title.asc()).limit(min(limit, 500))
    result = await db.execute(stmt)
    return [_to_read(row) for row in result.scalars().all()]


@router.post(
    "/books",
    summary="Add a book",
    response_model=BookRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_book(
    payload: BookCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> BookRead:
    row = Book(
        title=payload.title,
        author=payload.author,
        year=payload.year,
        isbn=payload.isbn,
        tradition=payload.tradition,
        notes=payload.notes,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/books/{book_id}", summary="Get book", response_model=BookRead)
async def get_book(
    book_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> BookRead:
    stmt = select(Book).where(
        Book.id == book_id,
        Book.deleted_at.is_(None),
        Book.owner_id == current_user.id,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Book {book_id} not found")
    return _to_read(row)


@router.patch(
    "/books/{book_id}",
    summary="Update book",
    response_model=BookRead,
)
async def update_book(
    book_id: UUID,
    payload: BookUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> BookRead:
    stmt = select(Book).where(
        Book.id == book_id,
        Book.deleted_at.is_(None),
        Book.owner_id == current_user.id,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Book {book_id} not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/books/{book_id}",
    summary="Archive book (soft-delete)",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def archive_book(
    book_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    stmt = select(Book).where(
        Book.id == book_id,
        Book.deleted_at.is_(None),
        Book.owner_id == current_user.id,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Book {book_id} not found")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
