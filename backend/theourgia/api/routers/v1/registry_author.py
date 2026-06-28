"""Registry author-protected bridge — H10 A2/A3/A4/A8.

These routes sign requests with the vault's configured author key
(`THEOURGIA_AUTHOR_DID` + `THEOURGIA_AUTHOR_PRIVATE_KEY_PATH`) before
forwarding to the registry. The signing keypair stays on the server;
the admin SPA never holds the private key.

Routes:
  POST   /api/v1/registry/author/submissions          — A2 submit
  GET    /api/v1/registry/author/submissions          — A3 list
  GET    /api/v1/registry/author/submissions/{id}     — A4 detail
  POST   /api/v1/registry/author/advisories           — A8 file advisory

When `THEOURGIA_AUTHOR_DID` is unset, the routes return 503 with
"author identity not configured" — same defence-in-depth pattern as
the agent daemon's `federation_transport_enabled` gate.
"""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from theourgia.api.deps import CurrentUser
from theourgia.api.routers.v1.registry_bridge import (
    get_registry_client,
)
from theourgia.core.config import get_settings
from theourgia.core.registry.author_signer import (
    AuthorSigner,
    AuthorSigningUnconfigured,
)
from theourgia.core.registry.client import (
    RegistryClient,
    RegistryError,
    RegistryNotConfigured,
    RegistryRefused,
    RegistryUnreachable,
)


__all__ = ["router", "get_author_signer"]


router = APIRouter(prefix="/registry/author", tags=["registry"])


@lru_cache(maxsize=1)
def _signer_cached() -> AuthorSigner | None:
    settings = get_settings()
    try:
        return AuthorSigner.from_paths(
            did=settings.author_did,
            private_key_path=settings.author_private_key_path,
        )
    except AuthorSigningUnconfigured:
        return None


def get_author_signer() -> AuthorSigner:
    """FastAPI dependency. Raises 503 when the operator hasn't
    configured an author identity. Cached after first construction."""
    signer = _signer_cached()
    if signer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="author identity not configured for this instance",
        )
    return signer


def reset_signer_cache() -> None:
    """Exposed for tests that mutate env vars + need to re-evaluate."""
    _signer_cached.cache_clear()


# ── schemas ──────────────────────────────────────────────────────────


class SubmissionCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=64, pattern=r"^[a-z][a-z0-9-]{1,63}$")
    version: str = Field(min_length=5, max_length=64)
    license_spdx: str
    description: str = Field(default="", max_length=2000)
    homepage: str | None = Field(default=None, max_length=500)
    source_url: str = Field(min_length=8, max_length=500)
    signature_base64: str = Field(min_length=4, max_length=255)
    manifest: dict = Field(default_factory=dict)
    capabilities: list[str] = Field(default_factory=list)
    target_tier: str = Field(default="community")


class AdvisoryCreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    plugin_id: str
    severity: str = Field(pattern=r"^(low|medium|high)$")
    affected_version_range: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=8000)
    remediation_version: str | None = Field(default=None, max_length=64)


# ── helpers ──────────────────────────────────────────────────────────


def _canonical_bytes(payload: dict) -> bytes:
    """Encode the body the same way the signer + registry do —
    sorted keys, no whitespace, UTF-8."""
    return json.dumps(
        payload, sort_keys=True, separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


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


# ── routes ───────────────────────────────────────────────────────────


@router.post("/submissions")
async def submit(
    payload: SubmissionCreateBody,
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_author_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    body_dict = payload.model_dump()
    body_bytes = _canonical_bytes(body_dict)
    headers = signer.sign(body_bytes)
    try:
        result = await registry.author_request(
            "POST",
            "/api/v1/submissions",
            body=body_dict,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(status_code=201, content=result)


@router.get("/submissions")
async def list_submissions(
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_author_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    headers = signer.sign(b"")
    try:
        result = await registry.author_request(
            "GET",
            "/api/v1/submissions",
            body=None,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=result)


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: str,
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_author_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    headers = signer.sign(b"")
    try:
        result = await registry.author_request(
            "GET",
            f"/api/v1/submissions/{submission_id}",
            body=None,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=result)


@router.post("/advisories")
async def file_advisory(
    payload: AdvisoryCreateBody,
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_author_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    body_dict = payload.model_dump()
    body_bytes = _canonical_bytes(body_dict)
    headers = signer.sign(body_bytes)
    try:
        result = await registry.author_request(
            "POST",
            "/api/v1/advisories",
            body=body_dict,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(status_code=201, content=result)
