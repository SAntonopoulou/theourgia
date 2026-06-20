"""Mode A — server-side at-rest encryption.

AES-256-GCM with per-vault data keys wrapped by the server master key.
The application can decrypt at any time, enabling server-side full-text
search over Mode A content.

Threat model: protects against database theft (the master key is in env,
not the database). Does NOT protect against an attacker who compromises
the running application process — for that, use Mode B (zero-knowledge).

API contract:

    encrypted = encrypt_mode_a(plaintext, data_key)
    plaintext = decrypt_mode_a(encrypted, data_key)

Both return / accept the envelope-encoded bytes (see :mod:`envelope`).
The caller is responsible for sourcing the right data key — typically
by loading the active key for the vault from the ``vault_key`` table and
unwrapping with the master key.
"""

from __future__ import annotations

import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from theourgia.core.crypto import envelope
from theourgia.core.crypto.keys import DataKey
from theourgia.core.crypto.types import DecryptionError, EncryptionError, EncryptionMode

__all__ = ["encrypt", "decrypt"]


def encrypt(plaintext: bytes, data_key: DataKey, *, associated_data: bytes | None = None) -> bytes:
    """Encrypt ``plaintext`` under the given data key.

    Returns the envelope-encoded bytes (see :mod:`envelope`).

    ``associated_data`` is optionally bound to the ciphertext as AEAD
    associated data; common patterns include binding to a row ID or
    field name so that swapping ciphertexts between rows fails
    authentication.
    """
    aead = AESGCM(data_key.key_bytes)
    nonce = secrets.token_bytes(envelope.MODE_A_NONCE_LEN)
    try:
        ciphertext = aead.encrypt(nonce, plaintext, associated_data=associated_data)
    except Exception as exc:
        msg = "Mode A encryption failed"
        raise EncryptionError(msg) from exc

    return envelope.encode(
        mode=EncryptionMode.MODE_A_SERVER_AT_REST,
        key_id=data_key.id,
        nonce=nonce,
        ciphertext=ciphertext,
    )


def decrypt(
    blob: bytes,
    data_key: DataKey,
    *,
    associated_data: bytes | None = None,
) -> bytes:
    """Decrypt a Mode A envelope under the given data key.

    The envelope's ``key_id`` must match ``data_key.id`` — otherwise the
    caller has loaded the wrong key. Raises :class:`DecryptionError` on
    mismatch, on auth tag failure, or on any malformation.
    """
    env = envelope.decode(blob)
    if env.mode != EncryptionMode.MODE_A_SERVER_AT_REST:
        msg = f"expected Mode A blob, got {env.mode.name}"
        raise DecryptionError(msg)
    if env.key_id != data_key.id:
        msg = "data key id does not match envelope key id"
        raise DecryptionError(msg)

    aead = AESGCM(data_key.key_bytes)
    try:
        return aead.decrypt(env.nonce, env.ciphertext, associated_data=associated_data)
    except Exception as exc:
        msg = "Mode A decryption failed (wrong key, tampered ciphertext, or wrong AAD)"
        raise DecryptionError(msg) from exc
