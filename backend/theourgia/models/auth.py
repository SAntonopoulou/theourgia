"""Authentication-adjacent models.

Tables:

- ``backup_code`` — one-time-use TOTP backup codes, one row per code,
  hash-stored, marked used on consumption.
- ``password_reset_token`` — single-use, short-lived tokens for the
  password-reset flow, hash-stored, with explicit expiry.

The bulk of identity data lives in :mod:`theourgia.models.identity`.
This module holds the side tables that exist solely for the auth flow.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["BackupCode", "PasswordResetToken"]


class BackupCode(IDMixin, TimestampMixin, table=True):
    """A TOTP backup code, hash-stored, single-use.

    Codes are generated as a set (typically 10) when the user enrolls
    2FA. The plaintext is shown to the user once at generation and
    never re-displayed. When the user later uses a backup code, the
    corresponding row is marked ``used_at = now()`` and may not be
    used again.
    """

    __tablename__ = "backup_code"
    __table_args__ = (
        Index("ix_backup_code_user_active", "user_id", "used_at"),
    )

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    code_hash: str = Field(
        sa_column=Column(String(64), unique=True, nullable=False),
        description="SHA-256 hex of the normalized backup code (uppercase, no hyphens)",
    )

    used_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="When the code was used; null means still available",
    )


class PasswordResetToken(IDMixin, TimestampMixin, table=True):
    """A single-use password reset token, hash-stored, with explicit expiry.

    The flow:

    1. User requests a password reset.
    2. We generate a fresh opaque token (`secrets.token_urlsafe(32)`),
       store its SHA-256 hex, send the plaintext to the user via email
       in a reset link.
    3. User clicks the link, presents the token.
    4. We hash the presented value and look up the row. If it matches,
       is not expired, and is not used, we accept the new password and
       set ``used_at = now()``.

    Tokens older than the configured TTL (default 30 minutes) are
    rejected and pruned by a background job.
    """

    __tablename__ = "password_reset_token"
    __table_args__ = (
        Index("ix_password_reset_user", "user_id"),
    )

    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    token_hash: str = Field(
        sa_column=Column(String(64), unique=True, nullable=False),
        description="SHA-256 hex of the plaintext token",
    )

    expires_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    used_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # IP address that requested the reset (for audit trail; informational)
    requested_from_ip: Optional[str] = Field(
        default=None,
        sa_column=Column(String(45), nullable=True),
    )
