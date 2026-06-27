"""Private viewer credential primitives (B138).

PBKDF2-HMAC-SHA256 with 100,000 iterations and a 16-byte salt.
The plaintext is returned exactly ONCE at issue time; only the
hash + salt persist.

This module is intentionally tiny and dependency-free so the
honesty invariants are easy to audit:

  * ``generate_plaintext`` — 32-byte cryptographically random,
    URL-safe base64 encoded.
  * ``hash_credential`` — given plaintext + salt, returns a
    bytes hash. Deterministic for fixed inputs.
  * ``verify_credential`` — constant-time compare.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

__all__ = [
    "PBKDF2_ITERATIONS",
    "SALT_BYTES",
    "PLAINTEXT_BYTES",
    "HASH_BYTES",
    "generate_plaintext",
    "generate_salt",
    "hash_credential",
    "verify_credential",
]


PBKDF2_ITERATIONS: int = 100_000
SALT_BYTES: int = 16
PLAINTEXT_BYTES: int = 32
HASH_BYTES: int = 32


def generate_plaintext() -> str:
    """Produce a fresh URL-safe random credential plaintext.

    Returns the base64url-encoded representation of 32 random
    bytes. The caller surfaces this to the practitioner ONCE
    at issue time; it must not be persisted in plaintext form.
    """
    return secrets.token_urlsafe(PLAINTEXT_BYTES)


def generate_salt() -> bytes:
    """Produce a fresh 16-byte salt."""
    return secrets.token_bytes(SALT_BYTES)


def hash_credential(plaintext: str, salt: bytes) -> bytes:
    """Hash ``plaintext`` against ``salt`` via PBKDF2-HMAC-SHA256.

    Deterministic for fixed inputs. Returns 32 bytes.
    """
    return hashlib.pbkdf2_hmac(
        "sha256",
        plaintext.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=HASH_BYTES,
    )


def verify_credential(
    plaintext: str, salt: bytes, expected_hash: bytes,
) -> bool:
    """Constant-time compare of ``hash_credential(plaintext, salt)``
    against ``expected_hash``."""
    candidate = hash_credential(plaintext, salt)
    return hmac.compare_digest(candidate, expected_hash)
