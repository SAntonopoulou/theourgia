"""Theourgia cryptography primitives.

Per-content encryption with two modes, selected by the user per content
item:

- **Mode A — server-side at rest.** AES-256-GCM via the ``cryptography``
  library. Per-vault data keys are wrapped by a server master key
  (``THEOURGIA_MASTER_ENCRYPTION_KEY``). The server holds the keys; the
  application decrypts on read. Supports server-side full-text search.

- **Mode B — zero-knowledge client-side.** XChaCha20-Poly1305 via
  libsodium (PyNaCl). The encryption key is derived in the browser from
  a passphrase the server never sees. The server stores only ciphertext
  and the KDF parameters; even a compromised server cannot decrypt.
  Used for ``initiation`` records, ``oath`` ledger entries, and any
  content explicitly marked ``sealed``.

Both modes share a versioned binary envelope (:mod:`envelope`) so an
encrypted blob is self-describing.

This package is the **single point** through which the rest of the
codebase interacts with cryptography. Other modules should not import
``cryptography`` or ``nacl`` directly.
"""

from __future__ import annotations

from theourgia.core.crypto.types import (
    DecryptionError,
    EncryptionError,
    EncryptionMode,
    InvalidEnvelopeError,
)

__all__ = [
    "DecryptionError",
    "EncryptionError",
    "EncryptionMode",
    "InvalidEnvelopeError",
]
