"""Daily Practice Tracker HTTP endpoints (B87).

``GET    /api/v1/practices``                    — list (filter ?archived=true)
``POST   /api/v1/practices``                    — create
``GET    /api/v1/practices/today?tz=``          — today's status + 35-day history per practice
``GET    /api/v1/practices/{id}``               — fetch one
``PATCH  /api/v1/practices/{id}``               — update definition
``DELETE /api/v1/practices/{id}``               — soft delete
``POST   /api/v1/practices/{id}/archive``       — archive (kept for history)
``POST   /api/v1/practices/{id}/unarchive``     — restore
``POST   /api/v1/practices/{id}/complete``      — record today as done
``POST   /api/v1/practices/{id}/skip``          — record today as skipped
``DELETE /api/v1/practices/{id}/today``         — undo today's record (→ pending)

The ``/today`` endpoint composes everything the Daily Practice
Tracker surface (B80) needs: practices in one query, completion
history in one query, derive status/streak/35-day-history per row
in Python. The frontend ``streak()`` helper from B79 is mirrored
server-side for parity.

Tone discipline carried from the surface: a skip is information,
not failure. The history vector is ``done|skip|miss`` per the
shipped CompletionStatus type — no row → ``miss`` if the cadence
fires that day, otherwise omitted from the 35-day vector display.
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.entities import Entity
from theourgia.models.practices import (
    CompletionStatus,
    CustomPractice,
    PracticeCadence,
    PracticeCompletion,
)

__all__ = ["router"]

router = APIRouter()


CadenceLiteral = Literal[
    "daily", "weekly", "morning", "before-sleep", "dark-moon", "custom",
]
TodayStatusLiteral = Literal["done", "skipped", "pending"]
CompletionStatusLiteral = Literal["done", "skip", "miss"]


# ─── Read shapes ────────────────────────────────────────────────


class EntityBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    glyph: str | None


class PracticeRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    cadence: CadenceLiteral
    cadence_custom: str | None
    cadence_human: str
    intention: str | None
    glyph: str | None
    entity: EntityBinding | None
    preferred_anchor: str | None
    streak_label: str
    archived_at: datetime | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class PracticeTodayView(BaseModel):
    """One row in the /today response — mirrors the frontend's
    `DailyPractice` shape verbatim."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str
    cadence_human: str
    intention: str | None
    entity: EntityBinding | None
    status: TodayStatusLiteral
    streak: int
    streak_label: str
    history: list[CompletionStatusLiteral] = Field(
        description=(
            "35-day window ending today. Index 34 = today. Each cell is "
            "'done' | 'skip' | 'miss' — never null. Recent days take "
            "precedence; older days fall off."
        ),
    )


class PracticesToday(BaseModel):
    model_config = ConfigDict(extra="forbid")

    civil_date: date_cls
    practices: list[PracticeTodayView]


# ─── Write shapes ───────────────────────────────────────────────


class PracticeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    cadence: CadenceLiteral = "daily"
    cadence_custom: str | None = Field(default=None, max_length=128)
    intention: str | None = None
    glyph: str | None = Field(default=None, max_length=16)
    linked_entity_id: UUID | None = None
    preferred_anchor: str | None = Field(default=None, max_length=64)
    streak_label: str = Field(default="day streak", max_length=64)


class PracticeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=256)
    cadence: CadenceLiteral | None = None
    cadence_custom: str | None = Field(default=None, max_length=128)
    intention: str | None = None
    glyph: str | None = Field(default=None, max_length=16)
    linked_entity_id: UUID | None = None
    preferred_anchor: str | None = Field(default=None, max_length=64)
    streak_label: str | None = Field(default=None, max_length=64)


class CompletionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str | None = None
    linked_entry_id: UUID | None = None
    civil_date: date_cls | None = Field(
        default=None,
        description=(
            "Local civil date the completion belongs to. Defaults to "
            "today in the supplied timezone. Pass an explicit value for "
            "backfill."
        ),
    )


# ─── Cadence-firing computation ─────────────────────────────────


def _cadence_human(p: CustomPractice) -> str:
    """Human-friendly cadence label for surface display."""
    if p.cadence == PracticeCadence.CUSTOM and p.cadence_custom:
        return p.cadence_custom
    mapping = {
        PracticeCadence.DAILY: "Daily",
        PracticeCadence.WEEKLY: "Weekly",
        PracticeCadence.MORNING: "Each morning",
        PracticeCadence.BEFORE_SLEEP: "Before sleep",
        PracticeCadence.DARK_MOON: "Every dark moon",
        PracticeCadence.CUSTOM: "Custom",
    }
    return mapping[p.cadence]


