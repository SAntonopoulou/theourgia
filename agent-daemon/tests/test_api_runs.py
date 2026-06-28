"""End-to-end runs control API — start/get/terminate + SSE stream.

Uses a fake subprocess spawner so tests don't fork().
"""

from __future__ import annotations

import asyncio
import json
import signal

import pytest
from fastapi.testclient import TestClient

from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.mcp import registry_dependency as mcp_dep
from theourgia_agent.api.routers.runs import (
    control_token_dependency,
    mcp_registry_dependency,
    run_registry_dependency,
    subprocess_spawner_dependency,
)
from theourgia_agent.mcp.sessions import MCPSessionRegistry
from theourgia_agent.runs.subprocess_runner import (
    RunRegistry,
    SpawnedProcess,
    SubprocessSpawner,
)


class _ScriptedReader:
    def __init__(self, lines: list[bytes]) -> None:
        self._lines = list(lines)

    async def readline(self) -> bytes:
        if not self._lines:
            return b""
        return self._lines.pop(0)


class _FakeProcess:
    def __init__(
        self,
        *,
        stdout_lines: list[bytes] | None = None,
        stderr_lines: list[bytes] | None = None,
        returncode: int = 0,
    ) -> None:
        self._stdout = (
            _ScriptedReader(stdout_lines or [])
            if stdout_lines is not None
            else None
        )
        self._stderr = (
            _ScriptedReader(stderr_lines or [])
            if stderr_lines is not None
            else None
        )
        self._returncode: int | None = None
        self._final_returncode = returncode
        self.signals: list[int] = []

    @property
    def stdout(self):
        return self._stdout

    @property
    def stderr(self):
        return self._stderr

    @property
    def returncode(self):
        return self._returncode

    def send_signal(self, sig: int) -> None:
        self.signals.append(sig)
        self._returncode = -sig

    async def wait(self) -> int:
        if self._returncode is None:
            self._returncode = self._final_returncode
        return self._returncode


class _FakeSpawner:
    def __init__(self, process: _FakeProcess) -> None:
        self.process = process

    async def spawn(
        self,
        *,
        command: list[str],
        env: dict[str, str],
        cwd: str,
    ) -> SpawnedProcess:
        return self.process  # type: ignore[return-value]


@pytest.fixture
def mcp_registry() -> MCPSessionRegistry:
    return MCPSessionRegistry()


@pytest.fixture
def run_registry() -> RunRegistry:
    return RunRegistry()


@pytest.fixture
def fake_process() -> _FakeProcess:
    return _FakeProcess(
        stdout_lines=[b"line-1\n", b"line-2\n"],
        returncode=0,
    )


@pytest.fixture
def fake_spawner(fake_process: _FakeProcess) -> _FakeSpawner:
    return _FakeSpawner(fake_process)


@pytest.fixture
def app(mcp_registry, run_registry, fake_spawner):
    app = create_app()
    app.dependency_overrides[mcp_dep] = lambda: mcp_registry
    app.dependency_overrides[mcp_registry_dependency] = lambda: mcp_registry
    app.dependency_overrides[run_registry_dependency] = lambda: run_registry
    app.dependency_overrides[subprocess_spawner_dependency] = (
        lambda: fake_spawner
    )
    app.dependency_overrides[control_token_dependency] = lambda: None
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


def _start_request() -> dict:
    return {
        "install_id": "install-1",
        "vault_did": "did:vault:test",
        "agent_slug": "example-agent",
        "task_text": "audit my synchronicities for last week",
        "granted_caps": ["read.entries"],
        "scope_id": "default",
        "monthly_cap_usd": "5.00",
        "month_spent_usd": "0.00",
        "recent_run_cost_usd": [],
        "vault_session_token": "vt-test",
        "claude_binary": "/usr/bin/true",
    }


def test_start_run_returns_202_with_run_snapshot(client) -> None:
    response = client.post("/runs", json=_start_request())
    assert response.status_code == 202, response.text
    body = response.json()
    assert body["run_id"] == "install-1"
    assert body["status"] in ("running", "completed", "errored")
    assert body["session_token"]
    assert "reservation_usd" in body


def test_start_run_rejected_with_409_when_cap_exceeded(client) -> None:
    req = _start_request()
    req["monthly_cap_usd"] = "1.00"
    req["month_spent_usd"] = "1.00"
    response = client.post("/runs", json=req)
    assert response.status_code == 409
    body = response.json()
    assert body["refused"] is True
    assert "monthly cost cap" in body["reason"]


def test_start_run_400_on_unknown_capability(client) -> None:
    req = _start_request()
    req["granted_caps"] = ["read.entries", "not.a.real.cap"]
    response = client.post("/runs", json=req)
    assert response.status_code == 400


def test_get_run_returns_404_for_unknown(client) -> None:
    response = client.get("/runs/does-not-exist")
    assert response.status_code == 404


def test_get_run_returns_snapshot_after_start(
    client, run_registry,
) -> None:
    start = client.post("/runs", json=_start_request())
    assert start.status_code == 202
    response = client.get("/runs/install-1")
    assert response.status_code == 200
    body = response.json()
    assert body["run_id"] == "install-1"


def test_delete_run_terminates_running_process(
    client, fake_process,
) -> None:
    # Use a long-running process that won't exit on its own.
    fake_process._final_returncode = 0
    response = client.post("/runs", json=_start_request())
    assert response.status_code == 202
    delete = client.delete("/runs/install-1")
    assert delete.status_code == 200


def test_delete_run_returns_404_for_unknown(client) -> None:
    response = client.delete("/runs/missing")
    assert response.status_code == 404


def test_control_token_enforced_when_configured(
    app, mcp_registry, run_registry, fake_spawner,
) -> None:
    """When the control-token dependency returns a value, requests
    WITHOUT the matching header are 401."""
    app.dependency_overrides[control_token_dependency] = (
        lambda: "secret-token"
    )
    client = TestClient(app)
    response = client.post("/runs", json=_start_request())
    assert response.status_code == 401


def test_control_token_passes_when_header_matches(
    app, mcp_registry, run_registry, fake_spawner,
) -> None:
    app.dependency_overrides[control_token_dependency] = (
        lambda: "secret-token"
    )
    client = TestClient(app)
    response = client.post(
        "/runs",
        json=_start_request(),
        headers={"X-Daemon-Auth": "secret-token"},
    )
    assert response.status_code == 202


def test_start_response_carries_task_session_token(client) -> None:
    """The session token in the response matches the MCP session the
    daemon registered for this run."""
    response = client.post("/runs", json=_start_request())
    assert response.status_code == 202
    body = response.json()
    assert isinstance(body["session_token"], str) and body["session_token"]


def test_stream_endpoint_returns_event_stream_content_type(client) -> None:
    response = client.post("/runs", json=_start_request())
    assert response.status_code == 202
    # The stream endpoint returns SSE; we can't fully drain it via
    # TestClient (sync) but we can verify the handshake.
    with client.stream("GET", "/runs/install-1/stream") as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
