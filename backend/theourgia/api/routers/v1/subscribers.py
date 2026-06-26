"""Subscribers endpoints (B128).

Per ``plan/10-batches-backend.md`` § B128.

Two halves of one substrate:

  1. Publisher-owned admin (auth required):
     - GET    /api/v1/subscribers
     - POST   /api/v1/subscribers/{id}/resend-confirmation
     - DELETE /api/v1/subscribers/{id}

  2. Public subscribe flow (no auth required):
     - POST /api/v1/vaults/{owner_id}/subscribe
     - POST /api/v1/subscribers/confirm
     - POST /api/v1/subscribers/unsubscribe

Honesty rules:
  * Double-opt-in is mandatory. POST /vaults/.../subscribe creates
    a PENDING_CONFIRMATION row + issues a confirmation_token; the
    practitioner is only ACTIVE after they POST /subscribers/confirm
    with that token.
  * The acknowledgment response after POST subscribe is verbatim:
    "Check your email to confirm — you're not subscribed until you
    click the link."
  * Failed-payment status is --warn, NEVER --danger. The webhook
    flips Subscriber.status to FAILED_PAYMENT (handled in
    webhook_processor's extension here).
  * Unsubscribe is sticky — once UNSUBSCRIBED, re-subscribing
    requires a fresh signup (the route generates new tokens).
  * Per-publisher email uniqueness — one publisher cannot have
    duplicate subscribers with the same email.
  * resend-confirmation is rate-limited 1/min per Subscriber.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import OptionalCookieUser, get_db_session
from theourgia.models.subscriber import Subscriber, SubscriberStatus

__all__ = [
    "router",
    "DOUBLE_OPT_IN_ACK",
    "RESEND_RATE_LIMIT",
]


router = APIRouter()


# The H07 Public Vault Page acknowledgment copy — verbatim.
DOUBLE_OPT_IN_ACK = (
    "Check your email to confirm — you're not subscribed until you "
    "click the link."
)

# The plan's rate-limit on /resend-confirmation. One minute is
# enough to dodge accidental double-clicks without frustrating
# the practitioner.
RESEND_RATE_LIMIT = timedelta(minutes=1)


# ── Schemas ────────────────────────────────────────────────────


class SubscriberRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    owner_id: str
    email: str
    tier_id: str | None
    status: str
    confirmed_at: datetime | None
    unsubscribed_at: datetime | None
    stripe_subscription_id: str | None
    last_failed_payment_at: datetime | None
    created_at: datetime
    updated_at: datetime


class SubscribePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    tier_id: UUID | None = None


class SubscribeAck(BaseModel):
    """The H07 surface receives this verbatim copy."""

    model_config = ConfigDict(extra="forbid")

    acknowledged: bool
    message: str


class ConfirmPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str


class UnsubscribePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str


# ── Helpers ────────────────────────────────────────────────────


def _new_token() -> str:
    """32-byte url-safe random token. Same shape as the B127
    download tokens — defence in depth on entropy."""
    return secrets.token_urlsafe(32)


def _to_subscriber_read(row: Subscriber) -> SubscriberRead:
    return SubscriberRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        email=row.email,
        tier_id=str(row.tier_id) if row.tier_id else None,
        status=row.status.value,
        confirmed_at=row.confirmed_at,
        unsubscribed_at=row.unsubscribed_at,
        stripe_subscription_id=row.stripe_subscription_id,
        last_failed_payment_at=row.last_failed_payment_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ── Publisher admin ────────────────────────────────────────────


@router.get(
    "/subscribers",
    response_model=list[SubscriberRead],
    tags=["subscribers"],
)
async def list_subscribers(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
    status_filter: SubscriberStatus | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[SubscriberRead]:
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    stmt = (
        select(Subscriber)
        .where(Subscriber.owner_id == current_user.id)
    )
    if status_filter is not None:
        stmt = stmt.where(Subscriber.status == status_filter)
    stmt = (
        stmt.order_by(Subscriber.created_at.desc())
        .offset(max(0, offset))
        .limit(min(max(1, limit), 500))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_subscriber_read(r) for r in rows]


@router.post(
    "/subscribers/{subscriber_id}/resend-confirmation",
    response_model=SubscriberRead,
    tags=["subscribers"],
)
async def resend_confirmation(
    subscriber_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> SubscriberRead:
    """Re-send the double-opt-in email. Rate-limited 1/min per
    subscriber to dodge accidental double-clicks."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(Subscriber, subscriber_id)
    if row is None or row.owner_id != current_user.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Subscriber not found.",
        )
    if row.status != SubscriberStatus.PENDING_CONFIRMATION:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot resend from status {row.status.value!r}.",
        )
    now = datetime.now(tz=timezone.utc)
    if (
        row.last_confirmation_sent_at is not None
        and now - row.last_confirmation_sent_at < RESEND_RATE_LIMIT
    ):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Resend rate-limited (1/min).",
        )
    row.last_confirmation_sent_at = now
    # The actual email send is the Phase 01 email substrate — out
    # of scope here. Tests assert the timestamp is bumped.
    await db.commit()
    await db.refresh(row)
    return _to_subscriber_read(row)


