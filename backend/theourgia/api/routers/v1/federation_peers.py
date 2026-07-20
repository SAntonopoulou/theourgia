"""Federation peer directory — /api/v1/federation/peers (v1-026).

Backs the Network Browser surface (H08 §S3):

  GET    /federation/peers          — list known peers
  POST   /federation/peers          — add a peer by URL (verify + store)
  DELETE /federation/peers/{id}     — remove a peer

Adding a peer fetches its ``/.well-known/theourgia/actor`` document to
verify the URL really is a Theourgia instance and to record the DID it
announces. On success a capability token is issued (spec §6 — the
minimal v1 grant covering native-protocol hub operations on our inbox)
and stored on the row; the token is returned ONCE in the create
response and never in list reads.

Rules wired:

  · Operator-facing: every endpoint requires auth (CurrentUser).
  · Transport-gated: 503 while ``federation_transport_enabled`` is
    off, matching the federation inbox.
  · HTTPS only — plaintext peer URLs are refused at validation.
  · No reputation judgement is stored or returned — a peer is a URL,
    a DID, and a handshake state string.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Annotated
from urllib.parse import urlparse
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.config import get_settings
from theourgia.core.federation.capability_tokens import issue_capability_token
from theourgia.core.federation.identity import (
    InvalidDIDError,
    make_instance_id,
    parse_actor_id,
)
from theourgia.core.federation.keys import load_or_create_keypair
from theourgia.models.federation_peer import FederationPeer

__all__ = ["get_peer_http_client", "router"]


_log = logging.getLogger(__name__)


router = APIRouter()


_VERIFY_TIMEOUT_S = 5.0


def get_peer_http_client() -> httpx.AsyncClient | None:
    """FastAPI dependency — tests override to inject a MockTransport-
    backed client. None means "build a real client per request"."""
    return None


def _require_transport_enabled() -> None:
    settings = get_settings()
    if not settings.federation_transport_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="federation transport disabled on this instance",
        )


# ── Schemas ─────────────────────────────────────────────────────────


class PeerCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_url: str = Field(max_length=500)
    label: str | None = Field(default=None, max_length=255)


class PeerRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    base_url: str
    instance_did: str
    label: str | None
    status: str
    added_at: datetime
    last_seen_at: datetime | None


class PeerCreated(PeerRead):
    """Create response — the ONLY place the capability token appears."""

    capability_token: str | None


def _to_read(row: FederationPeer) -> PeerRead:
    return PeerRead(
        id=str(row.id),
        base_url=row.base_url,
        instance_did=row.instance_did,
        label=row.label,
        status=row.status,
        added_at=row.added_at,
        last_seen_at=row.last_seen_at,
    )


# ── Helpers ─────────────────────────────────────────────────────────


def _normalize_base_url(raw: str) -> str:
    """Validate + normalize the operator-supplied peer URL."""
    candidate = raw.strip().rstrip("/")
    parsed = urlparse(candidate)
    if parsed.scheme != "https":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peer URLs must be https://.",
        )
    if not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peer URL is missing a host.",
        )
    if parsed.query or parsed.fragment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Peer URL must not carry a query or fragment.",
        )
    return candidate


async def _fetch_peer_actor(
    base_url: str, client: httpx.AsyncClient | None,
) -> dict:
    """Fetch + validate the peer's actor document. 502 on any failure."""
    url = f"{base_url}/.well-known/theourgia/actor"
    try:
        if client is not None:
            response = await client.get(url)
        else:
            async with httpx.AsyncClient(timeout=_VERIFY_TIMEOUT_S) as real:
                response = await real.get(url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Peer unreachable: {exc}",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Peer did not answer the actor document "
                f"(HTTP {response.status_code}) — is it a Theourgia "
                "instance?"
            ),
        )
    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Peer actor document is not JSON.",
        ) from exc

    did = payload.get("did")
    public_key = payload.get("public_key")
    if not isinstance(did, str) or not did:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Peer actor document is missing its DID.",
        )
    try:
        parse_actor_id(did)
    except InvalidDIDError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Peer announced a malformed DID: {did!r}",
        ) from exc
    if not isinstance(public_key, str) or not public_key:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Peer actor document is missing its public key.",
        )
    return payload


def _issue_peer_capability(peer_did: str) -> str | None:
    """Issue the minimal inbox capability for a freshly added peer.

    Best-effort: a missing / unloadable instance keypair logs and
    returns None rather than failing the add — the operator can
    re-add later to reissue.
    """
    settings = get_settings()
    try:
        keypair = load_or_create_keypair(
            private_path=settings.federation_private_key_path,
            public_path=settings.federation_public_key_path,
        )
        instance_did = make_instance_id(settings.instance_id)
        return issue_capability_token(
            private_key=keypair.private_key,
            issuer=instance_did,
            subject=peer_did,
            audience=instance_did,
            capabilities=["federation:inbox"],
        )
    except Exception:  # noqa: BLE001 — token issuance is best-effort
        _log.warning(
            "federation_peers.capability_issue_failed",
            extra={"peer_did": peer_did},
        )
        return None


# ── Endpoints ───────────────────────────────────────────────────────


@router.get(
    "/federation/peers",
    response_model=list[PeerRead],
    summary="List known federation peers",
)
async def list_peers(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[PeerRead]:
    _require_transport_enabled()
    rows = (
        await db.execute(
            select(FederationPeer).order_by(FederationPeer.added_at)
        )
    ).scalars().all()
    return [_to_read(r) for r in rows]


@router.post(
    "/federation/peers",
    response_model=PeerCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Add a federation peer by URL",
)
async def add_peer(
    payload: PeerCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    http_client: Annotated[
        httpx.AsyncClient | None, Depends(get_peer_http_client),
    ],
) -> PeerCreated:
    _require_transport_enabled()
    base_url = _normalize_base_url(payload.base_url)

    existing = (
        await db.execute(
            select(FederationPeer).where(
                FederationPeer.base_url == base_url,
            )
        )
    ).scalars().first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This peer is already in the directory.",
        )

    actor_doc = await _fetch_peer_actor(base_url, http_client)
    peer_did = str(actor_doc["did"])
    now = datetime.now(tz=UTC)

    row = FederationPeer(
        base_url=base_url,
        instance_did=peer_did,
        label=payload.label,
        status="successful",
        added_at=now,
        last_seen_at=now,
        capability_token=_issue_peer_capability(peer_did),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    return PeerCreated(
        **_to_read(row).model_dump(),
        capability_token=row.capability_token,
    )


@router.delete(
    "/federation/peers/{peer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a federation peer",
)
async def remove_peer(
    peer_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> Response:
    _require_transport_enabled()
    row = (
        await db.execute(
            select(FederationPeer).where(FederationPeer.id == peer_id)
        )
    ).scalars().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No such peer.",
        )
    await db.delete(row)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
