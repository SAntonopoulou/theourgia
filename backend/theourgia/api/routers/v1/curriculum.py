"""Tetraktys ladder / curriculum HTTP endpoints (Sprint I-B, Domain 3).

``GET  /api/v1/curriculum/ladder``                    — all ten spheres + state, walk order
``GET  /api/v1/curriculum/spheres/{number}``          — one sphere (sealed if locked)
``POST /api/v1/curriculum/spheres/{number}/items``    — author a curriculum item
``POST /api/v1/curriculum/items/{item_id}/complete``  — mark done (+ optional evidence)
``PUT  /api/v1/curriculum/spheres/{number}/gate``     — set the gate's requirements prose
``POST /api/v1/curriculum/spheres/{number}/gate/pass``— pass the gate
``GET  /api/v1/curriculum/progress``                  — a phrase, never a percentage

The walk discipline:

* The serpent order is fixed: 10→9→8→7→4→5→6→3→2→1. Current position
  is *derived* — the first sphere in walk order whose gate isn't
  passed — never stored.
* Locked spheres (later in the walk) are sealed: their curriculum is
  returned only as counts, their items cannot be completed, their
  gates cannot be passed or edited.
* A gate passes only when every ``required_for_gate`` item of its
  sphere is complete.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.curriculum import (
    SERPENT_WALK,
    CurriculumItem,
    CurriculumItemKind,
    LadderSphere,
    SphereGate,
)
from theourgia.models.entries import Entry
from theourgia.models.initiations import Initiation

__all__ = ["router"]

router = APIRouter()


SphereStateLiteral = Literal["done", "current", "locked"]
ItemKindLiteral = Literal["reading", "practice", "deliverable"]


# ─── Pure walk logic (unit-tested directly) ─────────────────────


def walk_states(passed_numbers: set[int]) -> dict[int, SphereStateLiteral]:
    """State per sphere number, from the set of passed gates.

    Walking the serpent order: a passed sphere is ``done``; the first
    unpassed sphere is ``current``; everything after it is ``locked``.
    When all ten are passed there is no current sphere.
    """
    states: dict[int, SphereStateLiteral] = {}
    current_found = False
    for number in SERPENT_WALK:
        if number in passed_numbers:
            states[number] = "done"
        elif not current_found:
            states[number] = "current"
            current_found = True
        else:
            states[number] = "locked"
    return states


def current_sphere_number(passed_numbers: set[int]) -> int | None:
    """The first sphere in walk order whose gate isn't passed."""
    for number in SERPENT_WALK:
        if number not in passed_numbers:
            return number
    return None


def ensure_unlocked(state: SphereStateLiteral, *, action: str) -> None:
    """Sealed lockout: locked spheres accept no work."""
    if state == "locked":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"This sphere is still sealed — the walk has not reached it. "
            f"Cannot {action} on a locked sphere.",
        )


def incomplete_required_titles(items: list[CurriculumItem]) -> list[str]:
    """Titles of gate-blocking items not yet complete."""
    return [
        item.title
        for item in items
        if item.required_for_gate
        and item.completed_at is None
        and item.deleted_at is None
    ]


# ─── Shapes ─────────────────────────────────────────────────────


class ItemRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    kind: ItemKindLiteral
    title: str
    notes: str | None
    required_for_gate: bool
    completed_at: datetime | None
    evidence_entry_id: str | None


class ItemCounts(BaseModel):
    """What a sealed sphere shows: numbers, not names."""

    model_config = ConfigDict(extra="forbid")

    total: int
    completed: int
    required_for_gate: int


class GateRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requirements: str | None
    passed_at: datetime | None
    countersign: str | None
    initiation_id: str | None


class SphereRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: int
    name: str
    walk_position: int
    state: SphereStateLiteral
    sealed: bool
    item_counts: ItemCounts
    items: list[ItemRead] | None = Field(
        description="Full items when unlocked; null (counts only) when sealed.",
    )
    gate: GateRead | None = Field(
        description="Gate detail when unlocked; null when sealed.",
    )


class LadderRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spheres: list[SphereRead]  # in walk order
    current_sphere: int | None


class ProgressRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_sphere: int | None
    phrase: str  # a phrase, never a percentage


class ItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: ItemKindLiteral
    title: str = Field(min_length=1, max_length=256)
    notes: str | None = None
    required_for_gate: bool = False


class ItemComplete(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_entry_id: UUID | None = Field(
        default=None,
        description="Journal entry evidencing the completed work.",
    )


class GateRequirementsWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    requirements: str | None = None


class GatePass(BaseModel):
    model_config = ConfigDict(extra="forbid")

    countersign: str | None = Field(default=None, max_length=256)
    initiation_id: UUID | None = Field(
        default=None,
        description="Sealed initiation record received at this gate.",
    )


# ─── DB helpers ─────────────────────────────────────────────────


async def _load_spheres(db: AsyncSession) -> list[LadderSphere]:
    stmt = select(LadderSphere).order_by(LadderSphere.walk_position.asc())
    spheres = (await db.execute(stmt)).scalars().all()
    if len(spheres) != len(SERPENT_WALK):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "The ladder catalog is not seeded — run migrations.",
        )
    return list(spheres)


