"""Registry FastAPI app — wires routers, health endpoint, identity discovery."""

from __future__ import annotations

from fastapi import FastAPI

from theourgia_registry.__about__ import __instance_name__, __version__
from theourgia_registry.api.routers import register_routers


__all__ = ["create_app", "app"]


def create_app() -> FastAPI:
    app = FastAPI(
        title="Theourgia plugin registry",
        version=__version__,
        description=(
            "Author/reviewer/public side of the Theourgia plugin ecosystem. "
            "Lives at plugins.theourgia.com; the vault host talks to this "
            "via the search + download endpoints."
        ),
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "service": __instance_name__,
            "version": __version__,
        }

    register_routers(app)
    return app


app = create_app()
