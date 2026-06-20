"""Transactional outbox for durable event delivery.

The outbox pattern decouples event publication from delivery:

1. **Publish:** The feature writes an :class:`OutboxEvent` row into
   the same DB transaction that does the business work.
2. **Dispatch:** A background worker reads pending rows, hands them
   to the in-process bus (which fans out to subscribers), and marks
   each row delivered.

Result: events are persisted at least once even across process
crashes, and the feature doesn't need to know who's listening. The
trade-off is delay — outbox events are not synchronous with the
publishing transaction (deliberately — synchronous fan-out is what
:class:`EventBus.publish` is for).

The :func:`enqueue_event` helper does step 1; the
:class:`OutboxDispatcher` (run as a Celery beat task) does step 2.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import select, update

from theourgia.core.events.bus import EventBus, default_bus
from theourgia.core.events.event import DomainEvent

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["OutboxDispatcher", "enqueue_event"]

_log = logging.getLogger(__name__)


async def enqueue_event(
    session: "AsyncSession",
    event: DomainEvent,
) -> None:
    """Write an event to the outbox inside the caller's transaction.

    Use this when the side-effects of an event must be transactionally
    consistent with the business work that produced it. The session
    is the caller's — we don't commit; the caller does.

    Example::

        async with session_scope() as session:
            entry = Entry(...)
            session.add(entry)
            await enqueue_event(
                session,
                DomainEvent(type="entry.created", payload={"entry_id": str(entry.id)}),
            )
            await session.commit()
    """
    # Late import to keep the model out of the substrate's import graph
    from theourgia.models.events import OutboxEvent

    row = OutboxEvent(
        event_id=event.id,
        event_type=event.type,
        payload_json=json.dumps(event.to_dict()),
        scheduled_for=datetime.now(tz=UTC),
        actor_id=event.actor_id,
    )
    session.add(row)


class OutboxDispatcher:
    """Reads pending outbox rows and fans them out via the in-process bus.

    Run as a Celery beat task (typically every few seconds). Picks up
    a bounded batch each tick, dispatches via the bus, marks rows
    delivered on success and increments the attempt count on failure.
    A row stays in the queue until it's delivered or until its
    attempts exhaust :attr:`max_attempts`, after which it's marked
    ``dead`` for operator investigation.

    The dispatcher is idempotent across crashes: rows it processed but
    failed to mark delivered get re-attempted (subscribers must
    therefore tolerate at-least-once delivery, typically by being
    keyed on :attr:`DomainEvent.id` for dedup).
    """

    def __init__(
        self,
        *,
        bus: EventBus | None = None,
        batch_size: int = 100,
        max_attempts: int = 10,
        retry_after: timedelta = timedelta(seconds=30),
    ) -> None:
        self._bus = bus or default_bus
        self._batch_size = batch_size
        self._max_attempts = max_attempts
        self._retry_after = retry_after

    async def tick(self, session: "AsyncSession") -> int:
        """Process one batch of pending events. Returns the number of
        rows dispatched (success or failure)."""
        from theourgia.models.events import OutboxEvent, OutboxStatus

        now = datetime.now(tz=UTC)
        stmt = (
            select(OutboxEvent)
            .where(
                OutboxEvent.status == OutboxStatus.PENDING,
                OutboxEvent.scheduled_for <= now,
            )
            .order_by(OutboxEvent.scheduled_for)
            .limit(self._batch_size)
        )
        result = await session.execute(stmt)
        rows = list(result.scalars().all())
        if not rows:
            return 0

        dispatched = 0
        for row in rows:
            event = self._row_to_event(row)
            try:
                await self._bus.publish(event)
                row.status = OutboxStatus.DELIVERED
                row.delivered_at = datetime.now(tz=UTC)
            except Exception as exc:  # noqa: BLE001
                row.attempts += 1
                row.last_error = str(exc)[:1000]
                if row.attempts >= self._max_attempts:
                    row.status = OutboxStatus.DEAD
                    _log.error(
                        "outbox.event.dead",
                        extra={
                            "event_id": str(row.event_id),
                            "event_type": row.event_type,
                            "attempts": row.attempts,
                        },
                    )
                else:
                    row.scheduled_for = datetime.now(tz=UTC) + self._retry_after
                    _log.warning(
                        "outbox.event.retry",
                        extra={
                            "event_id": str(row.event_id),
                            "event_type": row.event_type,
                            "attempts": row.attempts,
                        },
                    )
            dispatched += 1

        await session.commit()
        return dispatched

    @staticmethod
    def _row_to_event(row: object) -> DomainEvent:
        payload = json.loads(row.payload_json)  # type: ignore[attr-defined]
        return DomainEvent.from_dict(payload)