async def _load_gates(
    db: AsyncSession, owner_id: UUID
) -> dict[UUID, SphereGate]:
    stmt = select(SphereGate).where(SphereGate.owner_id == owner_id)
    rows = (await db.execute(stmt)).scalars().all()
    return {g.sphere_id: g for g in rows}


async def _load_items(
    db: AsyncSession, owner_id: UUID, sphere_ids: list[UUID] | None = None
) -> list[CurriculumItem]:
    stmt = select(CurriculumItem).where(
        CurriculumItem.deleted_at.is_(None),  # type: ignore[union-attr]
        CurriculumItem.owner_id == owner_id,
    )
    if sphere_ids is not None:
        stmt = stmt.where(CurriculumItem.sphere_id.in_(sphere_ids))  # type: ignore[attr-defined]
    stmt = stmt.order_by(CurriculumItem.created_at.asc())
    return list((await db.execute(stmt)).scalars().all())


async def _sphere_by_number(db: AsyncSession, number: int) -> LadderSphere:
    stmt = select(LadderSphere).where(LadderSphere.number == number)
    sphere = (await db.execute(stmt)).scalar_one_or_none()
    if sphere is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Sphere {number} not found (the ladder is 1–10).",
        )
    return sphere


def _item_read(item: CurriculumItem) -> ItemRead:
    return ItemRead(
        id=str(item.id),
        kind=item.kind.value,
        title=item.title,
        notes=item.notes,
        required_for_gate=item.required_for_gate,
        completed_at=item.completed_at,
        evidence_entry_id=(
            str(item.evidence_entry_id) if item.evidence_entry_id else None
        ),
    )


def _gate_read(gate: SphereGate | None) -> GateRead:
    if gate is None:
        return GateRead(
            requirements=None, passed_at=None, countersign=None, initiation_id=None,
        )
    return GateRead(
        requirements=gate.requirements,
        passed_at=gate.passed_at,
        countersign=gate.countersign,
        initiation_id=str(gate.initiation_id) if gate.initiation_id else None,
    )


def _sphere_read(
    sphere: LadderSphere,
    state: SphereStateLiteral,
    items: list[CurriculumItem],
    gate: SphereGate | None,
) -> SphereRead:
    sealed = state == "locked"
    counts = ItemCounts(
        total=len(items),
        completed=sum(1 for i in items if i.completed_at is not None),
        required_for_gate=sum(1 for i in items if i.required_for_gate),
    )
    return SphereRead(
        number=sphere.number,
        name=sphere.name,
        walk_position=sphere.walk_position,
        state=state,
        sealed=sealed,
        item_counts=counts,
        items=None if sealed else [_item_read(i) for i in items],
        gate=None if sealed else _gate_read(gate),
    )


async def _ladder_context(
    db: AsyncSession, owner_id: UUID
) -> tuple[
    list[LadderSphere],
    dict[UUID, SphereGate],
    dict[int, SphereStateLiteral],
]:
    spheres = await _load_spheres(db)
    gates = await _load_gates(db, owner_id)
    passed = {
        s.number
        for s in spheres
        if (g := gates.get(s.id)) is not None and g.passed_at is not None
    }
    return spheres, gates, walk_states(passed)


# ─── Endpoints ──────────────────────────────────────────────────


