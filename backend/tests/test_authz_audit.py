"""Tests for the audit-event factory and logger.

The pure factory ``build_audit_event`` is tested fully; the
:class:`AuditLogger` persistence path is exercised via a recording
session double. Integration with a real Postgres database lands when
the PostgreSQL test-fixture infrastructure is set up in a subsequent
batch.
"""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.authz.audit import AuditLogger, build_audit_event
from theourgia.models.audit import AuditEventKind, AuditOutcome


def test_build_audit_event_minimal() -> None:
    event = build_audit_event(
        kind=AuditEventKind.SYSTEM,
        action="startup",
        outcome=AuditOutcome.SUCCESS,
    )
    assert event.kind == AuditEventKind.SYSTEM
    assert event.action == "startup"
    assert event.outcome == AuditOutcome.SUCCESS
    assert event.actor_id is None
    assert event.vault_id is None
    assert event.hub_id is None
    assert event.ip_address is None
    assert event.user_agent == ""
    assert event.detail == {}


def test_build_audit_event_full() -> None:
    actor = uuid4()
    vault = uuid4()
    hub = uuid4()
    event = build_audit_event(
        kind=AuditEventKind.AUTH,
        action="login",
        outcome=AuditOutcome.SUCCESS,
        actor_id=actor,
        vault_id=vault,
        hub_id=hub,
        ip_address="192.168.1.42",
        user_agent="Firefox/132",
        detail={"method": "password+totp", "device": "laptop"},
    )
    assert event.actor_id == actor
    assert event.vault_id == vault
    assert event.hub_id == hub
    assert event.ip_address == "192.168.1.42"
    assert event.user_agent == "Firefox/132"
    assert event.detail == {"method": "password+totp", "device": "laptop"}


def test_build_audit_event_detail_is_copied() -> None:
    """The detail dict on the event is not the same object as the input."""
    detail = {"key": "value"}
    event = build_audit_event(
        kind=AuditEventKind.AUTH,
        action="login",
        outcome=AuditOutcome.SUCCESS,
        detail=detail,
    )
    detail["mutated"] = "after"
    assert "mutated" not in event.detail


def test_build_audit_event_rejects_empty_action() -> None:
    with pytest.raises(ValueError, match="action must not be empty"):
        build_audit_event(
            kind=AuditEventKind.AUTH,
            action="",
            outcome=AuditOutcome.SUCCESS,
        )


def test_build_audit_event_rejects_overlong_action() -> None:
    with pytest.raises(ValueError, match="action must be <="):
        build_audit_event(
            kind=AuditEventKind.AUTH,
            action="x" * 129,
            outcome=AuditOutcome.SUCCESS,
        )


def test_build_audit_event_rejects_overlong_ip_address() -> None:
    with pytest.raises(ValueError, match="ip_address must be"):
        build_audit_event(
            kind=AuditEventKind.AUTH,
            action="login",
            outcome=AuditOutcome.SUCCESS,
            ip_address="x" * 46,
        )


def test_build_audit_event_clamps_long_user_agent() -> None:
    """User agents from the wild are noisy; clamp rather than reject."""
    event = build_audit_event(
        kind=AuditEventKind.AUTH,
        action="login",
        outcome=AuditOutcome.SUCCESS,
        user_agent="x" * 1000,
    )
    assert len(event.user_agent) == 512


def test_outcomes_supported() -> None:
    for outcome in (AuditOutcome.SUCCESS, AuditOutcome.FAILURE, AuditOutcome.DENIED):
        event = build_audit_event(
            kind=AuditEventKind.AUTH,
            action="login",
            outcome=outcome,
        )
        assert event.outcome == outcome


def test_all_event_kinds_supported() -> None:
    """Every defined kind must be valid input to build_audit_event."""
    for kind in AuditEventKind:
        event = build_audit_event(
            kind=kind,
            action=f"{kind.value}.smoke",
            outcome=AuditOutcome.SUCCESS,
        )
        assert event.kind == kind


# ─────────────────────────────────────────────────────────────────────────────
# AuditLogger via recording session double
# ─────────────────────────────────────────────────────────────────────────────


class _RecordingSession:
    """Minimal session double that captures add()/flush() calls."""

    def __init__(self) -> None:
        self.added: list[object] = []
        self.flushed: int = 0

    def add(self, obj: object) -> None:
        self.added.append(obj)

    async def flush(self) -> None:
        self.flushed += 1


@pytest.mark.asyncio
async def test_audit_logger_adds_event_to_session_and_flushes() -> None:
    session = _RecordingSession()
    logger = AuditLogger(session)  # type: ignore[arg-type]

    event = await logger.log(
        kind=AuditEventKind.AUTH,
        action="login",
        outcome=AuditOutcome.SUCCESS,
        actor_id=uuid4(),
    )

    assert len(session.added) == 1
    assert session.added[0] is event
    assert session.flushed == 1


@pytest.mark.asyncio
async def test_audit_logger_returns_constructed_event() -> None:
    session = _RecordingSession()
    logger = AuditLogger(session)  # type: ignore[arg-type]

    event = await logger.log(
        kind=AuditEventKind.SEALED_READ,
        action="entry.sealed.decrypt",
        outcome=AuditOutcome.SUCCESS,
    )

    assert event.kind == AuditEventKind.SEALED_READ
    assert event.action == "entry.sealed.decrypt"
    assert event.outcome == AuditOutcome.SUCCESS
