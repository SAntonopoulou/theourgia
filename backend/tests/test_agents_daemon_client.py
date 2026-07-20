"""DaemonClient tests — httpx MockTransport-backed round-trips."""

from __future__ import annotations

import json

import httpx
import pytest

from theourgia.core.agents.daemon_client import (
    DaemonClient,
    DaemonError,
    DaemonNotConfigured,
    DaemonRefused,
    DaemonUnreachable,
)


def _make_client(handler, *, base_url="http://daemon.test"):
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return DaemonClient(
        base_url=base_url,
        control_token="ctrl-token",
        http_client=http,
    ), http


@pytest.mark.asyncio
async def test_start_run_forwards_body_and_returns_response() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = json.loads(request.read().decode("utf-8"))
        captured["headers"] = dict(request.headers)
        return httpx.Response(
            202,
            json={"run_id": "r1", "status": "running"},
        )

    client, http = _make_client(handler)
    try:
        result = await client.start_run({"install_id": "i1"})
    finally:
        await http.aclose()
    assert result == {"run_id": "r1", "status": "running"}
    assert captured["url"] == "http://daemon.test/runs"
    assert captured["body"] == {"install_id": "i1"}
    assert captured["headers"]["x-daemon-auth"] == "ctrl-token"


@pytest.mark.asyncio
async def test_get_run_round_trip() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert "/runs/r1" in str(request.url)
        return httpx.Response(200, json={"run_id": "r1", "status": "completed"})

    client, http = _make_client(handler)
    try:
        result = await client.get_run("r1")
    finally:
        await http.aclose()
    assert result["status"] == "completed"


@pytest.mark.asyncio
async def test_terminate_run_uses_delete() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        return httpx.Response(200, json={"status": "halted"})

    client, http = _make_client(handler)
    try:
        await client.terminate_run("r1")
    finally:
        await http.aclose()
    assert captured["method"] == "DELETE"


@pytest.mark.asyncio
async def test_report_cost_forwards_body() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.read().decode("utf-8"))
        return httpx.Response(200, json={"cost_usd": "0.50"})

    client, http = _make_client(handler)
    try:
        await client.report_cost("r1", {"tokens_in": 10, "cost_usd": "0.50"})
    finally:
        await http.aclose()
    assert captured["body"] == {"tokens_in": 10, "cost_usd": "0.50"}


@pytest.mark.asyncio
async def test_query_audit_forwards_params() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(200, json={"events": []})

    client, http = _make_client(handler)
    try:
        await client.query_audit(
            vault_did="did:vault:alice",
            event_type="mcp.tools_call",
            limit=50,
        )
    finally:
        await http.aclose()
    assert "vault_did=did:vault:alice" in captured["url"]
    assert "event_type=mcp.tools_call" in captured["url"]
    assert "limit=50" in captured["url"]


@pytest.mark.asyncio
async def test_cost_summary_forwards_vault_and_window() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(
            200,
            json={"vault_id": "v1", "window": "week", "per_install": []},
        )

    client, http = _make_client(handler)
    try:
        result = await client.cost_summary(vault_id="v1", window="week")
    finally:
        await http.aclose()
    assert result["window"] == "week"
    assert "/costs/summary" in captured["url"]
    assert "vault_id=v1" in captured["url"]
    assert "window=week" in captured["url"]


@pytest.mark.asyncio
async def test_daemon_refused_preserves_status_and_payload() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            409,
            json={"refused": True, "reason": "monthly cap exceeded"},
        )

    client, http = _make_client(handler)
    try:
        with pytest.raises(DaemonRefused) as exc:
            await client.start_run({"install_id": "i"})
    finally:
        await http.aclose()
    assert exc.value.status_code == 409
    assert exc.value.payload["reason"] == "monthly cap exceeded"


@pytest.mark.asyncio
async def test_daemon_not_configured_when_base_url_missing() -> None:
    client = DaemonClient(base_url=None, control_token="t")
    with pytest.raises(DaemonNotConfigured):
        await client.start_run({"install_id": "i"})


@pytest.mark.asyncio
async def test_daemon_unreachable_on_transport_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    client, http = _make_client(handler)
    try:
        with pytest.raises(DaemonUnreachable):
            await client.get_run("r1")
    finally:
        await http.aclose()


@pytest.mark.asyncio
async def test_non_json_response_raises_daemon_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="not json")

    client, http = _make_client(handler)
    try:
        with pytest.raises(DaemonError):
            await client.get_run("r1")
    finally:
        await http.aclose()


@pytest.mark.asyncio
async def test_text_payload_preserved_on_refusal() -> None:
    """When the daemon returns a non-JSON 4xx body, DaemonRefused
    carries the raw text so the bridge can still relay it."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="daemon shutting down")

    client, http = _make_client(handler)
    try:
        with pytest.raises(DaemonRefused) as exc:
            await client.get_run("r1")
    finally:
        await http.aclose()
    assert exc.value.status_code == 503
    assert exc.value.payload == "daemon shutting down"


def test_daemon_client_strips_trailing_slash_on_base_url() -> None:
    client = DaemonClient(base_url="http://daemon.test/", control_token="t")
    assert client._ensure_configured() == "http://daemon.test"


def test_daemon_client_unset_url_raises_immediately() -> None:
    client = DaemonClient(base_url=None, control_token="t")
    with pytest.raises(DaemonNotConfigured):
        client._ensure_configured()
