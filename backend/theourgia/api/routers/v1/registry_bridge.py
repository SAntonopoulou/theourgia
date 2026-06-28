"""Registry bridge — proxies the H10 A-cluster + C2 marketplace browse.

The vault sits between the admin SPA + the registry service. This
router maps `/api/v1/registry/*` paths to the registry's own
`/api/v1/*` endpoints, adding the vault session auth on the inbound
side + forwarding (or stripping) auth on the outbound side.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from theourgia.api.deps import CurrentUser
from theourgia.core.config import get_settings
from theourgia.core.registry.client import (
    RegistryClient,
    RegistryError,
    RegistryNotConfigured,
    RegistryRefused,
    RegistryUnreachable,
)


__all__ = ["router", "get_registry_client"]


router = APIRouter(prefix="/registry", tags=["registry"])


def get_registry_client() -> RegistryClient:
    """The RegistryClient FastAPI dependency. Tests override this to
    inject an httpx.MockTransport-backed client."""
    settings = get_settings()
    return RegistryClient(base_url=settings.registry_url)


def _handle_registry_error(exc: RegistryError) -> HTTPException:
    if isinstance(exc, RegistryNotConfigured):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Plugin registry not configured for this instance.",
        )
    if isinstance(exc, RegistryRefused):
        return HTTPException(
            status_code=exc.status_code, detail=exc.payload,
        )
    if isinstance(exc, RegistryUnreachable):
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=str(exc),
    )


@router.get("/plugins")
async def list_plugins(
    user: CurrentUser,  # noqa: ARG001 — proxied browse requires session
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
    sort: str = "recent_update",
) -> JSONResponse:
    """Paged plugin browse for the marketplace + public home."""
    try:
        body = await registry.list_plugins(sort=sort)
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=body)


@router.get("/authors/{did:path}")
async def get_author(
    did: str,
    user: CurrentUser,  # noqa: ARG001
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    try:
        body = await registry.get_author(did)
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=body)
