"""Postgres-backed AuditSink + AuditReader.

Writes audit rows through the daemon's session_scope (one row per emit).
Reads via SELECT … ORDER BY happened_at DESC LIMIT/OFFSET on the
(vault_did, happened_at DESC) index added in alembic 0002.

For unit tests that don't want a live DB, `InMemoryAuditSink` is the
default; this implementation is the production wiring.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)

from theourgia_agent.models.audit import AuditEvent, AuditEventType
from theourgia_agent.runs.audit import AuditRecord


__all__ = ["DbAuditSink"]


def _event_to_record(event: AuditEvent) -> AuditRecord:
    return AuditRecord(
        vault_did=event.vault_did,
        event_type=event.event_type,
        happened_at=event.happened_at,
        run_id=event.run_id,
        install_id=event.install_id,
        tool_name=event.tool_name,
        arguments_json=event.arguments_json,
        allowed=event.allowed,
        filtered_count=event.filtered_count,
        detail=event.detail,
    )


@dataclass(slots=True)
class DbAuditSink:
    """Writes/reads audit rows via the daemon's async engine.

    Constructed once and held on the FastAPI app state; passed to the
    runs router via the audit_sink_dependency override. The engine
    must outlive every emit; the dataclass keeps a strong reference."""

    engine: AsyncEngine

    @property
    def _sessionmaker(self) -> async_sessionmaker[AsyncSession]:
        return async_sessionmaker(bind=self.engine, expire_on_commit=False)

    async def emit(self, record: AuditRecord) -> None:
        event = record.to_model()
        async with self._sessionmaker() as session:
            try:
                session.add(event)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def query(
        self,
        *,
        vault_did: str,
        event_type: AuditEventType | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AuditRecord]:
        """Newest-first, per-vault scoped read.

        The (vault_did, happened_at DESC) index handles the dominant
        access pattern. event_type filter falls back to the secondary
        index (vault_did, event_type) when supplied."""
        stmt = (
            select(AuditEvent)
            .where(AuditEvent.vault_did == vault_did)
            .order_by(desc(AuditEvent.happened_at))
            .limit(limit)
            .offset(offset)
        )
        if event_type is not None:
            stmt = stmt.where(AuditEvent.event_type == event_type)

        async with self._sessionmaker() as session:
            result = await session.execute(stmt)
            rows = result.scalars().all()

        return [_event_to_record(r) for r in rows]
