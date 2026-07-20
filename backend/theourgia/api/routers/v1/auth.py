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

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.api.errors import UnauthorizedError
from theourgia.core.auth.tokens import generate_token, hash_token
from theourgia.core.config import get_settings
from theourgia.models.identity import Session as SessionRow
from theourgia.models.identity import User

__all__ = ["router"]

router = APIRouter()


SESSION_COOKIE = "theourgia_session"
SESSION_LIFETIME = timedelta(days=7)


class DemoSignInInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    magickal_name: str = Field(min_length=1, max_length=128)
    password: str | None = Field(default=None, min_length=1, max_length=256)


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
        # b108-2gs single-operator gate. When THEOURGIA_ALLOWED_MAGICKAL_NAMES
        # is set (production), refuse to CREATE accounts for names not on
        # the allowlist. Existing users still sign in fine (the check only
        # runs when the User row doesn't exist yet). Empty allowlist means
        # open enrollment — the dev / self-hosting-first-run default.
        settings = get_settings()
        allowlist = settings.allowed_magickal_names_set
        if allowlist and payload.magickal_name.casefold() not in allowlist:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "This is a single-operator vault; new accounts are not "
                    "accepted here. To use the Theourgia toolkit, self-host "
                    "your own instance: https://github.com/SAntonopoulou/"
                    "theourgia — the AGPL-3.0 source runs on a single "
                    "cheap VPS. Federated content sharing between instances "
                    "is a first-class feature."
                ),
            )
        user = User(email=email)
        db.add(user)
        await db.flush()  # populate user.id
    else:
        # b108-2hl SECURITY FIX: existing users must present their
        # password when one is set. Before this batch anyone who typed
        # the magickal name at /signin got the account's session
        # unconditionally.
        #
        # The password_hash column has always been on User but this
        # signin path never checked it — that's the hole.
        if user.password_hash is not None:
            from theourgia.core.auth.passwords import verify_password

            if not payload.password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=(
                        "Password required for this account. Enter the "
                        "password you set at your last sign-in."
                    ),
                )
            if not verify_password(payload.password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect password.",
                )

    # v1-030: every account gets exactly one default vault. Idempotent,
    # so this also backfills pre-v1-030 accounts (like the operator's)
    # on their next sign-in. Vault-scoped surfaces — federation actor,
    # key rotation, per-vault voces — were silently dead without it.
    from theourgia.core.vaults import ensure_vault

    await ensure_vault(
        db,
        owner_id=user.id,
        display_name=payload.magickal_name,
        slug_hint=payload.magickal_name,
    )

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


# ── Set / change password (b108-2hl SECURITY) ────────────────────


class SetPasswordInput(BaseModel):
    """New password + (when already set) the current one to authorise."""

    model_config = ConfigDict(extra="forbid")

    new_password: str = Field(min_length=8, max_length=256)
    current_password: str | None = Field(default=None, max_length=256)


class PasswordStatusRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    has_password: bool


@router.get(
    "/auth/password",
    response_model=PasswordStatusRead,
    summary="Whether a password is set for the current account",
)
async def get_password_status(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    theourgia_session: Annotated[str | None, Cookie()] = None,
) -> PasswordStatusRead:
    row = await _resolve_session(theourgia_session, db)
    if row is None:
        raise UnauthorizedError("missing or invalid session")
    stmt = select(User).where(User.id == row.user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise UnauthorizedError("user record missing")
    return PasswordStatusRead(has_password=user.password_hash is not None)


@router.put(
    "/auth/password",
    response_model=PasswordStatusRead,
    summary="Set or change the account password",
    description=(
        "Sets an Argon2id password hash. If a password is already set, "
        "``current_password`` must verify against the stored hash. New "
        "passwords must be at least 8 characters."
    ),
)
async def set_password(
    payload: SetPasswordInput,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    theourgia_session: Annotated[str | None, Cookie()] = None,
) -> PasswordStatusRead:
    row = await _resolve_session(theourgia_session, db)
    if row is None:
        raise UnauthorizedError("missing or invalid session")
    stmt = select(User).where(User.id == row.user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None:
        raise UnauthorizedError("user record missing")

    from theourgia.core.auth.passwords import hash_password, verify_password

    if user.password_hash is not None:
        # Changing an existing password requires the current one.
        if not payload.current_password or not verify_password(
            payload.current_password, user.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    "Current password required and must match to change "
                    "your password."
                ),
            )

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return PasswordStatusRead(has_password=True)


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
