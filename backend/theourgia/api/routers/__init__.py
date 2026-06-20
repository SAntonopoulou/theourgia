"""API routers.

Routers are organized by domain. The router files attach to the
application via :func:`register_routers` in :mod:`theourgia.api.app`.

Versioned routes live under ``v1/``; unversioned (health, OpenAPI,
docs) live at the top level.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

from theourgia.api.routers import health
from theourgia.api.routers.v1 import meta as v1_meta

__all__ = ["register_routers"]


def register_routers(app: FastAPI) -> None:
    """Attach all routers to the app."""
    # Unversioned operational endpoints
    app.include_router(health.router, tags=["operations"])

    # Versioned API surface (v1)
    v1 = APIRouter(prefix="/api/v1")
    v1.include_router(v1_meta.router, tags=["meta"])
    app.include_router(v1)
