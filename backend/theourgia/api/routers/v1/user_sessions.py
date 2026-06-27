"""Per-user sessions + devices — H10 Cluster B6 prerequisite.

The H10 SessionsAndDevices surface (Cluster B6) lists active sessions
in device-friendly language (rule 48 — per-device, not per-token).
Raw token IDs are NEVER returned; the surface speaks of "this laptop ·
Athens · last seen 14 minutes ago" rather than UUIDs.

Endpoints:

  GET    /api/v1/me/sessions                   list active sessions
  DELETE /api/v1/me/sessions/{session_id}      revoke one
  POST   /api/v1/me/sessions/revoke-others     revoke all except current

Device names are derived from the User-Agent + a coarse IP-geo
fallback. The shape never carries the raw User-Agent string — only
the rendered name.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.auth.tokens import hash_token
from theourgia.core.authz.audit import AuditLogger
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.identity import Session as SessionRow

__all__ = ["router"]


router = APIRouter()


_FIREFOX = re.compile(r"firefox", re.IGNORECASE)
_CHROME = re.compile(r"chrome|chromium", re.IGNORECASE)
_SAFARI = re.compile(r"safari", re.IGNORECASE)
_MOBILE = re.compile(r"mobile|iphone|android", re.IGNORECASE)


def _browser(ua: str) -> str:
    if _FIREFOX.search(ua):
        return "Firefox"
    if _CHROME.search(ua):
        return "Chrome"
    if _SAFARI.search(ua):
        return "Safari"
    return "Browser"


def _device(ua: str) -> str:
    if _MOBILE.search(ua):
        return "phone"
    return "laptop"


def _device_label(ua: str) -> str:
    if not ua:
        return "Unknown device"
    return f"{_device(ua).capitalize()} · {_browser(ua)}"


class SessionRead(BaseModel):
    """Per-device shape. RULE 48 — NO token IDs ever; UUIDs minimum."""

    model_config = ConfigDict(extra="forbid")

    id: str
    device_label: str
    ip_address: str | None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    is_current: bool


class SessionsListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sessions: list[SessionRead]


def _to_read(row: SessionRow, *, current_token_hash: bytes | None) -> SessionRead:
    return SessionRead(
        id=str(row.id),
        device_label=_device_label(row.user_agent),
        ip_address=row.ip_address,
        created_at=row.created_at,
        last_used_at=row.last_used_at,
        expires_at=row.expires_at,
        is_current=(
            current_token_hash is not None
            and row.token_hash == current_token_hash.hex()
        ),
    )


def _current_session_token_hash(request: Request) -> bytes | None:
    """Extract the bearer token from the incoming request + hash it
    so we can flag the current session in the list."""
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    if not token:
        return None
    return hash_token(token).encode("ascii")


@router.get("/me/sessions", response_model=SessionsListResponse)
async def list_sessions(
    request: Request,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionsListResponse:
    rows = list(
        (
            await db.execute(
                select(SessionRow)
                .where(
                    SessionRow.user_id == user.id,
                    SessionRow.revoked_at.is_(None),
                    SessionRow.expires_at > datetime.now(tz=UTC),
                )
                .order_by(SessionRow.last_used_at.desc())
            )
        ).scalars().all()
    )
    current = _current_session_token_hash(request)
    return SessionsListResponse(
        sessions=[_to_read(r, current_token_hash=current) for r in rows],
    )


@router.delete(
    "/me/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_session(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    row = (
        await db.execute(
            select(SessionRow).where(
                SessionRow.id == session_id,
                SessionRow.user_id == user.id,
            )
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )
    if row.revoked_at is not None:
        return  # idempotent
    row.revoked_at = datetime.now(tz=UTC)
    await AuditLogger(db).log(
        kind=AuditEventKind.AUTH,
        action="session.revoke",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        detail={"session_id": str(session_id)},
    )
    await db.commit()


@router.post(
    "/me/sessions/revoke-others",
    response_model=SessionsListResponse,
)
async def revoke_other_sessions(
    request: Request,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionsListResponse:
    """Revoke every active session except the one making this request."""
    current = _current_session_token_hash(request)
    rows = list(
        (
            await db.execute(
                select(SessionRow).where(
                    SessionRow.user_id == user.id,
                    SessionRow.revoked_at.is_(None),
                )
            )
        ).scalars().all()
    )
    now = datetime.now(tz=UTC)
    revoked_count = 0
    for row in rows:
        if current is not None and row.token_hash == current.hex():
            continue
        row.revoked_at = now
        revoked_count += 1
    await AuditLogger(db).log(
        kind=AuditEventKind.AUTH,
        action="session.revoke_others",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
        detail={"revoked_count": revoked_count},
    )
    await db.commit()

    # Return the remaining sessions (which is just the current one).
    remaining = list(
        (
            await db.execute(
                select(SessionRow)
                .where(
                    SessionRow.user_id == user.id,
                    SessionRow.revoked_at.is_(None),
                )
                .order_by(SessionRow.last_used_at.desc())
            )
        ).scalars().all()
    )
    return SessionsListResponse(
        sessions=[
            _to_read(r, current_token_hash=current) for r in remaining
        ],
    )
