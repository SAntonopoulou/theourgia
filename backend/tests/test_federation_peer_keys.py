"""PeerKeyResolver tests — httpx.MockTransport-backed."""

from __future__ import annotations

import base64

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)

from theourgia.core.federation.peer_keys import (
    PeerKeyResolver,
    PeerKeyUnavailableError,
    did_to_host,
)


def _keypair_pem() -> tuple[Ed25519PrivateKey, str]:
    """Helper — returns (private, URL-safe-base64-public-key)."""
    private = Ed25519PrivateKey.generate()
    raw = private.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return private, base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def test_did_to_host_extracts_correctly() -> None:
    assert did_to_host("did:theourgia:peer.example.com") == "peer.example.com"


def test_did_to_host_rejects_non_theourgia_did() -> None:
    with pytest.raises(ValueError):
        did_to_host("did:web:peer.example.com")


def test_did_to_host_rejects_malformed_host() -> None:
    with pytest.raises(ValueError):
        did_to_host("did:theourgia:not a host")
    with pytest.raises(ValueError):
        did_to_host("did:theourgia:has/slash")
    with pytest.raises(ValueError):
        did_to_host("did:theourgia:")


@pytest.mark.asyncio
async def test_resolver_fetches_and_caches() -> None:
    _, pub_b64 = _keypair_pem()
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        call_count["n"] += 1
        assert str(request.url) == (
            "https://peer.example.com/.well-known/theourgia/actor"
        )
        return httpx.Response(
            200,
            json={
                "did": "did:theourgia:peer.example.com",
                "public_key": pub_b64,
                "public_key_algorithm": "ed25519",
                "api_base": "https://peer.example.com",
            },
        )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        resolver = PeerKeyResolver(http_client=client)
        key1 = await resolver.resolve("did:theourgia:peer.example.com")
        key2 = await resolver.resolve("did:theourgia:peer.example.com")
    assert key1.did == "did:theourgia:peer.example.com"
    assert key1.public_key is key2.public_key  # same cached instance
    assert call_count["n"] == 1  # only one HTTP fetch


@pytest.mark.asyncio
async def test_resolver_raises_on_unreachable_peer() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no route")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
        resolver = PeerKeyResolver(http_client=c)
        with pytest.raises(PeerKeyUnavailableError):
            await resolver.resolve("did:theourgia:dead.example.com")


@pytest.mark.asyncio
async def test_resolver_raises_on_non_200() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(404, text="not found"),
        ),
    ) as c:
        resolver = PeerKeyResolver(http_client=c)
        with pytest.raises(PeerKeyUnavailableError) as exc:
            await resolver.resolve("did:theourgia:peer.example.com")
        assert "HTTP 404" in str(exc.value)


@pytest.mark.asyncio
async def test_resolver_raises_on_did_mismatch() -> None:
    """If the peer's actor doc announces a different DID than the one
    we resolved by, refuse rather than guess."""
    _, pub_b64 = _keypair_pem()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "did": "did:theourgia:other.example.com",
                "public_key": pub_b64,
                "api_base": "https://other.example.com",
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
        resolver = PeerKeyResolver(http_client=c)
        with pytest.raises(PeerKeyUnavailableError) as exc:
            await resolver.resolve("did:theourgia:peer.example.com")
        assert "DID mismatch" in str(exc.value)


@pytest.mark.asyncio
async def test_resolver_raises_on_missing_public_key() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(
                200,
                json={
                    "did": "did:theourgia:peer.example.com",
                    "api_base": "https://peer.example.com",
                    # No public_key field.
                },
            ),
        ),
    ) as c:
        resolver = PeerKeyResolver(http_client=c)
        with pytest.raises(PeerKeyUnavailableError) as exc:
            await resolver.resolve("did:theourgia:peer.example.com")
        assert "missing public_key" in str(exc.value)


@pytest.mark.asyncio
async def test_resolver_raises_on_unparseable_key() -> None:
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(
            lambda r: httpx.Response(
                200,
                json={
                    "did": "did:theourgia:peer.example.com",
                    "public_key": "this-is-not-base64-or-the-wrong-length",
                    "api_base": "https://peer.example.com",
                },
            ),
        ),
    ) as c:
        resolver = PeerKeyResolver(http_client=c)
        with pytest.raises(PeerKeyUnavailableError):
            await resolver.resolve("did:theourgia:peer.example.com")


@pytest.mark.asyncio
async def test_resolver_invalidate_evicts_entry() -> None:
    _, pub_b64 = _keypair_pem()
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        call_count["n"] += 1
        return httpx.Response(
            200,
            json={
                "did": "did:theourgia:peer.example.com",
                "public_key": pub_b64,
                "api_base": "https://peer.example.com",
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
        resolver = PeerKeyResolver(http_client=c)
        await resolver.resolve("did:theourgia:peer.example.com")
        resolver.invalidate("did:theourgia:peer.example.com")
        await resolver.resolve("did:theourgia:peer.example.com")
    assert call_count["n"] == 2
