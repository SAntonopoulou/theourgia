"""Auth HTTP endpoints.

Phase 02 Batch 12 ships a **demo signin** that opens a real Session
against a deterministically-named development User. WebAuthn
registration + login ceremonies (the canonical auth flow) land in a
later batch — this is the substrate-level scaffold that lets the
frontend's AuthContext flip to authenticated.

Routes
------
``POST   /api/v1/auth/demo-signin`` — find-or-create a dev User, open
  a Session, set a HttpOnly cookie. Body: ``{ "magickal_name": str }``.

``GET    /api/v1/auth/session`` — return the SessionRead for the
  cookie-presented session. 401 if missing / invalid / expired /
  revoked.

``DELETE /api/v1/auth/session`` — revoke the cookie-presented session,
  clear the cookie. Returns 204.

Cookie shape
------------
- name: ``theourgia_session``
- HttpOnly, Secure, SameSite=Lax
- max-age = 7 days
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.api.errors import UnauthorizedError
from theourgia.core.auth.tokens import generate_token, hash_token
from theourgia.models.identity import Session as SessionRow
from theourgia.models.identity import User

__all__ = ["router"]

router = APIRouter()


SESSION_COOKIE = "theourgia_session"
SESSION_LIFETIME = timedelta(days=7)


class DemoSignInInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    magickal_name: str = Field(min_length=1, max_length=128)


class SessionRead(BaseModel):
    """Wire format for ``GET /api/v1/auth/session`` — mirrors frontend ``Session``."""

    model_config = ConfigDict(extra="forbid")

    user_id: str
    display_name: str
    magickal_name: str | None
    vault_id: str | None
    expires_at: datetime


_slug_re = re.compile(r"[^a-z0-9]+")


def _slug(name: str) -> str:
    """Deterministic ASCII slug for synthesizing the demo user's email.

    Whitespace, punctuation, and non-ASCII characters collapse to a single
    hyphen. Long names truncate to 32 chars. The slug isn't shown to the
    user — it just produces a stable email key for find-or-create.
    """
    s = _slug_re.sub("-", name.lower()).strip("-")
    if not s:
        s = "demo"
    return s[:32]


def _demo_email(magickal_name: str) -> str:
    return f"{_slug(magickal_name)}@dev.theourgia.com"


def _set_cookie(response: Response, token: str, *, expires_at: datetime) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )


def _clear_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE, path="/")


async def _resolve_session(
    cookie_value: str | None,
    db: AsyncSession,
) -> SessionRow | None:
    if not cookie_value:
        return None
    token_hash = hash_token(cookie_value)
    stmt = select(SessionRow).where(SessionRow.token_hash == token_hash)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        return None
    if row.revoked_at is not None:
        return None
    if row.expires_at <= datetime.now(tz=UTC):
        return None
    return row


async def _session_to_read(row: SessionRow, db: AsyncSession) -> SessionRead:
    user_stmt = select(User).where(User.id == row.user_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if user is None:
        raise UnauthorizedError("session refers to unknown user")
    # Display name = the slug of the email today; once Persona ships,
    # the session carries an active_persona_id and we read magickal_name
    # from there. For now: derive from email.
    display_name = user.email.split("@")[0]
    return SessionRead(
        user_id=str(user.id),
        display_name=display_name,
        magickal_name=display_name,
        vault_id=None,
        expires_at=row.expires_at,
    )


@router.post(
    "/auth/demo-signin",
    summary="Demo signin",
    description=(
        "Find-or-create a development user with the supplied magickal name and "
        "open a session. PHASE 02 ONLY — replaced by the WebAuthn ceremony in a "
        "later batch."
    ),
    response_model=SessionRead,
)
async def demo_signin(
    payload: DemoSignInInput,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SessionRead:
    email = _demo_email(payload.magickal_name)

    user_stmt = select(User).where(User.email == email)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if user is None:
        user = User(email=email)
        db.add(user)
        await db.flush()  # populate user.id

    now = datetime.now(tz=UTC)
    expires_at = now + SESSION_LIFETIME
    token = generate_token()
    row = SessionRow(
        user_id=user.id,
        token_hash=hash_token(token),
        user_agent="",
        ip_address=None,
        expires_at=expires_at,
        last_used_at=now,
    )
    db.add(row)
    await db.commit()

    _set_cookie(response, token, expires_at=expires_at)
    return await _session_to_read(row, db)


@router.get(
    "/auth/session",
    summary="Current session",
    description="Return the SessionRead for the cookie-presented session, or 401.",
    response_model=SessionRead,
)
async def get_session(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    theourgia_session: Annotated[str | None, Cookie()] = None,
) -> SessionRead:
    row = await _resolve_session(theourgia_session, db)
    if row is None:
        raise UnauthorizedError("missing or invalid session")
    return await _session_to_read(row, db)


@router.delete(
    "/auth/session",
    summary="Sign out",
    description="Revoke the cookie-presented session and clear the cookie.",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_session(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    theourgia_session: Annotated[str | None, Cookie()] = None,
) -> Response:
    row = await _resolve_session(theourgia_session, db)
    if row is not None:
        row.revoked_at = datetime.now(tz=UTC)
        await db.commit()
    _clear_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