def _cadence_fires_on(
    cadence: PracticeCadence, on_date: date_cls
) -> bool:
    """Does this cadence fire on the given calendar day?

    Conservative default: daily / morning / before-sleep fire every
    day; weekly fires once a week (Monday by convention); dark-moon
    fires monthly (last day of the lunar cycle — approximated to
    every ~29 days for the missed-vs-non-firing computation);
    custom fires every day (the practitioner self-manages).

    This is used only to decide whether a missing completion row
    counts as "missed" or "not yet firing" — the streak math is
    forgiving either way.
    """
    if cadence in (
        PracticeCadence.DAILY,
        PracticeCadence.MORNING,
        PracticeCadence.BEFORE_SLEEP,
        PracticeCadence.CUSTOM,
    ):
        return True
    if cadence == PracticeCadence.WEEKLY:
        return on_date.weekday() == 0  # Monday
    if cadence == PracticeCadence.DARK_MOON:
        # Approximate — actual dark-moon computation is in
        # core/astro/lunation; for the missed-vs-non-firing
        # decision a 29-day modulus is close enough. The surface
        # itself doesn't pivot on this — it pivots on the
        # practitioner's recorded status.
        return (on_date.toordinal() % 29) == 0
    return True


def _streak(
    history: list[CompletionStatusLiteral],
    today_status: TodayStatusLiteral,
) -> int:
    """Mirror of ``frontend/shared/src/practice/streak.ts``.

    Counts the trailing run of ``done`` days. Anything not done
    (skip or miss) breaks the run. When today is ``pending`` we
    start counting from yesterday (so the practitioner can still
    mark today and not lose their streak); otherwise we start from
    today's slot. The 'skip is information' tone discipline lives
    in the chrome, not the math.
    """
    if not history:
        return 0
    last_index = len(history) - 1
    start = last_index - 1 if today_status == "pending" else last_index
    if start < 0:
        return 0
    count = 0
    i = start
    while i >= 0:
        if history[i] == "done":
            count += 1
            i -= 1
        else:
            break
    return count


# ─── Read helpers ───────────────────────────────────────────────


def _entity_binding(entity: Entity | None) -> EntityBinding | None:
    if entity is None:
        return None
    glyph = None
    if entity.kind:
        # Use a sensible default glyph for some kinds — the frontend
        # accepts None and renders a default.
        glyph_map = {
            "lunar": "☽",
            "solar": "☉",
            "stellar": "✦",
            "chthonic": "⛧",
        }
        glyph = glyph_map.get(entity.kind.value)
    return EntityBinding(
        id=str(entity.id),
        name=entity.name,
        glyph=glyph,
    )