@router.delete(
    "/subscribers/{subscriber_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["subscribers"],
)
async def admin_unsubscribe(
    subscriber_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: OptionalCookieUser,
) -> Response:
    """Publisher-side unsubscribe. The row STAYS for audit;
    status flips to UNSUBSCRIBED."""
    if current_user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Auth required.")
    row = await db.get(Subscriber, subscriber_id)
    if row is None or row.owner_id != current_user.id:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Subscriber not found.",
        )
    row.status = SubscriberStatus.UNSUBSCRIBED
    row.unsubscribed_at = datetime.now(tz=timezone.utc)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── Public subscribe flow ──────────────────────────────────────


@router.post(
    "/vaults/{owner_id}/subscribe",
    response_model=SubscribeAck,
    status_code=status.HTTP_201_CREATED,
    tags=["subscribers"],
)
async def public_subscribe(
    owner_id: UUID,
    payload: SubscribePayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubscribeAck:
    """Public-facing double-opt-in entry. Anonymous.

    If a subscriber already exists for this (owner_id, email):
      - PENDING_CONFIRMATION → reuse the row (don't issue a fresh
        token; the existing one is still valid).
      - ACTIVE → no-op acknowledgment (don't reveal that the
        email is already on the list).
      - UNSUBSCRIBED → re-subscribe with FRESH tokens + flip
        status back to PENDING_CONFIRMATION (per the plan, re-
        subscribing requires a new signup with new tokens).
      - FAILED_PAYMENT → respond as if pending (the publisher's
        side already has it surfaced; the subscriber doesn't need
        to know about the failure).
    """
    now = datetime.now(tz=timezone.utc)
    existing = (
        await db.execute(
            select(Subscriber)
            .where(Subscriber.owner_id == owner_id)
            .where(Subscriber.email == str(payload.email))
        )
    ).scalars().first()

    if existing is None:
        row = Subscriber(
            owner_id=owner_id,
            email=str(payload.email),
            tier_id=payload.tier_id,
            status=SubscriberStatus.PENDING_CONFIRMATION,
            confirmation_token=_new_token(),
            unsubscribe_token=_new_token(),
            last_confirmation_sent_at=now,
        )
        db.add(row)
    elif existing.status == SubscriberStatus.UNSUBSCRIBED:
        existing.status = SubscriberStatus.PENDING_CONFIRMATION
        existing.unsubscribed_at = None
        existing.confirmation_token = _new_token()
        existing.unsubscribe_token = _new_token()
        existing.confirmed_at = None
        existing.last_confirmation_sent_at = now
    elif existing.status == SubscriberStatus.PENDING_CONFIRMATION:
        # Don't rotate the token on a duplicate submission — the
        # original email link should still work.
        existing.last_confirmation_sent_at = now

    await db.commit()
    return SubscribeAck(acknowledged=True, message=DOUBLE_OPT_IN_ACK)


@router.post(
    "/subscribers/confirm",
    response_model=SubscriberRead,
    tags=["subscribers"],
)
async def confirm_subscription(
    payload: ConfirmPayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubscriberRead:
    """Flip status PENDING_CONFIRMATION → ACTIVE."""
    row = (
        await db.execute(
            select(Subscriber).where(
                Subscriber.confirmation_token == payload.token,
            )
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Confirmation token not recognised.",
        )
    if row.status != SubscriberStatus.PENDING_CONFIRMATION:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot confirm from status {row.status.value!r}.",
        )
    row.status = SubscriberStatus.ACTIVE
    row.confirmed_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_subscriber_read(row)


@router.post(
    "/subscribers/unsubscribe",
    response_model=SubscriberRead,
    tags=["subscribers"],
)
async def public_unsubscribe(
    payload: UnsubscribePayload,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SubscriberRead:
    """Public unsubscribe via the permanent token embedded in
    every newsletter. Sticky — re-subscribing requires a fresh
    signup with new tokens."""
    row = (
        await db.execute(
            select(Subscriber).where(
                Subscriber.unsubscribe_token == payload.token,
            )
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Unsubscribe token not recognised.",
        )
    if row.status == SubscriberStatus.UNSUBSCRIBED:
        # Idempotent.
        return _to_subscriber_read(row)
    row.status = SubscriberStatus.UNSUBSCRIBED
    row.unsubscribed_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_subscriber_read(row)
