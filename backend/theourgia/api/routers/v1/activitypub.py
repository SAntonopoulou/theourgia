"""ActivityPub HTTP endpoints — Phase 13 stub follow-on.

Per ``plan/13-activitypub.md``.

::

  GET   /api/v1/activitypub/settings                  caller's settings (get-or-create)
  PATCH /api/v1/activitypub/settings                  partial update

  GET   /api/v1/activitypub/followers                 confirmed followers
  GET   /api/v1/activitypub/follow-requests           pending requests
  POST  /api/v1/activitypub/follow-requests/{id}/approve
  POST  /api/v1/activitypub/follow-requests/{id}/decline

Honesty rules wired at this layer:

  · Settings are get-or-create — the first GET writes the row
    with the H08 default mapping (entries→Article · notes→Note ·
    rituals→Event · publications→Article).
  · ``enabled`` defaults FALSE (H08 rule 28 · per-network opt-in).
  · ``follower_approval`` defaults MANUAL for vaults (H08 rule 20).
  · ``broadcast_deletes`` defaults FALSE (rule 32 — user opts in
    given the cache caveat).
  · Approve / decline are immutable terminal states — re-attempt
    returns 409.
  · v1-026: approve queues a signed AP ``Accept`` to the follower's
    inbox via the Phase 12.5 delivery queue (no-op while the
    transport gate is off; failures never block the local approval).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.federation.ap_outbound import enqueue_accept_for_follow
from theourgia.models.activitypub import (
    ActivityPubFollower,
    ActivityPubFollowRequest,
    ActivityPubSettings,
    FollowerApproval,
    FollowRequestState,
)
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome

__all__ = ["router"]


_log = logging.getLogger(__name__)


router = APIRouter()


DEFAULT_OBJECT_TYPE_MAPPING: dict[str, str] = {
    "entries": "Article",
    "notes": "Note",
    "rituals": "Event",
    "publications": "Article",
}


# ── Schemas ─────────────────────────────────────────────────────────


class SettingsRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool
    display_name_override: str | None
    bio_override: str | None
    follower_approval: FollowerApproval
    broadcast_creates: bool
    broadcast_updates: bool
    broadcast_deletes: bool
    object_type_mapping: dict
    created_at: datetime
    updated_at: datetime


class SettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool | None = None
    display_name_override: str | None = Field(default=None, max_length=255)
    bio_override: str | None = Field(default=None, max_length=2000)
    follower_approval: FollowerApproval | None = None
    broadcast_creates: bool | None = None
    broadcast_updates: bool | None = None
    broadcast_deletes: bool | None = None
    object_type_mapping: dict | None = None


class FollowerRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    follower_did: str
    follower_handle: str | None
    follower_inbox_url: str | None
    last_delivery_at: datetime | None
    created_at: datetime


class FollowRequestRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    follower_did: str
    follower_handle: str | None
    state: FollowRequestState
    resolved_at: datetime | None
    created_at: datetime


# ── Helpers ─────────────────────────────────────────────────────────


async def _get_or_create_settings(
    db: AsyncSession, owner_id: UUID,
) -> ActivityPubSettings:
    row = (
        await db.execute(
            select(ActivityPubSettings).where(
                ActivityPubSettings.owner_id == owner_id,
            )
        )
    ).scalars().first()
    if row is not None:
        return row
    row = ActivityPubSettings(
        owner_id=owner_id,
        object_type_mapping=dict(DEFAULT_OBJECT_TYPE_MAPPING),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


def _to_settings_read(row: ActivityPubSettings) -> SettingsRead:
    mapping = dict(row.object_type_mapping or {})
    # Backfill the H08 default mapping for fields the row doesn't
    # yet name. Defence in depth — a row created before the
    # mapping seed should still render the right defaults on read.
    for key, value in DEFAULT_OBJECT_TYPE_MAPPING.items():
        mapping.setdefault(key, value)
    return SettingsRead(
        enabled=row.enabled,
        display_name_override=row.display_name_override,
        bio_override=row.bio_override,
        follower_approval=row.follower_approval,
        broadcast_creates=row.broadcast_creates,
        broadcast_updates=row.broadcast_updates,
        broadcast_deletes=row.broadcast_deletes,
        object_type_mapping=mapping,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _to_follower_read(row: ActivityPubFollower) -> FollowerRead:
    return FollowerRead(
        id=str(row.id),
        follower_did=row.follower_did,
        follower_handle=row.follower_handle,
        follower_inbox_url=row.follower_inbox_url,
        last_delivery_at=row.last_delivery_at,
        created_at=row.created_at,
    )


def _to_request_read(
    row: ActivityPubFollowRequest,
) -> FollowRequestRead:
    return FollowRequestRead(
        id=str(row.id),
        follower_did=row.follower_did,
        follower_handle=row.follower_handle,
        state=row.state,
        resolved_at=row.resolved_at,
        created_at=row.created_at,
    )


def _emit_ap_audit(
    db: AsyncSession,
    *,
    actor_id: UUID,
    action: str,
    detail: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            kind=AuditEventKind.FEDERATION,
            action=action,
            actor_id=actor_id,
            outcome=AuditOutcome.SUCCESS,
            detail=detail or {},
        )
    )


# ── Endpoints — settings ───────────────────────────────────────────


@router.get(
    "/activitypub/settings",
    response_model=SettingsRead,
)
async def get_settings(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SettingsRead:
    row = await _get_or_create_settings(db, user.id)
    return _to_settings_read(row)


@router.patch(
    "/activitypub/settings",
    response_model=SettingsRead,
)
async def update_settings(
    payload: SettingsUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SettingsRead:
    row = await _get_or_create_settings(db, user.id)
    data = payload.model_dump(exclude_unset=True)
    previous_enabled = row.enabled
    for key, value in data.items():
        setattr(row, key, value)
    db.add(row)

    # First-activation audit row — surfaces the
    # "Open your public actor to the wider web" moment on the
    # admin's audit timeline.
    if data.get("enabled") is True and not previous_enabled:
        _emit_ap_audit(
            db,
            actor_id=user.id,
            action="activitypub.enable",
        )

    await db.commit()
    await db.refresh(row)
    return _to_settings_read(row)


# ── Endpoints — followers ──────────────────────────────────────────


@router.get(
    "/activitypub/followers",
    response_model=list[FollowerRead],
)
async def list_followers(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[FollowerRead]:
    rows = (
        await db.execute(
            select(ActivityPubFollower)
            .where(ActivityPubFollower.owner_id == user.id)
            .order_by(ActivityPubFollower.created_at.desc())
        )
    ).scalars().all()
    return [_to_follower_read(r) for r in rows]


@router.get(
    "/activitypub/follow-requests",
    response_model=list[FollowRequestRead],
)
async def list_follow_requests(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    state: Literal["pending", "all"] = "pending",
) -> list[FollowRequestRead]:
    stmt = (
        select(ActivityPubFollowRequest)
        .where(ActivityPubFollowRequest.owner_id == user.id)
    )
    if state == "pending":
        stmt = stmt.where(
            ActivityPubFollowRequest.state
            == FollowRequestState.PENDING,
        )
    stmt = stmt.order_by(ActivityPubFollowRequest.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_request_read(r) for r in rows]


async def _resolve_request(
    db: AsyncSession,
    *,
    request_id: UUID,
    user_id: UUID,
    new_state: FollowRequestState,
) -> ActivityPubFollowRequest:
    req = (
        await db.execute(
            select(ActivityPubFollowRequest).where(
                ActivityPubFollowRequest.id == request_id,
                ActivityPubFollowRequest.owner_id == user_id,
            )
        )
    ).scalars().first()
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow request not found.",
        )
    if req.state != FollowRequestState.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This follow request has already been resolved.",
        )
    req.state = new_state
    req.resolved_at = datetime.now(tz=UTC)
    db.add(req)
    return req


@router.post(
    "/activitypub/follow-requests/{request_id}/approve",
    response_model=FollowRequestRead,
)
async def approve_request(
    request_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> FollowRequestRead:
    req = await _resolve_request(
        db,
        request_id=request_id,
        user_id=user.id,
        new_state=FollowRequestState.ACCEPTED,
    )
    # Materialise the confirmed-follower row; the local row exists
    # immediately regardless of transport state.
    db.add(
        ActivityPubFollower(
            owner_id=user.id,
            follower_did=req.follower_did,
            follower_handle=req.follower_handle,
        )
    )
    # v1-026: queue the signed Accept to the follower's inbox. The
    # helper no-ops when transport is disabled; failures never block
    # the local approval (the follower row above is the source of
    # truth — the Accept is a courtesy the retry queue re-attempts).
    try:
        await enqueue_accept_for_follow(
            db,
            owner_id=user.id,
            follower_did=req.follower_did,
        )
    except Exception:  # noqa: BLE001 — approval must never fail on enqueue
        _log.warning(
            "activitypub.approve.accept_enqueue_failed",
            extra={"follower_did": req.follower_did},
        )
    _emit_ap_audit(
        db,
        actor_id=user.id,
        action="activitypub.follow.approve",
        detail={
            "request_id": str(req.id),
            "follower_did": req.follower_did,
        },
    )
    await db.commit()
    await db.refresh(req)
    return _to_request_read(req)


@router.post(
    "/activitypub/follow-requests/{request_id}/decline",
    response_model=FollowRequestRead,
)
async def decline_request(
    request_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> FollowRequestRead:
    req = await _resolve_request(
        db,
        request_id=request_id,
        user_id=user.id,
        new_state=FollowRequestState.REJECTED,
    )
    _emit_ap_audit(
        db,
        actor_id=user.id,
        action="activitypub.follow.decline",
        detail={
            "request_id": str(req.id),
            "follower_did": req.follower_did,
        },
    )
    await db.commit()
    await db.refresh(req)
    return _to_request_read(req)
