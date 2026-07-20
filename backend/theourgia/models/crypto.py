"""ORM models for cryptographic key material storage.

Three tables:

- ``vault_key`` — per-vault data keys (DEKs) for Mode A, in wrapped form.
  At most one row per vault is ``active = true``; rotation creates a new
  active row and demotes the prior key (kept for decrypting older blobs
  until they have been re-encrypted with the new key).

- ``key_rotation`` — one row per Mode A rotation run (v1-027 · Phase 15
  B5). Tracks which key replaced which, plus the batched re-encryption
  sweep's progress so a rotation is resumable and auditable. States are
  plain strings (pending / running / done / failed) — no enums.

- ``sealed_kdf_params`` — Argon2id parameters per sealed scope (typically
  per-user). The browser uses these together with the user's passphrase
  to derive the Mode B encryption key.

None of these tables hold plaintext key material; the wrapped DEK in
``vault_key`` is encrypted by the server master key, and the KDF params
in ``sealed_kdf_params`` are inputs to a passphrase-only derivation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    UniqueConstraint,
    func,
)
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["VaultKey", "KeyRotation", "SealedKdfParams"]


class VaultKey(IDMixin, TimestampMixin, table=True):
    """A per-vault Mode A data key (DEK), in master-key-wrapped form.

    Lifecycle:
      - Created when a vault is first provisioned (``active = True``).
      - Rotated by creating a new row with ``active = True`` and setting
        ``active = False`` on the prior key. The prior key is retained
        because some ciphertext in the vault is still encrypted under it;
        a background re-encryption job migrates content to the active
        key over time.
      - Never deleted — historical keys must remain to decrypt old data.
    """

    __tablename__ = "vault_key"
    __table_args__ = (
        Index("ix_vault_key_vault_active", "vault_id", "active"),
    )

    vault_id: UUID = Field(
        sa_column=Column(ForeignKey("vault.id", ondelete="RESTRICT"), nullable=False, index=True),
    )

    # The 32-byte Mode A DEK encrypted under the master key (AES-256-GCM).
    # Length includes the 16-byte AEAD tag. See core/crypto/keys.py.
    wrapped_key: bytes = Field(
        sa_column=Column(LargeBinary, nullable=False),
        description="Master-key-wrapped 32-byte data key (ciphertext + 16-byte tag)",
    )

    # True for at most one row per vault — the current active DEK.
    active: bool = Field(
        sa_column=Column(Boolean, nullable=False, server_default="true"),
    )

    # Rotation tracking
    rotated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="When this key was rotated out of active status",
    )


class KeyRotation(IDMixin, TimestampMixin, table=True):
    """One Mode A vault-key rotation run (v1-027 · Phase 15 B5).

    Lifecycle:
      - ``pending`` — the new active key exists; the re-encryption sweep
        has not started yet.
      - ``running`` — the Celery sweep is re-encrypting envelopes in
        batches. ``rows_done`` advances per committed batch.
      - ``done`` — every Mode A envelope in the vault is under the new
        key. The retired ``vault_key`` row is kept forever regardless.
      - ``failed`` — the sweep stopped (e.g. the master key could not
        unwrap a data key). Old envelopes are intact and decryptable;
        the sweep may be resumed, or a later rotation's sweep picks the
        stragglers up (the sweep migrates ALL retired-key envelopes,
        not just this rotation's ``old_key_id``).

    Never carries key material — only key row IDs and counters.
    """

    __tablename__ = "key_rotation"
    __table_args__ = (
        Index("ix_key_rotation_vault_state", "vault_id", "state"),
    )

    vault_id: UUID = Field(
        sa_column=Column(ForeignKey("vault.id", ondelete="RESTRICT"), nullable=False, index=True),
    )

    # The demoted key (NULL for the initial-provision "rotation" that
    # creates a vault's first data key) and its replacement.
    old_key_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(ForeignKey("vault_key.id", ondelete="RESTRICT"), nullable=True),
    )
    new_key_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(ForeignKey("vault_key.id", ondelete="RESTRICT"), nullable=True),
        description="NULL only when rotation failed before a new key was created",
    )

    # pending / running / done / failed — plain string, no enum.
    state: str = Field(
        default="pending",
        sa_column=Column(String(16), nullable=False, server_default="pending"),
    )

    # Sweep progress. rows_total is recomputed as rows_done + remaining
    # whenever the sweep (re)starts, so the arithmetic survives resumes.
    rows_total: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
    )
    rows_done: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
    )

    started_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    finished_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Failure detail (safe operator-facing message; never key material).
    error: Optional[str] = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )


class SealedKdfParams(IDMixin, TimestampMixin, table=True):
    """Argon2id parameters for deriving a Mode B encryption key.

    One row per user (initially); per-content-type or per-vault scoping
    can be added later if needed. The salt and Argon2id parameters travel
    with each Mode B ciphertext via the envelope ``key_id``.

    The user's passphrase is never stored. The browser uses these
    parameters + the typed passphrase to derive the 32-byte key, then
    encrypts/decrypts client-side.
    """

    __tablename__ = "sealed_kdf_params"
    __table_args__ = (
        UniqueConstraint("user_id", "scope", name="uq_sealed_kdf_user_scope"),
    )

    user_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True),
    )

    # Free-form scope identifier; for v1 we use "personal" for the user's
    # default sealed scope. Future scopes (per-vault, per-tradition, etc.)
    # land here without schema change.
    scope: str = Field(
        sa_column=Column(
            "scope",
            # Use plain VARCHAR; CITEXT not needed since scopes are
            # programmatic identifiers, not user input.
            __import__("sqlalchemy").String(64),
            nullable=False,
            server_default="personal",
        ),
        default="personal",
    )

    # 16-byte Argon2id salt
    salt: bytes = Field(sa_column=Column(LargeBinary, nullable=False))

    # Argon2id parameters
    time_cost: int = Field(
        sa_column=Column(Integer, nullable=False, server_default="3"),
    )
    memory_cost_kib: int = Field(
        sa_column=Column(Integer, nullable=False, server_default="65536"),
        description="Argon2id memory cost in KiB (default: 64 MiB)",
    )
    parallelism: int = Field(
        sa_column=Column(Integer, nullable=False, server_default="4"),
    )

    # Output length of the derived key in bytes (always 32 currently;
    # field exists for forward compatibility).
    key_length: int = Field(
        sa_column=Column(Integer, nullable=False, server_default="32"),
    )

    # Recovery passphrase fingerprint (optional): if the user opted into
    # the recovery flow, a one-way fingerprint of the passphrase is
    # stored here so the recovery UI can warn "no, that's not your
    # recovery passphrase" without exposing what it should be. Plain
    # SHA-256 of the recovery passphrase; never enough to brute-force
    # under reasonable assumptions because the recovery passphrase is
    # long.
    recovery_fingerprint: Optional[bytes] = Field(
        default=None,
        sa_column=Column(LargeBinary, nullable=True),
    )
