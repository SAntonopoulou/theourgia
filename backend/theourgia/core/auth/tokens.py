"""Opaque random tokens for sessions, password reset, and similar.

A token is generated as 256 bits of cryptographically random data,
encoded as a URL-safe base64 string for transport, and stored in the
database as the hex SHA-256 digest of the bytes.

Stored hashes (not plaintext) means:

- The plaintext token only ever exists in the user's possession
  (cookie, recovery link, etc.).
- A database leak doesn't yield usable tokens.
- Token lookup is by hash, not by plaintext.

The hash function is plain SHA-256 (no salt). This is correct here:
tokens are themselves high-entropy random secrets, so the standard
reason to salt (defeat rainbow tables on weak inputs) doesn't apply.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

__all__ = [
    "TOKEN_ENTROPY_BYTES",
    "generate_token",
    "hash_token",
    "tokens_match",
]

# 256 bits of entropy
TOKEN_ENTROPY_BYTES: int = 32


def generate_token() -> str:
    """Generate a fresh opaque random token.

    Returns a URL-safe base64 string (43 characters, no padding).
    """
    return secrets.token_urlsafe(TOKEN_ENTROPY_BYTES)


def hash_token(plain: str) -> str:
    """Return the storage form of a token: hex SHA-256 of the UTF-8 bytes.

    Length: 64 hex characters.
    """
    if not plain:
        msg = "token must not be empty"
        raise ValueError(msg)
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


def tokens_match(plain: str, stored_hash: str) -> bool:
    """Constant-time comparison of a presented token against a stored hash.

    Returns ``False`` for any malformed input rather than raising.
    """
    if not plain or not stored_hash:
        return False
    try:
        candidate = hash_token(plain)
    except ValueError:
        return False
    return hmac.compare_digest(candidate, stored_hash)
