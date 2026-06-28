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
