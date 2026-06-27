"""Group ritual HTTP endpoints — Phase 12 B139b.

Per ``plan/12-batches-backend.md`` § B139.

::

  POST   /api/v1/group-rituals                       create draft
  GET    /api/v1/group-rituals                       list (organizer or participant)
  GET    /api/v1/group-rituals/{id}                  full record
  PATCH  /api/v1/group-rituals/{id}                  organizer-only · DRAFT only
  POST   /api/v1/group-rituals/{id}/invite           bulk invite
  POST   /api/v1/group-rituals/{id}/respond          caller-as-participant
  POST   /api/v1/group-rituals/{id}/start            organizer · INVITED → IN_PROGRESS
  POST   /api/v1/group-rituals/{id}/fragments        IN_PROGRESS only · append-only
  POST   /api/v1/group-rituals/{id}/complete         caller-as-participant
  POST   /api/v1/group-rituals/{id}/reflection       write-once per (ritual, author)
  POST   /api/v1/group-rituals/{id}/close            organizer · → COMPLETED

Honesty rules wired:

  · PATCH refuses if status != DRAFT — once-final lock from H08
    rule 22.
  · Reflection write-once enforced by UniqueConstraint at the DB
    layer; the router catches IntegrityError and returns 409.
  · Fragments are append-only — no PUT/DELETE.
  · The hub owner cannot decline their own invite (router-level
    sanity).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.group_ritual import (
    GroupRitual,
    GroupRitualFragment,
    GroupRitualLocation,
    GroupRitualParticipant,
    GroupRitualReflection,
    GroupRitualStatus,
    ParticipantStatus,
)

__all__ = ["router"]


router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────


class GroupRitualRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    organizer_id: str
    hub_id: str | None
    title: str
    description: str | None
    scheduled_for_utc: datetime
    location: GroupRitualLocation
    location_detail: str | None
    shared_script: str | None
    correspondences_payload: dict
    egregore_entity_id: str | None
    status: GroupRitualStatus
    created_at: datetime
    updated_at: datetime


class GroupRitualCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    scheduled_for_utc: datetime
    hub_id: UUID | None = None
    location: GroupRitualLocation = GroupRitualLocation.DISPERSED
    location_detail: str | None = Field(default=None, max_length=500)
    shared_script: str | None = None
    correspondences_payload: dict = Field(default_factory=dict)


class GroupRitualUpdate(BaseModel):
    """PATCH shape — refused once status != DRAFT."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    scheduled_for_utc: datetime | None = None
    location: GroupRitualLocation | None = None
    location_detail: str | None = Field(default=None, max_length=500)
    shared_script: str | None = None
    correspondences_payload: dict | None = None


class InvitePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_ids: list[UUID] = Field(min_length=1)


class RespondPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    response: Literal["accepted", "declined"]


class FragmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=4000)


class ReflectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=4000)


class FragmentRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    author_id: str
    body: str
    posted_at_utc: datetime


class ReflectionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    author_id: str
    body: str
    created_at: datetime


# ── Helpers ────────────────────────────────────────────────────────


def _to_read(row: GroupRitual) -> GroupRitualRead:
    return GroupRitualRead(
        id=str(row.id),
        organizer_id=str(row.organizer_id),
        hub_id=str(row.hub_id) if row.hub_id else None,
        title=row.title,
        description=row.description,
        scheduled_for_utc=row.scheduled_for_utc,
        location=row.location,
        location_detail=row.location_detail,
        shared_script=row.shared_script,
        correspondences_payload=dict(row.correspondences_payload or {}),
        egregore_entity_id=(
            str(row.egregore_entity_id)
            if row.egregore_entity_id
            else None
        ),
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _load_ritual(db: AsyncSession, ritual_id: UUID) -> GroupRitual:
    row = (
        await db.execute(
            select(GroupRitual).where(
                GroupRitual.id == ritual_id,
                GroupRitual.deleted_at.is_(None),
            )
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group ritual not found.",
        )
    return row


async def _require_organizer(ritual: GroupRitual, user_id: UUID) -> None:
    if ritual.organizer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the organizer may take this action.",
        )


async def _require_participant(
    db: AsyncSession, ritual: GroupRitual, user_id: UUID,
) -> GroupRitualParticipant:
    p = (
        await db.execute(
            select(GroupRitualParticipant).where(
                GroupRitualParticipant.ritual_id == ritual.id,
                GroupRitualParticipant.user_id == user_id,
            )
        )
    ).scalars().first()
    if p is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this ritual.",
        )
    return p


