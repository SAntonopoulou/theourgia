"""Audit emission — the daemon's honest record of what it did.

Every MCP call, every run transition, every cap decision lands here.
The H10 B4 PerUserAuditLog surface reads from the same table.

Sinks are pluggable: production uses DbAuditSink (writes through the
daemon's session_scope); tests use InMemoryAuditSink (a list); units
that don't care use NullAuditSink (drops).

The sink is held on the DispatchContext / RunHandle as a plain
attribute so the emit points compose cleanly without dragging the DB
session around.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import UUID

from theourgia_agent.models.audit import AuditEvent, AuditEventType


__all__ = [
    "AuditRecord",
    "AuditSink",
    "AuditReader",
    "InMemoryAuditSink",
    "NullAuditSink",
    "sanitise_arguments",
    "now",
]


# Argument keys we always strip before persisting. The vault session
# token is the most security-sensitive; api_key_plaintext should never
# reach here, but defence in depth.
_SECRET_KEYS: frozenset[str] = frozenset(
    {
        "api_key",
        "api_key_plaintext",
        "session_token",
        "vault_session_token",
        "token",
        "password",
        "passphrase",
        "secret",
    },
)


def sanitise_arguments(args: dict[str, Any] | None) -> dict[str, Any] | None:
    """Strip secret-shaped keys before persisting to audit.

    The MCP `tools/call` arguments (tag, limit, kind, etc.) don't
    contain secrets, but a buggy or malicious agent might shoehorn
    one. Defence in depth — strip anything that LOOKS like a secret."""
    if not args:
        return args
    out: dict[str, Any] = {}
    for k, v in args.items():
        if k.lower() in _SECRET_KEYS:
            out[k] = "<redacted>"
        else:
            out[k] = v
    return out


@dataclass(slots=True, frozen=True)
class AuditRecord:
    """The shape callers pass to a sink — converted to AuditEvent on
    persist."""

    vault_did: str
    event_type: AuditEventType
    happened_at: datetime
    run_id: str | None = None
    install_id: UUID | None = None
    tool_name: str | None = None
    arguments_json: dict[str, Any] | None = None
    allowed: bool = True
    filtered_count: int = 0
    detail: str | None = None

    def to_model(self) -> AuditEvent:
        return AuditEvent(
            vault_did=self.vault_did,
            run_id=self.run_id,
            install_id=self.install_id,
            event_type=self.event_type,
            tool_name=self.tool_name,
            arguments_json=self.arguments_json,
            allowed=self.allowed,
            filtered_count=self.filtered_count,
            detail=self.detail,
            happened_at=self.happened_at,
        )


class AuditSink(Protocol):
    """Where audit records land."""

    async def emit(self, record: AuditRecord) -> None: ...


class AuditReader(Protocol):
    """Read-side for the B4 PerUserAuditLog surface query layer."""

    async def query(
        self,
        *,
        vault_did: str,
        event_type: AuditEventType | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditRecord]: ...


@dataclass(slots=True)
class InMemoryAuditSink:
    """For tests + early dev — keeps every record in a list."""

    records: list[AuditRecord] = field(default_factory=list)
    _lock: asyncio.Lock = field(default=None, init=False)  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self._lock = asyncio.Lock()

    async def emit(self, record: AuditRecord) -> None:
        async with self._lock:
            self.records.append(record)

    def find(
        self, *, event_type: AuditEventType | None = None,
    ) -> list[AuditRecord]:
        """Convenience for tests."""
        if event_type is None:
            return list(self.records)
        return [r for r in self.records if r.event_type == event_type]

    async def query(
        self,
        *,
        vault_did: str,
        event_type: AuditEventType | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditRecord]:
        """AuditReader implementation. B4 query layer reads through this.

        Returns newest-first. Per-vault scoping enforced (rule 9 — no
        cross-vault leakage even in the audit log)."""
        candidates = [
            r for r in self.records if r.vault_did == vault_did
        ]
        if event_type is not None:
            candidates = [
                r for r in candidates if r.event_type == event_type
            ]
        candidates.sort(key=lambda r: r.happened_at, reverse=True)
        return candidates[offset : offset + limit]


@dataclass(slots=True)
class NullAuditSink:
    """Drops every event. For units that don't exercise the audit path."""

    async def emit(self, record: AuditRecord) -> None:
        return None

    async def query(
        self,
        *,
        vault_did: str,
        event_type: AuditEventType | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditRecord]:
        return []


def now() -> datetime:
    """Server-side UTC timestamp helper — single source so tests can
    monkeypatch if needed."""
    return datetime.now(tz=UTC)
