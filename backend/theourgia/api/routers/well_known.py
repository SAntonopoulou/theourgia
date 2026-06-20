"""``.well-known/theourgia/actor`` — instance actor publication.

Federation peers fetch this endpoint to discover this instance's
public key and DID before initiating any signed exchange. The
response is small JSON, served unauthenticated, cacheable for an
hour by default.

This mirrors how ActivityPub uses ``.well-known/webfinger``; the
Theourgia native federation protocol uses a Theourgia-specific path
to avoid collision with future AP additions.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from theourgia.__about__ import __version__
from theourgia.api.errors import ServiceUnavailableError
from theourgia.core.config import get_settings
from theourgia.core.federation.identity import make_instance_id
from theourgia.core.federation.keys import (
    InstanceKeypair,
    load_or_create_keypair,
    serialize_public_key,
)

__all__ = ["router"]

_log = logging.getLogger(__name__)

router = APIRouter()


class ActorPublication(BaseModel):
    """Response of ``GET /.well-known/theourgia/actor``."""

    model_config = ConfigDict(extra="forbid")

    did: str = Field(description="The instance's Decentralized Identifier")
    public_key: str = Field(
        description="Ed25519 public key, URL-safe base64 (no padding)",
    )
    public_key_algorithm: str = Field(default="ed25519")
    api_base: str = Field(description="Base URL of the instance's API")
    software: str = Field(default="theourgia")
    software_version: str = Field(default=__version__)
    protocol_versions: list[str] = Field(
        default_factory=lambda: ["theourgia/1"],
        description=(
            "Federation protocol versions this instance supports. "
            "Peers negotiate to a common version."
        ),
    )


_keypair_cache: InstanceKeypair | None = None


def _get_keypair() -> InstanceKeypair:
    """Lazily load (or create) the instance keypair.

    Cached after first access. Tests can reset by setting ``_keypair_cache = None``
    via the module attribute.
    """
    global _keypair_cache
    if _keypair_cache is None:
        settings = get_settings()
        try:
            _keypair_cache = load_or_create_keypair(
                private_path=settings.federation_private_key_path,
                public_path=settings.federation_public_key_path,
            )
        except Exception as exc:
            _log.exception("failed to load or create federation keypair")
            msg = "federation keypair not available"
            raise ServiceUnavailableError(msg) from exc
    return _keypair_cache


@router.get(
    "/.well-known/theourgia/actor",
    summary="Instance actor publication",
    description=(
        "Returns this instance's federation public key and DID. Used by "
        "federation peers to verify signed exchanges. Unauthenticated; "
        "cacheable for one hour."
    ),
    response_model=ActorPublication,
)
async def actor() -> ActorPublication:
    settings = get_settings()
    kp = _get_keypair()
    return ActorPublication(
        did=make_instance_id(settings.instance_id),
        public_key=serialize_public_key(kp.public_key),
        api_base=settings.base_url,
    )
