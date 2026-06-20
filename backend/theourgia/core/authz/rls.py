"""Row-Level Security GUC management.

PostgreSQL RLS policies in our schema read the
``theourgia.current_user_id`` GUC (Grand Unified Configuration setting,
i.e., a runtime variable). The application sets this variable once per
request — typically in a FastAPI middleware that has resolved the
session — and any subsequent query against the same connection has its
RLS policies evaluated as that user.

The GUC is set with ``SET LOCAL`` so it is scoped to the current
transaction; without an open transaction, ``SET`` is used and the value
sticks for the rest of the session (which is fine for short-lived
request connections).

This module is the only place in the codebase that should
``execute("SET ... theourgia.current_user_id")``. Other code calls
:func:`set_current_user_id`.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["set_current_user_id", "clear_current_user_id", "GUC_NAME"]


GUC_NAME: str = "theourgia.current_user_id"
"""The PostgreSQL GUC that RLS policies read.

Note the namespace prefix ``theourgia.`` — Postgres reserves
unprefixed names; custom GUCs MUST contain a dot.
"""


async def set_current_user_id(session: AsyncSession, user_id: UUID) -> None:
    """Set the RLS user id GUC on this session's transaction.

    Uses ``SET LOCAL`` so the value clears at COMMIT / ROLLBACK; a
    subsequent request on the same pooled connection starts with no
    user id set, which is the safe default.

    Raises :class:`ValueError` if ``user_id`` is not a valid UUID
    instance (defensive — the caller should already have a typed UUID).
    """
    if not isinstance(user_id, UUID):
        msg = f"user_id must be a UUID instance, got {type(user_id).__name__}"
        raise ValueError(msg)

    # We use set_config() rather than SET LOCAL: asyncpg's prepared-
    # statement protocol can't bind parameters into the SET command, but
    # set_config(name, value, is_local) is a normal SQL function and
    # binds cleanly. is_local=true scopes the value to the current
    # transaction (same semantic as SET LOCAL).
    await session.execute(
        text("SELECT set_config(:name, :value, true)"),
        {"name": GUC_NAME, "value": str(user_id)},
    )


async def clear_current_user_id(session: AsyncSession) -> None:
    """Clear the RLS user id GUC.

    Use after the request finishes or when you want a portion of code
    to run with no current user — e.g., system-level operations
    explicitly rolled in audit log.
    """
    await session.execute(
        text("SELECT set_config(:name, '', true)"),
        {"name": GUC_NAME},
    )
