"""WebFinger endpoint — RFC 7033 actor discovery.

Phase 13 (ActivityPub) interoperability. Fediverse software (Mastodon,
Pleroma, GoToSocial, etc.) discovers actors at remote instances by
calling::

  GET /.well-known/webfinger?resource=acct:<user>@<host>

The response is a JSON Resource Descriptor (JRD) per RFC 7033 with
the actor's profile + ActivityPub inbox URL.

Rule 60 invariants this endpoint observes:

  · The endpoint is mounted at the app level (not under ``/api/v1``)
    because federation clients hardcode the ``.well-known`` path.
  · Only resources for vaults / hubs that have explicitly enabled
    ActivityPub are discoverable. Resources for ActivityPub-disabled
    or non-existent accounts return 404.
  · NO email lookup: the only resource scheme accepted is ``acct:``;
    anything else (``mailto:``, ``http:``, etc.) returns 400.
  · The endpoint is rate-limited at the substrate level (see
    middleware) — federation peers that flood get throttled.
  · When ``FEDERATION_TRANSPORT_ENABLED`` is false, the endpoint
    returns 404 for all queries. The instance is not discoverable.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.core.config import get_settings
from theourgia.models.activitypub import ActivityPubSettings
from theourgia.models.identity import Vault

__all__ = ["router"]


_log = logging.getLogger(__name__)


router = APIRouter()


class WebFingerLink(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rel: str
    type: str | None = None
    href: str | None = None
    template: str | None = None


class WebFingerResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str
    aliases: list[str] = Field(default_factory=list)
    links: list[WebFingerLink] = Field(default_factory=list)


def _parse_acct(resource: str, host: str) -> str:
    """Parse ``acct:<user>@<host>`` and return ``<user>`` if the host
    matches. Raises HTTPException 400 on any other shape, 404 if the
    host doesn't match."""
    if not resource.startswith("acct:"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only acct: resources are supported.",
        )
    rest = resource[5:]
    if "@" not in rest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="acct: resource must be 'acct:<user>@<host>'.",
        )
    user, _, resource_host = rest.rpartition("@")
    if resource_host != host:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such actor on this instance.",
        )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="acct: resource must include a user.",
        )
    return user


@router.get("/.well-known/webfinger")
async def webfinger(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    resource: str = Query(..., description="acct:<user>@<host>"),
) -> Response:
    settings = get_settings()
    if not settings.federation_transport_enabled:
        # The instance is not discoverable when transport is off.
        # Return 404 so federation peers treat us as "no such instance"
        # without learning that we deliberately disabled transport.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such actor on this instance.",
        )

    user = _parse_acct(resource, settings.instance_id)

    # Look up the vault by slug
    vault = (
        await db.execute(
            select(Vault).where(Vault.slug == user)
        )
    ).scalars().first()
    if vault is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such actor on this instance.",
        )

    # ActivityPub must be explicitly enabled per-vault.
    # ActivityPubSettings is owner-scoped (one row per vault owner).
    ap_settings = (
        await db.execute(
            select(ActivityPubSettings).where(
                ActivityPubSettings.owner_id == vault.owner_id,
            )
        )
    ).scalars().first()
    if ap_settings is None or not ap_settings.enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such actor on this instance.",
        )

    base = settings.base_url.rstrip("/")
    actor_url = f"{base}/users/{vault.slug}"
    profile_url = f"{base}/@{vault.slug}"
    body = WebFingerResponse(
        subject=resource,
        aliases=[actor_url, profile_url],
        links=[
            WebFingerLink(
                rel="self",
                type="application/activity+json",
                href=actor_url,
            ),
            WebFingerLink(
                rel="http://webfinger.net/rel/profile-page",
                type="text/html",
                href=profile_url,
            ),
        ],
    )
    return Response(
        content=body.model_dump_json(),
        media_type="application/jrd+json",
        headers={"Cache-Control": "public, max-age=3600"},
    )
