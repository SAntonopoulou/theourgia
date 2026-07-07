"""Runes HTTP endpoints.

``GET    /api/v1/runes/sets``                    — list bundled rune sets
``GET    /api/v1/runes/sets/{set_id}``           — fetch one set + all its runes
``POST   /api/v1/runes/cast``                    — deterministic cast
``GET    /api/v1/runes/readings``                — list readings
``GET    /api/v1/runes/readings/{id}``           — fetch one
``PATCH  /api/v1/runes/readings/{id}``           — update interpretation / retrospective
``DELETE /api/v1/runes/readings/{id}``           — soft delete

Built-in spreads (single, three_rune, nine_rune_wyrd) are exposed
as ``GET /api/v1/runes/spreads`` for the frontend; the engine
treats every spread as a position count, so there's no separate
table.

Per ``plan/06-divination-and-practice.md`` §4.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Final, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.divination.runes import (
    DrawnRune,
    RuneOrientation,
    RuneSet,
    runes_cast,
)
from theourgia.core.divination.runes.bundles import (
    BUILTIN_RUNE_SETS,
    BuiltinRune,
    BuiltinRuneSet,
    runeset_by_value,
)
from theourgia.core.divination.tarot.engine import make_seed
from theourgia.models.runes import RuneReading
from theourgia.models.runes import RuneSet as RuneSetModel

__all__ = ["router"]

router = APIRouter()


RuneSetLiteral = Literal[
    "elder_futhark", "younger_futhark", "anglo_saxon_futhorc",
    "armanen", "northumbrian",
]
SpreadLiteral = Literal["single", "three_rune", "nine_rune_wyrd"]
OrientationLiteral = Literal["upright", "reversed"]


# Built-in spread positions. Each is a tuple of dicts that mirrors
# the Tarot spread shape.
_BUILTIN_SPREADS: Final[dict[str, tuple[dict[str, object], ...]]] = {
    "single": (
        {"index": 0, "name": "The Rune", "meaning": "The question at hand."},
    ),
    "three_rune": (
        {"index": 0, "name": "Past", "meaning": "What has been."},
        {"index": 1, "name": "Present", "meaning": "What is now."},
        {"index": 2, "name": "Future", "meaning": "What is forming."},
    ),
    "nine_rune_wyrd": tuple(
        {
            "index": i,
            "name": f"Position {i + 1}",
            "meaning": (
                "Past / urd, present / verdandi, future / skuld" if i < 3 else
                "Self / family / influence" if i < 6 else
                "Hopes / fears / outcome"
            ),
        }
        for i in range(9)
    ),
}


# ───── Rune sets catalog ─────────────────────────────────────────────


class RuneRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    index: int
    name: str
    transliteration: str
    glyph: str
    aett: int
    element: str
    symmetric: bool
    upright_meaning: str
    reversed_meaning: str
    correspondences: dict[str, object]


def _rune_to_read(r: BuiltinRune) -> RuneRead:
    return RuneRead(
        index=r.index,
        name=r.name,
        transliteration=r.transliteration,
        glyph=r.glyph,
        aett=r.aett,
        element=r.element,
        symmetric=r.symmetric,
        upright_meaning=r.upright_meaning,
        reversed_meaning=r.reversed_meaning,
        correspondences=dict(r.correspondences),
    )


class RuneSetRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    set_id: RuneSetLiteral
    name: str
    description: str
    size: int


class RuneSetDetail(RuneSetRead):
    runes: list[RuneRead]


def _set_summary(s: BuiltinRuneSet) -> RuneSetRead:
    return RuneSetRead(
        set_id=s.set_id.value,
        name=s.name,
        description=s.description,
        size=s.size,
    )


@router.get("/runes/sets", response_model=list[RuneSetRead], tags=["runes"])
async def list_sets() -> list[RuneSetRead]:
    return [_set_summary(s) for s in BUILTIN_RUNE_SETS]


@router.get(
    "/runes/sets/{set_id}",
    response_model=RuneSetDetail,
    tags=["runes"],
)
async def get_set(set_id: RuneSetLiteral) -> RuneSetDetail:
    try:
        s = runeset_by_value(set_id)
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Rune set {set_id!r} not bundled.",
        ) from exc
    return RuneSetDetail(
        **_set_summary(s).model_dump(),
        runes=[_rune_to_read(r) for r in s.runes],
    )


# ───── Built-in spreads ──────────────────────────────────────────────


class SpreadRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: SpreadLiteral
    positions: list[dict[str, object]]
    position_count: int


@router.get("/runes/spreads", response_model=list[SpreadRead], tags=["runes"])
async def list_spreads() -> list[SpreadRead]:
    return [
        SpreadRead(
            slug=slug,  # type: ignore[arg-type]
            positions=list(positions),
            position_count=len(positions),
        )
        for slug, positions in _BUILTIN_SPREADS.items()
    ]


# ───── Cast ──────────────────────────────────────────────────────────


class CastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rune_set: RuneSetLiteral = "elder_futhark"
    spread: SpreadLiteral = "three_rune"
    question: str | None = None
    seed: str | None = None
    allow_reversals: bool = True
    entry_id: UUID | None = None
    entity_id: UUID | None = None
    working_id: UUID | None = None


class DrawnRuneRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    position_index: int
    rune_index: int
    orientation: OrientationLiteral
    rune: RuneRead | None = None
    spread_position: dict[str, object] | None = None


class ReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    rune_set: RuneSetLiteral
    spread: str
    question: str | None
    seed: str
    drawn_at: datetime
    drawn_runes: list[DrawnRuneRead]
    interpretation: str | None
    retrospective_rating: int | None
    retrospective_notes: str | None
    entry_id: str | None
    entity_id: str | None
    working_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class ReadingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    interpretation: str | None = None
    retrospective_rating: int | None = Field(default=None, ge=1, le=5)
    retrospective_notes: str | None = None
    entry_id: UUID | None = None
    entity_id: UUID | None = None
    working_id: UUID | None = None


def _expand_drawn(
    drawn: list[DrawnRune],
    runes_by_index: dict[int, BuiltinRune],
    spread_positions: tuple[dict[str, object], ...],
) -> list[DrawnRuneRead]:
    pos_by_index = {int(p.get("index", -1)): p for p in spread_positions}
    out: list[DrawnRuneRead] = []
    for d in drawn:
        out.append(
            DrawnRuneRead(
                position_index=d.position_index,
                rune_index=d.rune_index,
                orientation=d.orientation.value,  # type: ignore[arg-type]
                rune=_rune_to_read(runes_by_index[d.rune_index]),
                spread_position=pos_by_index.get(d.position_index),
            )
        )
    return out


def _reading_to_read(
    row: RuneReading,
    drawn_payload: list[DrawnRuneRead],
) -> ReadingRead:
    return ReadingRead(
        id=str(row.id),
        rune_set=row.rune_set.value,
        spread=row.spread_name,
        question=row.question,
        seed=row.seed,
        drawn_at=row.drawn_at,
        drawn_runes=drawn_payload,
        interpretation=row.interpretation,
        retrospective_rating=row.retrospective_rating,
        retrospective_notes=row.retrospective_notes,
        entry_id=str(row.entry_id) if row.entry_id else None,
        entity_id=str(row.entity_id) if row.entity_id else None,
        working_id=str(row.working_id) if row.working_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _expand_persisted(
    row: RuneReading,
    bundled_set: BuiltinRuneSet,
) -> list[DrawnRuneRead]:
    runes_by_index = {r.index: r for r in bundled_set.runes}
    spread_positions = _BUILTIN_SPREADS.get(row.spread_name, ())
    pos_by_index = {int(p.get("index", -1)): p for p in spread_positions}
    out: list[DrawnRuneRead] = []
    for entry in row.drawn_runes or []:
        rune_idx = int(entry.get("rune_index", -1))
        out.append(
            DrawnRuneRead(
                position_index=int(entry.get("position_index", -1)),
                rune_index=rune_idx,
                orientation=str(entry.get("orientation", "upright")),  # type: ignore[arg-type]
                rune=(
                    _rune_to_read(runes_by_index[rune_idx])
                    if rune_idx in runes_by_index
                    else None
                ),
                spread_position=pos_by_index.get(int(entry.get("position_index", -1))),
            )
        )
    return out


def _materialise_drawn(drawn: list[DrawnRune]) -> list[dict[str, object]]:
    return [
        {
            "position_index": d.position_index,
            "rune_index": d.rune_index,
            "orientation": d.orientation.value,
        }
        for d in drawn
    ]


@router.post(
    "/runes/cast",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["runes"],
)
async def cast(
    payload: CastRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    try:
        bundled_set = runeset_by_value(payload.rune_set)
    except KeyError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Rune set {payload.rune_set!r} is not bundled.",
        ) from exc

    spread_positions = _BUILTIN_SPREADS.get(payload.spread)
    if spread_positions is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown spread {payload.spread!r}.",
        )

    now = datetime.now(tz=UTC)
    seed = payload.seed or make_seed(
        now.isoformat(), payload.question or "", uuid4().hex,
    )

    drawn = runes_cast(
        set_size=bundled_set.size,
        position_count=len(spread_positions),
        seed=seed,
        reversible_flags=bundled_set.reversible_flags,
        allow_reversals=payload.allow_reversals,
    )

    row = RuneReading(
        question=payload.question,
        rune_set=RuneSetModel(payload.rune_set),
        spread_name=payload.spread,
        position_count=len(spread_positions),
        seed=seed,
        drawn_at=now,
        drawn_runes=_materialise_drawn(drawn),
        entry_id=payload.entry_id,
        entity_id=payload.entity_id,
        working_id=payload.working_id,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    runes_by_index = {r.index: r for r in bundled_set.runes}
    return _reading_to_read(
        row, _expand_drawn(drawn, runes_by_index, spread_positions),
    )


@router.get("/runes/readings", response_model=list[ReadingRead], tags=["runes"])
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    rune_set: RuneSetLiteral | None = None,
    limit: int = 100,
) -> list[ReadingRead]:
    stmt = select(RuneReading).where(
        RuneReading.deleted_at.is_(None),
        RuneReading.owner_id == current_user.id,
    )
    if rune_set is not None:
        stmt = stmt.where(RuneReading.rune_set == RuneSetModel(rune_set))
    stmt = stmt.order_by(RuneReading.drawn_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    out: list[ReadingRead] = []
    for row in rows:
        try:
            bundled_set = runeset_by_value(row.rune_set)
        except KeyError:
            continue  # Defensive — skip rows whose set isn't bundled.
        out.append(_reading_to_read(row, _expand_persisted(row, bundled_set)))
    return out


@router.get(
    "/runes/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["runes"],
)
async def get_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(RuneReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    bundled_set = runeset_by_value(row.rune_set)
    return _reading_to_read(row, _expand_persisted(row, bundled_set))


@router.patch(
    "/runes/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["runes"],
)
async def update_reading(
    reading_id: UUID,
    payload: ReadingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(RuneReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    bundled_set = runeset_by_value(row.rune_set)
    return _reading_to_read(row, _expand_persisted(row, bundled_set))


@router.delete(
    "/runes/readings/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["runes"],
)
async def delete_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(RuneReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
