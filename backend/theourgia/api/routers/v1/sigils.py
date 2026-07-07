"""Sigil HTTP endpoints.

``GET    /api/v1/sigils``                 — list with filters
``POST   /api/v1/sigils``                 — create
``GET    /api/v1/sigils/{id}``            — detail (svg + parameters)
``PATCH  /api/v1/sigils/{id}``            — update meta only
``DELETE /api/v1/sigils/{id}``            — soft delete
``POST   /api/v1/sigils/{id}/fork``       — fork a new version

Per the H05 committed-make rule: ``intention``, ``mode``,
``parameters``, ``svg``, and ``seed`` are immutable after save —
PATCH attempts to mutate them are silently dropped (the API
preserves the source-of-truth semantics; the practitioner can fork
to make a new version).

Honesty rule (H05 §5): ``purpose=consecrated`` cannot be set
without a ``linked_working_entry_id`` pointing at a real working
entry. Enforced at create + update.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.entries import Entry
from theourgia.models.sigils import Sigil, SigilMode, SigilPurpose

__all__ = ["router"]

router = APIRouter()


SigilModeLiteral = Literal[
    "spare",
    "kamea",
    "rose_cross",
    "pythagorean",
    "hebrew",
    "greek",
    "hashed",
    "harmonograph",
    "formula",
    "freeform",
    "image",
]
SigilPurposeLiteral = Literal[
    "workshop_draft", "consecrated", "gift", "personal_study",
]


class SigilRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str | None
    title: str
    intention: str
    mode: SigilModeLiteral
    parameters: dict[str, Any]
    svg: str
    seed: str | None
    purpose: SigilPurposeLiteral
    citation: str | None
    notes: str | None
    linked_entity_id: str | None
    linked_working_entry_id: str | None
    parent_sigil_id: str | None
    created_at: datetime
    updated_at: datetime


class SigilCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=240)
    intention: str = Field(min_length=1)
    mode: SigilModeLiteral
    parameters: dict[str, Any] = Field(default_factory=dict)
    svg: str = Field(min_length=1)
    seed: str | None = Field(default=None, max_length=64)
    purpose: SigilPurposeLiteral = "workshop_draft"
    citation: str | None = Field(default=None, max_length=480)
    notes: str | None = None
    linked_entity_id: UUID | None = None
    linked_working_entry_id: UUID | None = None


class SigilUpdate(BaseModel):
    """Only meta fields are mutable. Source-of-truth fields
    (intention, mode, parameters, svg, seed) are immutable after
    save — fork to make a new version."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=240)
    purpose: SigilPurposeLiteral | None = None
    citation: str | None = Field(default=None, max_length=480)
    notes: str | None = None
    linked_entity_id: UUID | None = None
    linked_working_entry_id: UUID | None = None


class SigilForkPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=240)


def _to_read(row: Sigil) -> SigilRead:
    return SigilRead(
        id=str(row.id),
        owner_id=str(row.owner_id) if row.owner_id else None,
        title=row.title,
        intention=row.intention,
        mode=row.mode.value,
        parameters=row.parameters or {},
        svg=row.svg,
        seed=row.seed,
        purpose=row.purpose.value,
        citation=row.citation,
        notes=row.notes,
        linked_entity_id=(
            str(row.linked_entity_id) if row.linked_entity_id else None
        ),
        linked_working_entry_id=(
            str(row.linked_working_entry_id)
            if row.linked_working_entry_id
            else None
        ),
        parent_sigil_id=(
            str(row.parent_sigil_id) if row.parent_sigil_id else None
        ),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _validate_consecrated(
    purpose: SigilPurpose,
    linked_working_entry_id: UUID | None,
    db: AsyncSession,
    owner_id: UUID | None,
) -> None:
    """H05 honesty rule: consecrated purpose requires a real linked
    working owned by the same vault."""
    if purpose != SigilPurpose.CONSECRATED:
        return
    if linked_working_entry_id is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            (
                "Consecrated sigils must link a working entry — set "
                "linked_working_entry_id to the entry that records the "
                "consecration."
            ),
        )
    entry = await db.get(Entry, linked_working_entry_id)
    if entry is None or entry.deleted_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "linked_working_entry_id does not match a live entry.",
        )
    if owner_id is not None and entry.owner_id != owner_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "linked_working_entry_id must reference an entry in your vault.",
        )


# ── Routes ──────────────────────────────────────────────────────────


