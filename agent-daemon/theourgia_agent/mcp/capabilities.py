"""Capability vocabulary for the MCP server.

The wire keys here MUST match the keys the H10 C3 surface presents
(see `frontend/shared/src/AgentInstall/copy.ts`) AND the keys the
main backend's plugin capability enum already ships (see
`backend/theourgia/core/plugins/capabilities.py`). Agents share the
same capability vocabulary as plugins — the host's MCP gate is one
of the runtime checks.

Three groups govern Cluster C:

  · `read.*` — vault content reads. Each is a tool the agent can
    call. The daemon proxies to the vault's MCP, filters the result.
  · `filesystem` — write-to-own-memory-only. The daemon enforces
    the path constraint (rule 59: agent sees `/srv/theourgia/agents/
    <vault>/<agent-id>/` ONLY).
  · `network.outbound` — required for the agent to spend the user's
    API key. Rate-limited to allowed_hosts at the model provider.

Capabilities are intentionally COARSE — finer-grained scopes are a
v2 concern. Rule 31's permission-grant UX is "few clear capabilities"
not "thousands of microscopic ones."
"""

from __future__ import annotations

import enum
from collections.abc import Iterable


__all__ = [
    "AgentCapability",
    "CAPABILITY_KIND_READ",
    "CAPABILITY_KIND_WRITE",
    "CAPABILITY_KIND_NETWORK",
    "capability_kind",
]


class AgentCapability(str, enum.Enum):
    """Permissions an agent may declare + the user may grant.

    Matches the install-time chrome (H10 C3) verbatim.
    """

    # ── Reads (vault → daemon → agent · filtered) ────────────────────
    READ_ENTRIES = "read.entries"
    """Read journal entries. Sealed entries NEVER returned (rule 53)."""

    READ_ENTITIES = "read.entities"
    """Read magical beings. Closed-tradition entities NEVER returned (rule 52)."""

    READ_DIVINATIONS = "read.divinations"
    """Read divination sessions + their results."""

    READ_LIBRARY = "read.library"
    """Read library items + correspondence tables."""

    READ_CORRESPONDENCES = "read.correspondences"
    """Read installed correspondence bundles."""

    READ_ANALYTICS = "read.analytics"
    """Read saved analytics queries + their materialised views."""

    READ_SYNCHRONICITIES = "read.synchronicities"
    """Read the synchronicity log."""

    # ── Writes (always to the agent's own memory only) ───────────────
    FILESYSTEM = "filesystem"
    """Write under `/srv/theourgia/agents/<vault>/<agent-id>/` ONLY.
    The daemon enforces this at the syscall level — the agent never
    sees a filesystem path it could escape from."""

    # ── Network ──────────────────────────────────────────────────────
    NETWORK_OUTBOUND = "network.outbound"
    """Spend the user's API key. The daemon's HTTP proxy gates outbound
    calls to the model provider host only."""

    @classmethod
    def from_string(cls, value: str) -> "AgentCapability":
        try:
            return cls(value)
        except ValueError as exc:
            msg = f"unknown agent capability: {value!r}"
            raise ValueError(msg) from exc


CAPABILITY_KIND_READ = "read"
CAPABILITY_KIND_WRITE = "write"
CAPABILITY_KIND_NETWORK = "network"


def capability_kind(cap: AgentCapability) -> str:
    """The high-level kind of a capability — used by the C2 marketplace
    filter to render "Read-only" / "Read-write" / "Read-write + network"
    chips against the installed set."""
    if cap == AgentCapability.FILESYSTEM:
        return CAPABILITY_KIND_WRITE
    if cap == AgentCapability.NETWORK_OUTBOUND:
        return CAPABILITY_KIND_NETWORK
    return CAPABILITY_KIND_READ


def summarise_capability_set(caps: Iterable[AgentCapability]) -> str:
    """Render a set of granted capabilities as the C2 chip label.

    Mirrors the surface convention:
      - read-only            (only `read.*`)
      - read-write           (read + filesystem)
      - read-write + network (read + filesystem + network.outbound)
    """
    cs = list(caps)
    has_write = any(capability_kind(c) == CAPABILITY_KIND_WRITE for c in cs)
    has_net = any(capability_kind(c) == CAPABILITY_KIND_NETWORK for c in cs)
    if has_net:
        return "read-write + network" if has_write else "read + network"
    if has_write:
        return "read-write"
    return "read-only"
