"""I Ching HTTP endpoints.

``GET    /api/v1/iching/hexagrams``              — list all 64 hexagrams (cached read)
``GET    /api/v1/iching/hexagrams/{number}``     — fetch one (1..64)
``POST   /api/v1/iching/cast``                   — deterministic cast (engine + persisted reading)
``GET    /api/v1/iching/readings``               — list readings
``GET    /api/v1/iching/readings/{id}``          — fetch one
``PATCH  /api/v1/iching/readings/{id}``          — update interpretation / retrospective
``DELETE /api/v1/iching/readings/{id}``          — soft delete

Per ``plan/06-divination-and-practice.md`` §2.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.divination.iching import (
    CastMethod,
    CastResult,
    iching_cast,
    lines_for_hexagram,
)
from theourgia.core.divination.iching.bundles import (
    BUILTIN_HEXAGRAMS,
    BuiltinHexagram,
    hexagram_by_number,
)
from theourgia.core.divination.tarot.engine import make_seed
from theourgia.models.iching import (
    Hexagram,
    IChingCastMethod,
    IChingReading,
    Trigram,
)

__all__ = ["router"]

router = APIRouter()


TrigramLiteral = Literal["qian", "dui", "li", "zhen", "xun", "kan", "gen", "kun"]
CastMethodLiteral = Literal["three_coins", "yarrow_stalks"]
LineKindLiteral = Literal["old_yin", "young_yang", "young_yin", "old_yang"]


# ───── Hexagram catalog ──────────────────────────────────────────────


class HexagramRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: int
    name_pinyin: str
    name_english: str
    binary_pattern: str
    lines: list[bool]
    lower_trigram: TrigramLiteral
    upper_trigram: TrigramLiteral
    judgment: str | None
    image: str | None
    line_texts: list[str]
    correspondences: dict[str, object]


def _builtin_to_read(h: BuiltinHexagram, *, db_row: Hexagram | None = None) -> HexagramRead:
    """Render a bundle hexagram (preferring DB-stored text if present)."""
    judgment = (db_row.judgment if db_row else None) or h.judgment_summary
    image = (db_row.image if db_row else None) or h.image_summary
    line_texts = list(db_row.line_texts) if (db_row and db_row.line_texts) else []
    correspondences = (
        dict(db_row.correspondences) if (db_row and db_row.correspondences) else dict(h.correspondences)
    )
    return HexagramRead(
        number=h.number,
        name_pinyin=h.name_pinyin,
        name_english=h.name_english,
        binary_pattern=h.binary_pattern,
        lines=list(h.lines),
        lower_trigram=h.lower_trigram.value,
        upper_trigram=h.upper_trigram.value,
        judgment=judgment,
        image=image,
        line_texts=line_texts,
        correspondences=correspondences,
    )


async def _load_db_hexagrams(db: AsyncSession) -> dict[int, Hexagram]:
    """Read every seeded Hexagram row keyed by King Wen number."""
    rows = (await db.execute(select(Hexagram))).scalars().all()
    return {row.number: row for row in rows}


@router.get(
    "/iching/hexagrams",
    response_model=list[HexagramRead],
    tags=["iching"],
)
async def list_hexagrams(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[HexagramRead]:
    db_rows = await _load_db_hexagrams(db)
    return [
        _builtin_to_read(h, db_row=db_rows.get(h.number))
        for h in BUILTIN_HEXAGRAMS
    ]


@router.get(
    "/iching/hexagrams/{number}",
    response_model=HexagramRead,
    tags=["iching"],
)
async def get_hexagram(
    number: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> HexagramRead:
    try:
        h = hexagram_by_number(number)
    except KeyError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Hexagram {number} not found (must be 1..64).",
        ) from exc
    # Try to pick up DB-seeded text if available.
    db_row = (
        await db.execute(select(Hexagram).where(Hexagram.number == number))
    ).scalar_one_or_none()
    return _builtin_to_read(h, db_row=db_row)


# ───── Cast ──────────────────────────────────────────────────────────


class CastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str | None = None
    method: CastMethodLiteral = "three_coins"
    seed: str | None = Field(
        default=None,
        description=(
            "Explicit seed. If omitted, derived from "
            "SHA-256(timestamp || question || uuid). Same seed + same "
            "method = same six lines."
        ),
    )
    entry_id: UUID | None = None
    entity_id: UUID | None = None
    working_id: UUID | None = None


class CastDrawnLine(BaseModel):
    model_config = ConfigDict(extra="forbid")

    index: int = Field(description="1-based, bottom-up.")
    kind: LineKindLiteral
    value: int = Field(description="6 / 7 / 8 / 9.")
    is_yang: bool
    is_changing: bool


class HexagramRef(BaseModel):
    """Slim hexagram reference embedded in a reading."""

    model_config = ConfigDict(extra="forbid")

    number: int
    name_pinyin: str
    name_english: str
    binary_pattern: str
    lower_trigram: TrigramLiteral
    upper_trigram: TrigramLiteral


def _hexagram_ref_for(number: int) -> HexagramRef:
    h = hexagram_by_number(number)
    return HexagramRef(
        number=h.number,
        name_pinyin=h.name_pinyin,
        name_english=h.name_english,
        binary_pattern=h.binary_pattern,
        lower_trigram=h.lower_trigram.value,
        upper_trigram=h.upper_trigram.value,
    )


class ReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    question: str | None
    method: CastMethodLiteral
    seed: str
    drawn_at: datetime
    lines: list[CastDrawnLine]
    primary_hexagram: HexagramRef
    transformation_hexagram: HexagramRef | None
    changing_line_indices: list[int]
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


def _materialise_lines(cast: CastResult) -> list[CastDrawnLine]:
    return [
        CastDrawnLine(
            index=i + 1,
            kind=line.value,  # type: ignore[arg-type]
            value=line.value_number,
            is_yang=line.is_yang,
            is_changing=line.is_changing,
        )
        for i, line in enumerate(cast.lines)
    ]


def _reading_to_read(row: IChingReading, cast: CastResult | None = None) -> ReadingRead:
    """Render a persisted reading. If ``cast`` is supplied (immediately
    after the engine ran) we use its line objects; otherwise we
    reconstruct LineKind values from the JSON-stored string array."""
    if cast is None:
        from theourgia.core.divination.iching.engine import LineKind

        rebuilt = tuple(LineKind(v) for v in row.lines)
        lines_payload = [
            CastDrawnLine(
                index=i + 1,
                kind=line.value,  # type: ignore[arg-type]
                value=line.value_number,
                is_yang=line.is_yang,
                is_changing=line.is_changing,
            )
            for i, line in enumerate(rebuilt)
        ]
    else:
        lines_payload = _materialise_lines(cast)

    return ReadingRead(
        id=str(row.id),
        question=row.question,
        method=row.method.value,
        seed=row.seed,
        drawn_at=row.drawn_at,
        lines=lines_payload,
        primary_hexagram=_hexagram_ref_for(row.primary_hexagram_number),
        transformation_hexagram=(
            _hexagram_ref_for(row.transformation_hexagram_number)
            if row.transformation_hexagram_number
            else None
        ),
        changing_line_indices=list(row.changing_line_indices)
        if row.changing_line_indices
        else [],
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


@router.post(
    "/iching/cast",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["iching"],
)
async def cast(
    payload: CastRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    now = datetime.now(tz=UTC)
    seed = payload.seed or make_seed(
        now.isoformat(), payload.question or "", uuid4().hex,
    )
    cast_result = iching_cast(seed=seed, method=CastMethod(payload.method))

    row = IChingReading(
        question=payload.question,
        method=IChingCastMethod(payload.method),
        seed=seed,
        drawn_at=now,
        lines=[line.value for line in cast_result.lines],
        primary_hexagram_number=cast_result.primary_hexagram,
        transformation_hexagram_number=cast_result.transformation_hexagram,
        changing_line_indices=list(cast_result.changing_lines),
        entry_id=payload.entry_id,
        entity_id=payload.entity_id,
        working_id=payload.working_id,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _reading_to_read(row, cast_result)


@router.get("/iching/readings", response_model=list[ReadingRead], tags=["iching"])
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    entity_id: UUID | None = None,
    limit: int = 100,
) -> list[ReadingRead]:
    stmt = select(IChingReading).where(
        IChingReading.deleted_at.is_(None),
        IChingReading.owner_id == current_user.id,
    )
    if entity_id is not None:
        stmt = stmt.where(IChingReading.entity_id == entity_id)
    stmt = stmt.order_by(IChingReading.drawn_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_reading_to_read(row) for row in rows]


@router.get(
    "/iching/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["iching"],
)
async def get_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(IChingReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    return _reading_to_read(row)


@router.patch(
    "/iching/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["iching"],
)
async def update_reading(
    reading_id: UUID,
    payload: ReadingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(IChingReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _reading_to_read(row)


@router.delete(
    "/iching/readings/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["iching"],
)
async def delete_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(IChingReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Verify the lookup table at import time so any bundle drift fails fast.
def _verify_bundle_against_engine() -> None:
    for h in BUILTIN_HEXAGRAMS:
        bool_lines = lines_for_hexagram(h.number)
        assert tuple(bool_lines) == h.lines, (
            f"binary pattern drift for hexagram {h.number}: "
            f"engine says {bool_lines}, bundle says {h.lines}"
        )


_verify_bundle_against_engine()
