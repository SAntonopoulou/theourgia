"""NodeInfo 2.0 — instance metadata for the wider fediverse.

``GET /.well-known/nodeinfo``   — discovery document (rel → href)
``GET /nodeinfo/2.0``           — the schema itself

App-level (not /api/v1) because consumers hardcode both paths.

Honesty rules wired (H08 — no engagement metrics, anywhere):

  · ``usage`` carries NO user / post / comment counts. The NodeInfo
    2.0 schema marks every count inside ``usage.users`` optional, so
    the minimum valid shape is an empty users object — that is what
    we emit. Crawler dashboards render "—"; that is the honest answer.
  · ``openRegistrations`` mirrors the operator's ``registration.open``
    instance setting — a policy fact, not a metric.
  · Both endpoints 503 while ``federation_transport_enabled`` is off
    (matching the federation inbox gate): a non-federating instance
    does not advertise itself.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.__about__ import __version__
from theourgia.api.deps import get_db_session
from theourgia.core.config import get_settings
from theourgia.core.instancesettings.dbread import read_bool_setting

__all__ = ["router"]

_log = logging.getLogger(__name__)

router = APIRouter()


NODEINFO_SCHEMA_2_0 = "http://nodeinfo.diaspora.software/ns/schema/2.0"


def _require_transport_enabled() -> None:
    settings = get_settings()
    if not settings.federation_transport_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="federation transport disabled on this instance",
        )


@router.get(
    "/.well-known/nodeinfo",
    summary="NodeInfo discovery document",
)
async def nodeinfo_discovery() -> JSONResponse:
    _require_transport_enabled()
    settings = get_settings()
    base = settings.base_url.rstrip("/")
    return JSONResponse(
        content={
            "links": [
                {
                    "rel": NODEINFO_SCHEMA_2_0,
                    "href": f"{base}/nodeinfo/2.0",
                },
            ],
        },
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get(
    "/nodeinfo/2.0",
    summary="NodeInfo 2.0 document",
)
async def nodeinfo_2_0(
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> JSONResponse:
    _require_transport_enabled()
    open_registrations = await read_bool_setting(
        db, "registration.open", default=True,
    )
    body: dict[str, Any] = {
        "version": "2.0",
        "software": {
            "name": "theourgia",
            "version": __version__,
        },
        "protocols": ["activitypub"],
        "services": {"inbound": [], "outbound": []},
        "openRegistrations": open_registrations,
        # No counts — every field inside usage.users is optional in
        # the 2.0 schema, and the honesty rules ban emitting them.
        "usage": {"users": {}},
        "metadata": {},
    }
    return JSONResponse(
        content=body,
        media_type=(
            'application/json; profile='
            f'"{NODEINFO_SCHEMA_2_0}#"; charset=utf-8'
        ),
        headers={"Cache-Control": "public, max-age=3600"},
    )
