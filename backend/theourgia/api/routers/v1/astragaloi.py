"""Astragaloi (five-knucklebone oracle) HTTP endpoints.

``POST  /api/v1/astragaloi/casts``        — record a throw (or simulate one)
``GET   /api/v1/astragaloi/casts``        — list casts (filters below)
``GET   /api/v1/astragaloi/casts/{id}``   — fetch one
``PATCH /api/v1/astragaloi/casts/{id}``   — the operator's own interpretation only
``GET   /api/v1/astragaloi/corpus/meta``  — corpus provenance, gaps, adjudications

Per the H12 data-contract supplement (Surface 3). Two hard rules:

* Rule 68 — a face is 1, 3, 4 or 6, never 2 or 5; sums 6 and 29 are
  mechanically impossible (422 on any violation).
* Rule 67 — a server-generated (simulated) cast is marked simulated
  forever; no update path exists for the flag or for the throw.

The resolved reading (god, verses, valence, tetraktys channel) is
denormalised onto the row at cast time so history survives later
corpus edits.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.divination.astragaloi import (
    cast_for_faces,
    corpus_meta,
    simulate_faces,
)
from theourgia.models.astragaloi import (
    AstragaloiCast,
    AstragaloiOctave,
    AstragaloiValence,
)
from theourgia.models.entries import Entry

__all__ = ["router"]

router = APIRouter()


BoneFace = Literal[1, 3, 4, 6]
ValenceLiteral = Literal["favourable", "cautionary", "unfavourable"]
OctaveLiteral = Literal["luminous", "embodied", "chthonic"]


# ─── Shapes ─────────────────────────────────────────────────────


class CastCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    faces: list[BoneFace] | None = Field(
        default=None,
        min_length=5,
        max_length=5,
        description=(
            "The five faces as thrown (any order). Omit and set "
            "simulate=true to let the server roll instead."
        ),
    )
    question: str | None = Field(
        default=None,
        description="The question / context brought to the throw.",
    )
    entry_id: UUID | None = None
    declared_intent: str | None = Field(
        default=None,
        description="Declared-intent text carried with the cast.",
    )
    simulate: bool = Field(
        default=False,
        description=(
            "Server-side RNG throw. The cast is marked simulated "
            "FOREVER (rule 67)."
        ),
    )


class OracleChannel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: str
    god_greek: str
    god_english: str
    verse_greek: str | None
    verse_english: str
    valence: ValenceLiteral


class LadderChannel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sphere: int
    octave: OctaveLiteral
    ground_element: str


class CastRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    faces: list[int]  # sorted ascending
    sum: int
    simulated: bool
    cast_at: datetime
    question: str | None
    entry_id: str | None
    declared_intent: str | None
    oracle: OracleChannel
    ladder: LadderChannel
    interpretation: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class CastUpdate(BaseModel):
    """Only the operator's own reading is ever editable — the throw,
    its source flag, and the resolved snapshot are not."""

    model_config = ConfigDict(extra="forbid")

    interpretation: str | None = None


def _to_read(row: AstragaloiCast) -> CastRead:
    return CastRead(
        id=str(row.id),
        faces=list(row.faces),
        sum=row.cast_sum,
        simulated=row.simulated,
        cast_at=row.cast_at,
        question=row.question,
        entry_id=str(row.entry_id) if row.entry_id else None,
        declared_intent=row.declared_intent,
        oracle=OracleChannel(
            number=row.oracle_number,
            god_greek=row.god_greek,
            god_english=row.god_english,
            verse_greek=row.verse_greek,
            verse_english=row.verse_english,
            valence=row.valence.value,
        ),
        ladder=LadderChannel(
            sphere=row.sphere,
            octave=row.octave.value,
            ground_element=row.ground_element,
        ),
        interpretation=row.interpretation,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ─── Endpoints ──────────────────────────────────────────────────


@router.post(
    "/astragaloi/casts",
    response_model=CastRead,
    status_code=status.HTTP_201_CREATED,
    tags=["astragaloi"],
)
async def create_cast(
    payload: CastCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CastRead:
    """Record a throw. The server computes the sum and resolves the
    reading from the corpus — the client never supplies either."""
    if payload.simulate and payload.faces is not None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Provide faces OR simulate=true, not both — a simulated cast "
            "is rolled server-side.",
        )
    if not payload.simulate and payload.faces is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "faces is required unless simulate=true.",
        )

    if payload.simulate:
        faces: tuple[int, ...] = simulate_faces()
    else:
        faces = tuple(payload.faces or ())

    try:
        reading = cast_for_faces(faces)
    except ValueError as exc:
        # Pydantic's Literal already guards this; kept for defense in
        # depth (and for the simulate path, which cannot fail).
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)
        ) from exc

    if payload.entry_id is not None:
        entry = await db.get(Entry, payload.entry_id)
        if (
            entry is None
            or entry.deleted_at is not None
            or entry.owner_id != current_user.id
        ):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Linked entry not found."
            )

    row = AstragaloiCast(
        faces=list(reading.faces),
        cast_sum=reading.sum,
        simulated=payload.simulate,
        cast_at=datetime.now(tz=UTC),
        question=payload.question,
        entry_id=payload.entry_id,
        declared_intent=payload.declared_intent,
        oracle_number=reading.oracle_number,
        god_greek=reading.god_greek,
        god_english=reading.god_english,
        verse_greek=reading.verse_greek,
        verse_english=reading.verse_english,
        valence=AstragaloiValence(reading.valence),
        sphere=reading.sphere,
        octave=AstragaloiOctave(reading.octave),
        ground_element=reading.ground_element,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/astragaloi/casts",
    response_model=list[CastRead],
    tags=["astragaloi"],
)
async def list_casts(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    valence: ValenceLiteral | None = None,
    sphere: Annotated[int | None, Query(ge=1, le=10)] = None,
    simulated: bool | None = None,
    cast_after: datetime | None = None,
    cast_before: datetime | None = None,
    limit: int = 100,
) -> list[CastRead]:
    stmt = select(AstragaloiCast).where(
        AstragaloiCast.deleted_at.is_(None),  # type: ignore[union-attr]
        AstragaloiCast.owner_id == current_user.id,
    )
    if valence is not None:
        stmt = stmt.where(AstragaloiCast.valence == AstragaloiValence(valence))
    if sphere is not None:
        stmt = stmt.where(AstragaloiCast.sphere == sphere)
    if simulated is not None:
        stmt = stmt.where(AstragaloiCast.simulated == simulated)
    if cast_after is not None:
        stmt = stmt.where(AstragaloiCast.cast_at >= cast_after)
    if cast_before is not None:
        stmt = stmt.where(AstragaloiCast.cast_at <= cast_before)
    stmt = stmt.order_by(AstragaloiCast.cast_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.get(
    "/astragaloi/casts/{cast_id}",
    response_model=CastRead,
    tags=["astragaloi"],
)
async def get_cast(
    cast_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CastRead:
    row = await db.get(AstragaloiCast, cast_id)
    if row is None or row.deleted_at is not None or row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cast not found.")
    return _to_read(row)


@router.patch(
    "/astragaloi/casts/{cast_id}",
    response_model=CastRead,
    tags=["astragaloi"],
)
async def update_cast(
    cast_id: UUID,
    payload: CastUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CastRead:
    """Attach / revise the operator's own interpretation. Nothing else
    on a cast is writable — the throw and its source flag are history."""
    row = await db.get(AstragaloiCast, cast_id)
    if row is None or row.deleted_at is not None or row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cast not found.")
    updates = payload.model_dump(exclude_unset=True)
    if "interpretation" in updates:
        row.interpretation = updates["interpretation"]
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/astragaloi/corpus/meta",
    tags=["astragaloi"],
)
async def get_corpus_meta(current_user: CurrentUser) -> dict[str, Any]:
    """The corpus meta block verbatim: provenance, legend, verse
    policy, caveats (the pending Nollé adjudications) and gaps — for
    honest display next to any reading."""
    _ = current_user  # authenticated surface; meta itself is not per-user
    return corpus_meta()
