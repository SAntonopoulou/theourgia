"""Outbound ActivityPub activities via the delivery queue — v1-026.

The Phase 12.5 transport (outbound.deliver + FederationDelivery +
Celery drain) existed but nothing enqueued. This module is the bridge:
it builds AP activity JSON and enqueues deliveries so the existing
retry worker carries them to peers.

Producers:

  · Inbound Follow processing (:mod:`inbox_processor`) and the manual
    approve endpoint — enqueue a signed ``Accept`` back to the
    follower's inbox.
  · ``apply_publish`` (entries router) — enqueue ``Create(Note)`` to
    every ACCEPTED follower of a vault whose owner opted into AP with
    ``broadcast_creates``.

Honesty + safety rules wired:

  · Everything is a no-op when ``settings.federation_transport_enabled``
    is False — rows never accumulate on instances that haven't opted
    in (the drain worker is gated too; this is defence in depth).
  · Broadcast covers ACCEPTED followers only — pending follow requests
    receive nothing.
  · Enqueue failures NEVER propagate into the publish path — callers
    wrap in try/except, and this module logs rather than raises for
    per-follower problems.
  · Only Visibility=PUBLIC content is broadcast (rule 12 — the publish
    path promotes to PUBLIC before calling in here).
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.config import get_settings
from theourgia.core.federation.delivery_queue import enqueue
from theourgia.core.federation.identity import InvalidDIDError, parse_actor_id
from theourgia.core.ids import uuid7
from theourgia.models.activitypub import ActivityPubFollower, ActivityPubSettings
from theourgia.models.federation_delivery import FederationDelivery
from theourgia.models.identity import Vault

__all__ = [
    "build_accept_activity",
    "build_create_activity",
    "enqueue_accept_for_follow",
    "enqueue_create_for_entry",
    "resolve_inbox_url",
]


_log = logging.getLogger(__name__)


AP_CONTEXT_URL = "https://www.w3.org/ns/activitystreams"


def resolve_inbox_url(
    follower_did: str, follower_inbox_url: str | None = None,
) -> str | None:
    """Best-effort inbox URL for a follower reference.

    Preference order:

    1. A stored ``follower_inbox_url`` (recorded when known).
    2. Native Theourgia DID → the instance's well-known native inbox.
    3. AP actor URL → the ``{actor}/inbox`` convention (mainstream AP
       servers serve the per-actor inbox there; a stored inbox URL
       from actor-document discovery always wins when present).

    Returns None when no HTTPS inbox can be derived — the caller logs
    and skips rather than guessing further.
    """
    if follower_inbox_url:
        return follower_inbox_url
    if follower_did.startswith("did:theourgia:"):
        try:
            host, _, _ = parse_actor_id(follower_did)
        except InvalidDIDError:
            return None
        return f"https://{host}/api/v1/federation/inbox"
    if follower_did.startswith("https://"):
        return f"{follower_did.rstrip('/')}/inbox"
    return None


def build_accept_activity(
    *,
    base: str,
    handle: str,
    follower_did: str,
    follow_activity: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """The ``Accept`` we send back for an inbound Follow.

    Echoes the original Follow activity as the object when we have it
    (Mastodon matches on it); otherwise reconstructs the minimal
    Follow shape.
    """
    actor_url = f"{base}/users/{handle}"
    obj: dict[str, Any] = follow_activity or {
        "type": "Follow",
        "actor": follower_did,
        "object": actor_url,
    }
    return {
        "@context": AP_CONTEXT_URL,
        "id": f"{actor_url}#accepts/{uuid7()}",
        "type": "Accept",
        "actor": actor_url,
        "object": obj,
    }


def build_create_activity(
    entry: Any, *, base: str, handle: str,
) -> dict[str, Any]:
    """``Create(Note)`` for a freshly published public entry.

    Mirrors the outbox's activity shape (activitypub_actor) so a
    follower's fetched view and the pushed view agree.
    """
    actor_url = f"{base}/users/{handle}"
    object_url = f"{base}/@{handle}/{entry.id}"
    published = (
        entry.published_at.isoformat()
        if getattr(entry, "published_at", None)
        else entry.created_at.isoformat()
    )
    return {
        "@context": AP_CONTEXT_URL,
        "id": f"{object_url}/activity",
        "type": "Create",
        "actor": actor_url,
        "published": published,
        "to": ["https://www.w3.org/ns/activitystreams#Public"],
        "cc": [f"{actor_url}/followers"],
        "object": {
            "id": object_url,
            "type": "Note",
            "attributedTo": actor_url,
            "content": entry.excerpt or entry.title,
            "name": entry.title,
            "published": published,
            "url": object_url,
            "to": ["https://www.w3.org/ns/activitystreams#Public"],
            "cc": [f"{actor_url}/followers"],
        },
    }


async def _vault_for_owner(
    db: AsyncSession, owner_id: UUID,
) -> Vault | None:
    stmt = select(Vault).where(Vault.owner_id == owner_id)
    return (await db.execute(stmt)).scalars().first()


async def enqueue_accept_for_follow(
    db: AsyncSession,
    *,
    owner_id: UUID,
    follower_did: str,
    follower_inbox_url: str | None = None,
    follow_activity: dict[str, Any] | None = None,
) -> FederationDelivery | None:
    """Queue the signed ``Accept`` for a resolved follow.

    Returns the delivery row, or None when transport is disabled, the
    owner has no vault (no actor URL to speak as), or no inbox URL can
    be derived. Never raises for those soft failures — the follow
    itself is already recorded locally; the Accept is a courtesy the
    retry queue keeps attempting once conditions allow.
    """
    settings = get_settings()
    if not settings.federation_transport_enabled:
        return None

    vault = await _vault_for_owner(db, owner_id)
    if vault is None:
        _log.warning(
            "ap_outbound.accept.no_vault", extra={"owner_id": str(owner_id)},
        )
        return None

    inbox_url = resolve_inbox_url(follower_did, follower_inbox_url)
    if inbox_url is None:
        _log.warning(
            "ap_outbound.accept.no_inbox",
            extra={"follower_did": follower_did},
        )
        return None

    base = settings.base_url.rstrip("/")
    activity = build_accept_activity(
        base=base,
        handle=vault.slug,
        follower_did=follower_did,
        follow_activity=follow_activity,
    )
    return await enqueue(
        db,
        recipient_did=follower_did,
        url=inbox_url,
        body_json=activity,
    )


async def enqueue_create_for_entry(db: AsyncSession, entry: Any) -> int:
    """Queue ``Create(Note)`` deliveries for a just-published entry.

    ACCEPTED followers only (the ActivityPubFollower table holds
    confirmed follows; pending requests get nothing). Applies the
    owner's AP settings: master ``enabled`` + ``broadcast_creates``
    must both hold. Returns the number of deliveries enqueued.
    """
    settings = get_settings()
    if not settings.federation_transport_enabled:
        return 0

    ap_settings = (
        await db.execute(
            select(ActivityPubSettings).where(
                ActivityPubSettings.owner_id == entry.owner_id,
            )
        )
    ).scalars().first()
    if (
        ap_settings is None
        or not ap_settings.enabled
        or not ap_settings.broadcast_creates
    ):
        return 0

    vault = await _vault_for_owner(db, entry.owner_id)
    if vault is None:
        return 0

    followers = (
        await db.execute(
            select(ActivityPubFollower).where(
                ActivityPubFollower.owner_id == entry.owner_id,
            )
        )
    ).scalars().all()
    if not followers:
        return 0

    base = settings.base_url.rstrip("/")
    activity = build_create_activity(entry, base=base, handle=vault.slug)

    enqueued = 0
    for follower in followers:
        inbox_url = resolve_inbox_url(
            follower.follower_did, follower.follower_inbox_url,
        )
        if inbox_url is None:
            _log.warning(
                "ap_outbound.create.no_inbox",
                extra={"follower_did": follower.follower_did},
            )
            continue
        await enqueue(
            db,
            recipient_did=follower.follower_did,
            url=inbox_url,
            body_json=activity,
        )
        enqueued += 1
    return enqueued
