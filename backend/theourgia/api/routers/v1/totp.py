"""TOTP 2FA endpoints — Phase 15 hardening tail-end.

Complements the WebAuthn passwordless flow with a second-factor
authenticator-app option (FreeOTP, Aegis, Authy, Google Authenticator,
1Password, etc.). Users may enroll TOTP alongside WebAuthn; either
can serve as an independent proof-of-identity.

Flow:

  1. `POST /auth/totp/begin`      → returns secret + otpauth:// URI
                                    (both go into a scannable QR on the
                                    client). Secret is provisional —
                                    stored on the User row but not yet
                                    marked "confirmed" until step 2.
  2. `POST /auth/totp/verify`     → user submits a code from the
                                    authenticator; if valid, TOTP is
                                    marked enrolled and backup codes are
                                    returned (shown once).
  3. `POST /auth/totp/challenge`  → sign-in-time 6-digit verification
                                    (or a backup code). Assumes primary
                                    auth already passed (session cookie
                                    valid); this is the second factor.
  4. `DELETE /auth/totp`          → disable TOTP + revoke backup codes.
  5. `POST /auth/totp/backup-codes` → regenerate the 10 backup codes
                                    (revokes any existing ones).

Rule 48 sibling: the surface speaks of "your authenticator" and shows
account_name + issuer verbatim from the otpauth URI. The raw secret
is only revealed at enrolment; once verified, it is never returned.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.auth.totp import (
    generate_backup_codes,
    generate_secret,
    provisioning_uri,
    verify_backup_code,
    verify_code,
)
from theourgia.core.authz.audit import AuditLogger
from theourgia.models.audit import AuditEventKind, AuditOutcome
from theourgia.models.auth import BackupCode

__all__ = ["router"]

router = APIRouter()


# ── Wire shapes ────────────────────────────────────────────────────


class TotpBeginResponse(BaseModel):
    """Enrolment step 1 — the user scans the QR built from `uri`."""

    model_config = ConfigDict(extra="forbid")

    secret: str
    """Base32 secret. Rendered by the client into the QR alongside `uri`
    so the user can manually enter it if their app doesn't support QR
    scanning."""

    uri: str
    """`otpauth://totp/...` URI — the standard payload for TOTP QRs."""

    account_name: str
    issuer: str


class TotpVerifyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=6, max_length=8)
    """The 6-digit code from the authenticator (whitespace-tolerant)."""


class TotpVerifyResponse(BaseModel):
    """Response on successful enrolment verification.

    `backup_codes` is shown to the user once and must not be logged.
    """

    model_config = ConfigDict(extra="forbid")

    enrolled: bool
    backup_codes: list[str]


class TotpChallengeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=6, max_length=16)
    """Either a 6-digit TOTP code or a `XXXX-XXXX` backup code."""


class TotpChallengeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: bool
    used_backup_code: bool
    remaining_backup_codes: int


class TotpStatusResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enrolled: bool
    remaining_backup_codes: int


class TotpBackupCodesResponse(BaseModel):
    """Regenerated backup codes. Shown once, never returned again."""

    model_config = ConfigDict(extra="forbid")

    backup_codes: list[str]


def _account_name(user_email: str) -> str:
    """Account name displayed by the authenticator app."""
    return user_email


# ── Endpoints ──────────────────────────────────────────────────────


@router.get("/auth/totp/status", response_model=TotpStatusResponse)
async def totp_status(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TotpStatusResponse:
    remaining = (
        await db.execute(
            select(BackupCode).where(
                BackupCode.user_id == user.id,
                BackupCode.used_at.is_(None),
            )
        )
    ).scalars().all()
    return TotpStatusResponse(
        enrolled=bool(user.totp_secret),
        remaining_backup_codes=len(list(remaining)),
    )


@router.post("/auth/totp/begin", response_model=TotpBeginResponse)
async def totp_begin(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TotpBeginResponse:
    """Issue a fresh TOTP secret + provisioning URI.

    The secret is persisted immediately on the user row as a
    *provisional* value. It becomes usable only after `/verify`.
    Re-calling `/begin` before `/verify` rotates the provisional
    secret (previous QR becomes invalid).
    """
    secret = generate_secret()
    user.totp_secret = secret
    await db.commit()
    account_name = _account_name(user.email)
    return TotpBeginResponse(
        secret=secret,
        uri=provisioning_uri(secret, account_name=account_name),
        account_name=account_name,
        issuer="Theourgia",
    )


@router.post("/auth/totp/verify", response_model=TotpVerifyResponse)
async def totp_verify(
    payload: TotpVerifyInput,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TotpVerifyResponse:
    """Confirm enrolment by verifying a code + issue backup codes.

    On success, the previously-provisional TOTP secret is now the
    canonical second-factor secret. 10 backup codes are minted and
    returned once; only their SHA-256 hashes persist.
    """
    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP enrolment has not been started",
        )
    if not verify_code(user.totp_secret, payload.code):
        await AuditLogger(db).log(
            kind=AuditEventKind.SECURITY,
            action="totp.verify",
            outcome=AuditOutcome.FAILURE,
            actor_id=user.id,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid code",
        )

    # Wipe existing backup codes (fresh set per verification).
    existing = (
        await db.execute(
            select(BackupCode).where(BackupCode.user_id == user.id)
        )
    ).scalars().all()
    for row in existing:
        await db.delete(row)

    codes = generate_backup_codes()
    for code in codes:
        db.add(BackupCode(user_id=user.id, code_hash=code.hash))

    await AuditLogger(db).log(
        kind=AuditEventKind.SECURITY,
        action="totp.enrol",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
    )
    await db.commit()
    return TotpVerifyResponse(
        enrolled=True,
        backup_codes=[c.plain for c in codes],
    )


@router.post("/auth/totp/challenge", response_model=TotpChallengeResponse)
async def totp_challenge(
    payload: TotpChallengeInput,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TotpChallengeResponse:
    """Verify a TOTP code OR a backup code at sign-in.

    Assumes primary auth (WebAuthn / password / demo signin) already
    established a session. This endpoint is the second-factor gate.

    Returns `used_backup_code=True` if the caller consumed one of the
    10-per-user backup codes; that row is marked `used_at=now()` and
    cannot be reused.
    """
    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is not enrolled for this account",
        )

    code = payload.code.strip()
    # First try as a TOTP 6-digit code
    if len(code.replace(" ", "")) == 6 and code.replace(" ", "").isdigit():
        if verify_code(user.totp_secret, code):
            await AuditLogger(db).log(
                kind=AuditEventKind.AUTH,
                action="totp.challenge",
                outcome=AuditOutcome.SUCCESS,
                actor_id=user.id,
            )
            remaining = (
                await db.execute(
                    select(BackupCode).where(
                        BackupCode.user_id == user.id,
                        BackupCode.used_at.is_(None),
                    )
                )
            ).scalars().all()
            await db.commit()
            return TotpChallengeResponse(
                ok=True,
                used_backup_code=False,
                remaining_backup_codes=len(list(remaining)),
            )

    # Fall through to backup code
    rows = list(
        (
            await db.execute(
                select(BackupCode).where(
                    BackupCode.user_id == user.id,
                    BackupCode.used_at.is_(None),
                )
            )
        ).scalars().all()
    )
    stored_hashes = [r.code_hash for r in rows]
    matched = verify_backup_code(code, stored_hashes)
    if matched is None:
        await AuditLogger(db).log(
            kind=AuditEventKind.AUTH,
            action="totp.challenge",
            outcome=AuditOutcome.FAILURE,
            actor_id=user.id,
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid code",
        )

    # Mark the used backup-code row and audit
    for r in rows:
        if r.code_hash == matched:
            r.used_at = datetime.now(tz=UTC)
            break
    await AuditLogger(db).log(
        kind=AuditEventKind.AUTH,
        action="totp.challenge.backup_code",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
    )
    await db.commit()
    remaining = [r for r in rows if r.used_at is None and r.code_hash != matched]
    return TotpChallengeResponse(
        ok=True,
        used_backup_code=True,
        remaining_backup_codes=len(remaining),
    )


@router.post(
    "/auth/totp/backup-codes",
    response_model=TotpBackupCodesResponse,
)
async def totp_regenerate_backup_codes(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TotpBackupCodesResponse:
    """Regenerate the 10 backup codes. Revokes any previous set."""
    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is not enrolled",
        )

    existing = (
        await db.execute(
            select(BackupCode).where(BackupCode.user_id == user.id)
        )
    ).scalars().all()
    for row in existing:
        await db.delete(row)

    codes = generate_backup_codes()
    for code in codes:
        db.add(BackupCode(user_id=user.id, code_hash=code.hash))

    await AuditLogger(db).log(
        kind=AuditEventKind.SECURITY,
        action="totp.regenerate_backup_codes",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
    )
    await db.commit()
    return TotpBackupCodesResponse(backup_codes=[c.plain for c in codes])


@router.delete("/auth/totp", status_code=status.HTTP_204_NO_CONTENT)
async def totp_disable(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    """Disable TOTP + delete all backup codes."""
    if not user.totp_secret:
        return None
    user.totp_secret = None
    existing = (
        await db.execute(
            select(BackupCode).where(BackupCode.user_id == user.id)
        )
    ).scalars().all()
    for row in existing:
        await db.delete(row)
    await AuditLogger(db).log(
        kind=AuditEventKind.SECURITY,
        action="totp.disable",
        outcome=AuditOutcome.SUCCESS,
        actor_id=user.id,
    )
    await db.commit()
