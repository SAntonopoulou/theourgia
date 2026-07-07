"""Scrying HTTP endpoints — session-based capture.

``POST   /api/v1/scrying/sessions``                   — start a session
``POST   /api/v1/scrying/sessions/{id}/end``          — close out a session
``GET    /api/v1/scrying/sessions``                   — list
``GET    /api/v1/scrying/sessions/{id}``              — fetch
``PATCH  /api/v1/scrying/sessions/{id}``              — update notes / symbols
``DELETE /api/v1/scrying/sessions/{id}``              — soft delete
``GET    /api/v1/scrying/symbol-index``               — symbol → sessions index

The actual trance-mode UI lives on the public site (`trance.astro`,
shipped). This endpoint is the data layer behind the admin's
post-session capture + the symbol index.

Per ``plan/06-divination-and-practice.md`` §8.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.divination_lite import ScryingMode, ScryingSession

__all__ = ["router"]

router = APIRouter()


ModeLiteral = Literal[
    "water_bowl", "black_mirror", "crystal", "fire", "smoke",
    "ink_in_water", "candle_flame", "other",
]


class SessionStart(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: ModeLiteral
    started_at: datetime | None = None
    intention: str | None = None
    preparation_notes: str | None = None
    entity_id: UUID | None = None
    planetary_hour: str | None = Field(default=None, max_length=32)


class SessionEnd(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ended_at: datetime | None = None
    vision_notes: str | None = None
    symbols: list[str] | None = None
    sketch_upload_id: UUID | None = None
    voice_memo_upload_id: UUID | None = None
    entry_id: UUID | None = None


class SessionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intention: str | None = None
    preparation_notes: str | None = None
    vision_notes: str | None = None
    symbols: list[str] | None = None
    sketch_upload_id: UUID | None = None
    voice_memo_upload_id: UUID | None = None
    entry_id: UUID | None = None
    entity_id: UUID | None = None


class SessionRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    mode: ModeLiteral
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    intention: str | None
    preparation_notes: str | None
    entity_id: str | None
    vision_notes: str | None
    symbols: list[str]
    sketch_upload_id: str | None
    voice_memo_upload_id: str | None
    planetary_hour: str | None
    entry_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


def _to_read(row: ScryingSession) -> SessionRead:
    duration_seconds: int | None = None
    if row.ended_at is not None:
        delta = row.ended_at - row.started_at
        duration_seconds = int(delta.total_seconds())
    return SessionRead(
        id=str(row.id),
        mode=row.mode.value,
        started_at=row.started_at,
        ended_at=row.ended_at,
        duration_seconds=duration_seconds,
        intention=row.intention,
        preparation_notes=row.preparation_notes,
        entity_id=str(row.entity_id) if row.entity_id else None,
        vision_notes=row.vision_notes,
        symbols=list(row.symbols) if row.symbols else [],
        sketch_upload_id=str(row.sketch_upload_id) if row.sketch_upload_id else None,
        voice_memo_upload_id=(
            str(row.voice_memo_upload_id) if row.voice_memo_upload_id else None
        ),
        planetary_hour=row.planetary_hour,
        entry_id=str(row.entry_id) if row.entry_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "/scrying/sessions",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
    tags=["scrying"],
)
async def start_session(
    payload: SessionStart,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SessionRead:
    row = ScryingSession(
        mode=ScryingMode(payload.mode),
        started_at=payload.started_at or datetime.now(tz=UTC),
        intention=payload.intention,
        preparation_notes=payload.preparation_notes,
        entity_id=payload.entity_id,
        planetary_hour=payload.planetary_hour,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/scrying/sessions/{session_id}/end",
    response_model=SessionRead,
    tags=["scrying"],
)
async def end_session(
    session_id: UUID,
    payload: SessionEnd,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SessionRead:
    row = await db.get(ScryingSession, session_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    if row.ended_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Session already ended.",
        )
    row.ended_at = payload.ended_at or datetime.now(tz=UTC)
    if row.ended_at < row.started_at:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "ended_at cannot precede started_at.",
        )
    if payload.vision_notes is not None:
        row.vision_notes = payload.vision_notes
    if payload.symbols is not None:
        row.symbols = payload.symbols
    if payload.sketch_upload_id is not None:
        row.sketch_upload_id = payload.sketch_upload_id
    if payload.voice_memo_upload_id is not None:
        row.voice_memo_upload_id = payload.voice_memo_upload_id
    if payload.entry_id is not None:
        row.entry_id = payload.entry_id
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/scrying/sessions",
    response_model=list[SessionRead],
    tags=["scrying"],
)
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    mode: ModeLiteral | None = None,
    entity_id: UUID | None = None,
    limit: int = 100,
) -> list[SessionRead]:
    stmt = select(ScryingSession).where(
        ScryingSession.deleted_at.is_(None),
        ScryingSession.owner_id == current_user.id,
    )
    if mode is not None:
        stmt = stmt.where(ScryingSession.mode == ScryingMode(mode))
    if entity_id is not None:
        stmt = stmt.where(ScryingSession.entity_id == entity_id)
    stmt = stmt.order_by(ScryingSession.started_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/scrying/sessions/{session_id}",
    response_model=SessionRead,
    tags=["scrying"],
)
async def get_session(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SessionRead:
    row = await db.get(ScryingSession, session_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    return _to_read(row)


@router.patch(
    "/scrying/sessions/{session_id}",
    response_model=SessionRead,
    tags=["scrying"],
)
async def update_session(
    session_id: UUID,
    payload: SessionUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SessionRead:
    row = await db.get(ScryingSession, session_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/scrying/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["scrying"],
)
async def delete_session(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(ScryingSession, session_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── Symbol index ──────────────────────────────────────────────────


class SymbolEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol: str
    count: int
    session_ids: list[str]


@router.get(
    "/scrying/symbol-index",
    response_model=list[SymbolEntry],
    tags=["scrying"],
)
async def symbol_index(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> list[SymbolEntry]:
    """All symbols extracted across the caller's scrying sessions,
    most-frequent first. Powers the cross-session "where else has
    this symbol appeared?" lookup that's shared with the Phase 04
    dream-symbol index."""
    stmt = select(ScryingSession).where(
        ScryingSession.deleted_at.is_(None),
        ScryingSession.owner_id == current_user.id,
    )
    rows = (await db.execute(stmt)).scalars().all()

    by_symbol: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        for symbol in row.symbols or []:
            by_symbol[str(symbol)].append(str(row.id))

    entries = [
        SymbolEntry(symbol=symbol, count=len(ids), session_ids=ids)
        for symbol, ids in by_symbol.items()
    ]
    entries.sort(key=lambda e: (-e.count, e.symbol))
    return entries
