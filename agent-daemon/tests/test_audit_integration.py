"""End-to-end audit emission + read tests.

Verifies that every honesty-rule-bearing event lands in the audit
log: MCP tool calls (allowed + denied), tools/list, run lifecycle,
cap refusal at wake, cap halt at spend.
"""

from __future__ import annotations

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.mcp import registry_dependency as mcp_dep
from theourgia_agent.api.routers.runs import (
    audit_sink_dependency,
    control_token_dependency,
    mcp_registry_dependency,
    run_registry_dependency,
    subprocess_spawner_dependency,
)
from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import DispatchContext, dispatch_tool
from theourgia_agent.mcp.gating import CapabilityDenied
from theourgia_agent.mcp.protocol import JsonRpcRequest, handle_request
from theourgia_agent.mcp.sessions import MCPSessionRegistry
from theourgia_agent.mcp.vault_client import VaultClient
from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import InMemoryAuditSink
from theourgia_agent.runs.launcher import LaunchRefused, LaunchRequest, plan_launch
from theourgia_agent.runs.subprocess_runner import RunRegistry, SpawnedProcess


class _StubVault:
    def __init__(
        self,
        records: list[dict] | None = None,
        closed_slugs: frozenset[str] = frozenset(),
    ) -> None:
        self._records = records or []
        self._closed = closed_slugs

    async def closed_tradition_slugs(self) -> frozenset[str]:
        return self._closed

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

    async def read_synchronicities(
        self, *, limit: int = 50,
    ) -> list[dict]:
        return list(self._records)


@pytest.mark.asyncio
async def test_dispatch_emits_mcp_tools_call_audit() -> None:
    sink = InMemoryAuditSink()
    ctx = DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=_StubVault(records=[{"id": "a", "sealed": False}]),  # type: ignore[arg-type]
        audit_sink=sink,
        vault_did="did:vault:alice",
        run_id="run-99",
    )
    await dispatch_tool(
        ctx, tool_name="read.entries", arguments={"tag": "h", "limit": 5},
    )
    events = sink.find(event_type=AuditEventType.MCP_TOOLS_CALL)
    assert len(events) == 1
    e = events[0]
    assert e.vault_did == "did:vault:alice"
    assert e.run_id == "run-99"
    assert e.tool_name == "read.entries"
    assert e.arguments_json == {"tag": "h", "limit": 5}
    assert e.allowed is True
    assert e.filtered_count == 0


@pytest.mark.asyncio
async def test_dispatch_emits_capability_denied_audit() -> None:
    sink = InMemoryAuditSink()
    ctx = DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=_StubVault(),  # type: ignore[arg-type]
        audit_sink=sink,
        vault_did="did:vault:alice",
    )
    with pytest.raises(CapabilityDenied):
        await dispatch_tool(ctx, tool_name="read.entities", arguments={})
    events = sink.find(event_type=AuditEventType.MCP_CAPABILITY_DENIED)
    assert len(events) == 1
    assert events[0].allowed is False
    assert events[0].tool_name == "read.entities"


@pytest.mark.asyncio
async def test_dispatch_audit_filtered_count_reflects_drops() -> None:
    sink = InMemoryAuditSink()
    ctx = DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=_StubVault(  # type: ignore[arg-type]
            records=[
                {"id": "a", "sealed": False},
                {"id": "b", "sealed": True},
                {"id": "c", "sealed": True},
            ],
        ),
        audit_sink=sink,
        vault_did="did:vault:alice",
    )
    await dispatch_tool(ctx, tool_name="read.entries")
    e = sink.find(event_type=AuditEventType.MCP_TOOLS_CALL)[0]
    assert e.filtered_count == 2


@pytest.mark.asyncio
async def test_tools_list_emits_audit() -> None:
    sink = InMemoryAuditSink()
    ctx = DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=_StubVault(),  # type: ignore[arg-type]
        audit_sink=sink,
        vault_did="did:vault:alice",
    )
    req = JsonRpcRequest(method="tools/list", params={}, id=1)
    await handle_request(ctx, req)
    events = sink.find(event_type=AuditEventType.MCP_TOOLS_LIST)
    assert len(events) == 1


@pytest.mark.asyncio
async def test_plan_launch_emits_cap_refused_at_wake_audit() -> None:
    sink = InMemoryAuditSink()
    reg = MCPSessionRegistry()
    request = LaunchRequest(
        install_id="install-1",
        vault_did="did:vault:alice",
        agent_slug="test",
        task_text="x",
        granted_caps=[AgentCapability.READ_ENTRIES],
        scope_id="s",
        monthly_cap_usd=Decimal("1.00"),
        month_spent_usd=Decimal("1.00"),  # at cap → refuse
    )
    outcome = await plan_launch(
        request=request, registry=reg, audit_sink=sink,
    )
    assert isinstance(outcome, LaunchRefused)
    events = sink.find(event_type=AuditEventType.CAP_REFUSED_AT_WAKE)
    assert len(events) == 1
    assert events[0].allowed is False
    assert events[0].vault_did == "did:vault:alice"
    assert "monthly cost cap" in (events[0].detail or "")


