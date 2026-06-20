"""Federation identifiers.

Theourgia uses W3C-style Decentralized Identifier (DID) syntax to name
instances, vaults, and hubs in federation messages:

- **Instance DID**: ``did:theourgia:{host}``
  Identifies a deployment. Example: ``did:theourgia:theourgia.com``.
- **Vault DID**: ``did:theourgia:{host}:vault:{slug}``
  Identifies a magician's vault on that instance. Example:
  ``did:theourgia:theourgia.com:vault:soror-eu-a``.
- **Hub DID**: ``did:theourgia:{host}:hub:{slug}``
  Identifies a network hub on that instance. Example:
  ``did:theourgia:lodge.example.org:hub:local-body-93``.

The host segment is the publicly-resolvable hostname; the slug matches
the ``slug`` column on the corresponding database row. A slug is
DNS-safe (lowercase letters, digits, hyphens; not starting or ending
with a hyphen; 1–64 chars).
"""

from __future__ import annotations

import enum
import re

__all__ = [
    "ActorKind",
    "DID_REGEX",
    "INSTANCE_DID_REGEX",
    "InvalidDIDError",
    "make_instance_id",
    "make_actor_id",
    "parse_actor_id",
]


class ActorKind(str, enum.Enum):
    """The kind of federation actor a DID names."""

    INSTANCE = "instance"
    VAULT = "vault"
    HUB = "hub"


# Host: DNS hostname. We allow ports for development (e.g. ":8000") but
# not paths or schemes.
_HOST_PATTERN = r"[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*(:[0-9]{1,5})?"

# Slug: DNS-safe identifier
_SLUG_PATTERN = r"[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?"

INSTANCE_DID_REGEX: re.Pattern[str] = re.compile(
    rf"^did:theourgia:(?P<host>{_HOST_PATTERN})$"
)
DID_REGEX: re.Pattern[str] = re.compile(
    rf"^did:theourgia:(?P<host>{_HOST_PATTERN}):(?P<kind>vault|hub):(?P<slug>{_SLUG_PATTERN})$"
)


class InvalidDIDError(ValueError):
    """Raised when a DID string fails to parse."""


def make_instance_id(host: str) -> str:
    """Build the instance DID for a given host.

    Raises :class:`InvalidDIDError` if ``host`` is not a valid DNS name.
    """
    candidate = f"did:theourgia:{host.lower()}"
    if not INSTANCE_DID_REGEX.match(candidate):
        msg = f"invalid host for instance DID: {host!r}"
        raise InvalidDIDError(msg)
    return candidate


def make_actor_id(host: str, kind: ActorKind, slug: str) -> str:
    """Build a vault or hub DID.

    Raises :class:`InvalidDIDError` for invalid host or slug, or if
    ``kind`` is ``INSTANCE`` (use :func:`make_instance_id` for that).
    """
    if kind == ActorKind.INSTANCE:
        msg = "use make_instance_id() for instance DIDs"
        raise InvalidDIDError(msg)
    candidate = f"did:theourgia:{host.lower()}:{kind.value}:{slug.lower()}"
    if not DID_REGEX.match(candidate):
        msg = f"invalid host or slug for actor DID: host={host!r}, slug={slug!r}"
        raise InvalidDIDError(msg)
    return candidate


def parse_actor_id(did: str) -> tuple[str, ActorKind, str | None]:
    """Parse a DID string into ``(host, kind, slug_or_None)``.

    Returns ``slug=None`` for instance DIDs; otherwise the slug from the
    DID. Raises :class:`InvalidDIDError` on malformation.
    """
    instance_match = INSTANCE_DID_REGEX.match(did)
    if instance_match:
        return (instance_match.group("host"), ActorKind.INSTANCE, None)

    actor_match = DID_REGEX.match(did)
    if actor_match:
        return (
            actor_match.group("host"),
            ActorKind(actor_match.group("kind")),
            actor_match.group("slug"),
        )

    msg = f"not a valid Theourgia DID: {did!r}"
    raise InvalidDIDError(msg)
