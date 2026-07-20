"""Memorial mode / digital inheritance endpoints — b108-2hg + v1-018.

FEATURES §18 · Digital inheritance / memorial mode. b108-2hg shipped
the per-user config, the manual check-in mechanic, and manual
memorial-mode trigger + reactivate. v1-018 added the executor
key-share (Shamir over GF(256) — see
docs/architecture/memorial-key-share-threat-model.md).

Endpoints (all authenticated, owner-scoped):

- GET   /api/v1/memorial/config           — read config (creates default if missing)
- PATCH /api/v1/memorial/config           — update settings
- POST  /api/v1/memorial/check-in         — record a check-in (bumps last_check_in_at)
- POST  /api/v1/memorial/trigger          — enter memorial mode (destructive)
- POST  /api/v1/memorial/reactivate       — bring vault back from memorial mode
- POST  /api/v1/memorial/key-share        — split a client-supplied secret; shares returned ONCE
- POST  /api/v1/memorial/key-share/verify — check a reconstruction against the commitment

The state (active / warning / memorial_pending / memorialized) is
computed on read from the timestamps so it's always consistent — the
computation lives in :mod:`theourgia.core.memorial`, shared with the
hourly Celery sweep (:mod:`theourgia.core.tasks.memorial`) that fires
the automatic trigger and the check-in reminder.

SECURITY NOTE: the key-share endpoints handle the split secret in
memory only. Nothing in this module may log request payloads — the
test suite asserts no secret material reaches the log stream.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.crypto import shamir
from theourgia.core.memorial import (
    MemorialState,
    compute_state,
    days_until_pending,
    days_until_warning,
)
from theourgia.models.memorial import MemorialConfig

__all__ = ["router"]

router = APIRouter()


class KeyShareInfo(BaseModel):
    """Public summary of the stored key-share commitment — parameters
    only, never share material."""

    model_config = ConfigDict(extra="forbid")

    n: int
    k: int
    created_at: datetime


class MemorialConfigRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    owner_id: str
    check_in_cadence_days: int
    warning_window_days: int
    last_check_in_at: datetime | None
    executor_name: str | None
    executor_email: str | None
    memorial_message: str | None
    posthumous_publications_enabled: bool
    memorialized_at: datetime | None
    # v1-018 — notification markers + key-share summary.
    warning_notified_at: datetime | None = None
    executor_notified_at: datetime | None = None
    key_share: KeyShareInfo | None = None
    # Computed
    state: MemorialState
    days_until_warning: int | None
    days_until_pending: int | None


class MemorialConfigUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    check_in_cadence_days: int | None = Field(default=None, ge=0, le=3650)
    warning_window_days: int | None = Field(default=None, ge=0, le=3650)
    executor_name: str | None = Field(default=None, max_length=240)
    executor_email: EmailStr | None = None
    memorial_message: str | None = None
    posthumous_publications_enabled: bool | None = None


# v1-018 — the state computation moved to theourgia.core.memorial so
# the hourly sweep shares one definition with this surface. The
# underscore aliases keep this module's public shape (and its tests)
# stable.
_compute_state = compute_state
_days_until_warning = days_until_warning
_days_until_pending = days_until_pending


def _key_share_info(row: MemorialConfig) -> KeyShareInfo | None:
    envelope = row.key_share_envelope
    if not envelope:
        return None
    return KeyShareInfo(
        n=int(envelope["n"]),
        k=int(envelope["k"]),
        created_at=datetime.fromisoformat(str(envelope["created_at"])),
    )


def _to_read(row: MemorialConfig) -> MemorialConfigRead:
    return MemorialConfigRead(
        id=str(row.id),
        owner_id=str(row.owner_id),
        check_in_cadence_days=row.check_in_cadence_days,
        warning_window_days=row.warning_window_days,
        last_check_in_at=row.last_check_in_at,
        executor_name=row.executor_name,
        executor_email=row.executor_email,
        memorial_message=row.memorial_message,
        posthumous_publications_enabled=row.posthumous_publications_enabled,
        memorialized_at=row.memorialized_at,
        warning_notified_at=row.warning_notified_at,
        executor_notified_at=row.executor_notified_at,
        key_share=_key_share_info(row),
        state=_compute_state(row),
        days_until_warning=_days_until_warning(row),
        days_until_pending=_days_until_pending(row),
    )


async def _get_or_create_config(
    db: AsyncSession, owner_id: UUID,
) -> MemorialConfig:
    stmt = select(MemorialConfig).where(MemorialConfig.owner_id == owner_id)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        row = MemorialConfig(owner_id=owner_id)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


@router.get(
    "/memorial/config",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def get_config(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    row = await _get_or_create_config(db, current_user.id)
    return _to_read(row)


@router.patch(
    "/memorial/config",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def update_config(
    payload: MemorialConfigUpdate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    row = await _get_or_create_config(db, current_user.id)
    if row.memorialized_at is not None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "The vault is in memorial mode; settings cannot be changed. "
            "Reactivate the vault first.",
        )
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/memorial/check-in",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def check_in(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    """Record a check-in. Bumps ``last_check_in_at`` to now.

    Even a memorialized vault accepts check-ins; if the operator
    signs in from beyond the veil, they may want to reactivate.

    v1-018: also clears ``warning_notified_at`` — a check-in starts a
    fresh cadence cycle, so a future lapse gets its reminder again.
    """
    row = await _get_or_create_config(db, current_user.id)
    row.last_check_in_at = datetime.now(tz=timezone.utc)
    row.warning_notified_at = None
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/memorial/trigger",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def trigger_memorial(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    """Enter memorial mode manually. Destructive: private writes are
    frozen; the vault becomes a read-only in-memoriam surface until
    a subsequent /reactivate call.
    """
    row = await _get_or_create_config(db, current_user.id)
    if row.memorialized_at is not None:
        return _to_read(row)  # idempotent
    row.memorialized_at = datetime.now(tz=timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.post(
    "/memorial/reactivate",
    response_model=MemorialConfigRead,
    tags=["memorial"],
)
async def reactivate(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MemorialConfigRead:
    """Bring a memorialized vault back. Bumps last_check_in_at too so
    the state immediately returns to `active`.

    v1-018: clears both notification markers so a future lapse cycle
    dispatches the reminder and the executor notice afresh."""
    row = await _get_or_create_config(db, current_user.id)
    row.memorialized_at = None
    row.last_check_in_at = datetime.now(tz=timezone.utc)
    row.warning_notified_at = None
    row.executor_notified_at = None
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


# ── v1-018: executor key-share (Shamir over GF(256)) ──────────────
#
# Design decision (see the threat-model doc): the CLIENT supplies the
# secret (e.g. its Mode B vault key material); the SERVER splits it,
# returns the shares exactly once (like backup codes), and stores only
# a SHA-256 commitment + the parameters. The server never persists the
# secret or any share, and never logs the request payload. Recovery is
# the inverse: the executor(s) combine their shares client-side and
# /verify checks the reconstruction against the commitment without
# storing it. A fully server-blind ceremony (client-side splitting) is
# noted in the threat model as the v1.1 upgrade.

_MAX_KEY_SHARE_SECRET_BYTES = 1024


class KeyShareCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    secret_b64: str = Field(min_length=1)
    shares: int = Field(ge=2, le=16, description="n — how many shares to issue.")
    threshold: int = Field(
        ge=2, le=16, description="k — how many shares reconstruct the secret.",
    )


class KeyShareCreateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shares_b64: list[str]
    n: int
    k: int
    created_at: datetime


class KeyShareVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    secret_b64: str = Field(min_length=1)


class KeyShareVerifyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verified: bool


def _decode_secret(secret_b64: str) -> bytes:
    try:
        secret = base64.b64decode(secret_b64, validate=True)
    except Exception:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "secret_b64 is not valid base64.",
        ) from None
    if not secret:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "The secret must not be empty.",
        )
    if len(secret) > _MAX_KEY_SHARE_SECRET_BYTES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"The secret must be at most {_MAX_KEY_SHARE_SECRET_BYTES} bytes.",
        )
    return secret


def _commitment(secret: bytes) -> str:
    return "sha256:" + hashlib.sha256(secret).hexdigest()


@router.post(
    "/memorial/key-share",
    response_model=KeyShareCreateResponse,
    tags=["memorial"],
)
async def create_key_share(
    payload: KeyShareCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> KeyShareCreateResponse:
    """Split a client-supplied secret into executor shares.

    The shares are returned ONCE and never stored; hand them to the
    executor(s) out-of-band. Only a SHA-256 commitment + parameters
    persist. Calling again replaces the commitment — previously
    distributed shares stop verifying.
    """
    if payload.threshold > payload.shares:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "threshold cannot exceed the number of shares.",
        )
    row = await _get_or_create_config(db, current_user.id)
    if row.memorialized_at is not None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "The vault is in memorial mode; the key-share cannot be "
            "changed. Reactivate the vault first.",
        )
    secret = _decode_secret(payload.secret_b64)
    shares = shamir.split(secret, payload.shares, payload.threshold)
    created_at = datetime.now(tz=timezone.utc)
    row.key_share_envelope = {
        "v": 1,
        "algo": "shamir-gf256",
        "n": payload.shares,
        "k": payload.threshold,
        "commitment": _commitment(secret),
        "created_at": created_at.isoformat(),
    }
    flag_modified(row, "key_share_envelope")
    await db.commit()
    return KeyShareCreateResponse(
        shares_b64=[base64.b64encode(s).decode("ascii") for s in shares],
        n=payload.shares,
        k=payload.threshold,
        created_at=created_at,
    )


@router.post(
    "/memorial/key-share/verify",
    response_model=KeyShareVerifyResponse,
    tags=["memorial"],
)
async def verify_key_share(
    payload: KeyShareVerifyRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> KeyShareVerifyResponse:
    """Check a client-side reconstruction against the commitment.

    Stores nothing; the candidate secret exists only for the duration
    of the request. Combining fewer than k shares yields a value that
    fails here — the commitment is the only integrity signal (Shamir
    reconstruction itself cannot detect wrong shares).
    """
    row = await _get_or_create_config(db, current_user.id)
    envelope = row.key_share_envelope
    if not envelope:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No key-share has been generated for this vault.",
        )
    candidate = _decode_secret(payload.secret_b64)
    expected = str(envelope.get("commitment", ""))
    verified = hmac.compare_digest(_commitment(candidate), expected)
    return KeyShareVerifyResponse(verified=verified)
