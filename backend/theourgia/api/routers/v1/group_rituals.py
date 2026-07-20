"""Group ritual HTTP endpoints — Phase 12 B139b + v1-033.

Per ``plan/12-batches-backend.md`` § B139; cross-instance flows per
``docs/developer/federation-protocol.md`` §4.7/§4.8 (v1-033).

::

  POST   /api/v1/group-rituals                       create draft
  GET    /api/v1/group-rituals                       list (organizer or participant)
  GET    /api/v1/group-rituals/{id}                  full record
  GET    /api/v1/group-rituals/{id}/remote-participants  cross-instance roster
  PATCH  /api/v1/group-rituals/{id}                  organizer-only · DRAFT only
  POST   /api/v1/group-rituals/{id}/invite           bulk invite (local ids + remote DIDs)
  POST   /api/v1/group-rituals/{id}/respond          caller-as-participant
  POST   /api/v1/group-rituals/{id}/start            organizer · INVITED → IN_PROGRESS
  POST   /api/v1/group-rituals/{id}/fragments        IN_PROGRESS only · append-only
  GET    /api/v1/group-rituals/{id}/fragments        merged collective log
  POST   /api/v1/group-rituals/{id}/complete         caller-as-participant
  POST   /api/v1/group-rituals/{id}/reflection       write-once per (ritual, author)
  GET    /api/v1/group-rituals/{id}/reflections      post-mortem assembly
  POST   /api/v1/group-rituals/{id}/close            organizer · → COMPLETED
  POST   /api/v1/group-rituals/{id}/declare-egregore organizer · during/after the working

Honesty rules wired:

  · PATCH refuses if status != DRAFT — once-final lock from H08
    rule 22.
  · Reflection write-once enforced by UniqueConstraint at the DB
    layer; the router catches IntegrityError and returns 409.
  · Fragments are append-only — no PUT/DELETE.
  · The hub owner cannot decline their own invite (router-level
    sanity).

Cross-instance rules (v1-033):

  · Remote practitioners are invited by vault DID; every remote
    invite queues a signed ``ritual.schedule`` on the delivery queue.
    Start / fragments / completion / egregore registration broadcast
    as ``ritual.update`` ops; a mirror instance sends its fragments
    and reflections back to the origin.
  · Broadcast failures NEVER fail the local lifecycle — federation is
    at-least-once via the retry queue, and the local record is the
    source of truth.
  · Mirror rituals (``organizer_id`` NULL) accept no local PATCH /
    start / close — those transitions arrive from the origin.
  · The egregore creation flow (plan/12): a DRAFT ritual declares
    ``egregore_name``; at close the EGREGORE entity is registered in
    the organizer's vault and every local non-declined participant's
    vault, and ``egregore_registration`` broadcasts so remote
    participating vaults register it too. ``declare-egregore``
    (v1-031) is the explicit affordance for a working already in
    progress or closed without a declaration: it registers + links +
    broadcasts immediately and is idempotent (409 once declared).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.config import get_settings
from theourgia.core.federation.identity import (
    ActorKind,
    InvalidDIDError,
    parse_actor_id,
)
from theourgia.core.federation.ritual_outbound import (
    broadcast_ritual_schedule,
    broadcast_ritual_update,
    build_ritual_update_envelope,
    local_vault_did,
    send_ritual_update_to_origin,
)
from theourgia.models.entities import Entity, EntityKind
from theourgia.models.group_ritual import (
    GroupRitual,
    GroupRitualFragment,
    GroupRitualLocation,
    GroupRitualParticipant,
    GroupRitualReflection,
    GroupRitualRemoteParticipant,
    GroupRitualStatus,
    ParticipantStatus,
)

__all__ = ["router"]


_log = logging.getLogger(__name__)


router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────


class GroupRitualRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    organizer_id: str | None
    hub_id: str | None
    title: str
    description: str | None
    scheduled_for_utc: datetime
    location: GroupRitualLocation
    location_detail: str | None
    shared_script: str | None
    correspondences_payload: dict
    egregore_entity_id: str | None
    egregore_name: str | None
    origin_did: str | None
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
    egregore_name: str | None = Field(
        default=None, min_length=1, max_length=256,
    )


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
    egregore_name: str | None = Field(
        default=None, min_length=1, max_length=256,
    )


class InvitePayload(BaseModel):
    """At least one invitee — local user ids and/or remote vault DIDs
    (``did:theourgia:{host}:vault:{slug}``, v1-033)."""

    model_config = ConfigDict(extra="forbid")

    user_ids: list[UUID] = Field(default_factory=list)
    remote_dids: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _at_least_one_invitee(self) -> "InvitePayload":
        if not self.user_ids and not self.remote_dids:
            msg = "invite at least one local user or remote vault DID"
            raise ValueError(msg)
        return self


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
    author_id: str | None
    author_did: str | None
    body: str
    posted_at_utc: datetime


class ReflectionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    author_id: str | None
    author_did: str | None
    body: str
    created_at: datetime


class RemoteParticipantRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    did: str
    role_in_ritual: str | None
    invited_at: datetime


class EgregoreDeclare(BaseModel):
    """POST /group-rituals/{id}/declare-egregore payload (v1-031)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=256)
    summary: str | None = Field(default=None, max_length=1024)


