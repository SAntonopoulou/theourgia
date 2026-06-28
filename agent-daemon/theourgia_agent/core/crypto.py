"""Mode B passphrase-based BYO-key encryption.

Locked with the user 2026-06-28: keys are encrypted at rest with a
passphrase-derived KEK; the decrypted plaintext lives in memory only
during an active session. Same security model as the sealed-content
mode B in the main backend.

Flow:

  1. User pastes Anthropic API key + passphrase.
  2. Daemon derives MASTER from passphrase via Argon2id (slow on
     purpose).
  3. Daemon derives per-record KEK via HKDF(MASTER, salt=hkdf_salt,
     info=record_id).
  4. Daemon encrypts the API key with AES-256-GCM under the KEK.
  5. Database stores: ciphertext, nonce, auth tag, record_id.
  6. To use: user re-enters passphrase at session start → daemon
     re-derives MASTER → KEK → decrypts. Plaintext lives in
     :class:`InMemoryKeyVault` for the session, never written to disk.

The daemon NEVER persists the plaintext. If the daemon restarts the
user must unlock again.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from argon2.low_level import Type, hash_secret_raw
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from theourgia_agent.core.config import get_settings


__all__ = [
    "EncryptedKey",
    "InMemoryKeyVault",
    "derive_master",
    "encrypt_api_key",
    "decrypt_api_key",
]


@dataclass(slots=True, frozen=True)
class EncryptedKey:
    """Wire format for a Mode B-encrypted API key.

    All fields are bytes; the database row stores them base64-encoded.
    """

    nonce: bytes  # 12 bytes (AES-GCM standard)
    ciphertext: bytes  # variable length
    record_id: bytes  # 16 bytes random per record (used in HKDF info)


def derive_master(passphrase: str) -> bytes:
    """Derive a 32-byte master key from the user's passphrase.

    Uses Argon2id with operator-tunable parameters. Slow on purpose —
    typical wall-time on a developer laptop ≈ 300ms. The slowness IS
    the security property; users only unlock once per session.
    """
    s = get_settings()
    return hash_secret_raw(
        secret=passphrase.encode("utf-8"),
        salt=s.hkdf_salt.get_secret_value().encode("utf-8"),
        time_cost=s.argon2_time_cost,
        memory_cost=s.argon2_memory_cost_kib,
        parallelism=s.argon2_parallelism,
        hash_len=32,
        type=Type.ID,
    )


def _derive_kek(master: bytes, record_id: bytes) -> bytes:
    return HKDF(
        algorithm=SHA256(),
        length=32,
        salt=record_id,
        info=b"theourgia-agent-byok-v1",
    ).derive(master)


def encrypt_api_key(plaintext: str, master: bytes) -> EncryptedKey:
    """Encrypt an API key with a fresh record_id + nonce."""
    record_id = os.urandom(16)
    nonce = os.urandom(12)
    kek = _derive_kek(master, record_id)
    ct = AESGCM(kek).encrypt(nonce, plaintext.encode("utf-8"), None)
    return EncryptedKey(nonce=nonce, ciphertext=ct, record_id=record_id)


def decrypt_api_key(record: EncryptedKey, master: bytes) -> str:
    """Decrypt a stored EncryptedKey back to plaintext.

    Raises :class:`cryptography.exceptions.InvalidTag` if the master
    is wrong (i.e., the user typed the wrong passphrase). Callers
    MUST catch and surface "passphrase incorrect" without leaking
    timing or other information.
    """
    kek = _derive_kek(master, record.record_id)
    pt = AESGCM(kek).decrypt(record.nonce, record.ciphertext, None)
    return pt.decode("utf-8")


class InMemoryKeyVault:
    """Per-session in-memory store of decrypted API keys.

    Holds plaintext API keys keyed by (vault_id, agent_id). Cleared
    when the daemon process exits OR when the user explicitly locks
    the vault again. Never serialised, never persisted.

    The dict is module-level by design — sharing across handlers in
    the same process. Production deployments run the daemon as a
    single user-scoped process.
    """

    __slots__ = ("_store",)

    def __init__(self) -> None:
        self._store: dict[tuple[str, str], str] = {}

    def store(self, vault_id: str, agent_id: str, plaintext: str) -> None:
        self._store[(vault_id, agent_id)] = plaintext

    def get(self, vault_id: str, agent_id: str) -> str | None:
        return self._store.get((vault_id, agent_id))

    def forget(self, vault_id: str, agent_id: str) -> None:
        self._store.pop((vault_id, agent_id), None)

    def lock(self) -> None:
        """Forget every key (used at session-end / explicit lock)."""
        self._store.clear()

    def has(self, vault_id: str, agent_id: str) -> bool:
        return (vault_id, agent_id) in self._store
