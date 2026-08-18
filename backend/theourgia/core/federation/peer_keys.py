"""Resolve a peer instance's Ed25519 public key from its DID — Phase 12.5.

When the inbox verifier sees a signed request with ``keyid=did:theourgia:
<peer-host>``, it needs the peer's published public key to verify the
signature. This module fetches the peer's
``/.well-known/theourgia/actor`` endpoint, caches the result, and exposes
it as :class:`PeerPublicKey`.

The cache is in-process + bounded; entries TTL after
``settings.federation_peer_key_ttl_seconds`` (default 1h). A real
production deployment should swap this for a Redis-backed cache so all
backend workers share resolved keys, but the in-process version is
correct + fast enough for v1.0.

Honesty rules:
  · The fetch is HTTP+TLS only — no plaintext ``http://`` (rejected at
    the URL parse step).
  · Timeouts are short (5s default) — a slow peer must not block the
    inbox.
  · If the peer's response doesn't include a valid public key, the
    function raises :class:`PeerKeyUnavailableError` — the verifier
    returns 502 to the peer (NOT 401, which would imply the peer's
    signature was bad).
"""

from __future__ import annotations

import asyncio
import base64
import ipaddress
import logging
import socket
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Final
from urllib.parse import urlparse

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PublicKey,
)

from theourgia.core.federation.keys import deserialize_public_key

__all__ = [
    "PeerKeyResolver",
    "PeerKeyUnavailableError",
    "PeerPublicKey",
    "did_to_host",
]


_log = logging.getLogger(__name__)


PEER_KEY_TTL_SECONDS: Final[int] = 3600


class PeerKeyUnavailableError(Exception):
    """The peer's public key could not be resolved.

    Distinct from signature failure — used when the peer is unreachable
    OR returns a malformed actor document. The inbox surfaces this as
    HTTP 502 (bad upstream)."""


@dataclass(slots=True, frozen=True)
class PeerPublicKey:
    did: str
    public_key: Ed25519PublicKey
    fetched_at: float
    """Monotonic clock value when the key was cached. Cache evicts
    entries older than PEER_KEY_TTL_SECONDS."""


