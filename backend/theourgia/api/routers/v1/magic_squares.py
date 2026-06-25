"""Magic square HTTP endpoints.

``GET    /api/v1/magic-squares/planetary`` — return the seven Agrippa
                                             planetary squares (no auth,
                                             served from Python constants)
``GET    /api/v1/magic-squares``           — list custom squares
``POST   /api/v1/magic-squares``           — create a custom square
``GET    /api/v1/magic-squares/{id}``      — detail
``PATCH  /api/v1/magic-squares/{id}``      — update (name + cells +
                                             attribution; order is
                                             immutable since changing
                                             it would invalidate cells)
``DELETE /api/v1/magic-squares/{id}``      — soft delete

The seven planetary squares are NOT rows in this table — they live
as immutable constants in
:mod:`theourgia.core.workshop.planetary_squares`. The dedicated
``/planetary`` endpoint serves them.

The H05 honesty rule: planetary squares are immutable. The custom
table holds only user constructions.

``is_magic`` is server-computed at create + update (rows + columns
+ both main diagonals all sum to the magic constant).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.workshop.planetary_squares import (
    PLANETARY_SQUARES,
    is_valid_magic_square,
    magic_constant,
)
from theourgia.models.magic_squares import MagicSquare

__all__ = ["router"]

router = APIRouter()


class PlanetarySquareRead(BaseModel):
    """One of the seven canonical planetary squares.

    Served from :mod:`theourgia.core.workshop.planetary_squares` —
    not a DB row. The ``planet`` field uses the lowercase slug
    (``saturn`` → ``moon``).
    """

    model_config = ConfigDict(extra="forbid")

    planet: str
    name: str
    order: int
    magic_constant: int
    cells: list[list[int]]
    citation: str


class MagicSquareRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    name: str
    order: int
    cells: list[list[int]]
    attribution: str | None
    is_magic: bool
    created_at: datetime
    updated_at: datetime


class MagicSquareCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=240)
    order: int = Field(ge=3, le=12)
    cells: list[list[int]]
    attribution: str | None = Field(default=None, max_length=480)


class MagicSquareUpdate(BaseModel):
    """``order`` is immutable — changing it would invalidate cells."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=240)
    cells: list[list[int]] | None = None
    attribution: str | None = Field(default=None, max_length=480)


def _validate_cells_shape(cells: list[list[int]], order: int) -> None:
    """Ensure ``cells`` is order × order. Raises 400 otherwise."""
    if len(cells) != order:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"cells must be {order} rows; got {len(cells)}.",
        )
    for i, row in enumerate(cells):
        if len(row) != order:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"cells row {i} must have {order} cells; got {len(row)}.",
            )


def _to_read(row: MagicSquare) -> MagicSquareRead:
    return MagicSquareRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        name=row.name,
        order=row.order,
        cells=[list(r) for r in (row.cells or [])],
        attribution=row.attribution,
        is_magic=row.is_magic,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ── Planetary endpoint (public, no auth scoping) ─────────────────────


@router.get(
    "/magic-squares/planetary",
    response_model=list[PlanetarySquareRead],
    tags=["magic-squares"],
)
async def list_planetary_squares() -> list[PlanetarySquareRead]:
    """Return the seven Agrippa planetary squares in sacred order
    (Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon).

    Public endpoint — no auth scoping. The squares are reference
    material, not user data.
    """
    return [
        PlanetarySquareRead(
            planet=s.planet,
            name=s.name,
            order=s.order,
            magic_constant=s.magic_constant,
            cells=[list(row) for row in s.cells],
            citation=s.citation,
        )
        for s in PLANETARY_SQUARES
    ]


# ── Custom square CRUD (auth-scoped) ─────────────────────────────────


@router.get(
    "/magic-squares",
    response_model=list[MagicSquareRead],
    tags=["magic-squares"],
)
async def list_magic_squares(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    limit: int = 100,
) -> list[MagicSquareRead]:
    stmt = select(MagicSquare).where(MagicSquare.deleted_at.is_(None))
    if current_user is not None:
        stmt = stmt.where(MagicSquare.owner_id == current_user.id)
    stmt = stmt.order_by(MagicSquare.created_at.desc()).limit(
        min(limit, 500)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/magic-squares",
    response_model=MagicSquareRead,
    status_code=status.HTTP_201_CREATED,
    tags=["magic-squares"],
)
async def create_magic_square(
    payload: MagicSquareCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> MagicSquareRead:
    _validate_cells_shape(payload.cells, payload.order)
    is_magic = is_valid_magic_square(payload.cells)

    row = MagicSquare(
        owner_id=current_user.id if current_user is not None else None,
        name=payload.name,
        order=payload.order,
        cells=payload.cells,
        attribution=payload.attribution,
        is_magic=is_magic,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/magic-squares/{square_id}",
    response_model=MagicSquareRead,
    tags=["magic-squares"],
)
async def get_magic_square(
    square_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> MagicSquareRead:
    row = await db.get(MagicSquare, square_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Magic square not found.",
        )
    if (
        current_user is not None
        and row.owner_id is not None
        and row.owner_id != current_user.id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Magic square not found.",
        )
    return _to_read(row)


@router.patch(
    "/magic-squares/{square_id}",
    response_model=MagicSquareRead,
    tags=["magic-squares"],
)
async def update_magic_square(
    square_id: UUID,
    payload: MagicSquareUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> MagicSquareRead:
    row = await db.get(MagicSquare, square_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Magic square not found.",
        )
    if (
        current_user is not None
        and row.owner_id is not None
        and row.owner_id != current_user.id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Magic square not found.",
        )

    data = payload.model_dump(exclude_unset=True)
    if "cells" in data and data["cells"] is not None:
        _validate_cells_shape(data["cells"], row.order)
        row.is_magic = is_valid_magic_square(data["cells"])
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/magic-squares/{square_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["magic-squares"],
)
async def delete_magic_square(
    square_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    row = await db.get(MagicSquare, square_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Magic square not found.",
        )
    if (
        current_user is not None
        and row.owner_id is not None
        and row.owner_id != current_user.id
    ):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Magic square not found.",
        )
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Silence unused-import for ``magic_constant`` (re-exported via
# ``from theourgia.core.workshop.planetary_squares import …`` keeps
# the helper one import-line away for any future endpoint).
_ = magic_constant
