"""Tea-leaf reading endpoints — b108-2hj.

FEATURES §13 · reference plugin (tea-leaf reading log). A
non-mechanical divination — practitioner identifies shapes in the
settled leaves and interprets them via a mix of dictionary +
intuition.

Endpoints:

- GET    /api/v1/reference/tea-leaf-symbols       — full symbol dictionary
- GET    /api/v1/divination/tea-leaves            — list readings
- POST   /api/v1/divination/tea-leaves            — record a reading
- GET    /api/v1/divination/tea-leaves/{id}       — read one
- PATCH  /api/v1/divination/tea-leaves/{id}       — edit interpretation
- DELETE /api/v1/divination/tea-leaves/{id}       — soft-delete
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
from theourgia.core.reference.tea_leaves import (
    TEA_LEAF_SYMBOLS,
    TeaLeafSymbol,
)
from theourgia.models.tea_leaf import TeaLeafReading

__all__ = ["router"]

router = APIRouter()


PositionLiteral = Literal["rim", "middle", "bottom", "handle"]
OrientationLiteral = Literal["upright", "inverted"]


# ── Symbols reference ────────────────────────────────────────────


class TeaLeafSymbolRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    name: str
    upright_meaning: str
    inverted_meaning: str | None
    position_notes: str
    glyph_hint: str


def _symbol_to_read(s: TeaLeafSymbol) -> TeaLeafSymbolRead:
    return TeaLeafSymbolRead(
        key=s.key,
        name=s.name,
        upright_meaning=s.upright_meaning,
        inverted_meaning=s.inverted_meaning,
        position_notes=s.position_notes,
        glyph_hint=s.glyph_hint,
    )


@router.get(
    "/reference/tea-leaf-symbols",
    response_model=list[TeaLeafSymbolRead],
    tags=["reference"],
    summary="Tasseography symbol dictionary",
)
async def list_symbols(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[TeaLeafSymbolRead]:
    return [_symbol_to_read(s) for s in TEA_LEAF_SYMBOLS]


# ── Readings ─────────────────────────────────────────────────────


class ObservedSymbol(BaseModel):
    """One symbol seen in a reading."""

    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=64)
    position: PositionLiteral = "middle"
    orientation: OrientationLiteral = "upright"
    notes: str | None = Field(default=None, max_length=2000)


class TeaLeafReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    question: str | None
    tea_variety: str | None
    symbols_observed: list[dict[str, object]]
    interpretation: str | None
    intuitive_notes: str | None
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime


class TeaLeafReadingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str | None = Field(default=None, max_length=4000)
    tea_variety: str | None = Field(default=None, max_length=120)
    symbols_observed: list[ObservedSymbol] = Field(default_factory=list)
    interpretation: str | None = None
    intuitive_notes: str | None = None
    occurred_at: datetime | None = None


class TeaLeafReadingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str | None = Field(default=None, max_length=4000)
    tea_variety: str | None = Field(default=None, max_length=120)
    symbols_observed: list[ObservedSymbol] | None = None
    interpretation: str | None = None
    intuitive_notes: str | None = None
    occurred_at: datetime | None = None


def _to_read(row: TeaLeafReading) -> TeaLeafReadingRead:
    return TeaLeafReadingRead(
        id=str(row.id),
        question=row.question,
        tea_variety=row.tea_variety,
        symbols_observed=list(row.symbols_observed or []),
        interpretation=row.interpretation,
        intuitive_notes=row.intuitive_notes,
        occurred_at=row.occurred_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get(
    "/divination/tea-leaves",
    response_model=list[TeaLeafReadingRead],
    tags=["divination"],
)
async def list_readings(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = 100,
) -> list[TeaLeafReadingRead]:
    stmt = (
        select(TeaLeafReading)
        .where(
            TeaLeafReading.owner_id == current_user.id,
            TeaLeafReading.deleted_at.is_(None),
        )
        .order_by(TeaLeafReading.occurred_at.desc())
        .limit(min(limit, 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(r) for r in rows]


@router.post(
    "/divination/tea-leaves",
    response_model=TeaLeafReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["divination"],
)
async def create_reading(
    payload: TeaLeafReadingCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TeaLeafReadingRead:
    now = datetime.now(tz=UTC)
    row = TeaLeafReading(
        owner_id=current_user.id,
        question=payload.question,
        tea_variety=payload.tea_variety,
        symbols_observed=[s.model_dump() for s in payload.symbols_observed],
        interpretation=payload.interpretation,
        intuitive_notes=payload.intuitive_notes,
        occurred_at=payload.occurred_at or now,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/divination/tea-leaves/{reading_id}",
    response_model=TeaLeafReadingRead,
    tags=["divination"],
)
async def get_reading(
    reading_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TeaLeafReadingRead:
    row = await db.get(TeaLeafReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    return _to_read(row)


@router.patch(
    "/divination/tea-leaves/{reading_id}",
    response_model=TeaLeafReadingRead,
    tags=["divination"],
)
async def update_reading(
    reading_id: UUID,
    payload: TeaLeafReadingUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TeaLeafReadingRead:
    row = await db.get(TeaLeafReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    data = payload.model_dump(exclude_unset=True)
    if "symbols_observed" in data and data["symbols_observed"] is not None:
        data["symbols_observed"] = [
            s.model_dump() if hasattr(s, "model_dump") else s
            for s in data["symbols_observed"]
        ]
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/divination/tea-leaves/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["divination"],
)
async def delete_reading(
    reading_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(TeaLeafReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
