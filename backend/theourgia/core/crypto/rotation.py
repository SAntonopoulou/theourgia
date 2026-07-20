"""Mode A vault-key rotation — v1-027 · Phase 15 B5.

The envelope layer (:mod:`theourgia.core.crypto.envelope`) embeds the
wrapping key's UUID in every blob, and ``vault_key`` retains every
historical DEK forever (at most one ``active`` per vault). That makes
the LAZY rotation path the one the model supports:

1. :func:`start_vault_key_rotation` creates a new active DEK and
   demotes the old one. New Mode A writes pick up the active key; every
   old blob stays decryptable via its embedded ``key_id``. Nothing is
   ever unreadable, even if the sweep never runs.

2. :func:`sweep_rotation` (driven by the Celery task in
   :mod:`theourgia.core.tasks.key_rotation`) walks the registered
   envelope-bearing columns in batches and re-encrypts every Mode A
   blob that is under ANY of the vault's retired keys — not just this
   rotation's ``old_key_id`` — so repeated rotations converge and a
   resumed sweep also collects stragglers from earlier failed runs.

CRITICAL invariant — no data loss, ever:

- A blob is only replaced by an in-place column UPDATE inside a batch
  transaction. The old envelope ceases to exist only in the same durable
  commit that writes the new one; a crash between batches rolls the
  partial batch back and leaves every blob decryptable under either the
  old or the new key.
- ``vault_key`` rows are NEVER deleted or overwritten. A retired
  wrapped DEK outlives every blob it protects.
- A master key that cannot unwrap the current DEK fails the rotation
  BEFORE any key or content row changes.

Mode B (zero-knowledge) blobs share the same columns but carry mode
byte 2 — the sweep's SQL predicate and the per-row decode both skip
them untouched. The server could not re-encrypt them anyway.

NOTE for future Mode A writers: today no content writer binds AEAD
associated data. If one lands, extend :class:`SweepTarget` with the AAD
derivation for its column — re-encrypting an AAD-bound blob without the
AAD fails decryption (loudly, which is the safe direction).
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import func, select

from theourgia.core.authz.audit import AuditLogger
from theourgia.core.crypto import envelope, mode_a
from theourgia.core.crypto.keys import (
    DataKey,
    MasterKey,
    generate_data_key,
    unwrap_data_key,
    wrap_data_key,
)
from theourgia.core.crypto.types import DecryptionError, EncryptionMode, InvalidEnvelopeError
from theourgia.core.ids import uuid7
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.crypto import KeyRotation, VaultKey

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "ACTIVE_ROTATION_STATES",
    "RotationInProgressError",
    "SweepTarget",
    "fingerprint_wrapped_key",
    "load_vault_keys",
    "start_vault_key_rotation",
    "sweep_rotation",
    "sweep_targets",
]


class RotationInProgressError(Exception):
    """A rotation is already pending/running for this vault (maps to 409)."""


#: Rotation states that block starting another rotation for the vault.
ACTIVE_ROTATION_STATES: tuple[str, ...] = ("pending", "running")

#: Envelope header prefix for a current-version Mode A blob:
#: version byte + mode byte. Bytes [2:18] are then the wrapping key UUID.
MODE_A_HEADER_PREFIX: bytes = bytes(
    [envelope.CURRENT_VERSION, int(EncryptionMode.MODE_A_SERVER_AT_REST)]
)


@dataclass(frozen=True, slots=True)
class SweepTarget:
    """One (model, column) pair the re-encryption sweep visits."""

    model: type
    column: str


def _default_targets() -> tuple[SweepTarget, ...]:
    """The envelope-bearing content columns.

    Imported lazily (function, not module level) to keep this module
    importable without dragging every content model in at
    ``core.crypto`` import time.
    """
    from theourgia.models.entries import Entry
    from theourgia.models.initiations import Initiation
    from theourgia.models.oaths import Oath
    from theourgia.models.talismans import Talisman

    return (
        SweepTarget(Entry, "encrypted_payload"),
        SweepTarget(Oath, "encrypted_payload"),
        SweepTarget(Initiation, "encrypted_payload"),
        SweepTarget(Talisman, "encrypted_payload"),
    )


@lru_cache(maxsize=1)
def sweep_targets() -> tuple[SweepTarget, ...]:
    """Registered sweep targets (cached)."""
    return _default_targets()


def fingerprint_wrapped_key(wrapped: bytes) -> str:
    """Public fingerprint of a wrapped DEK — SHA-256 hex of the
    ciphertext. Safe to display: the wrapped key is AES-GCM ciphertext
    under the master key, so its hash reveals nothing about the DEK."""
    return hashlib.sha256(wrapped).hexdigest()


async def load_vault_keys(
    session: AsyncSession, vault_id: UUID,
) -> list[VaultKey]:
    """All of a vault's key rows, oldest first. One query so callers
    (and test fakes) split active/retired in Python."""
    stmt = (
        select(VaultKey)
        .where(VaultKey.vault_id == vault_id)
        .order_by(VaultKey.created_at.asc())
    )
    return list((await session.execute(stmt)).scalars().all())


async def get_active_rotation(
    session: AsyncSession, vault_id: UUID,
) -> KeyRotation | None:
    """The vault's pending/running rotation, if any."""
    stmt = (
        select(KeyRotation)
        .where(KeyRotation.vault_id == vault_id)
        .where(KeyRotation.state.in_(ACTIVE_ROTATION_STATES))  # type: ignore[attr-defined]
        .limit(1)
    )
    return (await session.execute(stmt)).scalars().first()


