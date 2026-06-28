"""JSON-RPC protocol handler tests — verifies error mapping + tools/list
shape + tools/call result shape. The dispatch + filter are exercised
elsewhere; here we only check the protocol envelope."""

from __future__ import annotations

import pytest

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import DispatchContext
from theourgia_agent.mcp.protocol import (
    ERROR_CAPABILITY_DENIED,
    ERROR_INVALID_PARAMS,
    ERROR_METHOD_NOT_FOUND,
    JsonRpcRequest,
    handle_request,
    tool_descriptors,
)


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


def _ctx(
    granted: list[AgentCapability],
    *,
    records: list[dict] | None = None,
    closed_slugs: frozenset[str] = frozenset(),
) -> DispatchContext:
    return DispatchContext(
        granted=granted,
        vault=FakeVault(records, closed_slugs),  # type: ignore[arg-type]
    )


def test_tool_descriptors_omits_filesystem_and_network() -> None:
    descriptors = tool_descriptors(
        [
            AgentCapability.READ_ENTRIES,
            AgentCapability.FILESYSTEM,
            AgentCapability.NETWORK_OUTBOUND,
        ],
    )
    names = [d["name"] for d in descriptors]
    assert "read.entries" in names
    assert "filesystem" not in names
    assert "network.outbound" not in names


def test_tool_descriptors_inputSchema_shape() -> None:
    descriptors = tool_descriptors([AgentCapability.READ_ENTRIES])
    assert descriptors[0]["inputSchema"]["type"] == "object"
    assert "tag" in descriptors[0]["inputSchema"]["properties"]
    assert "limit" in descriptors[0]["inputSchema"]["properties"]


def test_from_payload_rejects_non_object() -> None:
    with pytest.raises(ValueError):
        JsonRpcRequest.from_payload("not a dict")


def test_from_payload_rejects_wrong_jsonrpc_version() -> None:
    with pytest.raises(ValueError):
        JsonRpcRequest.from_payload(
            {"jsonrpc": "1.0", "method": "tools/list", "id": 1},
        )


def test_from_payload_rejects_missing_method() -> None:
    with pytest.raises(ValueError):
        JsonRpcRequest.from_payload({"jsonrpc": "2.0", "id": 1})


@pytest.mark.asyncio
async def test_handle_tools_list() -> None:
    ctx = _ctx([AgentCapability.READ_ENTRIES])
    request = JsonRpcRequest(method="tools/list", params={}, id=7)
    response = await handle_request(ctx, request)
    assert response.id == 7
    assert response.error is None
    assert response.result is not None
    tools = response.result["tools"]
    assert any(t["name"] == "read.entries" for t in tools)


@pytest.mark.asyncio
async def test_handle_tools_call_happy_path() -> None:
    ctx = _ctx(
        [AgentCapability.READ_ENTRIES],
        records=[
            {"id": "a", "sealed": False},
            {"id": "b", "sealed": True},
        ],
    )
    request = JsonRpcRequest(
        method="tools/call",
        params={"name": "read.entries", "arguments": {"limit": 10}},
        id=1,
    )
    response = await handle_request(ctx, request)
    assert response.error is None
    assert response.result is not None
    assert [r["id"] for r in response.result["records"]] == ["a"]
    assert response.result["filtered_count"] == 1


@pytest.mark.asyncio
async def test_handle_tools_call_capability_denied() -> None:
    ctx = _ctx([AgentCapability.READ_ENTRIES])
    request = JsonRpcRequest(
        method="tools/call",
        params={"name": "read.entities", "arguments": {}},
        id=1,
    )
    response = await handle_request(ctx, request)
    assert response.error is not None
    assert response.error.code == ERROR_CAPABILITY_DENIED
    assert response.error.data == {"required": "read.entities"}


@pytest.mark.asyncio
async def test_handle_tools_call_invalid_tool_name() -> None:
    ctx = _ctx([AgentCapability.READ_ENTRIES])
    request = JsonRpcRequest(
        method="tools/call",
        params={"name": "", "arguments": {}},
        id=1,
    )
    response = await handle_request(ctx, request)
    assert response.error is not None
    assert response.error.code == ERROR_INVALID_PARAMS


@pytest.mark.asyncio
async def test_handle_tools_call_arguments_must_be_object() -> None:
    ctx = _ctx([AgentCapability.READ_ENTRIES])
    request = JsonRpcRequest(
        method="tools/call",
        params={"name": "read.entries", "arguments": "not an object"},
        id=1,
    )
    response = await handle_request(ctx, request)
    assert response.error is not None
    assert response.error.code == ERROR_INVALID_PARAMS


@pytest.mark.asyncio
async def test_handle_unknown_method() -> None:
    ctx = _ctx([AgentCapability.READ_ENTRIES])
    request = JsonRpcRequest(method="resources/list", params={}, id=2)
    response = await handle_request(ctx, request)
    assert response.error is not None
    assert response.error.code == ERROR_METHOD_NOT_FOUND


@pytest.mark.asyncio
async def test_handle_tools_call_unknown_capability_string() -> None:
    """A well-formed tools/call naming an unknown capability surfaces
    INVALID_PARAMS (not 'method not found' — `tools/call` IS the method,
    the name argument is what is invalid)."""
    ctx = _ctx([AgentCapability.READ_ENTRIES])
    request = JsonRpcRequest(
        method="tools/call",
        params={"name": "read.nope", "arguments": {}},
        id=3,
    )
    response = await handle_request(ctx, request)
    assert response.error is not None
    assert response.error.code == ERROR_INVALID_PARAMS
