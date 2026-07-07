"""Geomancy HTTP endpoints.

``GET    /api/v1/geomancy/figures``           — list all 16 figures + metadata
``GET    /api/v1/geomancy/figures/{name}``    — fetch one (Latin canonical name)
``POST   /api/v1/geomancy/cast``              — deterministic cast (engine + persisted reading)
``POST   /api/v1/geomancy/cast/manual``       — cast from caller-supplied mother figures
``GET    /api/v1/geomancy/readings``          — list readings
``GET    /api/v1/geomancy/readings/{id}``     — fetch reading + rederived chart
``PATCH  /api/v1/geomancy/readings/{id}``     — update interpretation / retrospective
``DELETE /api/v1/geomancy/readings/{id}``     — soft delete

Per ``plan/06-divination-and-practice.md`` §3.
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
from theourgia.core.divination.geomancy import (
    Chart,
    Figure,
    FigureName,
    figure_by_name,
    geomancy_cast,
)
from theourgia.core.divination.geomancy.bundles import (
    BUILTIN_FIGURES,
    BuiltinFigure,
    figure_metadata,
)
from theourgia.core.divination.geomancy.engine import (
    HOUSE_MEANINGS,
    _build_chart,  # noqa: PLC2701 — internal use for manual cast
)
from theourgia.core.divination.tarot.engine import make_seed
from theourgia.models.geomancy import GeomancyMethod, GeomancyReading

__all__ = ["router"]

router = APIRouter()


FigureNameLiteral = Literal[
    "via", "cauda_draconis", "puer", "fortuna_minor",
    "puella", "amissio", "carcer", "laetitia",
    "caput_draconis", "conjunctio", "acquisitio", "rubeus",
    "fortuna_major", "albus", "tristitia", "populus",
]
MethodLiteral = Literal["dots", "rng", "manual"]


# ───── Figure catalog ────────────────────────────────────────────────


class FigureRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: FigureNameLiteral
    name_english: str
    lines: list[bool] = Field(description="Top-down. True = single, False = double.")
    planet: str
    zodiac: str
    element: str
    mobility: Literal["mobile", "stable"]
    meaning: str
    correspondences: dict[str, object]


def _figure_to_read(f: BuiltinFigure) -> FigureRead:
    return FigureRead(
        name=f.name.value,
        name_english=f.name_english,
        lines=list(f.lines),
        planet=f.planet,
        zodiac=f.zodiac,
        element=f.element,
        mobility=f.mobility,  # type: ignore[arg-type]
        meaning=f.meaning,
        correspondences=dict(f.correspondences),
    )


@router.get(
    "/geomancy/figures",
    response_model=list[FigureRead],
    tags=["geomancy"],
)
async def list_figures() -> list[FigureRead]:
    return [_figure_to_read(f) for f in BUILTIN_FIGURES]


@router.get(
    "/geomancy/figures/{name}",
    response_model=FigureRead,
    tags=["geomancy"],
)
async def get_figure(name: FigureNameLiteral) -> FigureRead:
    try:
        meta = figure_metadata(name)
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Figure {name!r} not found.",
        ) from exc
    return _figure_to_read(meta)


# ───── Cast ──────────────────────────────────────────────────────────


class CastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str | None = None
    method: MethodLiteral = "rng"
    seed: str | None = None
    entry_id: UUID | None = None
    entity_id: UUID | None = None
    working_id: UUID | None = None


class ManualCastRequest(BaseModel):
    """Manual cast — caller supplies the four mother figures directly."""

    model_config = ConfigDict(extra="forbid")

    question: str | None = None
    mothers: tuple[
        FigureNameLiteral, FigureNameLiteral,
        FigureNameLiteral, FigureNameLiteral,
    ]
    entry_id: UUID | None = None
    entity_id: UUID | None = None
    working_id: UUID | None = None


class FigureRef(BaseModel):
    """Slim figure reference embedded in a reading."""

    model_config = ConfigDict(extra="forbid")

    name: FigureNameLiteral
    name_english: str
    lines: list[bool]
    planet: str
    element: str


def _figure_ref(figure: Figure) -> FigureRef:
    meta = figure_metadata(figure.name)
    return FigureRef(
        name=figure.name.value,
        name_english=meta.name_english,
        lines=list(figure.lines),
        planet=meta.planet,
        element=meta.element,
    )


class HouseRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    house: int
    meaning: str
    figure: FigureRef


def _house_to_read(house: int, figure: Figure) -> HouseRead:
    return HouseRead(
        house=house,
        meaning=HOUSE_MEANINGS[house - 1],
        figure=_figure_ref(figure),
    )


class ChartRead(BaseModel):
    """The full rederived shield."""

    model_config = ConfigDict(extra="forbid")

    mothers: list[FigureRef]
    daughters: list[FigureRef]
    nieces: list[FigureRef]
    right_witness: FigureRef
    left_witness: FigureRef
    judge: FigureRef
    reconciler: FigureRef
    houses: list[HouseRead]


def _chart_to_read(chart: Chart) -> ChartRead:
    return ChartRead(
        mothers=[_figure_ref(m) for m in chart.mothers],
        daughters=[_figure_ref(d) for d in chart.daughters],
        nieces=[_figure_ref(n) for n in chart.nieces],
        right_witness=_figure_ref(chart.right_witness),
        left_witness=_figure_ref(chart.left_witness),
        judge=_figure_ref(chart.judge),
        reconciler=_figure_ref(chart.reconciler),
        houses=[
            _house_to_read(h.house, figure_by_name(h.figure_name))
            for h in chart.houses
        ],
    )


class ReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    question: str | None
    method: MethodLiteral
    seed: str
    drawn_at: datetime
    chart: ChartRead
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


def _reading_to_read(row: GeomancyReading, chart: Chart) -> ReadingRead:
    return ReadingRead(
        id=str(row.id),
        question=row.question,
        method=row.method.value,
        seed=row.seed,
        drawn_at=row.drawn_at,
        chart=_chart_to_read(chart),
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


def _rederive_chart(row: GeomancyReading) -> Chart:
    """Rebuild the chart from the persisted row.

    For ``rng`` / ``dots`` methods the seed reproduces the four
    mothers and thus the chart. For ``manual`` casts the four
    mothers are stored verbatim, and we rebuild via ``_build_chart``.
    """
    if row.method == GeomancyMethod.MANUAL:
        mothers = tuple(figure_by_name(name) for name in row.mothers)
        return _build_chart(mothers)  # type: ignore[arg-type]
    return geomancy_cast(row.seed)


@router.post(
    "/geomancy/cast",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["geomancy"],
)
async def cast(
    payload: CastRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    if payload.method == "manual":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Use /geomancy/cast/manual for manually-supplied mothers.",
        )
    now = datetime.now(tz=UTC)
    seed = payload.seed or make_seed(
        now.isoformat(), payload.question or "", uuid4().hex,
    )
    chart = geomancy_cast(seed)

    row = GeomancyReading(
        question=payload.question,
        method=GeomancyMethod(payload.method),
        seed=seed,
        drawn_at=now,
        mothers=[m.name.value for m in chart.mothers],
        judge_figure=chart.judge.name.value,
        entry_id=payload.entry_id,
        entity_id=payload.entity_id,
        working_id=payload.working_id,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _reading_to_read(row, chart)


@router.post(
    "/geomancy/cast/manual",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["geomancy"],
)
async def cast_manual(
    payload: ManualCastRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    now = datetime.now(tz=UTC)
    mothers = tuple(figure_by_name(name) for name in payload.mothers)
    chart = _build_chart(mothers)  # type: ignore[arg-type]
    # For manual casts the "seed" field carries a stable label
    # derived from the mother names — purely informational.
    seed = "manual:" + ",".join(payload.mothers)

    row = GeomancyReading(
        question=payload.question,
        method=GeomancyMethod.MANUAL,
        seed=seed,
        drawn_at=now,
        mothers=list(payload.mothers),
        judge_figure=chart.judge.name.value,
        entry_id=payload.entry_id,
        entity_id=payload.entity_id,
        working_id=payload.working_id,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _reading_to_read(row, chart)


@router.get(
    "/geomancy/readings",
    response_model=list[ReadingRead],
    tags=["geomancy"],
)
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    judge: FigureNameLiteral | None = None,
    entity_id: UUID | None = None,
    limit: int = 100,
) -> list[ReadingRead]:
    stmt = select(GeomancyReading).where(
        GeomancyReading.deleted_at.is_(None),
        GeomancyReading.owner_id == current_user.id,
    )
    if judge is not None:
        stmt = stmt.where(GeomancyReading.judge_figure == judge)
    if entity_id is not None:
        stmt = stmt.where(GeomancyReading.entity_id == entity_id)
    stmt = stmt.order_by(GeomancyReading.drawn_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_reading_to_read(row, _rederive_chart(row)) for row in rows]


@router.get(
    "/geomancy/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["geomancy"],
)
async def get_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(GeomancyReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    return _reading_to_read(row, _rederive_chart(row))


@router.patch(
    "/geomancy/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["geomancy"],
)
async def update_reading(
    reading_id: UUID,
    payload: ReadingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(GeomancyReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _reading_to_read(row, _rederive_chart(row))


@router.delete(
    "/geomancy/readings/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["geomancy"],
)
async def delete_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(GeomancyReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