def _new_vault_key(master: MasterKey, vault_id: UUID) -> tuple[VaultKey, DataKey]:
    """Generate + wrap a fresh DEK. The row's PK IS the DataKey id —
    the envelope's ``key_id`` and the unwrap AAD both depend on it."""
    key_id = uuid7()
    data_key = generate_data_key(key_id)
    row = VaultKey(
        id=key_id,
        vault_id=vault_id,
        wrapped_key=wrap_data_key(master, data_key),
        active=True,
    )
    return row, data_key


async def start_vault_key_rotation(
    session: AsyncSession,
    vault_id: UUID,
    *,
    master: MasterKey,
    now: datetime | None = None,
) -> KeyRotation:
    """Begin a rotation: new active DEK, old key demoted, tracking row.

    - Raises :class:`RotationInProgressError` when a rotation is
      already pending/running for the vault (endpoint maps to 409).
    - A vault with no key yet gets its first DEK; the rotation row is
      immediately ``done`` (nothing to re-encrypt).
    - A master key that cannot unwrap the current DEK raises
      :class:`DecryptionError` after persisting (flush) a ``failed``
      rotation row. No key row and no content row is touched — the
      old envelopes are exactly as they were.

    The caller commits (and audits — see the keys router / sweep task).
    """
    now = now or datetime.now(tz=UTC)

    if await get_active_rotation(session, vault_id) is not None:
        msg = "a key rotation is already in progress for this vault"
        raise RotationInProgressError(msg)

    keys = await load_vault_keys(session, vault_id)
    active = next((k for k in keys if k.active), None)

    if active is None:
        # Initial provision — the vault's first DEK. Nothing to sweep.
        new_row, _ = _new_vault_key(master, vault_id)
        rotation = KeyRotation(
            vault_id=vault_id,
            old_key_id=None,
            new_key_id=new_row.id,
            state="done",
            rows_total=0,
            rows_done=0,
            started_at=now,
            finished_at=now,
        )
        session.add(new_row)
        session.add(rotation)
        await session.flush()
        return rotation

    # Fail-fast BEFORE any state changes: prove the configured master
    # key is the one that wrapped the current DEK.
    try:
        unwrap_data_key(master, active.id, active.wrapped_key)
    except DecryptionError:
        rotation = KeyRotation(
            vault_id=vault_id,
            old_key_id=active.id,
            new_key_id=None,
            state="failed",
            started_at=now,
            finished_at=now,
            error="master key cannot unwrap the active vault key",
        )
        session.add(rotation)
        await session.flush()
        raise

    new_row, _ = _new_vault_key(master, vault_id)
    active.active = False
    active.rotated_at = now
    rotation = KeyRotation(
        vault_id=vault_id,
        old_key_id=active.id,
        new_key_id=new_row.id,
        state="pending",
        started_at=None,
        finished_at=None,
    )
    session.add(new_row)
    session.add(rotation)
    await session.flush()
    return rotation


def _retired_predicate(target: SweepTarget, retired_ids: list[UUID]):
    """SQL predicate: column holds a current-version Mode A envelope
    whose embedded key UUID is one of the vault's retired DEKs.

    Postgres ``substr`` over bytea; positions are 1-indexed. The
    per-row decode re-verifies everything before touching a byte."""
    col = getattr(target.model, target.column)
    return (
        col.is_not(None)
        & (func.substr(col, 1, 2) == MODE_A_HEADER_PREFIX)
        & (func.substr(col, 3, 16).in_([k.bytes for k in retired_ids]))
    )


async def _count_remaining(
    session: AsyncSession,
    targets: tuple[SweepTarget, ...],
    retired_ids: list[UUID],
) -> int:
    total = 0
    for target in targets:
        stmt = (
            select(func.count())
            .select_from(target.model)
            .where(_retired_predicate(target, retired_ids))
        )
        total += int((await session.execute(stmt)).scalar_one())
    return total


async def _mark_failed(
    session: AsyncSession,
    rotation: KeyRotation,
    *,
    error: str,
    now: datetime,
) -> None:
    """Record failure + audit, then commit. Content rows in the
    current (uncommitted) batch roll back server-side; every envelope
    remains decryptable — old keys are never deleted."""
    await session.rollback()
    rotation.state = "failed"
    rotation.error = error
    rotation.finished_at = now
    await AuditLogger(session).log(
        kind=AuditEventKind.SECURITY,
        action="key.rotation.failed",
        outcome=AuditOutcome.FAILURE,
        vault_id=rotation.vault_id,
        detail={
            "rotation_id": str(rotation.id),
            "old_key_id": str(rotation.old_key_id) if rotation.old_key_id else None,
            "new_key_id": str(rotation.new_key_id) if rotation.new_key_id else None,
            "rows_done": rotation.rows_done,
            "rows_total": rotation.rows_total,
            "error": error,
        },
    )
    await session.commit()


