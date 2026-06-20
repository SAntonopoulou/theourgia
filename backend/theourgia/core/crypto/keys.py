"""Server-side key management for Mode A.

Two-tier key hierarchy:

- **Master key** (the KEK — Key Encryption Key): a 32-byte secret
  derived from ``THEOURGIA_MASTER_ENCRYPTION_KEY``. Loaded once at
  process start. Used only to wrap/unwrap per-vault data keys; never
  touches user content directly.

- **Per-vault data keys** (DEKs — Data Encryption Keys): random 32-byte
  keys generated when a vault is created and persisted to the
  ``vault_key`` table in wrapped form. Each vault has at least one
  current data key; rotation generates a new active key and re-wraps the
  ciphertext on read (or via a background re-encryption job).

Wrapping uses AES-256-GCM with a deterministic nonce derived from the
data key ID — *not* a fresh random nonce — because each (master_key,
data_key_id) pair encrypts exactly one DEK. The deterministic nonce
makes wrapped DEKs stable across calls, simplifying caching and
auditability.

This module never logs key material. The ``MasterKey`` class is
deliberately not ``__repr__``-friendly to reduce accidental leakage in
tracebacks and debuggers.
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from uuid import UUID

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from theourgia.core.crypto.types import DecryptionError

__all__ = ["MasterKey", "DataKey", "generate_data_key", "wrap_data_key", "unwrap_data_key"]


KEY_LEN: int = 32  # 256-bit keys throughout
WRAP_NONCE_LEN: int = 12  # AES-GCM nonce


@dataclass(frozen=True, slots=True)
class MasterKey:
    """The server master key (KEK).

    Constructed from the ``THEOURGIA_MASTER_ENCRYPTION_KEY`` environment
    variable via :meth:`from_secret`. The class deliberately does not
    expose its raw bytes via ``__repr__`` or ``str``.
    """

    _key: bytes  # 32 bytes

    def __post_init__(self) -> None:
        if len(self._key) != KEY_LEN:
            msg = f"master key must be {KEY_LEN} bytes, got {len(self._key)}"
            raise ValueError(msg)

    def __repr__(self) -> str:
        return "MasterKey(***)"

    def __str__(self) -> str:
        return "MasterKey(***)"

    @classmethod
    def from_secret(cls, secret: str) -> "MasterKey":
        """Derive a master key from the configured secret string.

        The secret is run through SHA-256 to produce a 32-byte key. This
        means the configured ``THEOURGIA_MASTER_ENCRYPTION_KEY`` does
        not need to be exactly 32 bytes — any non-empty string yields a
        consistent 32-byte key.

        Empty strings are rejected; the secret must be present.
        """
        if not secret:
            msg = "master key secret must not be empty"
            raise ValueError(msg)
        digest = hashlib.sha256(secret.encode("utf-8")).digest()
        return cls(_key=digest)


@dataclass(frozen=True, slots=True)
class DataKey:
    """An unwrapped per-vault data key (DEK).

    Holds 32 bytes of raw key material. Created only briefly during
    encrypt/decrypt operations — never persisted in unwrapped form, never
    cached.
    """

    id: UUID
    _key: bytes

    def __post_init__(self) -> None:
        if len(self._key) != KEY_LEN:
            msg = f"data key must be {KEY_LEN} bytes, got {len(self._key)}"
            raise ValueError(msg)

    def __repr__(self) -> str:
        return f"DataKey(id={self.id}, key=***)"

    def __str__(self) -> str:
        return f"DataKey(id={self.id}, key=***)"

    @property
    def key_bytes(self) -> bytes:
        """Raw key material. Use sparingly and never log."""
        return self._key


def generate_data_key(key_id: UUID) -> DataKey:
    """Generate a fresh random 256-bit data key."""
    return DataKey(id=key_id, _key=secrets.token_bytes(KEY_LEN))


def _wrap_nonce_for(data_key_id: UUID) -> bytes:
    """Deterministically derive the 12-byte wrap nonce from the data key id.

    Wrapping a single DEK with a single (master_key, key_id) pair
    happens exactly once, so a deterministic nonce is safe (and in fact
    desirable for caching stability). We use the first 12 bytes of
    SHA-256(key_id.bytes).
    """
    return hashlib.sha256(data_key_id.bytes).digest()[:WRAP_NONCE_LEN]


def wrap_data_key(master: MasterKey, data_key: DataKey) -> bytes:
    """Encrypt a data key with the master key.

    Returns the wrapped DEK as raw bytes (AES-256-GCM ciphertext including
    the auth tag). The wrap is stable for a given (master, key_id) pair —
    the same DEK wrapped twice produces the same ciphertext.
    """
    aead = AESGCM(master._key)  # noqa: SLF001 — class-internal access
    nonce = _wrap_nonce_for(data_key.id)
    return aead.encrypt(nonce, data_key.key_bytes, associated_data=data_key.id.bytes)


def unwrap_data_key(master: MasterKey, key_id: UUID, wrapped: bytes) -> DataKey:
    """Decrypt a wrapped data key with the master key.

    Raises :class:`DecryptionError` on auth tag mismatch (wrong master
    key, tampered ciphertext, or wrong key_id used as associated data).
    """
    aead = AESGCM(master._key)  # noqa: SLF001
    nonce = _wrap_nonce_for(key_id)
    try:
        raw = aead.decrypt(nonce, wrapped, associated_data=key_id.bytes)
    except Exception as exc:
        msg = "failed to unwrap data key"
        raise DecryptionError(msg) from exc
    return DataKey(id=key_id, _key=raw)
