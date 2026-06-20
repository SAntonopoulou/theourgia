"""Shared types for the crypto package."""

from __future__ import annotations

import enum

__all__ = [
    "EncryptionMode",
    "EncryptionError",
    "DecryptionError",
    "InvalidEnvelopeError",
]


class EncryptionMode(int, enum.Enum):
    """Which encryption mode a piece of content uses.

    Persisted on the content row as part of its metadata; the value is
    also encoded into the envelope so that a blob found in the wild is
    self-describing.
    """

    MODE_A_SERVER_AT_REST = 1
    """AES-256-GCM with per-vault data keys wrapped by the server master key."""

    MODE_B_ZERO_KNOWLEDGE = 2
    """XChaCha20-Poly1305 with a key derived client-side from a passphrase
    the server never sees."""


class EncryptionError(Exception):
    """Raised when encryption fails for any reason."""


class DecryptionError(Exception):
    """Raised when decryption fails — wrong key, tampered ciphertext, or
    corrupted envelope.

    The string detail is intentionally vague at the API boundary
    (clients should not learn whether a key was wrong vs. ciphertext was
    tampered); detailed reasons go to structured logs only.
    """


class InvalidEnvelopeError(EncryptionError):
    """Raised when an envelope cannot be parsed — bad version, bad length,
    unknown mode, etc."""
