"""Instance metadata endpoint.

``GET /api/v1/meta`` — returns version, capabilities, and identity
information for this Theourgia instance. Used by clients to discover
the surface before deeper interaction.

This endpoint is intentionally unauthenticated: federation peers and
prospective integrators need to read metadata to negotiate.
"""

from __future__ import annotations

from fastapi import APIRouter

from theourgia.__about__ import __version__
from theourgia.api.schemas import Meta
from theourgia.core.config import get_settings

__all__ = ["router"]

router = APIRouter()


@router.get(
    "/meta",
    summary="Instance metadata",
    description="Version, capabilities, and identity of this Theourgia instance.",
    response_model=Meta,
)
async def meta() -> Meta:
    settings = get_settings()
    return Meta(
        instance_id=settings.instance_id,
        version=__version__,
        api_version="v1",
        environment=settings.env,
        telemetry="none",
    )