@router.get("/sigils", response_model=list[SigilRead], tags=["sigils"])
async def list_sigils(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    mode: SigilModeLiteral | None = None,
    purpose: SigilPurposeLiteral | None = None,
    linked_entity_id: UUID | None = None,
    limit: int = 100,
) -> list[SigilRead]:
    stmt = select(Sigil).where(
        Sigil.deleted_at.is_(None),
        Sigil.owner_id == current_user.id,
    )
    if mode is not None:
        stmt = stmt.where(Sigil.mode == SigilMode(mode))
    if purpose is not None:
        stmt = stmt.where(Sigil.purpose == SigilPurpose(purpose))
    if linked_entity_id is not None:
        stmt = stmt.where(Sigil.linked_entity_id == linked_entity_id)
    stmt = stmt.order_by(Sigil.created_at.desc()).limit(min(limit, 500))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.post(
    "/sigils",
    response_model=SigilRead,
    status_code=status.HTTP_201_CREATED,
    tags=["sigils"],
)
async def create_sigil(
    payload: SigilCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SigilRead:
    purpose = SigilPurpose(payload.purpose)
    owner_id = current_user.id
    await _validate_consecrated(
        purpose, payload.linked_working_entry_id, db, owner_id,
    )

    row = Sigil(
        owner_id=owner_id,
        title=payload.title,
        intention=payload.intention,
        mode=SigilMode(payload.mode),
        parameters=payload.parameters,
        svg=payload.svg,
        seed=payload.seed,
        purpose=purpose,
        citation=payload.citation,
        notes=payload.notes,
        linked_entity_id=payload.linked_entity_id,
        linked_working_entry_id=payload.linked_working_entry_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get(
    "/sigils/{sigil_id}", response_model=SigilRead, tags=["sigils"],
)
async def get_sigil(
    sigil_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SigilRead:
    row = await db.get(Sigil, sigil_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")
    return _to_read(row)


@router.patch(
    "/sigils/{sigil_id}", response_model=SigilRead, tags=["sigils"],
)
async def update_sigil(
    sigil_id: UUID,
    payload: SigilUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SigilRead:
    row = await db.get(Sigil, sigil_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")

    data = payload.model_dump(exclude_unset=True)

    # Resolve the candidate purpose + linked working *after* applying
    # the patch, so the honesty rule fires when either is set.
    candidate_purpose: SigilPurpose = (
        SigilPurpose(data["purpose"])
        if "purpose" in data and data["purpose"] is not None
        else row.purpose
    )
    candidate_link: UUID | None = (
        data["linked_working_entry_id"]
        if "linked_working_entry_id" in data
        else row.linked_working_entry_id
    )
    await _validate_consecrated(
        candidate_purpose, candidate_link, db, row.owner_id,
    )

    if "purpose" in data and data["purpose"] is not None:
        data["purpose"] = SigilPurpose(data["purpose"])

    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.delete(
    "/sigils/{sigil_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["sigils"],
)
async def delete_sigil(
    sigil_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(Sigil, sigil_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")
    row.deleted_at = datetime.now(tz=row.created_at.tzinfo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/sigils/{sigil_id}/fork",
    response_model=SigilRead,
    status_code=status.HTTP_201_CREATED,
    tags=["sigils"],
)
async def fork_sigil(
    sigil_id: UUID,
    payload: SigilForkPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> SigilRead:
    """Fork an existing sigil: creates a new row with
    ``parent_sigil_id = source.id``. The parent is unaffected.

    The fork's intention / mode / parameters / svg / seed are
    copied verbatim from the parent. The practitioner can then
    PATCH the fork's meta (title, notes, purpose, etc.) and use
    it as the basis for a new variant.
    """
    parent = await db.get(Sigil, sigil_id)
    if parent is None or parent.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")
    if parent.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sigil not found.")

    title = payload.title or f"{parent.title} — new version"
    child = Sigil(
        owner_id=current_user.id,
        title=title,
        intention=parent.intention,
        mode=parent.mode,
        parameters=dict(parent.parameters or {}),
        svg=parent.svg,
        seed=parent.seed,
        # Default forks back to draft — promoting to consecrated
        # requires a fresh consecration working link.
        purpose=SigilPurpose.WORKSHOP_DRAFT,
        citation=parent.citation,
        notes=None,
        linked_entity_id=parent.linked_entity_id,
        linked_working_entry_id=None,  # do not inherit consecration link
        parent_sigil_id=parent.id,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    return _to_read(child)
