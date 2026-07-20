"""Vault-side MCP bearer tokens — mint + resolve.

The daemon authenticates to ``POST /api/v1/mcp`` with a dedicated
bearer token the vault mints per agent run (NOT the magician's
browser-session token). Scope is structural: the token resolves only
on the MCP endpoint, and the MCP endpoint serves only read methods.

Lifecycle:

  · ``POST /api/v1/agents/runs`` mints a token via :func:`mint_mcp_token`
    and hands the plaintext to the daemon as ``vault_session_token``.
  · The daemon's :class:`VaultClient` presents it as
    ``Authorization: Bearer`` on every MCP JSON-RPC call.
  · :func:`resolve_mcp_token` hashes + looks it up; expired / revoked /
    unknown all resolve to ``None`` (the endpoint 401s, which the
    daemon surfaces as :class:`VaultUnauthorisedError`).
  · No refresh: tokens expire ``MCP_TOKEN_TTL`` after mint. A new run
    mints a new token. Expired rows are inert (cleanup can arrive with
    a later housekeeping sweep; the hash is worthless once expired).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from theourgia.core.auth.tokens import generate_token, hash_token
from theourgia.models.agents import AgentMcpToken

__all__ = ["MCP_TOKEN_TTL", "mint_mcp_token", "resolve_mcp_token"]


# Generous enough for a long agent run, short enough that a leaked
# token dies the same day. Runs outliving this lose vault reads and
# the daemon reports VaultUnauthorisedError — an acceptable v1 bound.
MCP_TOKEN_TTL = timedelta(hours=12)


async def mint_mcp_token(
    session: AsyncSession,
    *,
    user_id: UUID,
    install_id: str,
    now: datetime | None = None,
) -> str:
    """Create a token row and return the PLAINTEXT (never stored).

    The caller owns the transaction; commit before handing the
    plaintext to the daemon so the dial-back cannot race the insert.
    """
    anchor = now or datetime.now(tz=UTC)
    plain = generate_token()
    session.add(
        AgentMcpToken(
            user_id=user_id,
            install_id=install_id,
            token_hash=hash_token(plain),
            expires_at=anchor + MCP_TOKEN_TTL,
        )
    )
    return plain


async def resolve_mcp_token(
    session: AsyncSession,
    token: str,
    *,
    now: datetime | None = None,
) -> AgentMcpToken | None:
    """Return the live token row for a presented plaintext, else None."""
    if not token:
        return None
    anchor = now or datetime.now(tz=UTC)
    stmt = select(AgentMcpToken).where(
        AgentMcpToken.token_hash == hash_token(token)
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        return None
    if row.revoked_at is not None:
        return None
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires <= anchor:
        return None
    return row