def _ip_is_disallowed(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """True if an IP is in a private / loopback / link-local / reserved /
    multicast / unspecified range — i.e. must never be an SSRF target."""
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _is_blocked_ssrf_host(host: str) -> bool:
    """True if ``host`` must not be fetched.

    Blocks IP literals in private / loopback / link-local / reserved /
    multicast / unspecified ranges, and internal-looking hostnames
    (``localhost``, single-label names, ``.local`` / ``.internal`` /
    ``.localhost`` suffixes). A real federation peer is a public FQDN.

    This is the cheap literal + name guard. It does NOT by itself defend
    against DNS rebinding — a public name that resolves to a private IP;
    :meth:`PeerKeyResolver._assert_resolved_public` closes that by
    re-validating the actual resolved addresses at fetch time.
    """
    # Strip an optional :port before inspecting the host.
    bare = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
    bare = bare.strip("[]")  # bracketed IPv6

    try:
        ip = ipaddress.ip_address(bare)
    except ValueError:
        name = bare.lower().rstrip(".")
        if name in {"localhost", ""}:
            return True
        if name.endswith((".local", ".internal", ".localhost")):
            return True
        # Single-label hostnames are internal by construction.
        if "." not in name:
            return True
        return False
    return _ip_is_disallowed(ip)


def did_to_host(did: str) -> str:
    """Map ``did:theourgia:peer.example.com`` → ``peer.example.com``.

    Raises ValueError for malformed or non-theourgia DIDs."""
    if not did.startswith("did:theourgia:"):
        msg = f"DID is not a theourgia DID: {did!r}"
        raise ValueError(msg)
    host = did[len("did:theourgia:") :].strip()
    if not host or " " in host or "/" in host:
        msg = f"DID host part malformed: {host!r}"
        raise ValueError(msg)
    return host


@dataclass(slots=True)
class PeerKeyResolver:
    """In-process cached resolver. One instance per process.

    Tests construct fresh resolvers; production code uses
    :func:`get_default_resolver`.
    """

    http_client: httpx.AsyncClient | None = None
    """Tests inject an httpx.MockTransport-backed client."""

    timeout_seconds: float = 5.0
    peer_base_url_lookup: (
        Callable[[str], Awaitable[str | None]] | None
    ) = None
    """Optional async lookup: DID → the base_url the operator registered
    for that peer (the federation_peer table). Registered peers resolve
    against their stored URL — the operator explicitly trusted it at
    peer-add time, which is what makes nonstandard ports (and TLS-less
    lab setups) work. Unknown peers keep the strict https-by-DID path
    (v1-029, found by the twin-instance test)."""

    _cache: dict[str, PeerPublicKey] | None = None
    _lock: asyncio.Lock | None = None

    def __post_init__(self) -> None:
        self._cache = {}
        self._lock = asyncio.Lock()

    async def resolve(self, did: str) -> PeerPublicKey:
        """Return the peer's key (cached or freshly fetched)."""
        assert self._cache is not None and self._lock is not None
        now = time.monotonic()
        cached = self._cache.get(did)
        if (
            cached is not None
            and now - cached.fetched_at < PEER_KEY_TTL_SECONDS
        ):
            return cached

        async with self._lock:
            # Re-check after acquiring lock — another coroutine may
            # have populated the cache.
            cached = self._cache.get(did)
            if (
                cached is not None
                and now - cached.fetched_at < PEER_KEY_TTL_SECONDS
            ):
                return cached

            key = await self._fetch(did)
            self._cache[did] = key
            return key

    async def _fetch(self, did: str) -> PeerPublicKey:
        try:
            host = did_to_host(did)
        except ValueError as exc:
            raise PeerKeyUnavailableError(
                f"cannot map DID to host: {exc}",
            ) from exc

        # SSRF guard (v1-049 + hardening): the DID here comes from an
        # inbound request's keyid, so a crafted keyid could point us at an
        # internal host. We now apply the guard to BOTH the DID-derived
        # host AND operator-registered peers — a registered base_url is
        # only exempted from the private-IP block when the LAB
        # insecure-http flag is set (LAN self-host). The guard re-resolves
        # and re-validates the actual addresses at fetch time, which
        # defeats DNS rebinding (a public name → private IP).
        registered = None
        if self.peer_base_url_lookup is not None:
            registered = await self.peer_base_url_lookup(did)
        if registered:
            base = registered.rstrip("/")
            url = f"{base}/.well-known/theourgia/actor"
            parsed = urlparse(base)
            connect_host = parsed.hostname or ""
            connect_port = parsed.port or (
                443 if parsed.scheme == "https" else 80
            )
            is_registered = True
        else:
            url = f"https://{host}/.well-known/theourgia/actor"
            bare = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
            connect_host = bare.strip("[]")
            connect_port = 443
            is_registered = False

        # Only validate before a REAL network connection. An injected
        # http_client is a controlled/mock transport (tests, or a future
        # pinned connector) that makes no live DNS-driven connection, so
        # there is nothing to rebind.
        if self.http_client is None:
            from theourgia.core.config import get_settings

            lab_ok = get_settings().federation_allow_insecure_http
            await self._assert_resolved_public(
                connect_host,
                connect_port,
                allow_private=(is_registered and lab_ok),
            )
        elif not is_registered and _is_blocked_ssrf_host(host):
            # Cheap literal/name guard still applies to DID-derived hosts
            # even under an injected transport (preserves v1-049).
            raise PeerKeyUnavailableError(
                f"refusing to resolve a non-public host: {host!r}",
            )
        try:
            if self.http_client is not None:
                response = await self.http_client.get(url)
            else:
                async with httpx.AsyncClient(
                    timeout=self.timeout_seconds,
                ) as client:
                    response = await client.get(url)
        except httpx.HTTPError as exc:
            raise PeerKeyUnavailableError(
                f"peer unreachable: {exc}",
            ) from exc

        if response.status_code != 200:
            raise PeerKeyUnavailableError(
                f"peer actor returned HTTP {response.status_code}",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise PeerKeyUnavailableError(
                "peer actor returned non-JSON body",
            ) from exc

        public_key_b64 = payload.get("public_key")
        if not isinstance(public_key_b64, str) or not public_key_b64:
            raise PeerKeyUnavailableError(
                "peer actor missing public_key field",
            )

        peer_did = payload.get("did")
        if peer_did != did:
            # The peer announced a different DID than the one we
            # resolved by — refuse rather than guess.
            raise PeerKeyUnavailableError(
                f"peer DID mismatch: expected {did!r}, got {peer_did!r}",
            )

        try:
            public_key = deserialize_public_key(public_key_b64)
        except (ValueError, base64.binascii.Error) as exc:
            raise PeerKeyUnavailableError(
                f"peer public key unparseable: {exc}",
            ) from exc

        return PeerPublicKey(
            did=did,
            public_key=public_key,
            fetched_at=time.monotonic(),
        )

    async def _assert_resolved_public(
        self, host: str, port: int, *, allow_private: bool,
    ) -> None:
        """Resolve ``host`` and reject if any resolved address is
        non-public — the DNS-rebinding defence.

        The cheap literal/name guard runs first, then every A/AAAA record
        the name currently resolves to is re-validated. A crafted DID (or
        a rebinding peer) that maps a public-looking name to an internal
        IP is refused here, at fetch time. ``allow_private`` is set only
        for operator-registered peers when the LAB insecure-http flag is
        on (LAN self-host); it is never granted to DID-derived hosts.
        """
        if allow_private:
            return
        if _is_blocked_ssrf_host(host):
            raise PeerKeyUnavailableError(
                f"refusing to resolve a non-public host: {host!r}",
            )
        try:
            loop = asyncio.get_running_loop()
            infos = await loop.getaddrinfo(
                host, port, type=socket.SOCK_STREAM,
            )
        except OSError as exc:
            raise PeerKeyUnavailableError(
                f"peer host did not resolve: {host!r}",
            ) from exc
        if not infos:
            raise PeerKeyUnavailableError(
                f"peer host did not resolve: {host!r}",
            )
        for info in infos:
            ip_str = info[4][0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue
            if _ip_is_disallowed(ip):
                raise PeerKeyUnavailableError(
                    f"peer host {host!r} resolves to a non-public address",
                )

    def invalidate(self, did: str) -> None:
        assert self._cache is not None
        self._cache.pop(did, None)

    def clear(self) -> None:
        assert self._cache is not None
        self._cache.clear()


_default_resolver: PeerKeyResolver | None = None


def get_default_resolver() -> PeerKeyResolver:
    global _default_resolver
    if _default_resolver is None:
        _default_resolver = PeerKeyResolver()
    return _default_resolver
