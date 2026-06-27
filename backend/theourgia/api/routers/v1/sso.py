"""SSO assertion endpoints — Phase 12 B141.

Per ``plan/12-batches-backend.md`` § B141.

::

  GET  /api/v1/sso/assertions                      list issuer's assertions
  POST /api/v1/sso/authorize                       create + return id
  POST /api/v1/sso/assertions/{id}/revoke          set revoked_at

Honesty rules wired:

  · ``expires_at_utc`` is server-fixed at now + 24h per H08
    rule. The client cannot specify a longer window.
  · ``revoked_at`` once set is immutable — 409 on re-revoke.
  · The signature is NOT yet generated — Phase 12.5 transport
    fills it. B141 ships the consent moment + the revoke list;
    the cross-instance wire follows.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.sso_assertion import SsoAssertion

__all__ = ["router"]


router = APIRouter()


ASSERTION_TTL = timedelta(hours=24)


# ── Schemas ─────────────────────────────────────────────────────────


class SsoAssertionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    target_did: str
    scope_payload: dict
    expires_at_utc: datetime
    revoked_at: datetime | None
    signature_b64: str | None
    created_at: datetime


class SsoAuthorizePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_did: str = Field(min_length=1, max_length=255)
    scope_payload: dict = Field(default_factory=dict)


# ── Helpers ─────────────────────────────────────────────────────────


def _to_read(row: SsoAssertion) -> SsoAssertionRead:
    return SsoAssertionRead(
        id=str(row.id),
        target_did=row.target_did,
        scope_payload=dict(row.scope_payload or {}),
        expires_at_utc=row.expires_at_utc,
        revoked_at=row.revoked_at,
        signature_b64=row.signature_b64,
        created_at=row.created_at,
    )


def _emit_audit(
    db: AsyncSession,
    *,
    actor_id: UUID,
    action: str,
    assertion_id: UUID,
    detail: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            kind=AuditEventKind.FEDERATION,
            action=action,
            actor_id=actor_id,
            outcome=AuditOutcome.SUCCESS,
            detail={"assertion_id": str(assertion_id), **(detail or {})},
        )
    )


# ── Endpoints ──────────────────────────────────────────────────────


@router.get(
    "/sso/assertions", response_model=list[SsoAssertionRead],
)
async def list_assertions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[SsoAssertionRead]:
    """List issuer's assertions. Order: active (non-revoked,
    non-expired) first by expires_at_utc, then revoked + expired
    descending by created_at."""
    rows = (
        await db.execute(
            select(SsoAssertion)
            .where(SsoAssertion.issuer_user_id == user.id)
            .order_by(SsoAssertion.created_at.desc())
        )
    ).scalars().all()
    return [_to_read(r) for r in rows]


@router.post(
    "/sso/authorize",
    response_model=SsoAssertionRead,
    status_code=status.HTTP_201_CREATED,
)
async def authorize(
    payload: SsoAuthorizePayload,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SsoAssertionRead:
    """Issue a new assertion. Server fixes expires_at_utc = now + 24h."""
    now = datetime.now(tz=UTC)
    assertion = SsoAssertion(
        issuer_user_id=user.id,
        target_did=payload.target_did,
        scope_payload=payload.scope_payload,
        expires_at_utc=now + ASSERTION_TTL,
    )
    db.add(assertion)
    await db.flush()
    _emit_audit(
        db,
        actor_id=user.id,
        action="sso.authorize",
        assertion_id=assertion.id,
        detail={"target_did": payload.target_did},
    )
    await db.commit()
    await db.refresh(assertion)
    return _to_read(assertion)


@router.post(
    "/sso/assertions/{assertion_id}/revoke",
    response_model=SsoAssertionRead,
)
async def revoke(
    assertion_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SsoAssertionRead:
    assertion = (
        await db.execute(
            select(SsoAssertion).where(
                SsoAssertion.id == assertion_id,
                SsoAssertion.issuer_user_id == user.id,
            )
        )
    ).scalars().first()
    if assertion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SSO assertion not found.",
        )
    if assertion.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This assertion has already been revoked.",
        )
    assertion.revoked_at = datetime.now(tz=UTC)
    db.add(assertion)
    _emit_audit(
        db,
        actor_id=user.id,
        action="sso.revoke",
        assertion_id=assertion.id,
    )
    await db.commit()
    await db.refresh(assertion)
    return _to_read(assertion)
