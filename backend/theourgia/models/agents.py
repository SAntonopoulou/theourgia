"""Phase 16 agent-integration models (vault side).

The agent daemon keeps its own database (installs, runs, audit). The
vault side stores only what the vault itself must authoritatively
check: the dedicated bearer tokens the daemon presents when it dials
back into the vault's MCP endpoint (``POST /api/v1/mcp``).

An :class:`AgentMcpToken` is minted per agent run at
``POST /api/v1/agents/runs`` (see
:mod:`theourgia.core.agents.mcp_tokens`) and passed to the daemon as
``vault_session_token``. It is deliberately NOT a row in the
``session`` table: a leaked MCP token can only reach the read-only
MCP endpoint, never the general API surface.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["AgentMcpToken"]


class AgentMcpToken(IDMixin, TimestampMixin, table=True):
    """One vault-MCP bearer token, scoped to a single agent run.

    Stored hashed (same SHA-256 discipline as ``session.token_hash``);
    the plaintext exists only in the daemon's :class:`LaunchRequest`
    for the lifetime of the run. Short expiry + no refresh: a new run
    mints a new token.
    """

    __tablename__ = "agent_mcp_token"

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    # The daemon-side agent_install this token was minted for. Free
    # string (the daemon's install id) — no FK, the daemon's DB is a
    # separate database.
    install_id: str = Field(
        sa_column=Column(String(64), nullable=False),
    )

    token_hash: str = Field(
        sa_column=Column(String(64), unique=True, nullable=False),
        description="SHA-256 of the opaque MCP token, hex-encoded",
    )

    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    revoked_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
