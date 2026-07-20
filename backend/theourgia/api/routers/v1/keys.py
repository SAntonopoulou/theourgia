"""Mode A vault-key endpoints — v1-027 · Phase 15 B5.

Backs the /settings/keys surface (H10 Cluster B5 KeyRotationSurface):

- ``POST /api/v1/keys/rotate``          — start a rotation (202; 409 if
  one is already pending/running for the vault)
- ``GET  /api/v1/keys/rotation-status`` — current active key + latest
  rotation row (sweep progress)
- ``GET  /api/v1/keys/history``         — past rotations, newest first,
  with the retired key's fingerprint

All three require the ``key.rotate`` scope via the authorize substrate
(:func:`require_scope`); the scope is per-self (defaults.py) and the
vault is resolved by ownership, so a caller can only ever act on their
own vault.

Key material never crosses this surface. The only key-derived value
exposed is the SHA-256 fingerprint of the *wrapped* DEK — ciphertext
under the master key — which identifies a key without revealing it.

Rotation mechanics (lazy path + batched sweep) live in
:mod:`theourgia.core.crypto.rotation`; the sweep runs on Celery
(:mod:`theourgia.core.tasks.key_rotation`). Audit: start is recorded
here (kind=SECURITY, ``key.rotation.started``); finish/failure are
recorded by the sweep.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import get_db_session, require_scope
from theourgia.core.authz.audit import AuditLogger
from theourgia.core.authz.scopes import Scope
from theourgia.core.crypto.keys import MasterKey
from theourgia.core.crypto.rotation import (
    RotationInProgressError,
    fingerprint_wrapped_key,
    start_vault_key_rotation,
)
from theourgia.core.crypto.types import DecryptionError
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.crypto import KeyRotation, VaultKey
from theourgia.models.identity import User, Vault

__all__ = ["router"]

router = APIRouter()

RequireKeyRotate = Annotated[User, Depends(require_scope(Scope.KEY_ROTATE))]
DBSession = Annotated[AsyncSession, Depends(get_db_session)]


# ── Schemas ────────────────────────────────────────────────────────


class CurrentKeyRead(BaseModel):
    """The vault's active DEK — identifiers only, never material."""

    model_config = ConfigDict(extra="forbid")

    key_id: str
    fingerprint_sha256: str
    created_at: datetime


class RotationRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    state: str  # pending / running / done / failed
    rows_total: int
    rows_done: int
    started_at: datetime | None
    finished_at: datetime | None
    error: str | None


class RotationStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_key: CurrentKeyRead | None
    rotation: RotationRead | None


class KeyHistoryItem(BaseModel):
    """One past rotation, with the retired key's public fingerprint."""

    model_config = ConfigDict(extra="forbid")

    rotation_id: str
    state: str
    retired_key_fingerprint_sha256: str | None
    retired_at: datetime | None
    rows_total: int
    rows_done: int


class KeyHistoryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[KeyHistoryItem]


# ── Helpers ────────────────────────────────────────────────────────


async def _resolve_user_vault(db: AsyncSession, user_id: UUID) -> Vault:
    """The user's vault — first owned, per the house v1 convention
    (mirrors plugins.py). Multi-vault selection arrives as a query
    param when a surface needs it."""
    vault = (
        await db.execute(
            select(Vault).where(Vault.owner_id == user_id)
            .order_by(Vault.created_at.asc())
            .limit(1)
        )
    ).scalars().first()
    if vault is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You do not own any vault.",
        )
    return vault


def _load_master_key() -> MasterKey:
    """The configured master key; 503 when the instance has none set
    (test/dev environments without THEOURGIA_MASTER_ENCRYPTION_KEY)."""
    from theourgia.core.config import get_settings

    secret = get_settings().master_encryption_key.get_secret_value()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Master encryption key is not configured on this instance.",
        )
    return MasterKey.from_secret(secret)


def _rotation_read(rotation: KeyRotation) -> RotationRead:
    return RotationRead(
        id=str(rotation.id),
        state=rotation.state,
        rows_total=rotation.rows_total,
        rows_done=rotation.rows_done,
        started_at=rotation.started_at,
        finished_at=rotation.finished_at,
        error=rotation.error,
    )


