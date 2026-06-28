"""Tool dispatch: one MCP tool per capability.

Pulls together capability gating, vault client, and the rule-52/53
filter. The SSE server forwards subprocess `tools/call` requests to
:func:`dispatch_tool`; on success, it returns the filtered records.

Closed-tradition slug list is fetched once per session and reused —
the slug set is small and changes only when the operator updates the
curated list.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.filters import filter_records
from theourgia_agent.mcp.gating import CapabilityDenied, require_capability
from theourgia_agent.mcp.vault_client import VaultClient
from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import (
    AuditRecord,
    AuditSink,
    NullAuditSink,
    now,
    sanitise_arguments,
)


__all__ = ["ToolCallResult", "DispatchContext", "dispatch_tool"]


@dataclass(slots=True)
class ToolCallResult:
    """What the SSE server sends back over the wire."""

    records: list[dict]
    filtered_count: int
    """How many records the daemon's filter pass dropped. The agent
    sees this number (rule 49-style honesty) but not the dropped
    payloads."""


@dataclass(slots=True)
class DispatchContext:
    """Per-MCP-session state held by the SSE server.

    Created once per `claude` subprocess. Cached fields (closed-
    tradition slugs) live here so repeated tool calls in the same
    session don't refetch.
    """

    granted: list[AgentCapability]
    vault: VaultClient
    closed_tradition_slugs: frozenset[str] = field(default=frozenset())
    audit_sink: AuditSink = field(default_factory=NullAuditSink)
    """Where MCP audit records land. Defaults to a no-op sink so unit
    tests can ignore the audit dimension; production wires a DbAuditSink."""
    vault_did: str = ""
    """DID of the vault this session belongs to — denormalised onto every
    audit row so the B4 query layer doesn't need to join."""
    run_id: str | None = None
    """Run this session is bound to. Set by the launcher; the SSE
    transport copies it from the MCPSession at request time."""

    async def ensure_closed_slugs_loaded(self) -> None:
        if not self.closed_tradition_slugs:
            self.closed_tradition_slugs = (
                await self.vault.closed_tradition_slugs()
            )


async def dispatch_tool(
    ctx: DispatchContext,
    *,
    tool_name: str,
    arguments: dict[str, Any] | None = None,
) -> ToolCallResult:
    """Route a JSON-RPC `tools/call` to the appropriate vault method.

    Raises :class:`CapabilityDenied` (from the gating layer) when the
    tool's required capability isn't granted. The SSE transport
    converts that to a JSON-RPC -32602.
    """
    args = arguments or {}
    cap = AgentCapability.from_string(tool_name)

    # Gate: must be in the granted set. Emit deny audit BEFORE raising.
    try:
        require_capability(ctx.granted, cap)
    except CapabilityDenied as exc:
        await ctx.audit_sink.emit(
            AuditRecord(
                vault_did=ctx.vault_did,
                event_type=AuditEventType.MCP_CAPABILITY_DENIED,
                happened_at=now(),
                run_id=ctx.run_id,
                tool_name=tool_name,
                arguments_json=sanitise_arguments(args),
                allowed=False,
                detail=f"capability {exc.required.value!r} not granted",
            ),
        )
        raise

    # Load closed-tradition slugs lazily — first read.* call costs
    # this round-trip; subsequent calls reuse.
    await ctx.ensure_closed_slugs_loaded()

    raw: Sequence[dict]
    if cap == AgentCapability.READ_ENTRIES:
        raw = await ctx.vault.read_entries(
            tag=args.get("tag"),
            limit=int(args.get("limit", 50)),
        )
    elif cap == AgentCapability.READ_ENTITIES:
        raw = await ctx.vault.read_entities(
            limit=int(args.get("limit", 50)),
        )
    elif cap == AgentCapability.READ_DIVINATIONS:
        raw = await ctx.vault.read_divinations(
            limit=int(args.get("limit", 50)),
        )
    elif cap == AgentCapability.READ_LIBRARY:
        raw = await ctx.vault.read_library(kind=args.get("kind"))
    elif cap == AgentCapability.READ_CORRESPONDENCES:
        raw = await ctx.vault.read_correspondences(
            bundle=args.get("bundle"),
        )
    elif cap == AgentCapability.READ_SYNCHRONICITIES:
        raw = await ctx.vault.read_synchronicities(
            limit=int(args.get("limit", 50)),
        )
    else:
        # filesystem + network.outbound are not READ tools; they're
        # capability flags the daemon's other subsystems honour.
        # An MCP client trying to call them as tools is a buggy or
        # malicious agent — refuse cleanly.
        msg = f"capability {cap.value!r} is not a callable tool"
        raise ValueError(msg)

    before = len(raw)
    filtered = filter_records(
        raw, closed_tradition_slugs=ctx.closed_tradition_slugs,
    )
    dropped = before - len(filtered)

    await ctx.audit_sink.emit(
        AuditRecord(
            vault_did=ctx.vault_did,
            event_type=AuditEventType.MCP_TOOLS_CALL,
            happened_at=now(),
            run_id=ctx.run_id,
            tool_name=tool_name,
            arguments_json=sanitise_arguments(args),
            allowed=True,
            filtered_count=dropped,
        ),
    )

    return ToolCallResult(
        records=filtered,
        filtered_count=dropped,
    )
