"""Agent daemon FastAPI app — health + control + SSE MCP endpoint."""

from __future__ import annotations

from fastapi import FastAPI

from theourgia_agent.__about__ import __instance_name__, __version__
from theourgia_agent.api.routers.audit import create_audit_router
from theourgia_agent.api.routers.costs import create_costs_router
from theourgia_agent.api.routers.installs import create_installs_router
from theourgia_agent.api.routers.mcp import create_mcp_router
from theourgia_agent.api.routers.memory import create_memory_router
from theourgia_agent.api.routers.runs import create_runs_router


__all__ = ["create_app", "app"]


def create_app() -> FastAPI:
    app = FastAPI(
        title="Theourgia agent daemon",
        version=__version__,
        description=(
            "Optional companion process for the AI agent layer. "
            "Talks to the vault over localhost HTTP; uses SSE for MCP."
        ),
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "service": __instance_name__,
            "version": __version__,
        }

    app.include_router(create_mcp_router())
    app.include_router(create_runs_router())
    app.include_router(create_audit_router())
    app.include_router(create_installs_router())
    app.include_router(create_memory_router())
    app.include_router(create_costs_router())
    return app


app = create_app()
