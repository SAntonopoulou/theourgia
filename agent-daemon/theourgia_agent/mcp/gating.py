"""Capability gating at the MCP-tool dispatch boundary.

Every MCP tool call from the spawned `claude` subprocess passes
through :func:`require_capability` before the daemon proxies to the
vault. If the granted capability set doesn't include the tool's
required capability, the dispatch raises :class:`CapabilityDenied`
which the SSE transport surfaces as a JSON-RPC error response.

Rule 31 — the permission grant is the user's act at install time;
the daemon enforces it at runtime. There is no "Grant all" shortcut;
similarly, there is no daemon-side bypass.
"""

from __future__ import annotations

from collections.abc import Iterable

from theourgia_agent.mcp.capabilities import AgentCapability


__all__ = ["CapabilityDenied", "require_capability"]


class CapabilityDenied(Exception):
    """An MCP tool was called without the required capability granted.

    The transport translates this into a JSON-RPC `-32602` (Invalid
    params) with a structured `data` field naming the missing cap.
    """

    def __init__(self, required: AgentCapability) -> None:
        super().__init__(
            f"capability {required.value!r} is not granted to this agent",
        )
        self.required = required


def require_capability(
    granted: Iterable[AgentCapability],
    required: AgentCapability,
) -> None:
    """Raise if the agent isn't allowed to call this tool.

    The check is exact-match — no implicit hierarchies. An agent with
    `read.entries` is NOT implicitly granted `read.entities` even
    though both are reads.
    """
    granted_set = set(granted)
    if required not in granted_set:
        raise CapabilityDenied(required)
