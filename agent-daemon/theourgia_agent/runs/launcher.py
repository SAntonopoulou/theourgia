"""Plan an agent run — cap evaluation + MCP session + subprocess command.

The actual subprocess spawn is one layer up (`subprocess_runner.py`); the
planner is pure so tests can verify the launch decision without touching
the filesystem or fork(). Separation also lets the SSE control endpoint
return a structured 'why I refused to wake' to the magician.

Flow:

    request  ──▶  evaluate_cap  ──▶  allowed?
                                       │
                                       ├── no  ──▶ LaunchRefused(reason)
                                       │
                                       └── yes ──▶ register MCPSession
                                                   build command + env
                                                   return LaunchPlan
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path

from theourgia_agent.core.config import get_settings
from theourgia_agent.core.cost_cap import CapDecision, evaluate_cap
from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import DispatchContext
from theourgia_agent.mcp.sessions import MCPSession, MCPSessionRegistry
from theourgia_agent.mcp.vault_client import VaultClient
from theourgia_agent.mcp.capabilities import AgentCapability as _Cap  # noqa: F401
from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import (
    AuditRecord,
    AuditSink,
    NullAuditSink,
    now as audit_now,
)
from theourgia_agent.runs.sandbox import wrap_command_with_sandbox


__all__ = [
    "LaunchRequest",
    "LaunchPlan",
    "LaunchRefused",
    "LaunchOutcome",
    "plan_launch",
]


@dataclass(slots=True, frozen=True)
class LaunchRequest:
    """The control plane's ask: 'wake this agent for this task'."""

    install_id: str
    """The agent_install row this run belongs to."""

    vault_did: str
    """Decentralised identity of the calling vault — picks the memory
    directory: `<memory_root>/<vault_did>/<install_id>/`."""

    agent_slug: str
    """Stable agent identifier (rendered in transcripts, logs)."""

    task_text: str
    """The magician's task. Stored verbatim — rule 51, the agent does
    not initiate itself."""

    granted_caps: list[AgentCapability]
    """The exact capability set the user granted at install time."""

    scope_id: str
    """The scope the magician chose for THIS run (a subset; the daemon
    does NOT enforce subset here — the C6 composer is the authoritative
    UI for the choice)."""

    monthly_cap_usd: Decimal
    month_spent_usd: Decimal
    recent_run_cost_usd: list[Decimal] = field(default_factory=list)

    vault_session_token: str = ""
    """Vault-issued bearer token the MCP client uses to read vault
    content. Cleared from memory when the run ends."""

    claude_binary: str = "claude"
    """Path or name of the claude CLI binary to spawn. Tests inject a
    no-op script."""

    api_key_env: str = "ANTHROPIC_API_KEY"
    """Name of the env var the subprocess reads its model-API key from.
    The value is loaded into the env at spawn time from Mode B's
    in-memory vault and ONLY for this subprocess."""

    api_key_plaintext: str | None = None
    """The BYO key, decrypted just-in-time at run start. The daemon does
    not keep this anywhere after spawn — see InMemoryKeyVault."""


@dataclass(slots=True, frozen=True)
class LaunchRefused:
    """No spawn — cap exceeded (or another precondition failed)."""

    reason: str


@dataclass(slots=True, frozen=True)
class LaunchPlan:
    """Everything the subprocess_runner needs to actually exec()."""

    session: MCPSession
    reservation_usd: Decimal
    cwd: Path
    """Working directory for the subprocess — the agent's memory dir.
    The filesystem capability bounds writes to here."""
    command: list[str]
    """argv for `asyncio.create_subprocess_exec`."""
    env: dict[str, str]
    """Process env. Includes MCP URL + Bearer token + API key. Tests
    verify no other secrets leak through."""


LaunchOutcome = LaunchPlan | LaunchRefused


def _memory_dir(memory_root: Path, vault_did: str, install_id: str) -> Path:
    """Per-agent memory directory.

    Rule 59 — the agent only sees this directory; the filesystem
    capability cannot escape it (enforced at the subprocess sandbox,
    not here)."""
    return memory_root / vault_did / install_id


async def plan_launch(
    *,
    request: LaunchRequest,
    registry: MCPSessionRegistry,
    audit_sink: AuditSink | None = None,
) -> LaunchOutcome:
    """Decide if a run may wake, and if so describe how to spawn it."""
    sink: AuditSink = audit_sink or NullAuditSink()
    decision: CapDecision = evaluate_cap(
        monthly_cap_usd=request.monthly_cap_usd,
        month_spent_usd=request.month_spent_usd,
        recent_run_cost_usd=request.recent_run_cost_usd,
    )
    if not decision.allowed:
        reason = decision.reason or "cost cap exceeded"
        await sink.emit(
            AuditRecord(
                vault_did=request.vault_did,
                event_type=AuditEventType.CAP_REFUSED_AT_WAKE,
                happened_at=audit_now(),
                run_id=request.install_id,
                allowed=False,
                detail=reason,
            ),
        )
        return LaunchRefused(reason=reason)

    settings = get_settings()

    vault = VaultClient(session_token=request.vault_session_token)
    ctx = DispatchContext(
        granted=list(request.granted_caps),
        vault=vault,
        audit_sink=sink,
        vault_did=request.vault_did,
        run_id=request.install_id,
    )
    session = registry.register(ctx=ctx, run_id=request.install_id)

    cwd = _memory_dir(
        settings.memory_root, request.vault_did, request.install_id,
    )

    env: dict[str, str] = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": str(cwd),
        # MCP wiring — the subprocess discovers the daemon via these
        # two variables. The bearer token is run-scoped and dies with
        # the session.
        "THEOURGIA_MCP_URL": (
            f"http://{settings.listen_host}:{settings.listen_port}/mcp/sse"
        ),
        "THEOURGIA_MCP_TOKEN": session.token,
        # Honesty rule beacon — the subprocess reads this and surfaces
        # the cap reservation to the C7 monitor.
        "THEOURGIA_RUN_RESERVATION_USD": str(decision.reservation_usd),
        "THEOURGIA_RUN_ID": session.run_id,
        "THEOURGIA_AGENT_SLUG": request.agent_slug,
    }
    if request.api_key_plaintext is not None:
        env[request.api_key_env] = request.api_key_plaintext

    base_command = [
        request.claude_binary,
        "--print",
        "--input-format", "text",
        request.task_text,
    ]

    # Rule 59: when filesystem capability is granted, the subprocess
    # must be confined to its memory dir. wrap_command_with_sandbox()
    # is a no-op when bwrap isn't installed (dev fallback); production
    # daemon Docker image installs bwrap.
    has_filesystem = AgentCapability.FILESYSTEM in request.granted_caps
    command = (
        wrap_command_with_sandbox(command=base_command, memory_dir=cwd)
        if has_filesystem
        else base_command
    )

    return LaunchPlan(
        session=session,
        reservation_usd=decision.reservation_usd,
        cwd=cwd,
        command=command,
        env=env,
    )
