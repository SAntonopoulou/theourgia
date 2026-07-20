"""Cost aggregation — the read side for the H10 C10 dashboard.

GET /costs/summary rolls persisted run cost snapshots up per vault:
window totals plus a per-install breakdown with the monthly-cap
percentage (rule 58 — fresh/resume split included; rule 56 — the cap
chip is always month-spend against the MONTHLY cap regardless of the
requested window).

Bearer `X-Daemon-Auth` token gates the endpoint, same as the rest of
the control plane; the vault bridge scopes by vault_id.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import JSONResponse

from theourgia_agent.api.routers.runs import (
    _check_control_token,
    control_token_dependency,
    run_persistence_dependency,
)
from theourgia_agent.runs.persistence import (
    SUMMARY_WINDOWS,
    RunPersistence,
)

__all__ = ["create_costs_router"]


def create_costs_router() -> APIRouter:
    router = APIRouter(prefix="/costs", tags=["costs"])

    @router.get("/summary")
    async def cost_summary(
        vault_id: str = Query(min_length=1),
        window: str = Query(default="month"),
        x_daemon_auth: str | None = Header(default=None),
        expected_token: str | None = Depends(control_token_dependency),
        persistence: RunPersistence = Depends(run_persistence_dependency),
    ) -> JSONResponse:
        _check_control_token(x_daemon_auth, expected_token)
        if window not in SUMMARY_WINDOWS:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"unknown window {window!r} "
                    f"(expected one of {', '.join(SUMMARY_WINDOWS)})"
                ),
            )
        summary = await persistence.cost_summary(
            vault_id=vault_id, window=window,
        )
        return JSONResponse(content=summary)

    return router
