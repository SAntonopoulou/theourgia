"""Phase 16 agent routes — bridge between vault session and daemon HTTP.

The H10 C-cluster surfaces (AgentTaskComposer, AgentRunMonitor, etc.)
hit these endpoints with the magician's vault session token; this
router resolves vault DID + adds the daemon control token, then forwards
to the localhost daemon.

The daemon's verbatim refusal payloads pass through unchanged so the
C7 monitor + C10 cost dashboard render the daemon's honesty text
(rule 49 — what the daemon said is what the magician sees).

Routes:
  · POST   /api/v1/agents/runs               — start a run
  · GET    /api/v1/agents/runs/{run_id}      — current snapshot
  · DELETE /api/v1/agents/runs/{run_id}      — terminate
  · GET    /api/v1/agents/runs/{run_id}/stream — SSE relay
  · POST   /api/v1/agents/runs/{run_id}/cost — proxy cost reports
  · GET    /api/v1/agents/audit              — proxy audit query
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from theourgia.api.deps import CurrentUser
from theourgia.core.agents.daemon_client import (
    DaemonClient,
    DaemonError,
    DaemonNotConfigured,
    DaemonRefused,
    DaemonUnreachable,
)
from theourgia.core.config import get_settings
from theourgia.models.identity import User


__all__ = ["router", "get_daemon_client"]


router = APIRouter(prefix="/agents", tags=["agents"])


def get_daemon_client() -> DaemonClient:
    """The DaemonClient FastAPI dependency. Tests override this to
    inject an httpx.MockTransport-backed client."""
    settings = get_settings()
    return DaemonClient(
        base_url=settings.agent_daemon_url,
        control_token=settings.agent_daemon_control_token.get_secret_value(),
    )


def _vault_did_for_user(user: User) -> str:
    """Resolve the calling user's vault DID.

    For the v1 single-tenant case, the vault DID is `did:vault:<instance_id>`
    + the user's identity slug. For multi-tenant deployments this will
    consult the User's DID document; that work lives downstream of this
    bridge."""
    settings = get_settings()
    # Identity row carries the user's stable handle on this instance.
    handle = getattr(user, "primary_handle", None) or str(user.id)
    return f"did:vault:{settings.instance_id}/{handle}"


def _handle_daemon_error(exc: DaemonError) -> HTTPException:
    """Map DaemonError to HTTPException, preserving daemon refusal copy."""
    if isinstance(exc, DaemonNotConfigured):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent daemon not configured for this instance.",
        )
    if isinstance(exc, DaemonRefused):
        return HTTPException(
            status_code=exc.status_code, detail=exc.payload,
        )
    if isinstance(exc, DaemonUnreachable):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=str(exc),
    )


# ── schemas ──────────────────────────────────────────────────────────


class StartRunBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    install_id: str
    agent_slug: str
    task_text: str = Field(min_length=1, max_length=8000)
    granted_caps: list[str]
    scope_id: str
    monthly_cap_usd: str
    month_spent_usd: str = "0"
    recent_run_cost_usd: list[str] = Field(default_factory=list)
    claude_binary: str = "claude"
    api_key_env: str = "ANTHROPIC_API_KEY"
    api_key_plaintext: str | None = None


class CostSampleBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tokens_in: int = 0
    tokens_out: int = 0
    tokens_cache: int = 0
    tokens_fresh: int = 0
    tokens_resume: int = 0
    cost_usd: str


class InstallCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: str = Field(min_length=1, max_length=64)
    display_name: str = Field(min_length=1, max_length=255)
    kind: str = Field(min_length=1, max_length=64)
    monthly_cost_cap_usd: str


class InstallStateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: str = Field(pattern=r"^(inactive|active|paused|cost_capped)$")


# ── routes ───────────────────────────────────────────────────────────


@router.post("/runs")
async def start_run(
    body: StartRunBody,
    user: CurrentUser,
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    """Start an agent run — proxies to daemon POST /runs.

    The vault adds the DID resolution + vault session token; the daemon
    holds the cap state, MCP session, subprocess.
    """
    vault_did = _vault_did_for_user(user)
    daemon_body: dict[str, Any] = {
        **body.model_dump(),
        "vault_did": vault_did,
        # The daemon's MCP layer needs a vault session token to dial
        # back into the vault's MCP. For now we mint a per-run token
        # derived from the user's existing session; production will
        # use a short-lived signed token (Phase 15 hardening).
        "vault_session_token": f"vault-sess-{user.id}",
    }
    try:
        result = await daemon.start_run(daemon_body)
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(status_code=202, content=result)


@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    user: CurrentUser,  # noqa: ARG001
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    try:
        result = await daemon.get_run(run_id)
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)


@router.delete("/runs/{run_id}")
async def terminate_run(
    run_id: str,
    user: CurrentUser,  # noqa: ARG001
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    try:
        result = await daemon.terminate_run(run_id)
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)


@router.post("/runs/{run_id}/cost")
async def report_cost(
    run_id: str,
    body: CostSampleBody,
    user: CurrentUser,  # noqa: ARG001
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    try:
        result = await daemon.report_cost(run_id, body.model_dump())
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)


@router.get("/runs/{run_id}/stream")
async def stream_run(
    run_id: str,
    user: CurrentUser,  # noqa: ARG001
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> StreamingResponse:
    """SSE relay — forwards the daemon's event-stream verbatim."""

    async def relay():
        try:
            async for chunk in daemon.stream_run(run_id):
                yield chunk
        except DaemonError as exc:
            # Inject a terminal SSE event with the error and stop.
            import json
            payload = json.dumps(
                {"error": str(exc), "type": type(exc).__name__},
            )
            yield f"event: error\ndata: {payload}\n\n".encode()

    return StreamingResponse(
        relay(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


# ── installs lifecycle ────────────────────────────────────────────────


def _vault_id_for_user(user: User) -> str:
    """Derive the daemon-side vault id for the calling user.

    The daemon's `vault_id` is a stable string per magician; we use
    the user's UUID stringified for v1 single-tenant. Multi-tenant
    deployments would map this to the magician's vault row id."""
    return str(user.id)


@router.post("/installs")
async def create_install(
    body: InstallCreateBody,
    user: CurrentUser,
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    daemon_body = {
        "vault_id": _vault_id_for_user(user),
        "agent_id": body.agent_id,
        "display_name": body.display_name,
        "kind": body.kind,
        "monthly_cost_cap_usd": body.monthly_cost_cap_usd,
    }
    try:
        result = await daemon.create_install(daemon_body)
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(status_code=201, content=result)


@router.get("/installs")
async def list_installs(
    user: CurrentUser,
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    try:
        result = await daemon.list_installs(_vault_id_for_user(user))
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)


@router.get("/installs/{install_id}")
async def get_install(
    install_id: str,
    user: CurrentUser,  # noqa: ARG001
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    try:
        result = await daemon.get_install(install_id)
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)


@router.patch("/installs/{install_id}/state")
async def update_install_state(
    install_id: str,
    body: InstallStateBody,
    user: CurrentUser,  # noqa: ARG001
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    try:
        result = await daemon.update_install_state(install_id, body.state)
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)


@router.delete("/installs/{install_id}")
async def delete_install(
    install_id: str,
    user: CurrentUser,  # noqa: ARG001
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
) -> JSONResponse:
    try:
        result = await daemon.delete_install(install_id)
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)


@router.get("/audit")
async def query_audit(
    user: CurrentUser,
    daemon: Annotated[DaemonClient, Depends(get_daemon_client)],
    event_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> JSONResponse:
    """Audit log for the calling user's vault — proxies to daemon GET /audit."""
    vault_did = _vault_did_for_user(user)
    try:
        result = await daemon.query_audit(
            vault_did=vault_did,
            event_type=event_type,
            limit=limit,
            offset=offset,
        )
    except DaemonError as exc:
        raise _handle_daemon_error(exc) from exc
    return JSONResponse(content=result)
