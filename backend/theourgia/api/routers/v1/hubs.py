"""Hubs HTTP endpoints — Phase 12 B137.

Per ``plan/12-batches-backend.md`` § B137.

::

  GET    /api/v1/hubs                                    list caller's hubs
  POST   /api/v1/hubs                                    create
  GET    /api/v1/hubs/{id}                               full record
  PATCH  /api/v1/hubs/{id}                               owner / EDIT_HUB_CONTENT
  GET    /api/v1/hubs/{id}/members                       MANAGE_MEMBERS
  POST   /api/v1/hubs/{id}/members/{user_id}/role        change role
  DELETE /api/v1/hubs/{id}/members/{user_id}             remove
  GET    /api/v1/hubs/{id}/roles                         matrix
  PATCH  /api/v1/hubs/{id}/roles                         bulk replace matrix

Honesty rules wired at this layer:

  * Owner of a hub is auto-admin via a Membership row written in
    the same transaction as ``POST /hubs``.
  * The default capability matrix from
    ``hub_capability.DEFAULT_CAPABILITY_MATRIX`` is seeded at
    hub creation.
  * Private hubs return 403 to non-members; public hubs return
    the full record to anyone authenticated.
  * Role changes refuse to demote the hub owner (owner stays
    admin).
  * Wire keys for roles are BARE — ``admin`` / ``officer`` /
    ``moderator`` / ``member`` / ``observer`` — stripped at the
    seam from the prefixed Phase 01 ``MembershipRole`` enum.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.hub_capability import (
    DEFAULT_CAPABILITY_MATRIX,
    HUB_ROLES,
    HubCapability,
    HubRoleCapability,
    bare_to_role,
    role_to_bare,
)
from theourgia.models.identity import (
    Hub,
    HubMembershipPolicy,
    Membership,
    MembershipRole,
)

__all__ = ["router"]


router = APIRouter()


_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$")


# ── Bare role + policy types ─────────────────────────────────────────


BareHubRole = Literal["admin", "officer", "moderator", "member", "observer"]


# ── Schemas ─────────────────────────────────────────────────────────


class HubRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    slug: str
    name: str  # mapped from display_name
    tagline: str | None
    description: str
    owner_id: str | None
    membership_policy: HubMembershipPolicy
    accepts_sso: bool
    auto_curates: bool
    public_banner_url: str | None
    public_tradition_tags: list[str]
    created_at: datetime
    updated_at: datetime


class HubCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    tagline: str | None = Field(default=None, max_length=420)
    description: str = ""
    membership_policy: HubMembershipPolicy = HubMembershipPolicy.PRIVATE
    accepts_sso: bool = False
    auto_curates: bool = False
    public_banner_url: str | None = Field(default=None, max_length=2048)
    public_tradition_tags: list[str] = Field(default_factory=list)


class HubUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    tagline: str | None = Field(default=None, max_length=420)
    description: str | None = None
    membership_policy: HubMembershipPolicy | None = None
    accepts_sso: bool | None = None
    auto_curates: bool | None = None
    public_banner_url: str | None = Field(default=None, max_length=2048)
    public_tradition_tags: list[str] | None = None


class MembershipRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    user_id: str
    hub_id: str
    role: BareHubRole
    created_at: datetime


class RoleChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: BareHubRole


class CapabilityMatrixRead(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hub_id: str
    matrix: dict[BareHubRole, list[HubCapability]]


class CapabilityMatrixUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    matrix: dict[BareHubRole, list[HubCapability]]


# ── Helpers ─────────────────────────────────────────────────────────


def _to_read(row: Hub) -> HubRead:
    return HubRead(
        id=str(row.id),
        slug=row.slug,
        name=row.display_name,
        tagline=row.tagline,
        description=row.description,
        owner_id=str(row.owner_id) if row.owner_id else None,
        membership_policy=row.membership_policy,
        accepts_sso=row.accepts_sso,
        auto_curates=row.auto_curates,
        public_banner_url=row.public_banner_url,
        public_tradition_tags=list(row.public_tradition_tags or []),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_membership_read(row: Membership) -> MembershipRead:
    return MembershipRead(
        id=str(row.id),
        user_id=str(row.user_id),
        hub_id=str(row.hub_id),
        role=role_to_bare(row.role),  # type: ignore[arg-type]
        created_at=row.created_at,
    )


async def _load_hub(db: AsyncSession, hub_id: UUID) -> Hub:
    hub = (
        await db.execute(
            select(Hub).where(Hub.id == hub_id, Hub.deleted_at.is_(None))
        )
    ).scalars().first()
    if hub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hub not found.",
        )
    return hub


async def _caller_capabilities(
    db: AsyncSession, hub: Hub, user_id: UUID,
) -> frozenset[HubCapability]:
    """Capabilities the user holds in the hub. The hub owner is
    treated as full-admin regardless of explicit grants."""
    if hub.owner_id == user_id:
        return frozenset(HubCapability)
    membership = (
        await db.execute(
            select(Membership).where(
                Membership.hub_id == hub.id,
                Membership.user_id == user_id,
            )
        )
    ).scalars().first()
    if membership is None:
        return frozenset()
    rows = (
        await db.execute(
            select(HubRoleCapability.capability).where(
                HubRoleCapability.hub_id == hub.id,
                HubRoleCapability.role == membership.role,
            )
        )
    ).scalars().all()
    return frozenset(rows)


def _require(
    caps: frozenset[HubCapability], needed: HubCapability,
) -> None:
    if needed not in caps:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You cannot do this because you lack permission "
                f"{needed.value}."
            ),
        )


def _emit_admin_event(
    db: AsyncSession,
    *,
    hub_id: UUID,
    actor_id: UUID,
    action: str,
    detail: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            kind=AuditEventKind.ADMIN,
            action=action,
            actor_id=actor_id,
            hub_id=hub_id,
            outcome=AuditOutcome.SUCCESS,
            detail=detail or {},
        )
    )


# ── Endpoints ───────────────────────────────────────────────────────


@router.get("/hubs", response_model=list[HubRead])
async def list_hubs(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[HubRead]:
    member_hub_ids = (
        await db.execute(
            select(Membership.hub_id).where(
                Membership.user_id == user.id,
                Membership.hub_id.is_not(None),
            )
        )
    ).scalars().all()
    hub_ids = set(member_hub_ids)
    if hub_ids:
        rows = (
            await db.execute(
                select(Hub).where(
                    Hub.deleted_at.is_(None),
                    (Hub.owner_id == user.id) | Hub.id.in_(hub_ids),
                )
            )
        ).scalars().all()
    else:
        rows = (
            await db.execute(
                select(Hub).where(
                    Hub.deleted_at.is_(None),
                    Hub.owner_id == user.id,
                )
            )
        ).scalars().all()
    return [_to_read(r) for r in rows]


@router.post(
    "/hubs",
    response_model=HubRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_hub(
    payload: HubCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> HubRead:
    if not _SLUG_RE.match(payload.slug):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Slug must be 2-64 chars: lowercase letters, digits, "
                "or hyphens; cannot start or end with a hyphen."
            ),
        )
    hub = Hub(
        slug=payload.slug,
        display_name=payload.name,
        tagline=payload.tagline,
        description=payload.description,
        owner_id=user.id,
        membership_policy=payload.membership_policy,
        accepts_sso=payload.accepts_sso,
        auto_curates=payload.auto_curates,
        public_banner_url=payload.public_banner_url,
        public_tradition_tags=payload.public_tradition_tags,
    )
    db.add(hub)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A hub with that slug already exists.",
        )

    db.add(
        Membership(
            hub_id=hub.id,
            user_id=user.id,
            role=MembershipRole.HUB_ADMIN,
        )
    )
    for role, caps in DEFAULT_CAPABILITY_MATRIX.items():
        for cap in caps:
            db.add(
                HubRoleCapability(
                    hub_id=hub.id, role=role, capability=cap,
                )
            )

    _emit_admin_event(
        db,
        hub_id=hub.id,
        actor_id=user.id,
        action="hub.create",
        detail={"slug": hub.slug, "policy": hub.membership_policy.value},
    )

    await db.commit()
    await db.refresh(hub)
    return _to_read(hub)


@router.get("/hubs/{hub_id}", response_model=HubRead)
async def get_hub(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> HubRead:
    hub = await _load_hub(db, hub_id)
    if hub.membership_policy == HubMembershipPolicy.PRIVATE:
        caps = await _caller_capabilities(db, hub, user.id)
        if not caps:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This hub is private.",
            )
    return _to_read(hub)


@router.patch("/hubs/{hub_id}", response_model=HubRead)
async def update_hub(
    hub_id: UUID,
    payload: HubUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> HubRead:
    hub = await _load_hub(db, hub_id)
    caps = await _caller_capabilities(db, hub, user.id)
    _require(caps, HubCapability.EDIT_HUB_CONTENT)

    data = payload.model_dump(exclude_unset=True)
    # ``name`` in the schema maps to ``display_name`` on the model.
    if "name" in data:
        data["display_name"] = data.pop("name")
    for key, value in data.items():
        setattr(hub, key, value)
    db.add(hub)
    _emit_admin_event(
        db,
        hub_id=hub.id,
        actor_id=user.id,
        action="hub.update",
        detail={"fields": sorted(data.keys())},
    )
    await db.commit()
    await db.refresh(hub)
    return _to_read(hub)


@router.get(
    "/hubs/{hub_id}/members", response_model=list[MembershipRead],
)
async def list_members(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[MembershipRead]:
    hub = await _load_hub(db, hub_id)
    caps = await _caller_capabilities(db, hub, user.id)
    _require(caps, HubCapability.MANAGE_MEMBERS)
    rows = (
        await db.execute(
            select(Membership).where(Membership.hub_id == hub.id)
        )
    ).scalars().all()
    return [_to_membership_read(r) for r in rows]


@router.post(
    "/hubs/{hub_id}/members/{target_user_id}/role",
    response_model=MembershipRead,
)
async def change_role(
    hub_id: UUID,
    target_user_id: UUID,
    payload: RoleChange,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> MembershipRead:
    hub = await _load_hub(db, hub_id)
    caps = await _caller_capabilities(db, hub, user.id)
    _require(caps, HubCapability.MANAGE_MEMBERS)

    new_role = bare_to_role(payload.role)

    if (
        hub.owner_id is not None
        and target_user_id == hub.owner_id
        and new_role != MembershipRole.HUB_ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The hub owner cannot be demoted from admin.",
        )

    membership = (
        await db.execute(
            select(Membership).where(
                Membership.hub_id == hub.id,
                Membership.user_id == target_user_id,
            )
        )
    ).scalars().first()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That user is not a member of this hub.",
        )

    previous = membership.role
    membership.role = new_role
    db.add(membership)
    _emit_admin_event(
        db,
        hub_id=hub.id,
        actor_id=user.id,
        action="hub.member.role_change",
        detail={
            "target_user_id": str(target_user_id),
            "from": previous.value,
            "to": new_role.value,
        },
    )
    await db.commit()
    await db.refresh(membership)
    return _to_membership_read(membership)


@router.delete(
    "/hubs/{hub_id}/members/{target_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    hub_id: UUID,
    target_user_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    hub = await _load_hub(db, hub_id)
    caps = await _caller_capabilities(db, hub, user.id)
    _require(caps, HubCapability.MANAGE_MEMBERS)

    if hub.owner_id is not None and target_user_id == hub.owner_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The hub owner cannot be removed.",
        )

    result = await db.execute(
        delete(Membership).where(
            Membership.hub_id == hub.id,
            Membership.user_id == target_user_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That user is not a member of this hub.",
        )
    _emit_admin_event(
        db,
        hub_id=hub.id,
        actor_id=user.id,
        action="hub.member.remove",
        detail={"target_user_id": str(target_user_id)},
    )
    await db.commit()


@router.get(
    "/hubs/{hub_id}/roles", response_model=CapabilityMatrixRead,
)
async def get_role_matrix(
    hub_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CapabilityMatrixRead:
    hub = await _load_hub(db, hub_id)
    caps = await _caller_capabilities(db, hub, user.id)
    if not caps:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this hub.",
        )
    rows = (
        await db.execute(
            select(HubRoleCapability).where(
                HubRoleCapability.hub_id == hub.id,
            )
        )
    ).scalars().all()
    matrix: dict[BareHubRole, list[HubCapability]] = {
        role_to_bare(r): []  # type: ignore[misc]
        for r in HUB_ROLES
    }
    for r in rows:
        matrix[role_to_bare(r.role)].append(r.capability)  # type: ignore[index]
    return CapabilityMatrixRead(hub_id=str(hub.id), matrix=matrix)


@router.patch(
    "/hubs/{hub_id}/roles", response_model=CapabilityMatrixRead,
)
async def update_role_matrix(
    hub_id: UUID,
    payload: CapabilityMatrixUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CapabilityMatrixRead:
    hub = await _load_hub(db, hub_id)
    caps = await _caller_capabilities(db, hub, user.id)
    _require(caps, HubCapability.MANAGE_PERMISSION_MATRIX)

    current_rows = (
        await db.execute(
            select(HubRoleCapability).where(
                HubRoleCapability.hub_id == hub.id,
            )
        )
    ).scalars().all()
    current: dict[MembershipRole, set[HubCapability]] = {
        r: set() for r in HUB_ROLES
    }
    for r in current_rows:
        current[r.role].add(r.capability)

    incoming: dict[MembershipRole, set[HubCapability]] = {
        bare_to_role(bare): set(payload.matrix.get(bare, []))
        for bare in ("admin", "officer", "moderator", "member", "observer")
    }

    audit_changes: list[dict] = []
    for role in HUB_ROLES:
        added = incoming[role] - current[role]
        removed = current[role] - incoming[role]
        for cap in added:
            db.add(
                HubRoleCapability(
                    hub_id=hub.id, role=role, capability=cap,
                )
            )
            audit_changes.append(
                {
                    "role": role_to_bare(role),
                    "capability": cap.value,
                    "op": "grant",
                }
            )
        if removed:
            await db.execute(
                delete(HubRoleCapability).where(
                    HubRoleCapability.hub_id == hub.id,
                    HubRoleCapability.role == role,
                    HubRoleCapability.capability.in_(removed),
                )
            )
            for cap in removed:
                audit_changes.append(
                    {
                        "role": role_to_bare(role),
                        "capability": cap.value,
                        "op": "revoke",
                    }
                )

    if audit_changes:
        _emit_admin_event(
            db,
            hub_id=hub.id,
            actor_id=user.id,
            action="hub.roles.update",
            detail={"changes": audit_changes},
        )

    await db.commit()
    return await get_role_matrix(hub_id, user, db)
