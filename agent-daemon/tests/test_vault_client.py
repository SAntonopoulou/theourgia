"""Vault MCP client tests — uses httpx MockTransport via injection.

The client now accepts an injected `http_client`; tests construct one
backed by a MockTransport. Cleaner than module-level monkeypatching.
"""

from __future__ import annotations

import json

import httpx
import pytest

from theourgia_agent.mcp.vault_client import (
    VaultClient,
    VaultClientError,
    VaultUnauthorisedError,
)


def _make_client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.mark.asyncio
async def test_read_entries_round_trip() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["method"] = request.method
        captured["headers"] = dict(request.headers)
        captured["body"] = json.loads(request.read().decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "records": [
                        {"id": "a", "sealed": False},
                        {"id": "b", "sealed": False},
                    ],
                },
            },
        )

    async with _make_client(handler) as http:
        client = VaultClient(
            session_token="vault-token-abc",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        records = await client.read_entries(tag="hekate", limit=10)

    assert records == [
        {"id": "a", "sealed": False},
        {"id": "b", "sealed": False},
    ]
    assert captured["url"] == "http://vault.test/mcp"
    assert captured["method"] == "POST"
    assert (
        captured["headers"]["authorization"] == "Bearer vault-token-abc"
    )
    assert captured["body"]["method"] == "read.entries"
    assert captured["body"]["params"] == {"tag": "hekate", "limit": 10}


@pytest.mark.asyncio
async def test_401_surfaces_unauthorised() -> None:
    async with _make_client(
        lambda req: httpx.Response(401, json={"error": "expired"}),
    ) as http:
        client = VaultClient(
            session_token="expired",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        with pytest.raises(VaultUnauthorisedError):
            await client.read_entries()


@pytest.mark.asyncio
async def test_jsonrpc_error_surfaces_client_error() -> None:
    async with _make_client(
        lambda req: httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "error": {"code": -32601, "message": "method not found"},
            },
        ),
    ) as http:
        client = VaultClient(
            session_token="t",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        with pytest.raises(VaultClientError) as exc:
            await client.read_entries()
    assert "method not found" in str(exc.value)


@pytest.mark.asyncio
async def test_closed_tradition_slugs_returns_frozenset() -> None:
    async with _make_client(
        lambda req: httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"slugs": ["closed-x", "closed-y"]},
            },
        ),
    ) as http:
        client = VaultClient(
            session_token="t",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        slugs = await client.closed_tradition_slugs()

    assert slugs == frozenset({"closed-x", "closed-y"})


@pytest.mark.asyncio
async def test_http_5xx_surfaces_client_error() -> None:
    async with _make_client(
        lambda req: httpx.Response(503, text="service unavailable"),
    ) as http:
        client = VaultClient(
            session_token="t",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        with pytest.raises(VaultClientError) as exc:
            await client.read_entries()
    assert "503" in str(exc.value)


@pytest.mark.asyncio
async def test_invalid_json_surfaces_client_error() -> None:
    async with _make_client(
        lambda req: httpx.Response(200, text="not json at all"),
    ) as http:
        client = VaultClient(
            session_token="t",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        with pytest.raises(VaultClientError) as exc:
            await client.read_entries()
    assert "invalid JSON" in str(exc.value)


@pytest.mark.asyncio
async def test_missing_result_dict_surfaces_client_error() -> None:
    async with _make_client(
        lambda req: httpx.Response(
            200,
            json={"jsonrpc": "2.0", "id": 1, "result": "not a dict"},
        ),
    ) as http:
        client = VaultClient(
            session_token="t",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        with pytest.raises(VaultClientError):
            await client.read_entries()


@pytest.mark.asyncio
async def test_read_entities_round_trip() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.read().decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "records": [{"id": "e1", "name": "Hekate"}],
                },
            },
        )

    async with _make_client(handler) as http:
        client = VaultClient(
            session_token="t",
            base_url="http://vault.test/mcp",
            http_client=http,
        )
        records = await client.read_entities(limit=20)

    assert records == [{"id": "e1", "name": "Hekate"}]
    assert captured["body"]["method"] == "read.entities"
    assert captured["body"]["params"] == {"limit": 20}