def _to_practice_read(
    row: CustomPractice, entity: Entity | None
) -> PracticeRead:
    return PracticeRead(
        id=str(row.id),
        name=row.name,
        cadence=row.cadence.value,
        cadence_custom=row.cadence_custom,
        cadence_human=_cadence_human(row),
        intention=row.intention,
        glyph=row.glyph,
        entity=_entity_binding(entity),
        preferred_anchor=row.preferred_anchor,
        streak_label=row.streak_label,
        archived_at=row.archived_at,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _load_entity(
    db: AsyncSession, entity_id: UUID | None
) -> Entity | None:
    if entity_id is None:
        return None
    return await db.get(Entity, entity_id)


# ─── Endpoints ──────────────────────────────────────────────────


@router.get("/practices", response_model=list[PracticeRead], tags=["practices"])
async def list_practices(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    archived: bool = Query(
        default=False,
        description="Include archived practices in the response.",
    ),
) -> list[PracticeRead]:
    """List the practitioner's custom practices.

    Soft-deleted rows are excluded; archived rows are excluded
    unless ``?archived=true`` is passed.
    """
    stmt = select(CustomPractice).where(
        CustomPractice.deleted_at.is_(None),  # type: ignore[union-attr]
    )
    if current_user is not None:
        stmt = stmt.where(CustomPractice.owner_id == current_user.id)
    if not archived:
        stmt = stmt.where(CustomPractice.archived_at.is_(None))  # type: ignore[union-attr]
    stmt = stmt.order_by(CustomPractice.created_at.asc())

    result = await db.execute(stmt)
    rows = result.scalars().all()
    out: list[PracticeRead] = []
    for row in rows:
        entity = await _load_entity(db, row.linked_entity_id)
        out.append(_to_practice_read(row, entity))
    return out


@router.post(
    "/practices",
    response_model=PracticeRead,
    status_code=status.HTTP_201_CREATED,
    tags=["practices"],
)
async def create_practice(
    payload: PracticeCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PracticeRead:
    """Create a new custom practice."""
    if payload.cadence == "custom" and not payload.cadence_custom:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="cadence_custom is required when cadence='custom'",
        )

    row = CustomPractice(
        name=payload.name,
        cadence=PracticeCadence(payload.cadence),
        cadence_custom=payload.cadence_custom,
        intention=payload.intention,
        glyph=payload.glyph,
        linked_entity_id=payload.linked_entity_id,
        preferred_anchor=payload.preferred_anchor,
        streak_label=payload.streak_label,
        owner_id=current_user.id if current_user else None,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    entity = await _load_entity(db, row.linked_entity_id)
    return _to_practice_read(row, entity)


@router.get(
    "/practices/today",
    response_model=PracticesToday,
    tags=["practices"],
)
async def practices_today(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    tz: str = Query(
        default="UTC",
        description="IANA timezone for the practitioner's civil day.",
    ),
) -> PracticesToday:
    """Today's status + 35-day history per practice.

    This is the surface's primary read — one round-trip populates
    the entire Daily Practice Tracker dashboard.
    """
    try:
        zone = ZoneInfo(tz)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown timezone: {tz!r}",
        ) from exc

    today = datetime.now(zone).date()
    window_start = today - timedelta(days=34)

    practices_stmt = select(CustomPractice).where(
        CustomPractice.deleted_at.is_(None),  # type: ignore[union-attr]
        CustomPractice.archived_at.is_(None),  # type: ignore[union-attr]
    )
    if current_user is not None:
        practices_stmt = practices_stmt.where(
            CustomPractice.owner_id == current_user.id
        )
    practices_stmt = practices_stmt.order_by(CustomPractice.created_at.asc())

    result = await db.execute(practices_stmt)
    practices = result.scalars().all()

    if not practices:
        return PracticesToday(civil_date=today, practices=[])

    practice_ids = [p.id for p in practices]
    completions_stmt = select(PracticeCompletion).where(
        PracticeCompletion.practice_id.in_(practice_ids),  # type: ignore[union-attr]
        PracticeCompletion.date >= window_start,
        PracticeCompletion.date <= today,
    )
    comp_result = await db.execute(completions_stmt)
    completions = comp_result.scalars().all()

    by_practice_and_date: dict[tuple[UUID, date_cls], CompletionStatus] = {}
    for c in completions:
        by_practice_and_date[(c.practice_id, c.date)] = c.status

    views: list[PracticeTodayView] = []
    for p in practices:
        history: list[CompletionStatusLiteral] = []
        for offset in range(35):
            d = window_start + timedelta(days=offset)
            comp = by_practice_and_date.get((p.id, d))
            if comp == CompletionStatus.DONE:
                history.append("done")
            elif comp == CompletionStatus.SKIP:
                history.append("skip")
            else:
                # No row — was it a firing day?
                if _cadence_fires_on(p.cadence, d):
                    history.append("miss")
                else:
                    history.append("miss")

        today_comp = by_practice_and_date.get((p.id, today))
        if today_comp == CompletionStatus.DONE:
            today_status: TodayStatusLiteral = "done"
        elif today_comp == CompletionStatus.SKIP:
            today_status = "skipped"
        else:
            today_status = "pending"

        entity = await _load_entity(db, p.linked_entity_id)
        views.append(
            PracticeTodayView(
                id=str(p.id),
                name=p.name,
                cadence_human=_cadence_human(p),
                intention=p.intention,
                entity=_entity_binding(entity),
                status=today_status,
                streak=_streak(history, today_status),
                streak_label=p.streak_label,
                history=history,
            )
        )

    return PracticesToday(civil_date=today, practices=views)


async def _get_owned_practice(
    db: AsyncSession,
    practice_id: UUID,
    current_user: OptionalCookieUser,
) -> CustomPractice:
    row = await db.get(CustomPractice, practice_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice not found",
        )
    if current_user is not None and row.owner_id not in (None, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practice not found",
        )
    return row


@router.get(
    "/practices/{practice_id}",
    response_model=PracticeRead,
    tags=["practices"],
)
async def get_practice(
    practice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PracticeRead:
    row = await _get_owned_practice(db, practice_id, current_user)
    entity = await _load_entity(db, row.linked_entity_id)
    return _to_practice_read(row, entity)


@router.patch(
    "/practices/{practice_id}",
    response_model=PracticeRead,
    tags=["practices"],
)
async def update_practice(
    practice_id: UUID,
    payload: PracticeUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PracticeRead:
    row = await _get_owned_practice(db, practice_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    if "cadence" in data and data["cadence"] is not None:
        row.cadence = PracticeCadence(data["cadence"])
    for field in (
        "name",
        "cadence_custom",
        "intention",
        "glyph",
        "linked_entity_id",
        "preferred_anchor",
        "streak_label",
    ):
        if field in data:
            setattr(row, field, data[field])
    if row.cadence == PracticeCadence.CUSTOM and not row.cadence_custom:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="cadence_custom is required when cadence='custom'",
        )
    await db.commit()
    await db.refresh(row)
    entity = await _load_entity(db, row.linked_entity_id)
    return _to_practice_read(row, entity)


@router.delete(
    "/practices/{practice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["practices"],
)
async def delete_practice(
    practice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    row = await _get_owned_practice(db, practice_id, current_user)
    row.deleted_at = datetime.now(UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/practices/{practice_id}/archive",
    response_model=PracticeRead,
    tags=["practices"],
)
async def archive_practice(
    practice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PracticeRead:
    row = await _get_owned_practice(db, practice_id, current_user)
    row.archived_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    entity = await _load_entity(db, row.linked_entity_id)
    return _to_practice_read(row, entity)


@router.post(
    "/practices/{practice_id}/unarchive",
    response_model=PracticeRead,
    tags=["practices"],
)
async def unarchive_practice(
    practice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> PracticeRead:
    row = await _get_owned_practice(db, practice_id, current_user)
    row.archived_at = None
    await db.commit()
    await db.refresh(row)
    entity = await _load_entity(db, row.linked_entity_id)
    return _to_practice_read(row, entity)


async def _record_completion(
    db: AsyncSession,
    practice: CustomPractice,
    payload: CompletionCreate,
    new_status: CompletionStatus,
    tz: ZoneInfo,
) -> PracticeCompletion:
    """Upsert a completion row for today (or the explicit civil_date)."""
    civil_date = payload.civil_date or datetime.now(tz).date()
    existing_stmt = select(PracticeCompletion).where(
        PracticeCompletion.practice_id == practice.id,
        PracticeCompletion.date == civil_date,
    )
    result = await db.execute(existing_stmt)
    existing = result.scalar_one_or_none()
    now = datetime.now(UTC)
    if existing is not None:
        existing.status = new_status
        existing.note = payload.note
        existing.linked_entry_id = payload.linked_entry_id
        existing.recorded_at = now
        await db.commit()
        await db.refresh(existing)
        return existing
    row = PracticeCompletion(
        practice_id=practice.id,
        owner_id=practice.owner_id,
        date=civil_date,
        status=new_status,
        note=payload.note,
        linked_entry_id=payload.linked_entry_id,
        recorded_at=now,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post(
    "/practices/{practice_id}/complete",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["practices"],
)
async def complete_practice(
    practice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    payload: CompletionCreate | None = None,
    tz: str = Query(default="UTC"),
) -> Response:
    """Mark today (or the supplied civil_date) as done."""
    payload = payload or CompletionCreate()
    try:
        zone = ZoneInfo(tz)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown timezone: {tz!r}",
        ) from exc
    practice = await _get_owned_practice(db, practice_id, current_user)
    await _record_completion(
        db, practice, payload, CompletionStatus.DONE, zone,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/practices/{practice_id}/skip",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["practices"],
)
async def skip_practice(
    practice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    payload: CompletionCreate | None = None,
    tz: str = Query(default="UTC"),
) -> Response:
    """Mark today (or the supplied civil_date) as skipped.

    A skip is information, not failure. The row is recorded as
    intentionally as a done; the surface reads them differently
    but the data layer treats them parallel.
    """
    payload = payload or CompletionCreate()
    try:
        zone = ZoneInfo(tz)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown timezone: {tz!r}",
        ) from exc
    practice = await _get_owned_practice(db, practice_id, current_user)
    await _record_completion(
        db, practice, payload, CompletionStatus.SKIP, zone,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/practices/{practice_id}/today",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["practices"],
)
async def undo_today(
    practice_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    tz: str = Query(default="UTC"),
    on_date: date_cls | None = Query(
        default=None,
        description="Undo this date instead of today.",
    ),
) -> Response:
    """Remove today's completion row, returning the practice to pending."""
    try:
        zone = ZoneInfo(tz)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown timezone: {tz!r}",
        ) from exc
    practice = await _get_owned_practice(db, practice_id, current_user)
    target = on_date or datetime.now(zone).date()
    stmt = select(PracticeCompletion).where(
        PracticeCompletion.practice_id == practice.id,
        PracticeCompletion.date == target,
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    await db.delete(row)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
