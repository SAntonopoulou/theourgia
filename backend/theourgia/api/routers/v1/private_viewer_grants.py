"""Private viewer grant HTTP endpoints — Phase 12 B138b.

Per ``plan/12-batches-backend.md`` § B138.

::

  GET    /api/v1/private-viewers              list owned (active + revoked)
  POST   /api/v1/private-viewers              issue (plaintext returned ONCE)
  POST   /api/v1/private-viewers/{id}/revoke  set revoked_at; immutable thereafter

Honesty rules wired at this layer:

  * The credential plaintext is returned in the ``POST`` response
    EXACTLY ONCE; it is never persisted in plaintext form and
    never returned again. The list endpoint never surfaces it.
  * ``revoked_at`` is immutable once set — re-attempting revoke
    on an already-revoked grant returns 409.
  * Default ``scope_kind`` is ``TAG`` — never ``FULL`` — enforced
    at the schema layer.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.private_viewer_credentials import (
    generate_plaintext,
    generate_salt,
    hash_credential,
)
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.private_viewer_grant import (
    PrivateViewerDelivery,
    PrivateViewerGrant,
    PrivateViewerScopeKind,
)

__all__ = ["router"]


router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────


class PrivateViewerGrantRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: str
    email_or_handle: str
    scope_kind: PrivateViewerScopeKind
    scope_payload: dict
    delivery: PrivateViewerDelivery
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class PrivateViewerGrantCreate(BaseModel):
    """Issue payload. ``scope_kind`` defaults to TAG (rule 11)."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=1, max_length=240)
    email_or_handle: str = Field(min_length=1, max_length=320)
    scope_kind: PrivateViewerScopeKind = PrivateViewerScopeKind.TAG
    scope_payload: dict = Field(default_factory=dict)
    delivery: PrivateViewerDelivery = PrivateViewerDelivery.SIGNED_LINK


class PrivateViewerGrantIssued(BaseModel):
    """The one-time response on issue — plaintext returned ONCE."""

    model_config = ConfigDict(extra="forbid")

    grant: PrivateViewerGrantRead
    plaintext_credential: str


# ── Helpers ────────────────────────────────────────────────────────


def _to_read(row: PrivateViewerGrant) -> PrivateViewerGrantRead:
    return PrivateViewerGrantRead(
        id=str(row.id),
        label=row.label,
        email_or_handle=row.email_or_handle,
        scope_kind=row.scope_kind,
        scope_payload=dict(row.scope_payload or {}),
        delivery=row.delivery,
        last_used_at=row.last_used_at,
        revoked_at=row.revoked_at,
        created_at=row.created_at,
    )


def _emit_audit(
    db: AsyncSession,
    *,
    actor_id: UUID,
    action: str,
    grant_id: UUID,
    detail: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            kind=AuditEventKind.FEDERATION,
            action=action,
            actor_id=actor_id,
            outcome=AuditOutcome.SUCCESS,
            detail={"grant_id": str(grant_id), **(detail or {})},
        )
    )


# ── Endpoints ──────────────────────────────────────────────────────


@router.get(
    "/private-viewers",
    response_model=list[PrivateViewerGrantRead],
)
async def list_grants(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[PrivateViewerGrantRead]:
    rows = (
        await db.execute(
            select(PrivateViewerGrant)
            .where(PrivateViewerGrant.owner_id == user.id)
            .order_by(PrivateViewerGrant.created_at.desc())
        )
    ).scalars().all()
    return [_to_read(r) for r in rows]


@router.post(
    "/private-viewers",
    response_model=PrivateViewerGrantIssued,
    status_code=status.HTTP_201_CREATED,
)
async def issue_grant(
    payload: PrivateViewerGrantCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PrivateViewerGrantIssued:
    """Issue a new grant + return the plaintext credential ONCE.

    The plaintext is never persisted in raw form; only the
    PBKDF2 hash + salt land in the DB. The caller must surface
    the plaintext to the practitioner in the same UX moment —
    this endpoint never returns it again.
    """
    plaintext = generate_plaintext()
    salt = generate_salt()
    credential_hash = hash_credential(plaintext, salt)

    grant = PrivateViewerGrant(
        owner_id=user.id,
        label=payload.label,
        email_or_handle=payload.email_or_handle,
        scope_kind=payload.scope_kind,
        scope_payload=payload.scope_payload,
        delivery=payload.delivery,
        credential_hash=credential_hash,
        credential_salt=salt,
    )
    db.add(grant)
    await db.flush()

    _emit_audit(
        db,
        actor_id=user.id,
        action="private_viewer.issue",
        grant_id=grant.id,
        detail={
            "scope_kind": payload.scope_kind.value,
            "delivery": payload.delivery.value,
        },
    )

    await db.commit()
    await db.refresh(grant)
    return PrivateViewerGrantIssued(
        grant=_to_read(grant),
        plaintext_credential=plaintext,
    )


@router.post(
    "/private-viewers/{grant_id}/revoke",
    response_model=PrivateViewerGrantRead,
)
async def revoke_grant(
    grant_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> PrivateViewerGrantRead:
    grant = (
        await db.execute(
            select(PrivateViewerGrant).where(
                PrivateViewerGrant.id == grant_id,
                PrivateViewerGrant.owner_id == user.id,
            )
        )
    ).scalars().first()
    if grant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Private viewer grant not found.",
        )
    if grant.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This grant has already been revoked.",
        )

    grant.revoked_at = datetime.now(tz=UTC)
    db.add(grant)
    _emit_audit(
        db,
        actor_id=user.id,
        action="private_viewer.revoke",
        grant_id=grant.id,
    )
    await db.commit()
    await db.refresh(grant)
    return _to_read(grant)
