"""ActivityPub actor + inbox + outbox endpoints — Phase 13.

Layout (all paths absolute, served at the apex — they're not under /api/v1
because AP clients expect canonical URLs):

  GET  /users/{handle}                — actor JSON-LD
  GET  /users/{handle}/inbox          — placeholder for AP clients that probe
  POST /users/{handle}/inbox          — receive an AP Activity
  GET  /users/{handle}/outbox         — paged OrderedCollection of public posts
  GET  /users/{handle}/followers      — count-only OrderedCollection
  GET  /users/{handle}/following      — empty OrderedCollection (rule:
                                        Theourgia does not follow others
                                        across AP — consent-first)

All endpoints require:
  - settings.federation_transport_enabled
  - ActivityPubSettings.enabled for the vault owner

When either is False, return 404 (don't leak the existence of a
disabled actor — rule 8: privacy by default).

Honesty rules (H08):
  · AP only ever sees Visibility=public (rule 12 — sealed never federates).
  · No engagement metrics (no likes, no reposts, no follower COUNT to
    the public — followers collection is unauthenticated and returns
    {"totalItems": null} to keep counts private; mainstream AP clients
    accept null and render "—").
  · No recommendation algorithm — outbox is strictly chronological.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Annotated, Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.core.config import get_settings
from theourgia.core.federation.identity import make_instance_id
from theourgia.core.federation.keys import (
    load_or_create_keypair,
    serialize_public_key,
)
from theourgia.models.activitypub import ActivityPubSettings
from theourgia.models.entries import (
    Entry,
    EntryType,
    EntryVisibility,
)
from theourgia.models.identity import Vault


__all__ = ["router"]


_log = logging.getLogger(__name__)


router = APIRouter()


AP_CONTEXT = [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1",
]


AP_CONTENT_TYPE = "application/activity+json"
AP_LD_CONTENT_TYPE = (
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
)


async def _resolve_actor_vault(
    db: AsyncSession, handle: str,
) -> Vault:
    """Look up a vault by its slug, requiring AP to be enabled.

    Returns the Vault row; raises 404 on any failure (don't differentiate
    "no such handle" from "AP disabled" — privacy by default)."""
    settings = get_settings()
    if not settings.federation_transport_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    vault = (
        await db.execute(select(Vault).where(Vault.slug == handle))
    ).scalars().first()
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    ap_settings = (
        await db.execute(
            select(ActivityPubSettings).where(
                ActivityPubSettings.owner_id == vault.owner_id,
            )
        )
    ).scalars().first()
    if ap_settings is None or not ap_settings.enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    return vault


def _build_actor(handle: str, vault: Vault) -> dict[str, Any]:
    settings = get_settings()
    base = settings.base_url.rstrip("/")
    actor_url = f"{base}/users/{handle}"

    keypair = load_or_create_keypair(
        private_path=settings.federation_private_key_path,
        public_path=settings.federation_public_key_path,
    )
    public_key_pem = keypair.public_key.public_bytes(
        encoding=__import__(
            "cryptography.hazmat.primitives.serialization",
            fromlist=["serialization"],
        ).Encoding.PEM,
        format=__import__(
            "cryptography.hazmat.primitives.serialization",
            fromlist=["serialization"],
        ).PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")

    return {
        "@context": AP_CONTEXT,
        "id": actor_url,
        "type": "Person",
        "preferredUsername": handle,
        "name": vault.display_name or handle,
        "summary": "",
        "inbox": f"{actor_url}/inbox",
        "outbox": f"{actor_url}/outbox",
        "followers": f"{actor_url}/followers",
        "following": f"{actor_url}/following",
        "url": f"{base}/@{handle}",
        "publicKey": {
            "id": f"{actor_url}#main-key",
            "owner": actor_url,
            "publicKeyPem": public_key_pem,
        },
        # No 'endpoints.sharedInbox' — we route everything per-actor for
        # privacy. AP servers fall back to the per-actor inbox.
    }


def _ap_response(payload: dict[str, Any]) -> Response:
    """Return an AP-typed JSON response. Mastodon + Pleroma + others
    expect ``application/activity+json``; we serve that exact MIME."""
    import json

    return Response(
        content=json.dumps(payload, separators=(",", ":")),
        media_type=AP_CONTENT_TYPE,
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get(
    "/users/{handle}",
    summary="ActivityPub actor",
    include_in_schema=True,
)
async def get_actor(
    handle: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    accept: str | None = Header(default=None),
) -> Response:
    """Return the AP actor document.

    Content negotiation: if Accept lacks `activity+json`, redirect to
    the human profile page. This keeps the URL universal — same id
    works for AP servers and browsers."""
    vault = await _resolve_actor_vault(db, handle)
    if accept and "activity+json" not in accept and "ld+json" not in accept:
        # Human browser; redirect to /@handle.
        settings = get_settings()
        return Response(
            status_code=status.HTTP_303_SEE_OTHER,
            headers={
                "Location": (
                    f"{settings.base_url.rstrip('/')}/@{quote(handle)}"
                ),
            },
        )
    return _ap_response(_build_actor(handle, vault))


@router.post(
    "/users/{handle}/inbox",
    summary="ActivityPub inbox (per-actor)",
    status_code=status.HTTP_202_ACCEPTED,
    include_in_schema=True,
)
async def post_inbox(
    handle: str,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Accept an AP-format activity addressed to this actor.

    For v1.0 we accept-and-stash: the request must be signed (the
    existing federation HTTP-signature verifier doesn't run here yet —
    that wiring lives in Phase 13.5 which connects AP to the native
    federation_activity table). We return 202 and persist the body to
    federation_activity with kind=UNKNOWN if we can't classify, so the
    operator dashboard always has a record."""
    vault = await _resolve_actor_vault(db, handle)
    body = await request.body()
    if not body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="empty body",
        )
    # Defer to the native inbox path's persistence layer. The AP→native
    # translation isn't lossless — for v1.0 we just stash with kind=UNKNOWN
    # and let the operator see what came in.
    try:
        import json
        body_json = json.loads(body.decode("utf-8"))
        if not isinstance(body_json, dict):
            raise ValueError("not an object")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"body is not valid JSON: {exc}",
        ) from exc

    from theourgia.models.federation_activity import (
        FederationActivity,
        FederationActivityKind,
    )

    activity = FederationActivity(
        sender_did=str(body_json.get("actor", "ap:unknown")),
        kind=_map_ap_type_to_kind(body_json.get("type")),
        body_json=body_json,
        received_at=datetime.now(tz=UTC),
        target_user_id=str(vault.owner_id),
    )
    db.add(activity)
    await db.commit()
    return Response(status_code=status.HTTP_202_ACCEPTED)


