"""Pendulum HTTP endpoints.

``POST   /api/v1/pendulum/readings``           — record a pendulum consultation
``GET    /api/v1/pendulum/readings``           — list
``GET    /api/v1/pendulum/readings/{id}``      — fetch one
``PATCH  /api/v1/pendulum/readings/{id}``      — update notes / calibration
``DELETE /api/v1/pendulum/readings/{id}``      — soft delete
``GET    /api/v1/pendulum/calibration``        — accuracy summary across calibrated reads

Pendulum is pure capture — the engine is the practitioner; the
backend records the outcome they observe.

Per ``plan/06-divination-and-practice.md`` §5.
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
from theourgia.models.divination_lite import (
    PendulumOutcome,
    PendulumReading,
)

__all__ = ["router"]

router = APIRouter()


OutcomeLiteral = Literal["yes", "no", "maybe", "no_response"]
CalibrationLiteral = Literal["correct", "incorrect", "ambiguous"]


class ReadingRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    question: str
    asked_at: datetime
    outcome: OutcomeLiteral
    confidence: int | None
    board_image_upload_id: str | None
    board_landing: dict[str, object] | None
    notes: str | None
    calibration: CalibrationLiteral | None
    calibration_at: datetime | None
    entry_id: str | None
    entity_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class ReadingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    asked_at: datetime | None = None
    outcome: OutcomeLiteral
    confidence: int | None = Field(default=None, ge=1, le=5)
    board_image_upload_id: UUID | None = None
    board_landing: dict[str, object] | None = None
    notes: str | None = None
    entry_id: UUID | None = None
    entity_id: UUID | None = None


class ReadingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confidence: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None
    calibration: CalibrationLiteral | None = None
    calibration_at: datetime | None = None
    entry_id: UUID | None = None
    entity_id: UUID | None = None


def _to_read(row: PendulumReading) -> ReadingRead:
    return ReadingRead(
        id=str(row.id),
        question=row.question,
        asked_at=row.asked_at,
        outcome=row.outcome.value,
        confidence=row.confidence,
        board_image_upload_id=(
            str(row.board_image_upload_id) if row.board_image_upload_id else None
        ),
        board_landing=dict(row.board_landing) if row.board_landing else None,
        notes=row.notes,
        calibration=row.calibration,  # type: ignore[arg-type]
        calibration_at=row.calibration_at,
        entry_id=str(row.entry_id) if row.entry_id else None,
        entity_id=str(row.entity_id) if row.entity_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "/pendulum/readings",
    response_model=ReadingRead,
    status_code=status.HTTP_201_CREATED,
    tags=["pendulum"],
)
async def create_reading(
    payload: ReadingCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = PendulumReading(
        question=payload.question,
        asked_at=payload.asked_at or datetime.now(tz=UTC),
        outcome=PendulumOutcome(payload.outcome),
        confidence=payload.confidence,
        board_image_upload_id=payload.board_image_upload_id,
        board_landing=payload.board_landing,
        notes=payload.notes,
        entry_id=payload.entry_id,
        entity_id=payload.entity_id,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/pendulum/readings",
    response_model=list[ReadingRead],
    tags=["pendulum"],
)
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    outcome: OutcomeLiteral | None = None,
    limit: int = 100,
) -> list[ReadingRead]:
    stmt = select(PendulumReading).where(
        PendulumReading.deleted_at.is_(None),
        PendulumReading.owner_id == current_user.id,
    )
    if outcome is not None:
        stmt = stmt.where(PendulumReading.outcome == PendulumOutcome(outcome))
    stmt = stmt.order_by(PendulumReading.asked_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/pendulum/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["pendulum"],
)
async def get_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(PendulumReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    return _to_read(row)


@router.patch(
    "/pendulum/readings/{reading_id}",
    response_model=ReadingRead,
    tags=["pendulum"],
)
async def update_reading(
    reading_id: UUID,
    payload: ReadingUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ReadingRead:
    row = await db.get(PendulumReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    data = payload.model_dump(exclude_unset=True)
    # When the user marks calibration but doesn't supply a timestamp,
    # default to now — the moment they verified the outcome.
    if "calibration" in data and data["calibration"] is not None:
        if "calibration_at" not in data or data["calibration_at"] is None:
            data["calibration_at"] = datetime.now(tz=UTC)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/pendulum/readings/{reading_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["pendulum"],
)
async def delete_reading(
    reading_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(PendulumReading, reading_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ───── Calibration summary ───────────────────────────────────────────


class CalibrationSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_readings: int
    calibrated_readings: int
    correct: int
    incorrect: int
    ambiguous: int
    accuracy_rate: float | None = Field(
        description=(
            "correct / (correct + incorrect). None when the denominator "
            "is zero. Ambiguous outcomes are not counted in either bucket."
        ),
    )


@router.get(
    "/pendulum/calibration",
    response_model=CalibrationSummary,
    tags=["pendulum"],
)
async def calibration_summary(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CalibrationSummary:
    """Per-user accuracy tally over all calibrated pendulum reads.

    The user marks each reading correct / incorrect / ambiguous when
    they can verify the outcome against reality; the summary tallies
    them so the user gets a sense of their personal calibration.
    """
    stmt = select(PendulumReading).where(
        PendulumReading.deleted_at.is_(None),
        PendulumReading.owner_id == current_user.id,
    )
    rows = (await db.execute(stmt)).scalars().all()

    total = len(rows)
    calibrated = [r for r in rows if r.calibration is not None]
    correct = sum(1 for r in calibrated if r.calibration == "correct")
    incorrect = sum(1 for r in calibrated if r.calibration == "incorrect")
    ambiguous = sum(1 for r in calibrated if r.calibration == "ambiguous")
    denominator = correct + incorrect
    accuracy: float | None = correct / denominator if denominator > 0 else None
    return CalibrationSummary(
        total_readings=total,
        calibrated_readings=len(calibrated),
        correct=correct,
        incorrect=incorrect,
        ambiguous=ambiguous,
        accuracy_rate=accuracy,
    )
