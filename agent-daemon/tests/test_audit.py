"""Audit sink + sanitisation tests."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import pytest

from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import (
    AuditRecord,
    InMemoryAuditSink,
    NullAuditSink,
    sanitise_arguments,
)


def _ts() -> datetime:
    return datetime(2026, 6, 28, 12, 0, 0, tzinfo=UTC)


def test_sanitise_arguments_strips_secret_shaped_keys() -> None:
    out = sanitise_arguments({
        "tag": "hekate",
        "api_key": "sk-real-key",
        "session_token": "abc",
        "limit": 10,
    })
    assert out == {
        "tag": "hekate",
        "api_key": "<redacted>",
        "session_token": "<redacted>",
        "limit": 10,
    }


def test_sanitise_arguments_passes_through_normal_args() -> None:
    args = {"tag": "h", "limit": 10, "kind": "spell"}
    assert sanitise_arguments(args) == args


def test_sanitise_arguments_handles_none_and_empty() -> None:
    assert sanitise_arguments(None) is None
    assert sanitise_arguments({}) == {}


def test_sanitise_arguments_is_case_insensitive() -> None:
    out = sanitise_arguments({"API_KEY": "x", "Password": "y"})
    assert out == {"API_KEY": "<redacted>", "Password": "<redacted>"}


@pytest.mark.asyncio
async def test_in_memory_sink_records_events() -> None:
    sink = InMemoryAuditSink()
    await sink.emit(
        AuditRecord(
            vault_did="did:vault:abc",
            event_type=AuditEventType.MCP_TOOLS_CALL,
            happened_at=_ts(),
            tool_name="read.entries",
            arguments_json={"tag": "hekate"},
        ),
    )
    assert len(sink.records) == 1
    assert sink.records[0].tool_name == "read.entries"


@pytest.mark.asyncio
async def test_in_memory_sink_find_filters_by_event_type() -> None:
    sink = InMemoryAuditSink()
    await sink.emit(
        AuditRecord(
            vault_did="d",
            event_type=AuditEventType.MCP_TOOLS_CALL,
            happened_at=_ts(),
        ),
    )
    await sink.emit(
        AuditRecord(
            vault_did="d",
            event_type=AuditEventType.CAP_REFUSED_AT_WAKE,
            happened_at=_ts(),
        ),
    )
    assert len(sink.find()) == 2
    assert len(sink.find(event_type=AuditEventType.MCP_TOOLS_CALL)) == 1


@pytest.mark.asyncio
async def test_null_sink_drops_silently() -> None:
    sink = NullAuditSink()
    await sink.emit(
        AuditRecord(
            vault_did="d",
            event_type=AuditEventType.RUN_STARTED,
            happened_at=_ts(),
        ),
    )


@pytest.mark.asyncio
async def test_in_memory_sink_concurrent_emits_preserved() -> None:
    """The internal lock prevents lost records under concurrent emit."""
    import asyncio as _asyncio

    sink = InMemoryAuditSink()

    async def emit_n(n: int) -> None:
        for _ in range(n):
            await sink.emit(
                AuditRecord(
                    vault_did="d",
                    event_type=AuditEventType.MCP_TOOLS_CALL,
                    happened_at=_ts(),
                ),
            )

    await _asyncio.gather(emit_n(20), emit_n(20), emit_n(20))
    assert len(sink.records) == 60


def test_audit_record_to_model_round_trip() -> None:
    """The record's `to_model()` carries every field to the ORM row."""
    record = AuditRecord(
        vault_did="did:vault:x",
        event_type=AuditEventType.MCP_TOOLS_CALL,
        happened_at=_ts(),
        run_id="run-1",
        install_id=UUID("11111111-1111-1111-1111-111111111111"),
        tool_name="read.entries",
        arguments_json={"tag": "h"},
        allowed=True,
        filtered_count=3,
        detail="(test detail)",
    )
    event = record.to_model()
    assert event.vault_did == "did:vault:x"
    assert event.event_type == AuditEventType.MCP_TOOLS_CALL
    assert event.run_id == "run-1"
    assert event.tool_name == "read.entries"
    assert event.arguments_json == {"tag": "h"}
    assert event.allowed is True
    assert event.filtered_count == 3
    assert event.detail == "(test detail)"