def _map_ap_type_to_kind(ap_type: Any) -> Any:
    """Translate an AP activity Type to our FederationActivityKind."""
    from theourgia.models.federation_activity import FederationActivityKind

    if not isinstance(ap_type, str):
        return FederationActivityKind.UNKNOWN
    mapping = {
        "Follow": FederationActivityKind.FOLLOW_REQUEST,
        "Accept": FederationActivityKind.FOLLOW_ACCEPT,
        "Reject": FederationActivityKind.FOLLOW_DECLINE,
        "Undo": FederationActivityKind.FOLLOW_UNDO,
        "Create": FederationActivityKind.NOTE_CREATE,
        "Update": FederationActivityKind.NOTE_UPDATE,
        "Delete": FederationActivityKind.NOTE_DELETE,
    }
    return mapping.get(ap_type, FederationActivityKind.UNKNOWN)


@router.get(
    "/users/{handle}/inbox",
    summary="ActivityPub inbox (placeholder GET)",
    include_in_schema=True,
)
async def get_inbox(
    handle: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Some AP probes do a GET first. Return a minimal OrderedCollection."""
    vault = await _resolve_actor_vault(db, handle)
    settings = get_settings()
    base = settings.base_url.rstrip("/")
    return _ap_response(
        {
            "@context": AP_CONTEXT,
            "id": f"{base}/users/{handle}/inbox",
            "type": "OrderedCollection",
            "totalItems": 0,
        },
    )


@router.get(
    "/users/{handle}/outbox",
    summary="ActivityPub outbox (paged public posts)",
    include_in_schema=True,
)
async def get_outbox(
    handle: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    page: bool = Query(default=False),
    cursor: str | None = Query(default=None),
) -> Response:
    """Paged OrderedCollection of public blog posts.

    Rule 12: AP only sees Visibility=PUBLIC.
    Rule 38: strictly chronological order (no popularity rank).
    """
    vault = await _resolve_actor_vault(db, handle)
    settings = get_settings()
    base = settings.base_url.rstrip("/")
    outbox_id = f"{base}/users/{handle}/outbox"

    if not page:
        # Collection summary — peer requests `?page=true` for the body.
        return _ap_response(
            {
                "@context": AP_CONTEXT,
                "id": outbox_id,
                "type": "OrderedCollection",
                "first": f"{outbox_id}?page=true",
            },
        )

    stmt = (
        select(Entry)
        .where(
            Entry.vault_id == vault.id,
            Entry.visibility == EntryVisibility.PUBLIC,
            Entry.type == EntryType.BLOG_POST,
            Entry.deleted_at.is_(None),
        )
        .order_by(desc(Entry.created_at))
        .limit(20)
    )
    entries = (await db.execute(stmt)).scalars().all()

    items = [
        _entry_to_create_activity(entry, base, handle)
        for entry in entries
    ]
    return _ap_response(
        {
            "@context": AP_CONTEXT,
            "id": f"{outbox_id}?page=true",
            "type": "OrderedCollectionPage",
            "partOf": outbox_id,
            "orderedItems": items,
        },
    )


def _entry_to_create_activity(
    entry: Entry, base: str, handle: str,
) -> dict[str, Any]:
    actor_url = f"{base}/users/{handle}"
    object_url = f"{base}/@{handle}/{entry.id}"
    return {
        "id": f"{object_url}/activity",
        "type": "Create",
        "actor": actor_url,
        "published": entry.created_at.isoformat(),
        "to": ["https://www.w3.org/ns/activitystreams#Public"],
        "cc": [f"{actor_url}/followers"],
        "object": {
            "id": object_url,
            "type": "Note",
            "attributedTo": actor_url,
            "content": entry.excerpt or entry.title,
            "name": entry.title,
            "published": entry.created_at.isoformat(),
            "url": object_url,
            "to": ["https://www.w3.org/ns/activitystreams#Public"],
            "cc": [f"{actor_url}/followers"],
        },
    }


@router.get(
    "/users/{handle}/followers",
    summary="ActivityPub followers collection (count-private)",
    include_in_schema=True,
)
async def get_followers(
    handle: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Return a stub collection. Rule 9: no public follower counts."""
    vault = await _resolve_actor_vault(db, handle)
    settings = get_settings()
    base = settings.base_url.rstrip("/")
    return _ap_response(
        {
            "@context": AP_CONTEXT,
            "id": f"{base}/users/{handle}/followers",
            "type": "OrderedCollection",
            # totalItems intentionally omitted — rule 9 / no public metrics.
            "first": f"{base}/users/{handle}/followers?page=true",
        },
    )


@router.get(
    "/users/{handle}/following",
    summary="ActivityPub following (always empty by design)",
    include_in_schema=True,
)
async def get_following(
    handle: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    """Always returns an empty collection.

    Theourgia does not federate-FOLLOW other AP actors (rule: consent-
    first follows are inbound only). The endpoint exists so AP clients
    that probe it don't 404 the entire actor."""
    vault = await _resolve_actor_vault(db, handle)
    settings = get_settings()
    base = settings.base_url.rstrip("/")
    return _ap_response(
        {
            "@context": AP_CONTEXT,
            "id": f"{base}/users/{handle}/following",
            "type": "OrderedCollection",
            "totalItems": 0,
            "orderedItems": [],
        },
    )
