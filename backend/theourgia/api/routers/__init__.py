"""API routers.

Routers are organized by domain. The router files attach to the
application via :func:`register_routers` in :mod:`theourgia.api.app`.

Versioned routes live under ``v1/``; unversioned (health, OpenAPI,
docs) live at the top level.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

from theourgia.api.routers import health, metrics, well_known
from theourgia.api.routers.v1 import auth as v1_auth
from theourgia.api.routers.v1 import entries as v1_entries
from theourgia.api.routers.v1 import library as v1_library
from theourgia.api.routers.v1 import meta as v1_meta
from theourgia.api.routers.v1 import user_settings as v1_user_settings

__all__ = ["register_routers"]


def register_routers(app: FastAPI) -> None:
    """Attach all routers to the app."""
    # Unversioned operational endpoints
    app.include_router(health.router, tags=["operations"])
    app.include_router(metrics.router, tags=["operations"])

    # .well-known endpoints (federation discovery, etc.)
    app.include_router(well_known.router, tags=["federation"])

    # Versioned API surface (v1)
    v1 = APIRouter(prefix="/api/v1")
    v1.include_router(v1_meta.router, tags=["meta"])
    v1.include_router(v1_auth.router, tags=["auth"])
    v1.include_router(v1_entries.router, tags=["entries"])
    v1.include_router(v1_library.router, tags=["library"])
    v1.include_router(v1_user_settings.router, tags=["user_settings"])
    app.include_router(v1)