async def _vault_keys(db: AsyncSession, vault_id: UUID) -> list[VaultKey]:
    stmt = (
        select(VaultKey)
        .where(VaultKey.vault_id == vault_id)
        .order_by(VaultKey.created_at.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def _latest_rotation(db: AsyncSession, vault_id: UUID) -> KeyRotation | None:
    stmt = (
        select(KeyRotation)
        .where(KeyRotation.vault_id == vault_id)
        .order_by(KeyRotation.created_at.desc())
        .limit(1)
    )
    return (await db.execute(stmt)).scalars().first()


# ── Endpoints ──────────────────────────────────────────────────────


@router.post(
    "/keys/rotate",
    response_model=RotationStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start a Mode A vault-key rotation",
)
async def start_rotation(
    current_user: RequireKeyRotate,
    db: DBSession,
) -> RotationStatusResponse:
    """Rotate the caller's vault data key.

    Creates the new active DEK immediately (new writes use it from the
    next request on) and queues the batched re-encryption sweep. 409
    when a rotation is already pending/running. A vault with no key
    yet gets its first DEK and the rotation completes inline.
    """
    vault = await _resolve_user_vault(db, current_user.id)
    master = _load_master_key()

    try:
        rotation = await start_vault_key_rotation(db, vault.id, master=master)
    except RotationInProgressError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc),
        ) from exc
    except DecryptionError as exc:
        # start_vault_key_rotation flushed a `failed` rotation row;
        # persist it + the audit trail, then refuse.
        await AuditLogger(db).log(
            kind=AuditEventKind.SECURITY,
            action="key.rotation.failed",
            outcome=AuditOutcome.FAILURE,
            actor_id=current_user.id,
            vault_id=vault.id,
            detail={"error": "master key cannot unwrap the active vault key"},
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "The configured master key cannot unwrap the active vault "
                "key. No data was changed; see the audit log."
            ),
        ) from exc

    await AuditLogger(db).log(
        kind=AuditEventKind.SECURITY,
        action="key.rotation.started",
        outcome=AuditOutcome.SUCCESS,
        actor_id=current_user.id,
        vault_id=vault.id,
        detail={
            "rotation_id": str(rotation.id),
            "old_key_id": str(rotation.old_key_id) if rotation.old_key_id else None,
            "new_key_id": str(rotation.new_key_id) if rotation.new_key_id else None,
            "initial_provision": rotation.old_key_id is None,
        },
    )
    await db.commit()

    if rotation.state == "pending":
        # Sweep on the worker. Imported here so tests can monkeypatch
        # the module attribute without a broker in the loop.
        from theourgia.core.tasks.key_rotation import run_key_rotation_sweep

        run_key_rotation_sweep.delay(str(rotation.id))

    keys = await _vault_keys(db, vault.id)
    active = next((k for k in keys if k.active), None)
    return RotationStatusResponse(
        current_key=(
            CurrentKeyRead(
                key_id=str(active.id),
                fingerprint_sha256=fingerprint_wrapped_key(active.wrapped_key),
                created_at=active.created_at,
            )
            if active is not None
            else None
        ),
        rotation=_rotation_read(rotation),
    )


@router.get(
    "/keys/rotation-status",
    response_model=RotationStatusResponse,
    summary="Current active key + latest rotation",
)
async def rotation_status(
    current_user: RequireKeyRotate,
    db: DBSession,
) -> RotationStatusResponse:
    vault = await _resolve_user_vault(db, current_user.id)
    keys = await _vault_keys(db, vault.id)
    active = next((k for k in keys if k.active), None)
    rotation = await _latest_rotation(db, vault.id)
    return RotationStatusResponse(
        current_key=(
            CurrentKeyRead(
                key_id=str(active.id),
                fingerprint_sha256=fingerprint_wrapped_key(active.wrapped_key),
                created_at=active.created_at,
            )
            if active is not None
            else None
        ),
        rotation=_rotation_read(rotation) if rotation is not None else None,
    )


@router.get(
    "/keys/history",
    response_model=KeyHistoryResponse,
    summary="Past rotations with retired-key fingerprints",
)
async def key_history(
    current_user: RequireKeyRotate,
    db: DBSession,
) -> KeyHistoryResponse:
    """Rotation history from the ``key_rotation`` table, newest first.

    Initial-provision runs (no retired key) are included with a null
    fingerprint; the frontend shows only retired keys in the trusted
    history list."""
    vault = await _resolve_user_vault(db, current_user.id)
    keys = await _vault_keys(db, vault.id)
    by_id = {k.id: k for k in keys}

    stmt = (
        select(KeyRotation)
        .where(KeyRotation.vault_id == vault.id)
        .order_by(KeyRotation.created_at.desc())
    )
    rotations = list((await db.execute(stmt)).scalars().all())

    items: list[KeyHistoryItem] = []
    for rotation in rotations:
        old = by_id.get(rotation.old_key_id) if rotation.old_key_id else None
        items.append(
            KeyHistoryItem(
                rotation_id=str(rotation.id),
                state=rotation.state,
                retired_key_fingerprint_sha256=(
                    fingerprint_wrapped_key(old.wrapped_key)
                    if old is not None
                    else None
                ),
                retired_at=(old.rotated_at if old is not None else None),
                rows_total=rotation.rows_total,
                rows_done=rotation.rows_done,
            )
        )
    return KeyHistoryResponse(items=items)
