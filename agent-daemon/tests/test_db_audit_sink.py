"""Integration tests for DbAuditSink against a real Postgres.

Skipped when THEOURGIA_AGENT_TEST_DATABASE_URL is unset (no test DB).
Bring up the test DB via:

    docker compose -f docker-compose.test.yml up -d daemon-pg
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import AuditRecord
from theourgia_agent.runs.db_audit_sink import DbAuditSink


def _ts(hour: int = 12) -> datetime:
    return datetime(2026, 6, 28, hour, 0, 0, tzinfo=UTC)


@pytest.mark.asyncio
async def test_emit_persists_event_row(
    daemon_engine: AsyncEngine, daemon_session,
) -> None:
    sink = DbAuditSink(engine=daemon_engine)
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.MCP_TOOLS_CALL,
            happened_at=_ts(),
            run_id="run-1",
            tool_name="read.entries",
            arguments_json={"tag": "h"},
            allowed=True,
            filtered_count=2,
            detail="ok",
        ),
    )
    rows = await sink.query(vault_did="did:vault:alice")
    assert len(rows) == 1
    r = rows[0]
    assert r.tool_name == "read.entries"
    assert r.arguments_json == {"tag": "h"}
    assert r.filtered_count == 2
    assert r.event_type == AuditEventType.MCP_TOOLS_CALL


@pytest.mark.asyncio
async def test_query_per_vault_scoped(
    daemon_engine: AsyncEngine, daemon_session,
) -> None:
    sink = DbAuditSink(engine=daemon_engine)
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.RUN_STARTED,
            happened_at=_ts(),
        ),
    )
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:bob",
            event_type=AuditEventType.RUN_STARTED,
            happened_at=_ts(),
        ),
    )
    alice = await sink.query(vault_did="did:vault:alice")
    bob = await sink.query(vault_did="did:vault:bob")
    assert len(alice) == 1
    assert len(bob) == 1


@pytest.mark.asyncio
async def test_query_newest_first(
    daemon_engine: AsyncEngine, daemon_session,
) -> None:
    sink = DbAuditSink(engine=daemon_engine)
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.RUN_STARTED,
            happened_at=_ts(hour=10),
            detail="first",
        ),
    )
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.RUN_COMPLETED,
            happened_at=_ts(hour=14),
            detail="second",
        ),
    )
    rows = await sink.query(vault_did="did:vault:alice")
    assert rows[0].detail == "second"
    assert rows[1].detail == "first"


@pytest.mark.asyncio
async def test_query_filter_by_event_type(
    daemon_engine: AsyncEngine, daemon_session,
) -> None:
    sink = DbAuditSink(engine=daemon_engine)
    for et in (
        AuditEventType.MCP_TOOLS_CALL,
        AuditEventType.MCP_TOOLS_CALL,
        AuditEventType.RUN_COMPLETED,
    ):
        await sink.emit(
            AuditRecord(
                vault_did="did:vault:alice",
                event_type=et,
                happened_at=_ts(),
            ),
        )
    calls = await sink.query(
        vault_did="did:vault:alice",
        event_type=AuditEventType.MCP_TOOLS_CALL,
    )
    completes = await sink.query(
        vault_did="did:vault:alice",
        event_type=AuditEventType.RUN_COMPLETED,
    )
    assert len(calls) == 2
    assert len(completes) == 1


@pytest.mark.asyncio
async def test_query_pagination(
    daemon_engine: AsyncEngine, daemon_session,
) -> None:
    sink = DbAuditSink(engine=daemon_engine)
    for h in range(10):
        await sink.emit(
            AuditRecord(
                vault_did="did:vault:alice",
                event_type=AuditEventType.MCP_TOOLS_CALL,
                happened_at=_ts(hour=h),
                detail=f"row-{h}",
            ),
        )
    page1 = await sink.query(vault_did="did:vault:alice", limit=3, offset=0)
    page2 = await sink.query(vault_did="did:vault:alice", limit=3, offset=3)
    assert len(page1) == 3
    assert len(page2) == 3
    # Newest-first ordering: page1[0] is hour 9, page2[0] is hour 6.
    assert page1[0].detail == "row-9"
    assert page2[0].detail == "row-6"


@pytest.mark.asyncio
async def test_emit_carries_install_id_uuid(
    daemon_engine: AsyncEngine, daemon_session,
) -> None:
    install_id = uuid4()
    sink = DbAuditSink(engine=daemon_engine)
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.RUN_STARTED,
            happened_at=_ts(),
            install_id=install_id,
        ),
    )
    rows = await sink.query(vault_did="did:vault:alice")
    assert rows[0].install_id == install_id


@pytest.mark.asyncio
async def test_capability_denied_round_trip(
    daemon_engine: AsyncEngine, daemon_session,
) -> None:
    sink = DbAuditSink(engine=daemon_engine)
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:alice",
            event_type=AuditEventType.MCP_CAPABILITY_DENIED,
            happened_at=_ts(),
            tool_name="read.entities",
            allowed=False,
            detail="capability 'read.entities' not granted",
        ),
    )
    rows = await sink.query(
        vault_did="did:vault:alice",
        event_type=AuditEventType.MCP_CAPABILITY_DENIED,
    )
    assert len(rows) == 1
    assert rows[0].allowed is False
