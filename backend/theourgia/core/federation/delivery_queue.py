"""Outbound delivery queue + retry worker — Phase 12.5.

Producers call :func:`enqueue` to schedule an outbound delivery; the
periodic :func:`drain_pending` worker picks up due rows, signs +
delivers via the existing :func:`deliver` primitive, and either:

  · 2xx → mark DELIVERED, set delivered_at
  · 4xx/5xx/transport-fail → schedule next_attempt_at with exponential
    backoff (60s · 5m · 30m · 2h · 12h · 24h), increment attempt_count.
    When attempt_count >= max_attempts, mark DEAD.

The backoff schedule keeps short-blip retries snappy + spreads load
when many peers are simultaneously down.

The worker uses SELECT FOR UPDATE SKIP LOCKED so multiple worker
processes can drain in parallel without double-delivering.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Final
from uuid import UUID

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.federation.outbound import deliver
from theourgia.models.federation_delivery import (
    FederationDelivery,
    FederationDeliveryStatus,
)


__all__ = [
    "BACKOFF_SCHEDULE_SECONDS",
    "enqueue",
    "drain_pending",
    "next_attempt_after",
]


_log = logging.getLogger(__name__)


# 60s · 5m · 30m · 2h · 12h · 24h — 6 steps matches default max_attempts.
BACKOFF_SCHEDULE_SECONDS: Final[tuple[int, ...]] = (
    60, 300, 1800, 7200, 43200, 86400,
)


def next_attempt_after(attempt_count: int) -> timedelta:
    """The delay before the (attempt_count + 1)-th attempt.

    `attempt_count` is the NUMBER OF ATTEMPTS ALREADY MADE — so 0 means
    "first attempt", 1 means "retry after first failure", etc.
    Clamped to the last bucket if attempt_count exceeds the schedule."""
    idx = min(attempt_count, len(BACKOFF_SCHEDULE_SECONDS) - 1)
    return timedelta(seconds=BACKOFF_SCHEDULE_SECONDS[idx])


async def enqueue(
    db: AsyncSession,
    *,
    recipient_did: str,
    url: str,
    body_json: dict,
    max_attempts: int = 6,
) -> FederationDelivery:
    """Persist a delivery for later draining.

    Returns the row; the caller can `await db.commit()` themselves
    (we don't commit inside helpers that may be part of a larger txn)."""
    row = FederationDelivery(
        recipient_did=recipient_did,
        url=url,
        body_json=body_json,
        status=FederationDeliveryStatus.PENDING,
        max_attempts=max_attempts,
        next_attempt_at=datetime.now(tz=UTC),
    )
    db.add(row)
    await db.flush()
    return row


async def drain_pending(
    db: AsyncSession,
    *,
    sender_keyid: str,
    sender_private_key: Ed25519PrivateKey,
    batch_size: int = 50,
    now: datetime | None = None,
) -> dict[str, int]:
    """Process up to `batch_size` due pending rows.

    Returns a counts dict — `{"delivered": n, "retried": n, "dead": n}`.
    Idempotent + safe to call concurrently from multiple workers
    (SELECT FOR UPDATE SKIP LOCKED on rows).
    """
    now = now or datetime.now(tz=UTC)
    counts = {"delivered": 0, "retried": 0, "dead": 0}

    stmt = (
        select(FederationDelivery)
        .where(
            FederationDelivery.status == FederationDeliveryStatus.PENDING,
            FederationDelivery.next_attempt_at <= now,
        )
        .order_by(FederationDelivery.next_attempt_at)
        .limit(batch_size)
        .with_for_update(skip_locked=True)
    )
    rows = (await db.execute(stmt)).scalars().all()

    for row in rows:
        result = await deliver(
            url=row.url,
            body_json=row.body_json,
            sender_keyid=sender_keyid,
            sender_private_key=sender_private_key,
        )
        row.attempt_count += 1
        if result.ok:
            row.status = FederationDeliveryStatus.DELIVERED
            row.delivered_at = now
            row.last_error = None
            counts["delivered"] += 1
        elif row.attempt_count >= row.max_attempts:
            row.status = FederationDeliveryStatus.DEAD
            row.last_error = (
                result.error or f"HTTP {result.status}"
            )[:1000]
            counts["dead"] += 1
            _log.warning(
                "federation_delivery DEAD",
                extra={
                    "delivery_id": str(row.id),
                    "recipient": row.recipient_did,
                    "url": row.url,
                    "attempts": row.attempt_count,
                    "last_error": row.last_error,
                },
            )
        else:
            row.next_attempt_at = now + next_attempt_after(row.attempt_count)
            row.last_error = (
                result.error or f"HTTP {result.status}"
            )[:1000]
            counts["retried"] += 1

    await db.commit()
    return counts
