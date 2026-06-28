"""Agent daemon FastAPI app — health + control + SSE MCP endpoint."""

from __future__ import annotations

from fastapi import FastAPI

from theourgia_agent.__about__ import __instance_name__, __version__


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

    # Control + SSE MCP routes land in follow-on commits.
    return app


app = create_app()
