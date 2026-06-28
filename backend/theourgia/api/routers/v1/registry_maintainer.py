"""Registry maintainer-protected bridge — H10 A5/A6/A7.

These routes sign requests with the vault's configured MAINTAINER key
(`THEOURGIA_MAINTAINER_DID` + `THEOURGIA_MAINTAINER_PRIVATE_KEY_PATH`).
The signing keypair is distinct from the author one — the LEAD
maintainer is a separate identity at the registry, and the operator
may not be both (in multi-maintainer setups the LEAD lives elsewhere).

Routes:
  GET    /api/v1/registry/maintainer/queue             — A5 review queue
  POST   /api/v1/registry/maintainer/submissions/{id}/take   — A6 claim
  POST   /api/v1/registry/maintainer/submissions/{id}/decide — A6 decide
  POST   /api/v1/registry/maintainer/plugins/{id}/promote    — A7 tier promote

When `THEOURGIA_MAINTAINER_DID` is unset, the routes return 503 with
"maintainer identity not configured".
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


__all__ = ["router", "get_maintainer_signer", "reset_maintainer_signer_cache"]


router = APIRouter(prefix="/registry/maintainer", tags=["registry"])


@lru_cache(maxsize=1)
def _signer_cached() -> AuthorSigner | None:
    settings = get_settings()
    try:
        return AuthorSigner.from_paths(
            did=settings.maintainer_did,
            private_key_path=settings.maintainer_private_key_path,
        )
    except AuthorSigningUnconfigured:
        return None


def get_maintainer_signer() -> AuthorSigner:
    """503 when the operator hasn't configured the maintainer identity."""
    signer = _signer_cached()
    if signer is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="maintainer identity not configured for this instance",
        )
    return signer


def reset_maintainer_signer_cache() -> None:
    _signer_cached.cache_clear()


# ── schemas ──────────────────────────────────────────────────────────


class DecisionBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: str = Field(
        pattern=r"^(accept_community|accept_official|reject|changes_requested)$",
    )
    note: str = Field(min_length=1, max_length=8000)


class PromoteBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    to_tier: str = Field(pattern=r"^(official|community|unverified)$")
    justification: str = Field(min_length=1, max_length=4000)


def _canonical_bytes(payload: dict) -> bytes:
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


@router.get("/queue")
async def review_queue(
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_maintainer_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    headers = signer.sign(b"")
    try:
        result = await registry.author_request(
            "GET",
            "/api/v1/maintainer/queue",
            body=None,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=result)


@router.post("/submissions/{submission_id}/take")
async def take_submission(
    submission_id: str,
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_maintainer_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    # POST with empty body — sign empty.
    headers = signer.sign(b"")
    try:
        result = await registry.author_request(
            "POST",
            f"/api/v1/maintainer/submissions/{submission_id}/take",
            body=None,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=result)


@router.post("/submissions/{submission_id}/decide")
async def decide_submission(
    submission_id: str,
    payload: DecisionBody,
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_maintainer_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    body_dict = payload.model_dump()
    body_bytes = _canonical_bytes(body_dict)
    headers = signer.sign(body_bytes)
    try:
        result = await registry.author_request(
            "POST",
            f"/api/v1/maintainer/submissions/{submission_id}/decide",
            body=body_dict,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=result)


@router.post("/plugins/{plugin_id}/promote")
async def promote_plugin(
    plugin_id: str,
    payload: PromoteBody,
    user: CurrentUser,  # noqa: ARG001
    signer: Annotated[AuthorSigner, Depends(get_maintainer_signer)],
    registry: Annotated[RegistryClient, Depends(get_registry_client)],
) -> JSONResponse:
    body_dict = payload.model_dump()
    body_bytes = _canonical_bytes(body_dict)
    headers = signer.sign(body_bytes)
    try:
        result = await registry.author_request(
            "POST",
            f"/api/v1/maintainer/plugins/{plugin_id}/promote",
            body=body_dict,
            signing_headers=headers,
        )
    except RegistryError as exc:
        raise _handle_registry_error(exc) from exc
    return JSONResponse(content=result)
