"""POST /api/v1/federation/inbox — Phase 12.5.

Verifies a signed federation request, records the activity, and returns
202 fast. Compose:

  1. Read raw body bytes (the exact bytes the sender signed).
  2. Parse the Signature-Input header to extract `keyid` (the sender's DID).
  3. Resolve the peer's public key via :class:`PeerKeyResolver`.
  4. Call :func:`verify_request` — raises HTTPSignatureError on failure.
  5. Record the signature's nonce in the replay store; raises
     ReplayDetectedError on duplicate.
  6. Parse the body JSON, persist as :class:`FederationActivity`.
  7. Respond 202 with the new activity's id.

Out-of-band handlers (hub processors, follow request handlers, etc.) read
the federation_activity table and flip status PENDING → PROCESSED.

The inbox is gated on `settings.federation_transport_enabled` — when
False, every call returns 503 with verbatim "federation transport
disabled" (defence in depth alongside the outbound gate).
"""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session
from theourgia.core.config import get_settings
from theourgia.core.federation.capability_tokens import (
    InvalidCapabilityTokenError,
    verify_capability_token,
)
from theourgia.core.federation.http_signatures import (
    HTTPSignatureError,
    verify_request,
)
from theourgia.core.federation.identity import make_instance_id
from theourgia.core.federation.keys import load_or_create_keypair
from theourgia.core.federation.peer_keys import (
    PeerKeyResolver,
    PeerKeyUnavailableError,
    get_default_resolver,
)
from theourgia.core.federation.replay_store import (
    ReplayDetectedError,
    record_nonce,
)
from theourgia.models.federation_activity import (
    FederationActivity,
    FederationActivityKind,
)

__all__ = [
    "CAPABILITY_INBOX_SCOPE",
    "CAPABILITY_REQUIRED_KINDS",
    "get_peer_key_resolver",
    "router",
]


_log = logging.getLogger(__name__)


router = APIRouter()


_KEYID_RE = re.compile(r'keyid="(?P<keyid>[^"]+)"')


# ── Capability gating (spec §6) ─────────────────────────────────────
#
# Fine-grained native-protocol operations (hub-admin actions performed
# on another instance) require a capability token this instance issued
# to the peer at add-peer time. Comment-shaped and follow-shaped
# activities are exempt per spec §6.4 (they land in moderation / the
# approval queue instead). v1 verifies the minimal contract: our own
# EdDSA signature, our DID as issuer AND audience, the sender as
# subject, and the single inbox scope.

CAPABILITY_INBOX_SCOPE = "federation:inbox"

CAPABILITY_REQUIRED_KINDS = frozenset({
    FederationActivityKind.HUB_INVITE,
    FederationActivityKind.HUB_ACCEPT,
    FederationActivityKind.HUB_DECLINE,
    FederationActivityKind.HUB_LEAVE,
    FederationActivityKind.HUB_POST,
    FederationActivityKind.HUB_UPDATE,
    FederationActivityKind.HUB_DELETE,
})


def _require_capability(token: str | None, sender_did: str) -> None:
    """403 unless ``token`` is a valid inbox capability for this sender."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "capability_required: this operation needs a capability "
                "token issued by this instance"
            ),
        )
    settings = get_settings()
    try:
        keypair = load_or_create_keypair(
            private_path=settings.federation_private_key_path,
            public_path=settings.federation_public_key_path,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="federation keypair not available",
        ) from exc
    instance_did = make_instance_id(settings.instance_id)
    try:
        decoded = verify_capability_token(
            token=token,
            public_key=keypair.public_key,
            expected_issuer=instance_did,
            expected_audience=instance_did,
            required_capability=CAPABILITY_INBOX_SCOPE,
        )
    except InvalidCapabilityTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"capability_invalid: {exc}",
        ) from exc
    if decoded.sub != sender_did:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "capability_invalid: token subject does not match the "
                "request signer"
            ),
        )


async def _registered_peer_base_url(did: str) -> str | None:
    """Resolve a DID to the base_url the operator registered at
    peer-add time (v1-029). Registered peers are authoritative for
    their own location — this is what makes nonstandard ports work;
    unknown DIDs fall through to the strict https-by-DID fetch."""
    from theourgia.core.db import get_sessionmaker
    from theourgia.models.federation_peer import FederationPeer

    async with get_sessionmaker()() as session:
        result = await session.execute(
            select(FederationPeer.base_url).where(
                FederationPeer.instance_did == did
            )
        )
        return result.scalar_one_or_none()


def get_peer_key_resolver() -> PeerKeyResolver:
    """FastAPI dependency — tests override to inject a mock-transport
    resolver."""
    resolver = get_default_resolver()
    if resolver.peer_base_url_lookup is None:
        resolver.peer_base_url_lookup = _registered_peer_base_url
    return resolver


def _extract_keyid(signature_input: str | None) -> str | None:
    """Parse `keyid` from the Signature-Input header value."""
    if not signature_input:
        return None
    m = _KEYID_RE.search(signature_input)
    return m.group("keyid") if m else None


def _classify_kind(body: dict[str, Any]) -> FederationActivityKind:
    """Map the body's `type` field to a known activity kind, or UNKNOWN."""
    raw = body.get("type") if isinstance(body, dict) else None
    if not isinstance(raw, str):
        return FederationActivityKind.UNKNOWN
    try:
        return FederationActivityKind(raw)
    except ValueError:
        return FederationActivityKind.UNKNOWN


