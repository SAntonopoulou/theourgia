"""In-process MCP session registry.

When the control plane spawns a `claude` subprocess for an agent run,
it issues a random session token and registers a :class:`DispatchContext`
under it. The subprocess presents that token as Bearer auth on the MCP
JSON-RPC endpoint; the route looks it up and routes through dispatch.

The registry is process-local and never persisted. Sessions close on
:meth:`drop` (called by the control plane when the subprocess exits)
or via TTL eviction (a daemon-level sweep, not implemented here).
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Final

from theourgia_agent.mcp.dispatch import DispatchContext


__all__ = [
    "MCPSession",
    "MCPSessionRegistry",
    "issue_session_token",
]


_TOKEN_BYTES: Final = 32


def issue_session_token() -> str:
    """Cryptographically random URL-safe token for a single MCP session."""
    return secrets.token_urlsafe(_TOKEN_BYTES)


@dataclass(slots=True)
class MCPSession:
    """One MCP session bound to one spawned subprocess."""

    token: str
    ctx: DispatchContext
    run_id: str
    """The agent-run row this session is tied to (audit + cost-cap join)."""
    created_at: datetime = field(
        default_factory=lambda: datetime.now(tz=UTC),
    )


@dataclass(slots=True)
class MCPSessionRegistry:
    """Tokens → MCPSession mapping for the lifetime of the daemon."""

    _by_token: dict[str, MCPSession] = field(default_factory=dict)

    def register(
        self,
        *,
        ctx: DispatchContext,
        run_id: str,
    ) -> MCPSession:
        token = issue_session_token()
        session = MCPSession(token=token, ctx=ctx, run_id=run_id)
        self._by_token[token] = session
        return session

    def lookup(self, token: str) -> MCPSession | None:
        return self._by_token.get(token)

    def drop(self, token: str) -> None:
        self._by_token.pop(token, None)

    def __len__(self) -> int:
        return len(self._by_token)

    def clear(self) -> None:
        self._by_token.clear()


_registry = MCPSessionRegistry()


def get_default_registry() -> MCPSessionRegistry:
    """Process-wide default registry. Tests should not use this — they
    construct their own registries and pass them as FastAPI dependency
    overrides."""
    return _registry