async def sweep_rotation(
    session: AsyncSession,
    rotation: KeyRotation,
    *,
    master: MasterKey,
    batch_size: int = 200,
    targets: tuple[SweepTarget, ...] | None = None,
    now: datetime | None = None,
) -> KeyRotation:
    """Batched, resumable re-encryption sweep for one rotation.

    Re-encrypts every Mode A envelope under ANY retired key of the
    vault to the current active key, ``batch_size`` rows per committed
    transaction. Progress is self-tracking: a re-encrypted row stops
    matching the predicate, so resuming (after a crash, a failure, or
    a worker restart) simply continues with whatever still matches.

    Commits per batch. On failure the rotation row is marked
    ``failed`` (with an operator-safe error), audited, committed, and
    the exception re-raised for the worker log.
    """
    now = now or datetime.now(tz=UTC)
    if rotation.state == "done":
        return rotation
    targets = targets if targets is not None else sweep_targets()

    keys = await load_vault_keys(session, rotation.vault_id)
    new_row = next((k for k in keys if k.id == rotation.new_key_id), None)
    if new_row is None:
        await _mark_failed(
            session, rotation, error="rotation has no new key row", now=now,
        )
        msg = "rotation has no new key row"
        raise DecryptionError(msg)

    try:
        new_key = unwrap_data_key(master, new_row.id, new_row.wrapped_key)
    except DecryptionError:
        await _mark_failed(
            session,
            rotation,
            error="master key cannot unwrap the new vault key",
            now=now,
        )
        raise

    retired = [k for k in keys if k.id != new_row.id]
    retired_ids = [k.id for k in retired]
    retired_by_id = {k.id: k for k in retired}
    unwrapped: dict[UUID, DataKey] = {}

    if not retired_ids:
        rotation.state = "done"
        rotation.started_at = rotation.started_at or now
        rotation.finished_at = now
        await _audit_finished(session, rotation)
        await session.commit()
        return rotation

    remaining = await _count_remaining(session, targets, retired_ids)
    rotation.rows_total = rotation.rows_done + remaining
    rotation.state = "running"
    rotation.started_at = rotation.started_at or now
    await session.commit()

    # rows_done as durably committed — restored on failure so a rolled-
    # back batch never inflates the persisted progress counter.
    committed_done = rotation.rows_done
    try:
        for target in targets:
            col_name = target.column
            while True:
                stmt = (
                    select(target.model)
                    .where(_retired_predicate(target, retired_ids))
                    .limit(batch_size)
                )
                rows = list((await session.execute(stmt)).scalars().all())
                if not rows:
                    break
                batch_done = 0
                for row in rows:
                    blob = getattr(row, col_name)
                    try:
                        env = envelope.decode(blob)
                    except InvalidEnvelopeError:
                        # Not one of ours — never touch it. (The SQL
                        # predicate makes this unreachable in practice.)
                        continue
                    if env.mode != EncryptionMode.MODE_A_SERVER_AT_REST:
                        continue
                    if env.key_id not in retired_by_id:
                        continue
                    old_key = unwrapped.get(env.key_id)
                    if old_key is None:
                        old_key = unwrap_data_key(
                            master,
                            env.key_id,
                            retired_by_id[env.key_id].wrapped_key,
                        )
                        unwrapped[env.key_id] = old_key
                    plaintext = mode_a.decrypt(blob, old_key)
                    # In-place swap: the old envelope is replaced only
                    # inside this batch's transaction — the new blob is
                    # durable in the same commit that removes the old.
                    setattr(row, col_name, mode_a.encrypt(plaintext, new_key))
                    batch_done += 1
                if batch_done == 0:
                    # Every selected row was skip-only (predicate and
                    # decode disagree — cannot happen with a healthy
                    # DB). Break rather than reselect the same rows.
                    break
                rotation.rows_done = committed_done + batch_done
                await session.commit()
                committed_done = rotation.rows_done
    except DecryptionError as exc:
        rotation.rows_done = committed_done
        await _mark_failed(session, rotation, error=str(exc), now=now)
        raise

    rotation.state = "done"
    rotation.finished_at = now
    await _audit_finished(session, rotation)
    await session.commit()
    return rotation


async def _audit_finished(session: AsyncSession, rotation: KeyRotation) -> None:
    await AuditLogger(session).log(
        kind=AuditEventKind.SECURITY,
        action="key.rotation.finished",
        outcome=AuditOutcome.SUCCESS,
        vault_id=rotation.vault_id,
        detail={
            "rotation_id": str(rotation.id),
            "old_key_id": str(rotation.old_key_id) if rotation.old_key_id else None,
            "new_key_id": str(rotation.new_key_id) if rotation.new_key_id else None,
            "rows_total": rotation.rows_total,
            "rows_done": rotation.rows_done,
        },
    )
