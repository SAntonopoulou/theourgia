"""Mode B — zero-knowledge client-side encryption.

XChaCha20-Poly1305 via libsodium (PyNaCl). The key is derived from a
passphrase the server never sees; the server stores only ciphertext and
KDF parameters.

**In production, encryption and decryption happen in the user's
browser.** This Python module is provided for:

1. Backend tests that need to construct or verify Mode B ciphertexts.
2. Admin diagnostics that examine envelope structure without touching
   real user passphrases.
3. Documentation showing the canonical contract.

The frontend implementation (libsodium.js ``crypto_aead_xchacha20poly1305_ietf_*``
with Argon2id-derived keys) must produce envelopes byte-identical to what
this module produces, given the same key + nonce + plaintext.

**The backend never holds Mode B keys in production.** If you find code
that does, that is a bug.
"""

from __future__ import annotations

import secrets
from uuid import UUID

import nacl.bindings

from theourgia.core.crypto import envelope
from theourgia.core.crypto.types import DecryptionError, EncryptionError, EncryptionMode

__all__ = ["encrypt", "decrypt"]


def encrypt(
    plaintext: bytes,
    key: bytes,
    *,
    kdf_params_id: UUID,
    associated_data: bytes | None = None,
) -> bytes:
    """Encrypt ``plaintext`` under a Mode B (XChaCha20-Poly1305) key.

    The ``kdf_params_id`` is embedded in the envelope so a downstream
    reader can look up the KDF parameters needed to derive the key from
    a passphrase.

    Production callers do not invoke this on the server; the frontend
    does. This module is for tests and reference.
    """
    if len(key) != 32:
        msg = f"Mode B key must be 32 bytes, got {len(key)}"
        raise EncryptionError(msg)
    nonce = secrets.token_bytes(envelope.MODE_B_NONCE_LEN)
    aad = associated_data or b""
    try:
        ciphertext = nacl.bindings.crypto_aead_xchacha20poly1305_ietf_encrypt(
            message=plaintext, aad=aad, nonce=nonce, key=key
        )
    except Exception as exc:
        msg = "Mode B encryption failed"
        raise EncryptionError(msg) from exc

    return envelope.encode(
        mode=EncryptionMode.MODE_B_ZERO_KNOWLEDGE,
        key_id=kdf_params_id,
        nonce=nonce,
        ciphertext=ciphertext,
    )


def decrypt(blob: bytes, key: bytes, *, associated_data: bytes | None = None) -> bytes:
    """Decrypt a Mode B envelope under the given (browser-derived) key.

    Raises :class:`DecryptionError` on auth tag failure or malformation.

    Production callers do not invoke this on the server; the frontend
    does. This module is for tests and reference.
    """
    if len(key) != 32:
        msg = f"Mode B key must be 32 bytes, got {len(key)}"
        raise DecryptionError(msg)

    env = envelope.decode(blob)
    if env.mode != EncryptionMode.MODE_B_ZERO_KNOWLEDGE:
        msg = f"expected Mode B blob, got {env.mode.name}"
        raise DecryptionError(msg)

    aad = associated_data or b""
    try:
        return nacl.bindings.crypto_aead_xchacha20poly1305_ietf_decrypt(
            ciphertext=env.ciphertext, aad=aad, nonce=env.nonce, key=key
        )
    except Exception as exc:
        msg = "Mode B decryption failed (wrong key, tampered ciphertext, or wrong AAD)"
        raise DecryptionError(msg) from exc
