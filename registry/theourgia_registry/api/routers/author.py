"""Author-side endpoints — submission lifecycle.

The author signs a request with their vault DID's private key; the
verifier here re-fetches the public key from the author's DID
document (cached on the Author row). For v1 the implementation is
schema-only — the auth dependency stubs out and returns 401 until
the SSO bridge to the vault host is wired.

Rule 41: authors can NEVER promote themselves. No self-promotion path.
Rule 42: License SPDX-validated at submit.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from theourgia_registry.api.deps import CurrentAuthor


__all__ = ["router"]


router = APIRouter()


ACCEPTED_LICENSES: frozenset[str] = frozenset(
    {
        "AGPL-3.0-only",
        "AGPL-3.0-or-later",
        "GPL-3.0-or-later",
        "LGPL-3.0-or-later",
        "MPL-2.0",
        "MIT",
        "BSD-2-Clause",
        "BSD-3-Clause",
        "Apache-2.0",
        "CC-BY-SA-4.0",
        "Unlicense",
    }
)


class SubmissionCreate(BaseModel):
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


class SubmissionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    plugin_id: str
    version: str
    status: str


@router.post(
    "/submissions",
    response_model=SubmissionRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit(
    payload: SubmissionCreate,
    author: CurrentAuthor,  # noqa: ARG001 — auth dependency placeholder
) -> SubmissionRead:
    """Submit a new version of a plugin.

    Rule 42 — license validated against ACCEPTED_LICENSES BEFORE any
    insert. Non-acceptable licenses surface a 400 with the accepted
    list in the detail.
    """
    if payload.license_spdx not in ACCEPTED_LICENSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "license_not_accepted",
                "accepted": sorted(ACCEPTED_LICENSES),
            },
        )
    # The DB write lands in a follow-on commit alongside the
    # SSO bridge; this endpoint is the schema lock.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Submission persistence wires after SSO bridge.",
    )