# ── Helpers ────────────────────────────────────────────────────────


def _to_read(row: GroupRitual) -> GroupRitualRead:
    return GroupRitualRead(
        id=str(row.id),
        organizer_id=(
            str(row.organizer_id) if row.organizer_id else None
        ),
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
        egregore_name=row.egregore_name,
        origin_did=row.origin_did,
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


async def _commit_broadcast(db: AsyncSession) -> None:
    """Commit queued federation deliveries; NEVER let a broadcast
    failure surface into the local lifecycle (v1-033 rule)."""
    try:
        await db.commit()
    except Exception:  # noqa: BLE001 — broadcast is best-effort
        _log.warning(
            "group_rituals.federation_broadcast_failed", exc_info=True,
        )
        try:
            await db.rollback()
        except Exception:  # noqa: BLE001
            pass


def _validate_remote_did(raw: str) -> str:
    """A remote invitee must be a vault DID on ANOTHER instance."""
    candidate = raw.strip()
    try:
        host, kind, _ = parse_actor_id(candidate)
    except InvalidDIDError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not a valid vault DID: {raw!r}",
        ) from exc
    if kind is not ActorKind.VAULT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Remote invitees must be vault DIDs, got {raw!r}.",
        )
    if host == get_settings().instance_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "That vault lives on this instance — invite the "
                "practitioner by user id instead."
            ),
        )
    return candidate


def _ritual_tradition_tags(ritual: GroupRitual) -> list[str]:
    """Tradition tags ride the scheduler's ``correspondences_payload``
    convention (``{"tradition_tags": [...]}``) — GroupRitual has no
    first-class tradition column. Absent or malformed → []."""
    raw = (ritual.correspondences_payload or {}).get("tradition_tags")
    if not isinstance(raw, list):
        return []
    return [tag for tag in raw if isinstance(tag, str) and tag][:16]


async def _register_egregore_locally(
    db: AsyncSession,
    ritual: GroupRitual,
    *,
    organizer_id: UUID,
    summary: str | None = None,
) -> None:
    """Egregore creation flow (plan/12): register the declared
    egregore in the organizer's vault and every local non-declined
    participant's vault, and link ``ritual.egregore_entity_id`` to
    the organizer's copy. Idempotent per (owner, ritual) via the
    entity origin tag — the same convention the inbox processor uses
    on mirror instances, so retries and re-declarations converge.

    The entity is a normal entity thereafter — offerings, contracts,
    workings attach to it like any other.
    """
    origin_tag = f"group-ritual:{ritual.id}"
    tags = _ritual_tradition_tags(ritual)
    participants = (
        await db.execute(
            select(GroupRitualParticipant).where(
                GroupRitualParticipant.ritual_id == ritual.id,
            )
        )
    ).scalars().all()
    owner_ids: list[UUID] = [organizer_id]
    for participant in participants:
        if participant.status == ParticipantStatus.DECLINED:
            continue
        if participant.user_id not in owner_ids:
            owner_ids.append(participant.user_id)
    for owner_id in owner_ids:
        entity = (
            await db.execute(
                select(Entity).where(
                    Entity.owner_id == owner_id,
                    Entity.origin == origin_tag,
                    Entity.deleted_at.is_(None),
                )
            )
        ).scalars().first()
        if entity is None:
            entity = Entity(
                name=ritual.egregore_name,
                kind=EntityKind.EGREGORE,
                owner_id=owner_id,
                origin=origin_tag,
                tradition=tags[0] if tags else "",
                tradition_tags=tags,
                summary=summary,
            )
            db.add(entity)
        if owner_id == organizer_id:
            ritual.egregore_entity_id = entity.id


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
        egregore_name=payload.egregore_name,
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


