"""Runs control plane — POST/GET/DELETE + SSE transcript stream.

The vault calls these routes to wake/monitor/halt agents. The daemon
is on localhost-only by default; for now we authenticate with a static
shared control-plane token (`THEOURGIA_AGENT_CONTROL_TOKEN`) — this is
the bridge between the vault's per-magician auth and the daemon's
process-level trust.

Endpoints:
  * POST   /runs                    — start a run; returns RunHandle or LaunchRefused
  * GET    /runs/{run_id}           — current status snapshot
  * DELETE /runs/{run_id}           — terminate (SIGTERM, then SIGKILL after grace)
  * GET    /runs/{run_id}/stream    — SSE transcript stream
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.sessions import MCPSessionRegistry
from theourgia_agent.runs.cost import (
    CostExceededReservation,
    CostSample,
)
from theourgia_agent.runs.launcher import (
    LaunchPlan,
    LaunchRefused,
    LaunchRequest,
    plan_launch,
)
from theourgia_agent.runs.subprocess_runner import (
    AsyncioSubprocessSpawner,
    RunHandle,
    RunRegistry,
    SubprocessSpawner,
    execute_run,
)


__all__ = [
    "create_runs_router",
    "control_token_dependency",
    "mcp_registry_dependency",
    "run_registry_dependency",
    "subprocess_spawner_dependency",
]


# ── dependencies ──────────────────────────────────────────────────────


def control_token_dependency() -> str | None:
    """The shared secret the vault presents on every control-plane call.

    `None` means 'auth disabled' (used in unit tests + early dev). In
    production the env var MUST be set; the daemon's startup task warns
    on stdout if it isn't.
    """
    return os.environ.get("THEOURGIA_AGENT_CONTROL_TOKEN")


# These three dependencies hold process-wide singletons. Tests override
# them via `app.dependency_overrides` to inject fresh state.
_default_mcp_registry: MCPSessionRegistry | None = None
_default_run_registry: RunRegistry | None = None
_default_spawner: SubprocessSpawner | None = None


def mcp_registry_dependency() -> MCPSessionRegistry:
    global _default_mcp_registry
    if _default_mcp_registry is None:
        _default_mcp_registry = MCPSessionRegistry()
    return _default_mcp_registry


def run_registry_dependency() -> RunRegistry:
    global _default_run_registry
    if _default_run_registry is None:
        _default_run_registry = RunRegistry()
    return _default_run_registry


def subprocess_spawner_dependency() -> SubprocessSpawner:
    global _default_spawner
    if _default_spawner is None:
        _default_spawner = AsyncioSubprocessSpawner()
    return _default_spawner


def _check_control_token(
    provided: str | None,
    expected: str | None,
) -> None:
    """If a control token is configured, require it; otherwise skip."""
    if expected is None:
        return
    if not provided or provided != expected:
        raise HTTPException(
            status_code=401,
            detail="invalid or missing control token",
        )


# ── request / response shapes ─────────────────────────────────────────


class StartRunRequest(BaseModel):
    install_id: str
    vault_did: str
    agent_slug: str
    task_text: str = Field(min_length=1, max_length=8000)
    granted_caps: list[str]
    scope_id: str
    monthly_cap_usd: Decimal
    month_spent_usd: Decimal = Decimal("0")
    recent_run_cost_usd: list[Decimal] = Field(default_factory=list)
    vault_session_token: str = ""
    claude_binary: str = "claude"
    api_key_env: str = "ANTHROPIC_API_KEY"
    api_key_plaintext: str | None = None


@dataclass(slots=True, frozen=True)
class RunSnapshot:
    """The wire shape for GET /runs/{id} (and the start response)."""

    run_id: str
    session_token: str
    status: str
    started_at: str
    ended_at: str | None
    returncode: int | None
    reservation_usd: str

    @classmethod
    def from_handle(
        cls,
        handle: RunHandle,
        *,
        reservation_usd: Decimal,
    ) -> "RunSnapshot":
        return cls(
            run_id=handle.run_id,
            session_token=handle.session_token,
            status=handle.status.value,
            started_at=handle.started_at.isoformat(),
            ended_at=(
                handle.ended_at.isoformat()
                if handle.ended_at is not None
                else None
            ),
            returncode=handle.returncode,
            reservation_usd=str(reservation_usd),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "session_token": self.session_token,
            "status": self.status,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "returncode": self.returncode,
            "reservation_usd": self.reservation_usd,
        }


class CostSampleBody(BaseModel):
    tokens_in: int = 0
    tokens_out: int = 0
    tokens_cache: int = 0
    tokens_fresh: int = 0
    tokens_resume: int = 0
    cost_usd: Decimal


def _snapshot_with_cost(
    handle: RunHandle, *, reservation_usd: Decimal,
) -> dict[str, Any]:
    out = RunSnapshot.from_handle(
        handle, reservation_usd=reservation_usd,
    ).to_dict()
    out["cost"] = handle.cost.snapshot()
    return out


# Map handle.run_id → reservation_usd (cheap; only live runs are stored).
# In production this lives in agent_run rows; the in-memory map is a
# stopgap until the DB write-through lands.
_reservations: dict[str, Decimal] = {}


# ── router ────────────────────────────────────────────────────────────


def create_runs_router() -> APIRouter:
    router = APIRouter(prefix="/runs", tags=["runs"])

    @router.post("")
    async def start_run(
        body: StartRunRequest,
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
        mcp_registry: MCPSessionRegistry = Depends(mcp_registry_dependency),
        run_registry: RunRegistry = Depends(run_registry_dependency),
        spawner: SubprocessSpawner = Depends(subprocess_spawner_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)

        try:
            granted_caps = [
                AgentCapability.from_string(c) for c in body.granted_caps
            ]
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        request = LaunchRequest(
            install_id=body.install_id,
            vault_did=body.vault_did,
            agent_slug=body.agent_slug,
            task_text=body.task_text,
            granted_caps=granted_caps,
            scope_id=body.scope_id,
            monthly_cap_usd=body.monthly_cap_usd,
            month_spent_usd=body.month_spent_usd,
            recent_run_cost_usd=list(body.recent_run_cost_usd),
            vault_session_token=body.vault_session_token,
            claude_binary=body.claude_binary,
            api_key_env=body.api_key_env,
            api_key_plaintext=body.api_key_plaintext,
        )

        outcome = plan_launch(request=request, registry=mcp_registry)
        if isinstance(outcome, LaunchRefused):
            return JSONResponse(
                status_code=409,
                content={"refused": True, "reason": outcome.reason},
            )

        assert isinstance(outcome, LaunchPlan)
        handle = await execute_run(
            plan=outcome,
            spawner=spawner,
            mcp_registry=mcp_registry,
            run_registry=run_registry,
        )
        _reservations[handle.run_id] = outcome.reservation_usd
        return JSONResponse(
            status_code=202,
            content=RunSnapshot.from_handle(
                handle, reservation_usd=outcome.reservation_usd,
            ).to_dict(),
        )

    @router.get("/{run_id}")
    async def get_run(
        run_id: str,
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
        run_registry: RunRegistry = Depends(run_registry_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        handle = run_registry.lookup(run_id)
        if handle is None:
            raise HTTPException(status_code=404, detail="run not found")
        return JSONResponse(
            content=_snapshot_with_cost(
                handle,
                reservation_usd=_reservations.get(run_id, Decimal("0")),
            ),
        )

    @router.post("/{run_id}/cost")
    async def report_cost(
        run_id: str,
        body: CostSampleBody,
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
        run_registry: RunRegistry = Depends(run_registry_dependency),
    ) -> JSONResponse:
        """Subprocess wrapper posts incremental cost samples here.

        On `CostExceededReservation`, the daemon terminates the run
        immediately — the magician is NEVER charged beyond the at-wake
        reservation (a hard guarantee of the cap design)."""
        _check_control_token(x_daemon_auth, expected_token)
        handle = run_registry.lookup(run_id)
        if handle is None:
            raise HTTPException(status_code=404, detail="run not found")
        sample = CostSample(
            tokens_in=body.tokens_in,
            tokens_out=body.tokens_out,
            tokens_cache=body.tokens_cache,
            tokens_fresh=body.tokens_fresh,
            tokens_resume=body.tokens_resume,
            cost_usd=body.cost_usd,
        )
        try:
            await handle.cost.record(sample)
        except CostExceededReservation as exc:
            await handle.terminate()
            return JSONResponse(
                status_code=409,
                content={
                    "cost_exceeded": True,
                    "reservation_usd": str(exc.reservation_usd),
                    "spent_usd": str(exc.spent_usd),
                    "halted": True,
                },
            )
        return JSONResponse(content=handle.cost.snapshot())

    @router.delete("/{run_id}")
    async def terminate_run(
        run_id: str,
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
        run_registry: RunRegistry = Depends(run_registry_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        handle = run_registry.lookup(run_id)
        if handle is None:
            raise HTTPException(status_code=404, detail="run not found")
        await handle.terminate()
        return JSONResponse(
            content={"run_id": run_id, "status": handle.status.value},
        )

    @router.get("/{run_id}/stream")
    async def stream_run(
        run_id: str,
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
        run_registry: RunRegistry = Depends(run_registry_dependency),
    ) -> StreamingResponse:
        _check_control_token(x_daemon_auth, expected_token)
        handle = run_registry.lookup(run_id)
        if handle is None:
            raise HTTPException(status_code=404, detail="run not found")

        async def event_source() -> AsyncGenerator[bytes, None]:
            async for chunk in handle.transcript.aiter():
                payload = json.dumps(
                    {
                        "timestamp": chunk.timestamp.isoformat(),
                        "stream": chunk.stream,
                        "text": chunk.text,
                    },
                )
                yield f"event: chunk\ndata: {payload}\n\n".encode()
            terminal = json.dumps(
                {
                    "status": handle.status.value,
                    "returncode": handle.returncode,
                    "ended_at": (
                        handle.ended_at.isoformat()
                        if handle.ended_at
                        else None
                    ),
                },
            )
            yield f"event: end\ndata: {terminal}\n\n".encode()

        return StreamingResponse(
            event_source(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
            },
        )

    return router
