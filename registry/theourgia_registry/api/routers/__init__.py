"""Registry routers — public + author + maintainer.

Mounted under ``/api/v1`` for endpoints; the registry's public root
(``/``) is served by a separate static handler in the future. For now
the API surface is what's exposed.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

from theourgia_registry.api.routers import author, maintainer, public


__all__ = ["register_routers"]


def register_routers(app: FastAPI) -> None:
    v1 = APIRouter(prefix="/api/v1")
    v1.include_router(public.router, tags=["public"])
    v1.include_router(author.router, tags=["author"])
    v1.include_router(maintainer.router, tags=["maintainer"])
    app.include_router(v1)