@router.get(
    "/group-rituals/{ritual_id}/remote-participants",
    response_model=list[RemoteParticipantRead],
)
async def list_remote_participants(
    ritual_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[RemoteParticipantRead]:
    """The cross-instance roster (v1-033). Organizer or participant."""
    ritual = await _load_ritual(db, ritual_id)
    if ritual.organizer_id != user.id:
        await _require_participant(db, ritual, user.id)
    rows = (
        await db.execute(
            select(GroupRitualRemoteParticipant).where(
                GroupRitualRemoteParticipant.ritual_id == ritual.id,
            )
        )
    ).scalars().all()
    return [
        RemoteParticipantRead(
            did=r.did,
            role_in_ritual=r.role_in_ritual,
            invited_at=r.invited_at,
        )
        for r in rows
    ]


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
    remote_dids = [_validate_remote_did(d) for d in payload.remote_dids]

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
    new_remote = False
    if remote_dids:
        existing_remote = set(
            (
                await db.execute(
                    select(GroupRitualRemoteParticipant.did).where(
                        GroupRitualRemoteParticipant.ritual_id
                        == ritual.id,
                    )
                )
            ).scalars().all()
        )
        now = datetime.now(tz=UTC)
        for did in remote_dids:
            if did in existing_remote:
                continue
            existing_remote.add(did)
            new_remote = True
            db.add(
                GroupRitualRemoteParticipant(
                    ritual_id=ritual.id,
                    did=did,
                    invited_at=now,
                )
            )
    if ritual.status == GroupRitualStatus.DRAFT:
        ritual.status = GroupRitualStatus.INVITED
        db.add(ritual)
    await db.commit()
    await db.refresh(ritual)

    if new_remote:
        # Broadcast the schedule to every remote participant — a
        # re-invite re-broadcasts; mirror creation is idempotent on
        # the receiving side. Never fails the local invite.
        try:
            organizer_did = await local_vault_did(db, user.id)
            if organizer_did is None:
                _log.warning(
                    "group_rituals.schedule_broadcast.no_vault",
                    extra={"ritual_id": str(ritual.id)},
                )
            else:
                await broadcast_ritual_schedule(
                    db, ritual, organizer_did=organizer_did,
                )
                await _commit_broadcast(db)
        except Exception:  # noqa: BLE001 — broadcast is best-effort
            _log.warning(
                "group_rituals.schedule_broadcast_failed", exc_info=True,
            )
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

    try:
        await broadcast_ritual_update(
            db,
            ritual,
            build_ritual_update_envelope(str(ritual.id), "start"),
        )
        await _commit_broadcast(db)
    except Exception:  # noqa: BLE001 — broadcast is best-effort
        _log.warning(
            "group_rituals.start_broadcast_failed", exc_info=True,
        )
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

    # Cross-instance relay (v1-033): a mirror sends the fragment back
    # to the origin; the origin broadcasts to its remote roster.
    try:
        author_did = await local_vault_did(db, user.id)
        if author_did is not None:
            if ritual.origin_ritual_id is not None:
                envelope = build_ritual_update_envelope(
                    str(ritual.origin_ritual_id),
                    "fragment",
                    author_did=author_did,
                    fragment_body=fragment.body,
                    posted_at_utc=fragment.posted_at_utc.isoformat(),
                )
                await send_ritual_update_to_origin(db, ritual, envelope)
            else:
                envelope = build_ritual_update_envelope(
                    str(ritual.id),
                    "fragment",
                    author_did=author_did,
                    fragment_body=fragment.body,
                    posted_at_utc=fragment.posted_at_utc.isoformat(),
                )
                await broadcast_ritual_update(db, ritual, envelope)
            await _commit_broadcast(db)
    except Exception:  # noqa: BLE001 — broadcast is best-effort
        _log.warning(
            "group_rituals.fragment_broadcast_failed", exc_info=True,
        )
    return FragmentRead(
        id=str(fragment.id),
        author_id=str(fragment.author_id),
        author_did=None,
        body=fragment.body,
        posted_at_utc=fragment.posted_at_utc,
    )


@router.get(
    "/group-rituals/{ritual_id}/fragments",
    response_model=list[FragmentRead],
)
async def list_fragments(
    ritual_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[FragmentRead]:
    """The merged collective log (FEATURES §14): local and remote
    fragments interleaved in posted order. Remote authors carry
    ``author_did``; local ones ``author_id``."""
    ritual = await _load_ritual(db, ritual_id)
    if ritual.organizer_id != user.id:
        await _require_participant(db, ritual, user.id)
    rows = (
        await db.execute(
            select(GroupRitualFragment)
            .where(GroupRitualFragment.ritual_id == ritual.id)
            .order_by(GroupRitualFragment.posted_at_utc)
        )
    ).scalars().all()
    return [
        FragmentRead(
            id=str(row.id),
            author_id=str(row.author_id) if row.author_id else None,
            author_did=row.author_did,
            body=row.body,
            posted_at_utc=row.posted_at_utc,
        )
        for row in rows
    ]


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

    # A mirror sends its reflection to the origin's post-mortem
    # assembly (v1-033). Origin-side reflections stay local.
    if ritual.origin_ritual_id is not None:
        try:
            author_did = await local_vault_did(db, user.id)
            if author_did is not None:
                envelope = build_ritual_update_envelope(
                    str(ritual.origin_ritual_id),
                    "postmortem_entry",
                    author_did=author_did,
                    reflection_body=reflection.body,
                )
                await send_ritual_update_to_origin(db, ritual, envelope)
                await _commit_broadcast(db)
        except Exception:  # noqa: BLE001 — broadcast is best-effort
            _log.warning(
                "group_rituals.reflection_broadcast_failed",
                exc_info=True,
            )
    return ReflectionRead(
        id=str(reflection.id),
        author_id=str(reflection.author_id),
        author_did=None,
        body=reflection.body,
        created_at=reflection.created_at,
    )


@router.get(
    "/group-rituals/{ritual_id}/reflections",
    response_model=list[ReflectionRead],
)
async def list_reflections(
    ritual_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[ReflectionRead]:
    """The post-mortem assembly: local reflections plus remote
    ``postmortem_entry`` arrivals, oldest first."""
    ritual = await _load_ritual(db, ritual_id)
    if ritual.organizer_id != user.id:
        await _require_participant(db, ritual, user.id)
    rows = (
        await db.execute(
            select(GroupRitualReflection)
            .where(GroupRitualReflection.ritual_id == ritual.id)
            .order_by(GroupRitualReflection.created_at)
        )
    ).scalars().all()
    return [
        ReflectionRead(
            id=str(row.id),
            author_id=str(row.author_id) if row.author_id else None,
            author_did=row.author_did,
            body=row.body,
            created_at=row.created_at,
        )
        for row in rows
    ]


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

    # Egregore creation flow (plan/12, v1-033): the declared egregore
    # registers at close. Idempotent — an earlier declare-egregore
    # call converges (late-accepting local participants still gain
    # their copy here).
    if ritual.egregore_name:
        await _register_egregore_locally(db, ritual, organizer_id=user.id)

    ritual.status = GroupRitualStatus.COMPLETED
    db.add(ritual)
    await db.commit()
    await db.refresh(ritual)

    # Broadcast completion (+ egregore registration) to the remote
    # roster. Both ops are idempotent receiver-side and
    # order-independent.
    try:
        if ritual.egregore_name:
            await broadcast_ritual_update(
                db,
                ritual,
                build_ritual_update_envelope(
                    str(ritual.id),
                    "egregore_registration",
                    egregore_name=ritual.egregore_name,
                ),
            )
        await broadcast_ritual_update(
            db,
            ritual,
            build_ritual_update_envelope(str(ritual.id), "completion"),
        )
        await _commit_broadcast(db)
    except Exception:  # noqa: BLE001 — broadcast is best-effort
        _log.warning(
            "group_rituals.close_broadcast_failed", exc_info=True,
        )
    return _to_read(ritual)


@router.post(
    "/group-rituals/{ritual_id}/declare-egregore",
    response_model=GroupRitualRead,
    status_code=status.HTTP_201_CREATED,
)
async def declare_egregore(
    ritual_id: UUID,
    payload: EgregoreDeclare,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> GroupRitualRead:
    """Declare the ritual a servitor/egregore creation event (v1-031).

    Registers the EGREGORE entity immediately — the organizer's vault
    plus every local non-declined participant's vault — links it via
    ``egregore_entity_id``, and broadcasts ``egregore_registration``
    to the remote roster so participating vaults register the same
    entity. Idempotent: a second declaration is a 409. The entity is
    a normal entity thereafter (offerings, contracts attach to it).

    While drafting, set ``egregore_name`` on the ritual instead; it
    registers at close.
    """
    ritual = await _load_ritual(db, ritual_id)
    await _require_organizer(ritual, user.id)
    if ritual.egregore_entity_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This ritual has already declared its egregore.",
        )
    if ritual.status not in (
        GroupRitualStatus.IN_PROGRESS,
        GroupRitualStatus.COMPLETED,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The egregore is declared during or after the working. "
                "While drafting, set egregore_name on the ritual — it "
                "registers at close."
            ),
        )
    ritual.egregore_name = payload.name
    await _register_egregore_locally(
        db, ritual, organizer_id=user.id, summary=payload.summary,
    )
    db.add(ritual)
    await db.commit()
    await db.refresh(ritual)
    read = _to_read(ritual)

    # Cross-vault registration (idempotent receiver-side; close
    # re-broadcasts harmlessly). Never fails the declaration.
    try:
        await broadcast_ritual_update(
            db,
            ritual,
            build_ritual_update_envelope(
                str(ritual.id),
                "egregore_registration",
                egregore_name=ritual.egregore_name,
            ),
        )
        await _commit_broadcast(db)
    except Exception:  # noqa: BLE001 — broadcast is best-effort
        _log.warning(
            "group_rituals.egregore_broadcast_failed", exc_info=True,
        )
    return read