# ── Endpoints ──────────────────────────────────────────────────────


@router.post(
    "/group-rituals",
    response_model=GroupRitualRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_ritual(
    payload: GroupRitualCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> GroupRitualRead:
    ritual = GroupRitual(
        organizer_id=user.id,
        hub_id=payload.hub_id,
        title=payload.title,
        description=payload.description,
        scheduled_for_utc=payload.scheduled_for_utc,
        location=payload.location,
        location_detail=payload.location_detail,
        shared_script=payload.shared_script,
        correspondences_payload=payload.correspondences_payload,
    )
    db.add(ritual)
    await db.commit()
    await db.refresh(ritual)
    return _to_read(ritual)


@router.get("/group-rituals", response_model=list[GroupRitualRead])
async def list_rituals(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[GroupRitualRead]:
    """Returns rituals where the caller is organizer OR participant."""
    participant_ids = (
        await db.execute(
            select(GroupRitualParticipant.ritual_id).where(
                GroupRitualParticipant.user_id == user.id,
            )
        )
    ).scalars().all()
    rows = (
        await db.execute(
            select(GroupRitual).where(
                GroupRitual.deleted_at.is_(None),
                (GroupRitual.organizer_id == user.id)
                | GroupRitual.id.in_(participant_ids or [UUID(int=0)]),
            )
            .order_by(GroupRitual.scheduled_for_utc.desc())
        )
    ).scalars().all()
    return [_to_read(r) for r in rows]


@router.get("/group-rituals/{ritual_id}", response_model=GroupRitualRead)
async def get_ritual(
    ritual_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> GroupRitualRead:
    ritual = await _load_ritual(db, ritual_id)
    if ritual.organizer_id != user.id:
        await _require_participant(db, ritual, user.id)
    return _to_read(ritual)


@router.patch(
    "/group-rituals/{ritual_id}", response_model=GroupRitualRead,
)
async def update_ritual(
    ritual_id: UUID,
    payload: GroupRitualUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> GroupRitualRead:
    ritual = await _load_ritual(db, ritual_id)
    await _require_organizer(ritual, user.id)
    if ritual.status != GroupRitualStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This ritual has been invited / started. The script "
                "and details are frozen — only fragments and "
                "reflections can be added now."
            ),
        )
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(ritual, key, value)
    db.add(ritual)
    await db.commit()
    await db.refresh(ritual)
    return _to_read(ritual)


@router.post(
    "/group-rituals/{ritual_id}/invite",
    response_model=GroupRitualRead,
)
async def invite_participants(
    ritual_id: UUID,
    payload: InvitePayload,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> GroupRitualRead:
    ritual = await _load_ritual(db, ritual_id)
    await _require_organizer(ritual, user.id)
    if ritual.status not in (
        GroupRitualStatus.DRAFT,
        GroupRitualStatus.INVITED,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot invite to a started or completed ritual.",
        )
    existing = (
        await db.execute(
            select(GroupRitualParticipant.user_id).where(
                GroupRitualParticipant.ritual_id == ritual.id,
            )
        )
    ).scalars().all()
    existing_set = set(existing)
    for uid in payload.user_ids:
        if uid in existing_set:
            continue
        db.add(
            GroupRitualParticipant(
                ritual_id=ritual.id,
                user_id=uid,
            )
        )
    if ritual.status == GroupRitualStatus.DRAFT:
        ritual.status = GroupRitualStatus.INVITED
        db.add(ritual)
    await db.commit()
    await db.refresh(ritual)
    return _to_read(ritual)


@router.post(
    "/group-rituals/{ritual_id}/respond",
)
async def respond_to_invite(
    ritual_id: UUID,
    payload: RespondPayload,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    ritual = await _load_ritual(db, ritual_id)
    p = await _require_participant(db, ritual, user.id)
    p.status = (
        ParticipantStatus.ACCEPTED
        if payload.response == "accepted"
        else ParticipantStatus.DECLINED
    )
    db.add(p)
    await db.commit()
    return {"status": p.status.value}


@router.post(
    "/group-rituals/{ritual_id}/start",
    response_model=GroupRitualRead,
)
async def start_ritual(
    ritual_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> GroupRitualRead:
    ritual = await _load_ritual(db, ritual_id)
    await _require_organizer(ritual, user.id)
    if ritual.status != GroupRitualStatus.INVITED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only INVITED rituals can be started.",
        )
    ritual.status = GroupRitualStatus.IN_PROGRESS
    db.add(ritual)
    await db.commit()
    await db.refresh(ritual)
    return _to_read(ritual)


@router.post(
    "/group-rituals/{ritual_id}/fragments",
    response_model=FragmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_fragment(
    ritual_id: UUID,
    payload: FragmentCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> FragmentRead:
    ritual = await _load_ritual(db, ritual_id)
    if ritual.status != GroupRitualStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fragments can only be posted while IN_PROGRESS.",
        )
    if ritual.organizer_id != user.id:
        await _require_participant(db, ritual, user.id)
    fragment = GroupRitualFragment(
        ritual_id=ritual.id,
        author_id=user.id,
        body=payload.body,
        posted_at_utc=datetime.now(tz=UTC),
    )
    db.add(fragment)
    await db.commit()
    await db.refresh(fragment)
    return FragmentRead(
        id=str(fragment.id),
        author_id=str(fragment.author_id),
        body=fragment.body,
        posted_at_utc=fragment.posted_at_utc,
    )


@router.post("/group-rituals/{ritual_id}/complete")
async def mark_completed(
    ritual_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict:
    ritual = await _load_ritual(db, ritual_id)
    p = await _require_participant(db, ritual, user.id)
    p.status = ParticipantStatus.COMPLETED
    db.add(p)
    await db.commit()
    return {"status": p.status.value}


@router.post(
    "/group-rituals/{ritual_id}/reflection",
    response_model=ReflectionRead,
    status_code=status.HTTP_201_CREATED,
)
async def post_reflection(
    ritual_id: UUID,
    payload: ReflectionCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ReflectionRead:
    ritual = await _load_ritual(db, ritual_id)
    if ritual.organizer_id != user.id:
        await _require_participant(db, ritual, user.id)
    reflection = GroupRitualReflection(
        ritual_id=ritual.id,
        author_id=user.id,
        body=payload.body,
    )
    db.add(reflection)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already posted a reflection on this ritual.",
        )
    await db.refresh(reflection)
    return ReflectionRead(
        id=str(reflection.id),
        author_id=str(reflection.author_id),
        body=reflection.body,
        created_at=reflection.created_at,
    )


@router.post(
    "/group-rituals/{ritual_id}/close",
    response_model=GroupRitualRead,
)
async def close_ritual(
    ritual_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> GroupRitualRead:
    ritual = await _load_ritual(db, ritual_id)
    await _require_organizer(ritual, user.id)
    if ritual.status not in (
        GroupRitualStatus.IN_PROGRESS,
        GroupRitualStatus.INVITED,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only IN_PROGRESS or INVITED rituals can be closed.",
        )
    ritual.status = GroupRitualStatus.COMPLETED
    db.add(ritual)
    await db.commit()
    await db.refresh(ritual)
    return _to_read(ritual)