@router.post(
    "/federation/inbox",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Receive a signed federation activity",
    include_in_schema=True,
)
async def receive_inbox(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    resolver: Annotated[
        PeerKeyResolver, Depends(get_peer_key_resolver),
    ],
    signature_input: str | None = Header(default=None, alias="Signature-Input"),
) -> JSONResponse:
    settings = get_settings()
    if not settings.federation_transport_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="federation transport disabled on this instance",
        )

    keyid = _extract_keyid(signature_input)
    if not keyid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="missing keyid in Signature-Input header",
        )

    body_bytes = await request.body()

    # Resolve sender key.
    try:
        peer = await resolver.resolve(keyid)
    except PeerKeyUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    # Verify signature. verify_request raises HTTPSignatureError on
    # any failure mode (window, mismatch, malformed, etc.).
    try:
        verify_request(
            public_key=peer.public_key,
            method=request.method,
            path=request.url.path,
            headers={k: v for k, v in request.headers.items()},
            expected_keyid=keyid,
        )
    except HTTPSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"signature verification failed: {exc}",
        ) from exc

    # Replay guard. The nonce key is "<keyid>:<created>" where created
    # comes from the Signature-Input header; falling back to the body's
    # SHA-256 would be acceptable but the existing verifier hashes the
    # body for digest, so the canonical replay key includes the
    # signature's created timestamp.
    nonce_key = _build_replay_nonce_key(signature_input, body_bytes)
    try:
        await record_nonce(db, nonce_key=nonce_key)
    except ReplayDetectedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"replayed nonce: {exc}",
        ) from exc

    # Parse body JSON. Verification passed already; this is just
    # extraction for the kind/target fields.
    try:
        body_json: dict = _safe_json(body_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"body is not valid JSON: {exc}",
        ) from exc

    kind = _classify_kind(body_json)

    # Capability gating (spec §6) — hub-admin operations need the
    # token this instance issued at add-peer time. Verified AFTER the
    # signature so an attacker can't probe capability validity
    # unsigned, and BEFORE persistence so refused ops leave no row.
    if kind in CAPABILITY_REQUIRED_KINDS:
        _require_capability(
            request.headers.get("X-Theourgia-Capability"), keyid,
        )

    target_hub_id = (
        body_json.get("target_hub_id")
        if isinstance(body_json.get("target_hub_id"), str)
        else None
    )
    target_user_id = (
        body_json.get("target_user_id")
        if isinstance(body_json.get("target_user_id"), str)
        else None
    )

    activity = FederationActivity(
        sender_did=keyid,
        kind=kind,
        body_json=body_json,
        received_at=datetime.now(tz=UTC),
        target_hub_id=target_hub_id,
        target_user_id=target_user_id,
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "activity_id": str(activity.id),
            "kind": activity.kind.value,
            "received_at": activity.received_at.isoformat(),
        },
    )


# ── helpers ──────────────────────────────────────────────────────────


def _safe_json(body: bytes) -> dict:
    import json

    if not body:
        raise ValueError("empty body")
    out = json.loads(body.decode("utf-8"))
    if not isinstance(out, dict):
        raise ValueError("body must be a JSON object")
    return out


_CREATED_RE = re.compile(r"created=(?P<ts>\d+)")


def _build_replay_nonce_key(
    signature_input: str | None, body: bytes,
) -> str:
    """Construct the replay-store key for an inbound signed request.

    Format: ``<keyid>:<created>``. The signature's `created` parameter
    is monotonically increasing per sender (RFC 9421 §2.2.1) — combined
    with the keyid it uniquely identifies the envelope. If `created` is
    missing (out-of-spec sender), fall back to a body hash so we still
    refuse exact replays.
    """
    import hashlib

    keyid = _extract_keyid(signature_input) or "<unknown>"
    created_match = (
        _CREATED_RE.search(signature_input) if signature_input else None
    )
    if created_match:
        return f"{keyid}:{created_match.group('ts')}"
    digest = hashlib.sha256(body).hexdigest()[:32]
    return f"{keyid}:body:{digest}"
