"""Key derivation for Mode B (zero-knowledge).

In Mode B, the encryption key is derived from a passphrase the server
never sees. Derivation happens in the user's browser; this module
provides:

1. **Parameter generation** — produces an Argon2id salt + parameter set
   for a new "sealed scope" (typically per-user or per-vault). Persisted
   to the ``sealed_kdf_params`` table.

2. **A Python reference implementation** of derivation — used by:
   - Backend tests (to construct test ciphertexts)
   - Admin diagnostics (to verify a passphrase against ciphertext
     formats, never to decrypt actual content)
   - Documentation that demonstrates the contract

Production-path Mode B derivation always happens in the browser via
``libsodium.js`` ``crypto_pwhash`` with the same parameters. The
``argon2-cffi`` Python implementation here matches that contract.

We use Argon2id (the hybrid variant — recommended by both RFC 9106 and
OWASP) at INTERACTIVE-grade parameters as a sensible default. Users
running on weak devices can have the parameters tuned down per-account;
users running on beefy machines can tune up. Parameters are stored
alongside the salt so they travel with the ciphertext.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass

import argon2.low_level

__all__ = ["KdfParams", "generate_params", "derive_key", "KEY_LEN", "SALT_LEN"]

KEY_LEN: int = 32  # 256-bit derived key
SALT_LEN: int = 16  # 128-bit salt — per RFC 9106 recommendation


@dataclass(frozen=True, slots=True)
class KdfParams:
    """Argon2id key derivation parameters for a sealed scope.

    Persisted to ``sealed_kdf_params``. The browser receives these and
    runs Argon2id against the user's passphrase to derive the same
    32-byte key the backend would derive if it had the passphrase
    (which, of course, it never does).

    Defaults are Argon2id INTERACTIVE-grade per ``argon2-cffi``:
    ``time_cost=3``, ``memory_cost=64 MiB``, ``parallelism=4``.
    These can be tuned per-user; the choice is recorded so derivation is
    deterministic across browser sessions.
    """

    salt: bytes
    time_cost: int = 3
    memory_cost: int = 65536  # KiB; 64 MiB
    parallelism: int = 4
    key_length: int = KEY_LEN

    def __post_init__(self) -> None:
        if len(self.salt) != SALT_LEN:
            msg = f"salt must be {SALT_LEN} bytes, got {len(self.salt)}"
            raise ValueError(msg)
        if self.time_cost < 1:
            msg = "time_cost must be >= 1"
            raise ValueError(msg)
        if self.memory_cost < 8 * 1024:  # 8 MiB floor — RFC 9106 minimum
            msg = "memory_cost must be at least 8192 KiB (8 MiB)"
            raise ValueError(msg)
        if self.parallelism < 1:
            msg = "parallelism must be >= 1"
            raise ValueError(msg)
        if self.key_length not in (16, 24, 32, 64):
            msg = "key_length must be 16, 24, 32, or 64"
            raise ValueError(msg)


def generate_params() -> KdfParams:
    """Generate fresh Argon2id parameters with a random salt.

    Returns INTERACTIVE-grade defaults. Tuning is the caller's concern.
    """
    return KdfParams(salt=secrets.token_bytes(SALT_LEN))


def derive_key(passphrase: str, params: KdfParams) -> bytes:
    """Derive a key from a passphrase using the given parameters.

    The resulting bytes are the same a libsodium.js / argon2-cffi /
    libsodium-C implementation would produce given identical parameters
    — Argon2id is deterministic.

    Production callers should not invoke this on the server with a
    real user passphrase (the whole point of Mode B is that the server
    never sees the passphrase). Use this only for tests and admin
    diagnostics where the passphrase is supplied locally.
    """
    if not passphrase:
        msg = "passphrase must not be empty"
        raise ValueError(msg)
    return argon2.low_level.hash_secret_raw(
        secret=passphrase.encode("utf-8"),
        salt=params.salt,
        time_cost=params.time_cost,
        memory_cost=params.memory_cost,
        parallelism=params.parallelism,
        hash_len=params.key_length,
        type=argon2.low_level.Type.ID,
    )
