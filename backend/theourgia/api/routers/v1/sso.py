"""SSO assertion endpoints — Phase 12 B141.

Per ``plan/12-batches-backend.md`` § B141.

::

  GET  /api/v1/sso/assertions                      list issuer's assertions
  POST /api/v1/sso/authorize                       create + return id
  POST /api/v1/sso/assertions/{id}/revoke          set revoked_at

Honesty rules wired:

  · ``expires_at_utc`` is server-fixed at now + 24h per H08
    rule. The client cannot specify a longer window.
  · ``revoked_at`` once set is immutable — 409 on re-revoke.
  · The signature is NOT yet generated — Phase 12.5 transport
    fills it. B141 ships the consent moment + the revoke list;
    the cross-instance wire follows.
"""

from __future__ import annotations

import base64
from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import urlparse
from uuid import UUID

from cryptography.hazmat.primitives import serialization
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.config import Settings, get_settings
from theourgia.core.federation.keys import load_or_create_keypair
from theourgia.core.federation.signing import (
    canonical_attestation_bytes,
    sign_bytes,
)
from theourgia.core.registry.author_signer import (
    AuthorSigner,
    AuthorSigningUnconfigured,
)
from theourgia.models.audit import AuditEvent, AuditEventKind, AuditOutcome
from theourgia.models.identity import Vault
from theourgia.models.sso_assertion import SsoAssertion

__all__ = ["router"]


router = APIRouter()


ASSERTION_TTL = timedelta(hours=24)

REGISTRY_ASSERTION_TTL = timedelta(minutes=15)
"""Registry SSO assertions are exchange-once bootstrap material —
they live minutes, not hours."""


# ── Schemas ─────────────────────────────────────────────────────────


class SsoAssertionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    target_did: str
    scope_payload: dict
    expires_at_utc: datetime
    revoked_at: datetime | None
    signature_b64: str | None
    created_at: datetime


class SsoAuthorizePayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_did: str = Field(min_length=1, max_length=255)
    scope_payload: dict = Field(default_factory=dict)


# ── Helpers ─────────────────────────────────────────────────────────


def _to_read(row: SsoAssertion) -> SsoAssertionRead:
    return SsoAssertionRead(
        id=str(row.id),
        target_did=row.target_did,
        scope_payload=dict(row.scope_payload or {}),
        expires_at_utc=row.expires_at_utc,
        revoked_at=row.revoked_at,
        signature_b64=row.signature_b64,
        created_at=row.created_at,
    )


def _emit_audit(
    db: AsyncSession,
    *,
    actor_id: UUID,
    action: str,
    assertion_id: UUID,
    detail: dict | None = None,
) -> None:
    db.add(
        AuditEvent(
            kind=AuditEventKind.FEDERATION,
            action=action,
            actor_id=actor_id,
            outcome=AuditOutcome.SUCCESS,
            detail={"assertion_id": str(assertion_id), **(detail or {})},
        )
    )


# ── Endpoints ──────────────────────────────────────────────────────


