"""SSO session bridge — the registry trusts the vault host's assertion.

``POST /api/v1/auth/sso-session`` accepts a vault-signed SSO assertion
(Ed25519, the vault's federation keypair) and establishes an authorized
author session mapped to the assertion's subject DID.

Verification chain (see ``core/sso.py`` + README "SSO trust model"):

  trusted-host list → audience → expiry → signature against the public
  key fetched from the issuer's ``/.well-known/theourgia/actor``.

On first sight of a DID the registry creates the Author row; when the
assertion carries the author's registry signing key
(``public_key_pem``) and the Author has none yet, the key is cached so
subsequent DID-signed author calls verify. An existing key is NEVER
overwritten by SSO — key rotation is a deliberate maintainer-mediated
operation, otherwise a compromised vault session could silently swap
the signing identity of every published release.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Annotated, Any, Protocol

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia_registry.api.deps import get_db_session
from theourgia_registry.core.config import get_settings
from theourgia_registry.core.sso import (
    SsoVerificationError,
    decode_actor_public_key,
    mint_session_token,
    verify_sso_assertion,
)
from theourgia_registry.models.author import Author

__all__ = ["ActorFetcher", "get_actor_fetcher", "router"]


router = APIRouter()


class ActorFetcher(Protocol):
    """Fetches a vault host's well-known actor document."""

    async def __call__(self, host: str) -> dict[str, Any]: ...


async def _fetch_actor_document(host: str) -> dict[str, Any]:
    url = f"https://{host}/.well-known/theourgia/actor"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"could not fetch issuer actor document from {host}",
        ) from exc


def get_actor_fetcher() -> ActorFetcher:
    """FastAPI dependency — tests override with a stub fetcher."""
    return _fetch_actor_document


class SsoSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assertion: dict[str, Any]
    signature_b64: str = Field(min_length=4, max_length=255)


class SsoSessionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_token: str
    author_did: str
    display_name: str
    expires_at: str


@router.post(
    "/auth/sso-session",
    response_model=SsoSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_sso_session(
    payload: SsoSessionRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    fetch_actor: Annotated[ActorFetcher, Depends(get_actor_fetcher)],
) -> SsoSessionResponse:
    """Exchange a vault-signed assertion for an author session token."""
    settings = get_settings()
    assertion = payload.assertion

    issuer_host = str(assertion.get("issuer_host") or "")
    if issuer_host not in settings.trusted_vault_hosts:
        # Refuse BEFORE any outbound fetch — an untrusted issuer must
        # not be able to make this registry dial arbitrary hosts.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"issuer {issuer_host!r} is not on this registry's "
                "trusted vault-host list"
            ),
        )

    actor_doc = await fetch_actor(issuer_host)
    public_key_value = str(actor_doc.get("public_key") or "")

    try:
        issuer_key = decode_actor_public_key(public_key_value)
        verify_sso_assertion(
            assertion=assertion,
            signature_b64=payload.signature_b64,
            issuer_public_key=issuer_key,
            trusted_hosts=list(settings.trusted_vault_hosts),
            expected_audience=settings.instance_id,
        )
    except SsoVerificationError as exc:
        raise HTTPException(
            status_code=exc.status_code, detail=str(exc),
        ) from exc

    subject_did = str(assertion["subject_did"])
    display_name = str(assertion.get("display_name") or subject_did)
    offered_key_pem = assertion.get("public_key_pem")

    author = (
        await db.execute(select(Author).where(Author.did == subject_did))
    ).scalar_one_or_none()
    if author is None:
        author = Author(
            did=subject_did,
            display_name=display_name,
            public_key_pem=(
                str(offered_key_pem) if offered_key_pem else None
            ),
        )
        db.add(author)
    elif author.public_key_pem is None and offered_key_pem:
        # First key registration via SSO is allowed; overwrite is not.
        author.public_key_pem = str(offered_key_pem)
        db.add(author)
    await db.commit()

    token, expires_at = mint_session_token(
        secret=settings.session_secret.get_secret_value(),
        author_did=subject_did,
        ttl=timedelta(hours=settings.sso_session_ttl_hours),
    )
    return SsoSessionResponse(
        session_token=token,
        author_did=subject_did,
        display_name=display_name,
        expires_at=expires_at.isoformat(),
    )