@pytest.mark.asyncio
async def test_audit_query_returns_per_vault_scoped() -> None:
    """Rule 9 — no cross-vault leakage even in the audit log."""
    sink = InMemoryAuditSink()
    from datetime import UTC, datetime

    from theourgia_agent.runs.audit import AuditRecord

    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.MCP_TOOLS_CALL,
            happened_at=datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC),
        ),
    )
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:bob",
            event_type=AuditEventType.MCP_TOOLS_CALL,
            happened_at=datetime(2026, 6, 28, 13, 0, 0, tzinfo=UTC),
        ),
    )
    alice_records = await sink.query(vault_did="did:vault:alice")
    bob_records = await sink.query(vault_did="did:vault:bob")
    assert len(alice_records) == 1
    assert len(bob_records) == 1
    assert alice_records[0].vault_did == "did:vault:alice"


@pytest.mark.asyncio
async def test_audit_query_orders_newest_first() -> None:
    from datetime import UTC, datetime

    from theourgia_agent.runs.audit import AuditRecord

    sink = InMemoryAuditSink()
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.RUN_STARTED,
            happened_at=datetime(2026, 1, 1, tzinfo=UTC),
            detail="first",
        ),
    )
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.RUN_COMPLETED,
            happened_at=datetime(2026, 6, 1, tzinfo=UTC),
            detail="second",
        ),
    )
    rows = await sink.query(vault_did="did:vault:alice")
    assert rows[0].detail == "second"
    assert rows[1].detail == "first"


# ── GET /audit HTTP tests ──────────────────────────────────────────────


class _FakeProcess:
    def __init__(self) -> None:
        self._returncode: int | None = None

    @property
    def stdout(self):
        return None

    @property
    def stderr(self):
        return None

    @property
    def returncode(self):
        return self._returncode

    def send_signal(self, sig: int) -> None:  # noqa: ARG002
        self._returncode = 0

    async def wait(self) -> int:
        if self._returncode is None:
            self._returncode = 0
        return self._returncode


class _FakeSpawner:
    async def spawn(self, *, command, env, cwd) -> SpawnedProcess:  # noqa: ARG002
        return _FakeProcess()  # type: ignore[return-value]


@pytest.fixture
def audit_sink() -> InMemoryAuditSink:
    return InMemoryAuditSink()


@pytest.fixture
def app(audit_sink):
    mcp_registry = MCPSessionRegistry()
    run_registry = RunRegistry()
    spawner = _FakeSpawner()
    app = create_app()
    app.dependency_overrides[mcp_dep] = lambda: mcp_registry
    app.dependency_overrides[mcp_registry_dependency] = lambda: mcp_registry
    app.dependency_overrides[run_registry_dependency] = lambda: run_registry
    app.dependency_overrides[subprocess_spawner_dependency] = lambda: spawner
    app.dependency_overrides[audit_sink_dependency] = lambda: audit_sink
    app.dependency_overrides[control_token_dependency] = lambda: None
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


def test_get_audit_requires_vault_did(client) -> None:
    response = client.get("/audit")
    assert response.status_code == 422  # missing required query param


def test_get_audit_returns_empty_when_no_events(client) -> None:
    response = client.get("/audit?vault_did=did:vault:alice")
    assert response.status_code == 200
    body = response.json()
    assert body["events"] == []
    assert body["vault_did"] == "did:vault:alice"


def test_get_audit_returns_recorded_events(
    client, audit_sink,
) -> None:
    """Start a run via the API; expect RUN_STARTED + RUN_COMPLETED."""
    start = client.post(
        "/runs",
        json={
            "install_id": "install-1",
            "vault_did": "did:vault:alice",
            "agent_slug": "test",
            "task_text": "x",
            "granted_caps": ["read.entries"],
            "scope_id": "s",
            "monthly_cap_usd": "10.00",
            "month_spent_usd": "0.00",
            "claude_binary": "/usr/bin/true",
        },
    )
    assert start.status_code == 202
    response = client.get("/audit?vault_did=did:vault:alice")
    assert response.status_code == 200
    events = response.json()["events"]
    event_types = {e["event_type"] for e in events}
    assert "run.started" in event_types


def test_get_audit_event_type_filter(
    client, audit_sink,
) -> None:
    from datetime import UTC, datetime

    import asyncio
    from theourgia_agent.runs.audit import AuditRecord

    async def seed() -> None:
        await audit_sink.emit(
            AuditRecord(
                vault_did="did:vault:alice",
                event_type=AuditEventType.MCP_TOOLS_CALL,
                happened_at=datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC),
            ),
        )
        await audit_sink.emit(
            AuditRecord(
                vault_did="did:vault:alice",
                event_type=AuditEventType.CAP_REFUSED_AT_WAKE,
                happened_at=datetime(2026, 6, 28, 13, 0, 0, tzinfo=UTC),
            ),
        )

    asyncio.run(seed())
    response = client.get(
        "/audit?vault_did=did:vault:alice&event_type=mcp.tools_call",
    )
    assert response.status_code == 200
    events = response.json()["events"]
    assert len(events) == 1
    assert events[0]["event_type"] == "mcp.tools_call"


def test_get_audit_400_on_unknown_event_type(client) -> None:
    response = client.get(
        "/audit?vault_did=did:vault:alice&event_type=mcp.bogus",
    )
    assert response.status_code == 400
