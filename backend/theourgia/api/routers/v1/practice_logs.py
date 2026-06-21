"""Practice-log HTTP endpoints.

Phase 06 closer — three concerns folded into one router file:

``GET    /api/v1/practice/paths``                       — list Tree of Life paths
``GET    /api/v1/practice/paths/{tradition}``           — paths for one tradition

``POST   /api/v1/practice/body``                        — log a body practice session
``GET    /api/v1/practice/body``                        — list sessions
``GET    /api/v1/practice/body/{id}``                   — fetch one
``PATCH  /api/v1/practice/body/{id}``                   — update notes / count
``DELETE /api/v1/practice/body/{id}``                   — soft delete
``GET    /api/v1/practice/body/totals``                 — cumulative time per posture/pattern

``POST   /api/v1/practice/banishing``                   — log a banishing
``GET    /api/v1/practice/banishing``                   — list
``GET    /api/v1/practice/banishing/{id}``              — fetch one
``PATCH  /api/v1/practice/banishing/{id}``              — update
``DELETE /api/v1/practice/banishing/{id}``              — soft delete
``GET    /api/v1/practice/banishing/cadence``           — last-30-day count for streak rendering

Per ``plan/06-divination-and-practice.md`` §§11-13.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.core.practice import (
    TREE_PATHS,
    TreeOfLifePath,
    TreeTradition,
    paths_for_tradition,
)
from theourgia.models.practice_logs import (
    BanishingLog,
    BanishingMethod,
    BodyPracticeKind,
    BodyPracticeSession,
)

__all__ = ["router"]

router = APIRouter()


TraditionLiteral = Literal["lurianic", "golden_dawn", "thelemic"]
BodyKindLiteral = Literal["asana", "pranayama", "other"]
BanishingMethodLiteral = Literal[
    "lbrp", "star_ruby", "simple_ground", "breath",
    "water", "salt", "bell", "incense", "khephra", "other",
]


# ───── Tree of Life paths catalog ────────────────────────────────────


class PathRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: int
    hebrew_letter: str
    letter_name: str
    connects: list[int]
    name: str
    tradition: TraditionLiteral
    tarot_card: str | None
    planet: str | None
    element: str | None
    color: str | None
    deity_associations: list[str]
    notes: str


def _path_to_read(p: TreeOfLifePath) -> PathRead:
    return PathRead(
        number=p.number,
        hebrew_letter=p.hebrew_letter,
        letter_name=p.letter_name,
        connects=list(p.connects),
        name=p.name,
        tradition=p.tradition.value,
        tarot_card=p.tarot_card,
        planet=p.planet,
        element=p.element,
        color=p.color,
        deity_associations=list(p.deity_associations),
        notes=p.notes,
    )


@router.get("/practice/paths", response_model=list[PathRead], tags=["practice"])
async def list_all_paths() -> list[PathRead]:
    return [_path_to_read(p) for p in TREE_PATHS]


@router.get(
    "/practice/paths/{tradition}",
    response_model=list[PathRead],
    tags=["practice"],
)
async def list_tradition_paths(tradition: TraditionLiteral) -> list[PathRead]:
    paths = paths_for_tradition(tradition)
    if not paths:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No paths bundled for tradition {tradition!r}.",
        )
    return [_path_to_read(p) for p in paths]


# ───── Body practice ─────────────────────────────────────────────────


class BodyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: BodyKindLiteral = "asana"
    posture_or_pattern: str = Field(min_length=1, max_length=128)
    started_at: datetime | None = None
    duration_seconds: int = Field(gt=0)
    breaks_count: int = Field(default=0, ge=0)
    observation_notes: str | None = None
    body_snapshot_id: UUID | None = None
    entry_id: UUID | None = None


class BodyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    duration_seconds: int | None = Field(default=None, gt=0)
    breaks_count: int | None = Field(default=None, ge=0)
    observation_notes: str | None = None
    body_snapshot_id: UUID | None = None
    entry_id: UUID | None = None


class BodyRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    kind: BodyKindLiteral
    posture_or_pattern: str
    started_at: datetime
    duration_seconds: int
    breaks_count: int
    observation_notes: str | None
    body_snapshot_id: str | None
    entry_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


def _body_to_read(row: BodyPracticeSession) -> BodyRead:
    return BodyRead(
        id=str(row.id),
        kind=row.kind.value,
        posture_or_pattern=row.posture_or_pattern,
        started_at=row.started_at,
        duration_seconds=row.duration_seconds,
        breaks_count=row.breaks_count,
        observation_notes=row.observation_notes,
        body_snapshot_id=str(row.body_snapshot_id) if row.body_snapshot_id else None,
        entry_id=str(row.entry_id) if row.entry_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "/practice/body",
    response_model=BodyRead,
    status_code=status.HTTP_201_CREATED,
    tags=["practice"],
)
async def create_body_session(
    payload: BodyCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> BodyRead:
    row = BodyPracticeSession(
        kind=BodyPracticeKind(payload.kind),
        posture_or_pattern=payload.posture_or_pattern,
        started_at=payload.started_at or datetime.now(tz=UTC),
        duration_seconds=payload.duration_seconds,
        breaks_count=payload.breaks_count,
        observation_notes=payload.observation_notes,
        body_snapshot_id=payload.body_snapshot_id,
        entry_id=payload.entry_id,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _body_to_read(row)


@router.get(
    "/practice/body",
    response_model=list[BodyRead],
    tags=["practice"],
)
async def list_body_sessions(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    kind: BodyKindLiteral | None = None,
    posture: str | None = None,
    limit: int = 100,
) -> list[BodyRead]:
    stmt = select(BodyPracticeSession).where(BodyPracticeSession.deleted_at.is_(None))
    if kind is not None:
        stmt = stmt.where(BodyPracticeSession.kind == BodyPracticeKind(kind))
    if posture is not None:
        stmt = stmt.where(BodyPracticeSession.posture_or_pattern == posture)
    stmt = stmt.order_by(BodyPracticeSession.started_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_body_to_read(row) for row in rows]


@router.get(
    "/practice/body/totals",
    tags=["practice"],
)
async def body_totals(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> list[dict[str, object]]:
    """Cumulative duration per posture/pattern across this user's
    sessions. Liber-E-style — practitioners track total time per
    posture as a measure of practice depth."""
    stmt = select(BodyPracticeSession).where(BodyPracticeSession.deleted_at.is_(None))
    if current_user is not None:
        stmt = stmt.where(BodyPracticeSession.owner_id == current_user.id)
    rows = (await db.execute(stmt)).scalars().all()

    totals: dict[tuple[str, str], dict[str, int]] = defaultdict(
        lambda: {"sessions": 0, "duration_seconds": 0, "breaks": 0},
    )
    for row in rows:
        key = (row.kind.value, row.posture_or_pattern)
        totals[key]["sessions"] += 1
        totals[key]["duration_seconds"] += row.duration_seconds
        totals[key]["breaks"] += row.breaks_count

    return [
        {
            "kind": kind,
            "posture_or_pattern": posture,
            "sessions": agg["sessions"],
            "duration_seconds": agg["duration_seconds"],
            "breaks": agg["breaks"],
        }
        for (kind, posture), agg in sorted(
            totals.items(), key=lambda kv: -kv[1]["duration_seconds"],
        )
    ]


@router.get(
    "/practice/body/{session_id}",
    response_model=BodyRead,
    tags=["practice"],
)
async def get_body_session(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> BodyRead:
    row = await db.get(BodyPracticeSession, session_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    return _body_to_read(row)


@router.patch(
    "/practice/body/{session_id}",
    response_model=BodyRead,
    tags=["practice"],
)
async def update_body_session(
    session_id: UUID,
    payload: BodyUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> BodyRead:
    row = await db.get(BodyPracticeSession, session_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _body_to_read(row)


@router.delete(
    "/practice/body/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["practice"],
)
async def delete_body_session(
    session_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(BodyPracticeSession, session_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── Banishing log ─────────────────────────────────────────────────


class BanishingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    method: BanishingMethodLiteral
    method_label: str | None = Field(default=None, max_length=128)
    performed_at: datetime | None = None
    duration_seconds: int | None = Field(default=None, ge=0)
    state_before: str | None = None
    state_after: str | None = None
    notes: str | None = None
    correspondences: dict[str, object] = Field(default_factory=dict)
    entry_id: UUID | None = None


class BanishingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    method_label: str | None = Field(default=None, max_length=128)
    duration_seconds: int | None = Field(default=None, ge=0)
    state_before: str | None = None
    state_after: str | None = None
    notes: str | None = None
    correspondences: dict[str, object] | None = None
    entry_id: UUID | None = None


class BanishingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    method: BanishingMethodLiteral
    method_label: str | None
    performed_at: datetime
    duration_seconds: int | None
    state_before: str | None
    state_after: str | None
    notes: str | None
    correspondences: dict[str, object]
    entry_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


def _banishing_to_read(row: BanishingLog) -> BanishingRead:
    return BanishingRead(
        id=str(row.id),
        method=row.method.value,
        method_label=row.method_label,
        performed_at=row.performed_at,
        duration_seconds=row.duration_seconds,
        state_before=row.state_before,
        state_after=row.state_after,
        notes=row.notes,
        correspondences=dict(row.correspondences) if row.correspondences else {},
        entry_id=str(row.entry_id) if row.entry_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "/practice/banishing",
    response_model=BanishingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["practice"],
)
async def create_banishing(
    payload: BanishingCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> BanishingRead:
    row = BanishingLog(
        method=BanishingMethod(payload.method),
        method_label=payload.method_label,
        performed_at=payload.performed_at or datetime.now(tz=UTC),
        duration_seconds=payload.duration_seconds,
        state_before=payload.state_before,
        state_after=payload.state_after,
        notes=payload.notes,
        correspondences=payload.correspondences,
        entry_id=payload.entry_id,
        owner_id=current_user.id if current_user is not None else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _banishing_to_read(row)


@router.get(
    "/practice/banishing",
    response_model=list[BanishingRead],
    tags=["practice"],
)
async def list_banishings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    method: BanishingMethodLiteral | None = None,
    limit: int = 100,
) -> list[BanishingRead]:
    stmt = select(BanishingLog).where(BanishingLog.deleted_at.is_(None))
    if method is not None:
        stmt = stmt.where(BanishingLog.method == BanishingMethod(method))
    stmt = stmt.order_by(BanishingLog.performed_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_banishing_to_read(row) for row in rows]


class BanishingCadence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    window_days: int
    total_count: int
    days_with_banishing: int
    days_with_banishing_ratio: float | None = Field(
        description="days_with_banishing / window_days; None when window is zero.",
    )


@router.get(
    "/practice/banishing/cadence",
    response_model=BanishingCadence,
    tags=["practice"],
)
async def banishing_cadence(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    window_days: int = 30,
) -> BanishingCadence:
    """Banishing frequency over the last ``window_days`` days.

    Returns total banishings + number of distinct days a banishing
    was logged. The ratio gives a daily-practice indicator without
    framing it as a "streak" (which carries gamification baggage).
    """
    if window_days <= 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "window_days must be positive.",
        )
    cutoff = datetime.now(tz=UTC) - timedelta(days=window_days)
    stmt = (
        select(BanishingLog)
        .where(BanishingLog.deleted_at.is_(None))
        .where(BanishingLog.performed_at >= cutoff)
    )
    if current_user is not None:
        stmt = stmt.where(BanishingLog.owner_id == current_user.id)
    rows = (await db.execute(stmt)).scalars().all()

    total = len(rows)
    days_set = {row.performed_at.date() for row in rows}
    ratio = len(days_set) / window_days if window_days > 0 else None
    return BanishingCadence(
        window_days=window_days,
        total_count=total,
        days_with_banishing=len(days_set),
        days_with_banishing_ratio=ratio,
    )


@router.get(
    "/practice/banishing/{log_id}",
    response_model=BanishingRead,
    tags=["practice"],
)
async def get_banishing(
    log_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> BanishingRead:
    row = await db.get(BanishingLog, log_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banishing log not found.")
    return _banishing_to_read(row)


@router.patch(
    "/practice/banishing/{log_id}",
    response_model=BanishingRead,
    tags=["practice"],
)
async def update_banishing(
    log_id: UUID,
    payload: BanishingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> BanishingRead:
    row = await db.get(BanishingLog, log_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banishing log not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _banishing_to_read(row)


@router.delete(
    "/practice/banishing/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["practice"],
)
async def delete_banishing(
    log_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    row = await db.get(BanishingLog, log_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Banishing log not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
