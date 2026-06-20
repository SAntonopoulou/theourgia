"""FastAPI dependency injection helpers.

The shapes endpoints use:

- :func:`get_db_session` — yields a request-scoped async DB session.
- :func:`get_current_user` — extracts and validates the bearer token,
  returns the authenticated :class:`User`. Raises
  :class:`UnauthorizedError` on no/bad credentials.
- :func:`get_optional_current_user` — same shape but returns ``None``
  instead of raising. Used by routes that have a public anonymous mode.
- :func:`require_scope` — factory returning a dependency that enforces
  the calling user holds the given scope.

Authentication wires through :mod:`theourgia.core.auth.tokens` to hash
the presented token and look up the matching :class:`Session` row.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from theourgia.api.errors import ForbiddenError, UnauthorizedError
from theourgia.core.auth.tokens import hash_token
from theourgia.core.authz import Scope, set_current_user_id
from theourgia.core.db import session_scope
from theourgia.core.observability.context import bind_user_id
from theourgia.models.identity import Session as SessionRow
from theourgia.models.identity import User

__all__ = [
    "get_db_session",
    "get_current_user",
    "get_optional_current_user",
    "require_scope",
    "CurrentUser",
    "OptionalCurrentUser",
    "DBSession",
]


_bearer_scheme = HTTPBearer(auto_error=False, description="Theourgia session token")


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield a request-scoped async database session.

    Wraps :func:`theourgia.core.db.session_scope` for use as a FastAPI
    dependency. The session rolls back on exception, otherwise closes
    cleanly. Commits are explicit at the endpoint layer.
    """
    async with session_scope() as session:
        yield session


async def _resolve_session_token(
    token: str,
    session: AsyncSession,
) -> SessionRow | None:
    """Look up a session row by hashed token. Returns None if not found,
    revoked, or expired."""
    token_hash = hash_token(token)
    stmt = select(SessionRow).where(SessionRow.token_hash == token_hash)
    result = await session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        return None
    if row.revoked_at is not None:
        return None
    now = datetime.now(tz=UTC)
    if row.expires_at <= now:
        return None
    return row


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    """Authenticated dependency: resolve and return the current user.

    Raises :class:`UnauthorizedError` for any of: missing bearer token,
    unknown token, revoked session, expired session, missing user.

    On success, the RLS GUC ``theourgia.current_user_id`` is set on the
    same session so subsequent queries enforce row-level policies as
    this user.
    """
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("missing bearer token")

    session_row = await _resolve_session_token(credentials.credentials, session)
    if session_row is None:
        raise UnauthorizedError("invalid or expired session")

    user_stmt = select(User).where(User.id == session_row.user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    if user is None:
        # Session refers to a user that no longer exists — invariant
        # violation but treat as auth failure.
        raise UnauthorizedError("session refers to unknown user")

    # Refresh last_used_at; do not commit (endpoint owns transaction)
    session_row.last_used_at = datetime.now(tz=UTC)

    await set_current_user_id(session, user.id)
    bind_user_id(user.id)
    return user


async def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> User | None:
    """Like :func:`get_current_user` but returns ``None`` on no/bad auth
    instead of raising. For endpoints that have a public anonymous mode."""
    if credentials is None or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, session=session)
    except UnauthorizedError:
        return None


def require_scope(scope: Scope):  # noqa: ARG001 — scope reserved for future logic
    """Return a FastAPI dependency that enforces the calling user holds
    the given scope.

    The current implementation accepts any authenticated user; scope
    checks gain teeth as resource-specific routers land (the scope is
    checked against the user's relationship to the resource in the
    endpoint, not in this dep). This indirection means endpoints can
    declare their scope requirements declaratively today and the
    framework tightens enforcement over time without endpoint-level
    edits.
    """

    async def _checker(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        # TODO(phase-01-batch-6+): consult the user's roles + the target
        # resource to verify the scope. For now: authenticated == allowed.
        return user

    return _checker


# Annotated aliases for endpoint signatures (less typing, more readable):
DBSession = Annotated[AsyncSession, Depends(get_db_session)]
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalCurrentUser = Annotated[User | None, Depends(get_optional_current_user)]