@router.get("/curriculum/ladder", response_model=LadderRead, tags=["curriculum"])
async def get_ladder(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> LadderRead:
    """The whole ladder in walk order. Locked spheres arrive sealed —
    counts only, no titles."""
    spheres, gates, states = await _ladder_context(db, current_user.id)
    items = await _load_items(db, current_user.id)
    items_by_sphere: dict[UUID, list[CurriculumItem]] = {}
    for item in items:
        items_by_sphere.setdefault(item.sphere_id, []).append(item)

    reads = [
        _sphere_read(
            s,
            states[s.number],
            items_by_sphere.get(s.id, []),
            gates.get(s.id),
        )
        for s in spheres
    ]
    current = next(
        (n for n, st in states.items() if st == "current"), None
    )
    return LadderRead(spheres=reads, current_sphere=current)


@router.get(
    "/curriculum/spheres/{number}",
    response_model=SphereRead,
    tags=["curriculum"],
)
async def get_sphere(
    number: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SphereRead:
    sphere = await _sphere_by_number(db, number)
    _, gates, states = await _ladder_context(db, current_user.id)
    items = await _load_items(db, current_user.id, [sphere.id])
    return _sphere_read(
        sphere, states[sphere.number], items, gates.get(sphere.id),
    )


@router.post(
    "/curriculum/spheres/{number}/items",
    response_model=ItemRead,
    status_code=status.HTTP_201_CREATED,
    tags=["curriculum"],
)
async def create_item(
    number: int,
    payload: ItemCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ItemRead:
    """Author a curriculum item. Authoring is allowed on any sphere —
    the seal governs *seeing and doing* the work, not planning it."""
    sphere = await _sphere_by_number(db, number)
    row = CurriculumItem(
        sphere_id=sphere.id,
        owner_id=current_user.id,
        kind=CurriculumItemKind(payload.kind),
        title=payload.title,
        notes=payload.notes,
        required_for_gate=payload.required_for_gate,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _item_read(row)


@router.post(
    "/curriculum/items/{item_id}/complete",
    response_model=ItemRead,
    tags=["curriculum"],
)
async def complete_item(
    item_id: UUID,
    payload: ItemComplete,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ItemRead:
    """Mark an item done, optionally with journal-entry evidence.
    Refused on sealed (locked) spheres."""
    item = await db.get(CurriculumItem, item_id)
    if (
        item is None
        or item.deleted_at is not None
        or item.owner_id != current_user.id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found.")
    if item.completed_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Item is already complete."
        )

    sphere = await db.get(LadderSphere, item.sphere_id)
    assert sphere is not None  # FK guarantees
    _, _, states = await _ladder_context(db, current_user.id)
    ensure_unlocked(states[sphere.number], action="complete an item")

    if payload.evidence_entry_id is not None:
        entry = await db.get(Entry, payload.evidence_entry_id)
        if (
            entry is None
            or entry.deleted_at is not None
            or entry.owner_id != current_user.id
        ):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Evidence entry not found."
            )
        item.evidence_entry_id = payload.evidence_entry_id

    item.completed_at = datetime.now(tz=UTC)
    await db.commit()
    await db.refresh(item)
    return _item_read(item)


async def _get_or_create_gate(
    db: AsyncSession, sphere: LadderSphere, owner_id: UUID
) -> SphereGate:
    stmt = select(SphereGate).where(
        SphereGate.sphere_id == sphere.id,
        SphereGate.owner_id == owner_id,
    )
    gate = (await db.execute(stmt)).scalar_one_or_none()
    if gate is None:
        gate = SphereGate(sphere_id=sphere.id, owner_id=owner_id)
        db.add(gate)
        await db.flush()
    return gate


@router.put(
    "/curriculum/spheres/{number}/gate",
    response_model=GateRead,
    tags=["curriculum"],
)
async def set_gate_requirements(
    number: int,
    payload: GateRequirementsWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> GateRead:
    """Write the gate's requirements prose. Refused once passed —
    a passed gate is part of the record."""
    sphere = await _sphere_by_number(db, number)
    gate = await _get_or_create_gate(db, sphere, current_user.id)
    if gate.passed_at is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This gate is already passed — its record is sealed.",
        )
    gate.requirements = payload.requirements
    await db.commit()
    await db.refresh(gate)
    return _gate_read(gate)


@router.post(
    "/curriculum/spheres/{number}/gate/pass",
    response_model=GateRead,
    tags=["curriculum"],
)
async def pass_gate(
    number: int,
    payload: GatePass,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> GateRead:
    """Pass the current sphere's gate.

    Requires: the sphere is the walk's current position, and every
    ``required_for_gate`` item of the sphere is complete.
    """
    sphere = await _sphere_by_number(db, number)
    _, _, states = await _ladder_context(db, current_user.id)
    state = states[sphere.number]
    if state == "done":
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This gate is already passed."
        )
    ensure_unlocked(state, action="pass the gate")

    items = await _load_items(db, current_user.id, [sphere.id])
    missing = incomplete_required_titles(items)
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "The gate does not open — required work is incomplete: "
            + "; ".join(missing),
        )

    if payload.initiation_id is not None:
        initiation = await db.get(Initiation, payload.initiation_id)
        if (
            initiation is None
            or initiation.deleted_at is not None
            or initiation.owner_id != current_user.id
        ):
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, "Initiation record not found."
            )

    gate = await _get_or_create_gate(db, sphere, current_user.id)
    gate.passed_at = datetime.now(tz=UTC)
    gate.countersign = payload.countersign
    gate.initiation_id = payload.initiation_id
    await db.commit()
    await db.refresh(gate)
    return _gate_read(gate)


@router.get(
    "/curriculum/progress", response_model=ProgressRead, tags=["curriculum"],
)
async def get_progress(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> ProgressRead:
    """Where the walk stands — as a phrase, never a percentage."""
    spheres, _, states = await _ladder_context(db, current_user.id)
    current = next((n for n, st in states.items() if st == "current"), None)
    if current is None:
        return ProgressRead(
            current_sphere=None,
            phrase="The walk is complete — all ten gates are passed.",
        )
    name = next(s.name for s in spheres if s.number == current)
    return ProgressRead(
        current_sphere=current,
        phrase=f"Sphere {current} · {name}",
    )