@router.get(
    "/sso/assertions", response_model=list[SsoAssertionRead],
)
async def list_assertions(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[SsoAssertionRead]:
    """List issuer's assertions. Order: active (non-revoked,
    non-expired) first by expires_at_utc, then revoked + expired
    descending by created_at."""
    rows = (
        await db.execute(
            select(SsoAssertion)
            .where(SsoAssertion.issuer_user_id == user.id)
            .order_by(SsoAssertion.created_at.desc())
        )
    ).scalars().all()
    return [_to_read(r) for r in rows]


@router.post(
    "/sso/authorize",
    response_model=SsoAssertionRead,
    status_code=status.HTTP_201_CREATED,
)
async def authorize(
    payload: SsoAuthorizePayload,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SsoAssertionRead:
    """Issue a new assertion. Server fixes expires_at_utc = now + 24h."""
    now = datetime.now(tz=UTC)
    assertion = SsoAssertion(
        issuer_user_id=user.id,
        target_did=payload.target_did,
        scope_payload=payload.scope_payload,
        expires_at_utc=now + ASSERTION_TTL,
    )
    db.add(assertion)
    await db.flush()
    _emit_audit(
        db,
        actor_id=user.id,
        action="sso.authorize",
        assertion_id=assertion.id,
        detail={"target_did": payload.target_did},
    )
    await db.commit()
    await db.refresh(assertion)
    return _to_read(assertion)


class RegistryAssertionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assertion: dict
    signature_b64: str
    registry_sso_url: str


@router.post(
    "/sso/registry-assertion",
    response_model=RegistryAssertionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def mint_registry_assertion(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> RegistryAssertionResponse:
    """Mint a vault-signed SSO assertion for the plugin registry.

    The registry bridge half of v1-032: the client POSTs the returned
    ``{assertion, signature_b64}`` pair to the registry's
    ``/api/v1/auth/sso-session`` (``registry_sso_url``) and receives an
    author session mapped to this vault's author DID.

    The assertion is signed with the instance's FEDERATION keypair —
    the key the registry verifies against this host's
    ``/.well-known/theourgia/actor`` document. It carries the author's
    registry signing public key (when configured) so first-contact SSO
    can bootstrap the author's key at the registry; the registry never
    overwrites an existing key via this path.

    503 when the registry URL or the author identity isn't configured —
    same honesty copy as the A-cluster routes."""
    settings = get_settings()
    if not settings.registry_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Plugin registry not configured for this instance.",
        )
    if not settings.author_did:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="author identity not configured for this instance",
        )
    audience = urlparse(settings.registry_url).hostname
    if not audience:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="registry URL is malformed — cannot derive audience",
        )

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

    vault = (
        await db.execute(
            select(Vault).where(Vault.owner_id == user.id)
            .order_by(Vault.created_at.asc())
            .limit(1)
        )
    ).scalars().first()
    display_name = vault.display_name if vault else settings.author_did

    issuer_host = urlparse(settings.base_url).hostname or settings.instance_id
    now = datetime.now(tz=UTC)
    assertion: dict = {
        "kind": "registry-sso",
        "issuer_host": issuer_host,
        "subject_did": settings.author_did,
        "display_name": display_name,
        "audience": audience,
        "expires_at": (now + REGISTRY_ASSERTION_TTL).isoformat(),
    }

    # Include the author's registry signing public key when the
    # operator has one configured — lets first-contact SSO register it.
    author_public_key_pem = _author_public_key_pem(settings)
    if author_public_key_pem is not None:
        assertion["public_key_pem"] = author_public_key_pem

    signature = sign_bytes(
        keypair.private_key, canonical_attestation_bytes(assertion),
    )

    db.add(
        AuditEvent(
            kind=AuditEventKind.FEDERATION,
            action="sso.registry_assertion",
            actor_id=user.id,
            outcome=AuditOutcome.SUCCESS,
            detail={
                "audience": audience,
                "subject_did": settings.author_did,
                "expires_at": assertion["expires_at"],
            },
        )
    )
    await db.commit()

    return RegistryAssertionResponse(
        assertion=assertion,
        signature_b64=base64.b64encode(signature).decode("ascii"),
        registry_sso_url=(
            settings.registry_url.rstrip("/") + "/api/v1/auth/sso-session"
        ),
    )


def _author_public_key_pem(settings: Settings) -> str | None:
    """The configured author key's PUBLIC half as PEM, or None."""
    try:
        signer = AuthorSigner.from_paths(
            did=settings.author_did,
            private_key_path=settings.author_private_key_path,
        )
    except AuthorSigningUnconfigured:
        return None
    return (
        signer.private_key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("utf-8")
    )


@router.post(
    "/sso/assertions/{assertion_id}/revoke",
    response_model=SsoAssertionRead,
)
async def revoke(
    assertion_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> SsoAssertionRead:
    assertion = (
        await db.execute(
            select(SsoAssertion).where(
                SsoAssertion.id == assertion_id,
                SsoAssertion.issuer_user_id == user.id,
            )
        )
    ).scalars().first()
    if assertion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SSO assertion not found.",
        )
    if assertion.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This assertion has already been revoked.",
        )
    assertion.revoked_at = datetime.now(tz=UTC)
    db.add(assertion)
    _emit_audit(
        db,
        actor_id=user.id,
        action="sso.revoke",
        assertion_id=assertion.id,
    )
    await db.commit()
    await db.refresh(assertion)
    return _to_read(assertion)
