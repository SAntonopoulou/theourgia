"""RegistryClient + bridge tests — httpx.MockTransport-backed."""

from __future__ import annotations

import json

import httpx
import pytest

from theourgia.core.registry.client import (
    RegistryClient,
    RegistryError,
    RegistryNotConfigured,
    RegistryRefused,
    RegistryUnreachable,
)


def _make_client(handler, *, base_url="http://registry.test"):
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return RegistryClient(base_url=base_url, http_client=http), http


@pytest.mark.asyncio
async def test_list_plugins_forwards_sort_param() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(
            200, json={"plugins": []},
        )

    client, http = _make_client(handler)
    try:
        result = await client.list_plugins(sort="alpha")
    finally:
        await http.aclose()
    assert result == {"plugins": []}
    assert "sort=alpha" in captured["url"]
    assert "/api/v1/plugins" in captured["url"]


@pytest.mark.asyncio
async def test_get_author_forwards_path() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(
            200,
            json={
                "did": "did:vault:alice",
                "display_name": "Alice",
                "homepage": None,
                "plugin_count": 0,
            },
        )

    client, http = _make_client(handler)
    try:
        result = await client.get_author("did:vault:alice")
    finally:
        await http.aclose()
    assert result["did"] == "did:vault:alice"
    assert "/api/v1/authors/did:vault:alice" in captured["url"]


@pytest.mark.asyncio
async def test_registry_refused_preserves_status_and_body() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            429,
            json={"error": "rate_limited", "retry_after": 30},
        )

    client, http = _make_client(handler)
    try:
        with pytest.raises(RegistryRefused) as exc:
            await client.list_plugins()
    finally:
        await http.aclose()
    assert exc.value.status_code == 429
    assert exc.value.payload["error"] == "rate_limited"


@pytest.mark.asyncio
async def test_registry_not_configured_when_base_url_missing() -> None:
    client = RegistryClient(base_url=None)
    with pytest.raises(RegistryNotConfigured):
        await client.list_plugins()


@pytest.mark.asyncio
async def test_registry_unreachable_on_transport_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("DNS failed")

    client, http = _make_client(handler)
    try:
        with pytest.raises(RegistryUnreachable):
            await client.list_plugins()
    finally:
        await http.aclose()


@pytest.mark.asyncio
async def test_non_json_response_raises_registry_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="not json")

    client, http = _make_client(handler)
    try:
        with pytest.raises(RegistryError):
            await client.list_plugins()
    finally:
        await http.aclose()


@pytest.mark.asyncio
async def test_base_url_trailing_slash_stripped() -> None:
    client = RegistryClient(base_url="http://registry.test/")
    assert client._ensure_configured() == "http://registry.test"


def test_bridge_routes_registered_on_v1() -> None:
    """Smoke: /api/v1/registry/* routes attach."""
    from theourgia.api.app import create_app

    app = create_app()
    paths = list(app.openapi()["paths"].keys())
    assert "/api/v1/registry/plugins" in paths
    assert "/api/v1/registry/authors/{did}" in paths


# ── release fetch (v1-032) ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_releases_hits_release_path() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(
            200,
            json={
                "plugin_name": "example",
                "author_did": "did:vault:alice",
                "tier": "community",
                "releases": [],
            },
        )

    client, http = _make_client(handler)
    try:
        result = await client.list_releases("example")
    finally:
        await http.aclose()
    assert "/api/v1/plugins/example/releases" in captured["url"]
    assert result["releases"] == []


@pytest.mark.asyncio
async def test_download_release_returns_bytes_and_headers() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            content=b"archive-bytes",
            headers={
                "X-Artifact-Sha256": "ab" * 32,
                "X-Artifact-Signature": "c2ln",
                "X-Author-Did": "did:vault:alice",
                "X-Author-Public-Key": "a2V5",
                "Content-Type": "application/gzip",
            },
        )

    client, http = _make_client(handler)
    try:
        download = await client.download_release("example", "1.0.0")
    finally:
        await http.aclose()
    assert download.content == b"archive-bytes"
    assert download.sha256 == "ab" * 32
    assert download.signature_b64 == "c2ln"
    assert download.author_did == "did:vault:alice"
    assert download.author_public_key_b64 == "a2V5"


@pytest.mark.asyncio
async def test_download_release_410_surfaces_as_refused() -> None:
    """Tombstone/withdrawn 410s keep their status + reason payload."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            410,
            json={"detail": {"error": "tombstoned", "reason": "superseded"}},
        )

    client, http = _make_client(handler)
    try:
        with pytest.raises(RegistryRefused) as exc:
            await client.download_release("example", "1.0.0")
    finally:
        await http.aclose()
    assert exc.value.status_code == 410
    assert exc.value.payload["detail"]["reason"] == "superseded"


# ── registry search proxy (v1-032) ──────────────────────────────────


@pytest.mark.asyncio
async def test_plugins_registry_search_proxies_browse() -> None:
    """plugins.py:search_registry now proxies the real browse — hits
    map latest_version and honour the tier filter."""
    from types import SimpleNamespace
    from uuid import uuid4

    from httpx import ASGITransport, AsyncClient

    from theourgia.api.app import create_app
    from theourgia.api.deps import get_current_user
    from theourgia.api.routers.v1.registry_bridge import get_registry_client

    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(str(request.url))
        return httpx.Response(
            200,
            json={
                "plugins": [
                    {
                        "id": "1",
                        "name": "runes-extended",
                        "author_did": "did:vault:alice",
                        "author_display_name": "Alice",
                        "description": "Younger Futhark",
                        "tier": "community",
                        "homepage": None,
                        "updated_at": "2026-07-20T00:00:00Z",
                        "tombstoned": False,
                        "latest_version": "1.2.0",
                    },
                    {
                        "id": "2",
                        "name": "unverified-thing",
                        "author_did": "did:vault:bob",
                        "author_display_name": "Bob",
                        "description": "No accepted release yet",
                        "tier": "unverified",
                        "homepage": None,
                        "updated_at": "2026-07-20T00:00:00Z",
                        "tombstoned": False,
                        "latest_version": None,
                    },
                ],
            },
        )

    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=uuid4(),
    )
    app.dependency_overrides[get_registry_client] = lambda: RegistryClient(
        base_url="http://registry.test", http_client=http,
    )
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://testserver",
        ) as ac:
            unfiltered = await ac.get(
                "/api/v1/plugins/registry/search", params={"q": "runes"},
            )
            filtered = await ac.get(
                "/api/v1/plugins/registry/search",
                params={"tier": "community"},
            )
    finally:
        await http.aclose()

    assert unfiltered.status_code == 200
    body = unfiltered.json()
    assert body["total"] == 2
    by_name = {h["name"]: h for h in body["hits"]}
    assert by_name["runes-extended"]["version"] == "1.2.0"
    assert by_name["unverified-thing"]["version"] == "—"
    assert any("q=runes" in url for url in captured)

    filtered_body = filtered.json()
    assert filtered_body["total"] == 1
    assert filtered_body["hits"][0]["tier"] == "community"


@pytest.mark.asyncio
async def test_plugins_registry_search_unconfigured_is_503() -> None:
    from types import SimpleNamespace
    from uuid import uuid4

    from httpx import ASGITransport, AsyncClient

    from theourgia.api.app import create_app
    from theourgia.api.deps import get_current_user
    from theourgia.api.routers.v1.registry_bridge import get_registry_client

    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=uuid4(),
    )
    app.dependency_overrides[get_registry_client] = lambda: RegistryClient(
        base_url=None,
    )
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    ) as ac:
        response = await ac.get("/api/v1/plugins/registry/search")

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]
