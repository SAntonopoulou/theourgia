"""Postgres-backed replay-nonce store — Phase 12.5.

The HTTP-signature verifier and the capability-token verifier both
need a place to record nonces they have observed. This module wraps
the ``federation_nonce`` table and exposes a small surface:

  - :func:`record_nonce` — try to record a nonce; raise
    :class:`ReplayDetectedError` if it was already accepted within
    the configured window.
  - :func:`purge_expired` — delete rows whose ``expires_at`` is in the
    past. A periodic job calls this.

The verifier is responsible for constructing a stable nonce key. For
HTTP signatures the key is ``"<keyid>:<created>:<nonce>"`` (the
``nonce`` parameter is the new RFC 9421 ``nonce`` from
Signature-Input; if absent, ``<created>`` alone is the unique
identifier — collision-safe at second granularity for one peer).

For capability tokens the key is ``"<iss>:<jti>"`` — the JWT's issuer
plus its random identifier.
"""

from __future__ import annotations

from datetime import datetime, timedelta, UTC
from typing import Final

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.federation_nonce import FederationNonce

__all__ = [
    "DEFAULT_REPLAY_WINDOW",
    "ReplayDetectedError",
    "record_nonce",
    "purge_expired",
]


DEFAULT_REPLAY_WINDOW: Final[timedelta] = timedelta(minutes=5)


class ReplayDetectedError(Exception):
    """The nonce key has already been accepted within the replay window."""

    def __init__(self, nonce_key: str) -> None:
        super().__init__(f"replay detected for nonce key {nonce_key!r}")
        self.nonce_key = nonce_key


async def record_nonce(
    db: AsyncSession,
    *,
    nonce_key: str,
    now: datetime | None = None,
    window: timedelta = DEFAULT_REPLAY_WINDOW,
) -> None:
    """Record ``nonce_key`` as observed.

    Raises :class:`ReplayDetectedError` if the unique constraint is
    violated — the verifier MUST translate this into a federation-
    transport rejection (HTTP 401 or domain-specific error).
    """
    if now is None:
        now = datetime.now(tz=UTC)
    row = FederationNonce(
        nonce_key=nonce_key,
        observed_at=now,
        expires_at=now + window,
    )
    db.add(row)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise ReplayDetectedError(nonce_key) from exc


async def purge_expired(
    db: AsyncSession, *, now: datetime | None = None,
) -> int:
    """Delete rows whose ``expires_at`` is in the past. Returns the
    number of rows deleted."""
    if now is None:
        now = datetime.now(tz=UTC)
    stmt = delete(FederationNonce).where(
        FederationNonce.expires_at < now,
    )
    result = await db.execute(stmt)
    await db.commit()
    return int(result.rowcount or 0)


async def count_active(db: AsyncSession) -> int:
    """How many nonces are currently in the unexpired window. For
    metrics + smoke tests."""
    now = datetime.now(tz=UTC)
    stmt = select(FederationNonce).where(
        FederationNonce.expires_at >= now,
    )
    rows = (await db.execute(stmt)).scalars().all()
    return len(rows)
