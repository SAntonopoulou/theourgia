"""End-to-end MCP route tests — bearer auth, JSON-RPC envelope round-trip,
SSE endpoint event."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.mcp import (
    endpoint_event_payload,
    registry_dependency,
)
from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import DispatchContext
from theourgia_agent.mcp.sessions import MCPSession, MCPSessionRegistry


class FakeVault:
    def __init__(
        self,
        records: list[dict] | None = None,
        closed_slugs: frozenset[str] = frozenset(),
    ) -> None:
        self._records = records or []
        self._closed_slugs = closed_slugs

    async def closed_tradition_slugs(self) -> frozenset[str]:
        return self._closed_slugs

    async def read_entries(
        self, *, tag: str | None = None, limit: int = 50,
    ) -> list[dict]:
        return list(self._records)

    async def read_entities(self, *, limit: int = 50) -> list[dict]:
        return list(self._records)

    async def read_divinations(self, *, limit: int = 50) -> list[dict]:
        return list(self._records)

    async def read_library(self, *, kind: str | None = None) -> list[dict]:
        return list(self._records)

    async def read_correspondences(
        self, *, bundle: str | None = None,
    ) -> list[dict]:
        return list(self._records)

    async def read_synchronicities(self, *, limit: int = 50) -> list[dict]:
        return list(self._records)


@pytest.fixture
def registry() -> MCPSessionRegistry:
    return MCPSessionRegistry()


@pytest.fixture
def app(registry: MCPSessionRegistry):
    app = create_app()
    app.dependency_overrides[registry_dependency] = lambda: registry
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


def _make_session(
    registry: MCPSessionRegistry,
    *,
    granted: list[AgentCapability],
    records: list[dict] | None = None,
    closed_slugs: frozenset[str] = frozenset(),
) -> str:
    ctx = DispatchContext(
        granted=granted,
        vault=FakeVault(records, closed_slugs),  # type: ignore[arg-type]
    )
    session = registry.register(ctx=ctx, run_id="run-abc")
    return session.token


def test_jsonrpc_requires_bearer_token(client) -> None:
    response = client.post("/mcp/jsonrpc", json={
        "jsonrpc": "2.0", "method": "tools/list", "id": 1,
    })
    assert response.status_code == 401


def test_jsonrpc_rejects_unknown_token(client) -> None:
    response = client.post(
        "/mcp/jsonrpc",
        json={"jsonrpc": "2.0", "method": "tools/list", "id": 1},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401


def test_tools_list_round_trip(client, registry) -> None:
    token = _make_session(
        registry,
        granted=[
            AgentCapability.READ_ENTRIES,
            AgentCapability.FILESYSTEM,
        ],
    )
    response = client.post(
        "/mcp/jsonrpc",
        json={"jsonrpc": "2.0", "method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == 1
    assert "result" in body
    names = [t["name"] for t in body["result"]["tools"]]
    assert names == ["read.entries"]


def test_tools_call_round_trip_filters_sealed(client, registry) -> None:
    token = _make_session(
        registry,
        granted=[AgentCapability.READ_ENTRIES],
        records=[
            {"id": "a", "sealed": False},
            {"id": "b", "sealed": True},
        ],
    )
    response = client.post(
        "/mcp/jsonrpc",
        json={
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {"name": "read.entries", "arguments": {"limit": 10}},
            "id": 2,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == 2
    assert [r["id"] for r in body["result"]["records"]] == ["a"]
    assert body["result"]["filtered_count"] == 1


def test_jsonrpc_returns_parse_error_for_invalid_json(client, registry) -> None:
    token = _make_session(
        registry, granted=[AgentCapability.READ_ENTRIES],
    )
    response = client.post(
        "/mcp/jsonrpc",
        content=b"not even close to JSON",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["error"]["code"] == -32700  # ERROR_PARSE


def test_jsonrpc_capability_denied_returns_application_error(
    client, registry,
) -> None:
    token = _make_session(
        registry, granted=[AgentCapability.READ_ENTRIES],
    )
    response = client.post(
        "/mcp/jsonrpc",
        json={
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {"name": "read.entities", "arguments": {}},
            "id": 3,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["error"]["code"] == -32001  # ERROR_CAPABILITY_DENIED
    assert body["error"]["data"] == {"required": "read.entities"}


def test_sse_endpoint_payload_carries_session_token() -> None:
    """The endpoint event names where the agent should POST messages —
    pure-function test (the streaming wrapper is exercised in
    integration, not here)."""
    ctx = DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=FakeVault(),  # type: ignore[arg-type]
    )
    session = MCPSession(token="abc-token", ctx=ctx, run_id="run-1")
    payload = endpoint_event_payload(session)
    assert payload["type"] == "endpoint"
    assert "abc-token" in payload["uri"]
    assert payload["uri"].startswith("/mcp/jsonrpc")


def test_sse_endpoint_requires_bearer(client) -> None:
    response = client.get("/mcp/sse")
    assert response.status_code == 401
