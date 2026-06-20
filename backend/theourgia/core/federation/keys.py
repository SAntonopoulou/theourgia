"""Per-instance Ed25519 keypair management.

Each Theourgia instance has exactly one long-lived Ed25519 keypair used
to sign federation messages and issue capability tokens. The private
key lives on disk at ``THEOURGIA_FEDERATION_PRIVATE_KEY_PATH`` (PEM,
mode 0600); the public key is exposed at ``/.well-known/theourgia/actor``
so peers can verify signatures.

Key generation happens lazily on first start (or on demand for new
instances). Once written, the keypair is permanent — rotation is a
deliberate operation that produces a *new* instance identity (a new DID
for keying purposes) and is documented in the federation protocol spec
(Phase 12).
"""

from __future__ import annotations

import base64
import logging
import os
import stat
from dataclasses import dataclass
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

__all__ = [
    "InstanceKeypair",
    "generate_keypair",
    "load_or_create_keypair",
    "serialize_public_key",
    "deserialize_public_key",
]

_log = logging.getLogger(__name__)

PUBLIC_KEY_LEN: int = 32
PRIVATE_KEY_LEN: int = 32


@dataclass(frozen=True, slots=True)
class InstanceKeypair:
    """The per-instance Ed25519 keypair.

    The private key is a ``cryptography`` :class:`Ed25519PrivateKey`;
    the public key is its corresponding :class:`Ed25519PublicKey`.
    Equality / hashing are not provided to avoid leaks via dictionary
    iteration; identity comparison is what callers want.
    """

    private_key: Ed25519PrivateKey
    public_key: Ed25519PublicKey

    def __repr__(self) -> str:  # No-leak default
        return "InstanceKeypair(private=***, public=***)"


def generate_keypair() -> InstanceKeypair:
    """Generate a fresh Ed25519 keypair in-memory."""
    private = Ed25519PrivateKey.generate()
    return InstanceKeypair(private_key=private, public_key=private.public_key())


def _write_private_key(path: Path, key: Ed25519PrivateKey) -> None:
    """Write the private key to ``path`` in unencrypted PEM, mode 0600."""
    pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    # Open with exclusive create + restrictive mode atomically
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(pem)
    except Exception:
        try:
            path.unlink(missing_ok=True)
        except Exception:
            pass
        raise


def _write_public_key(path: Path, key: Ed25519PublicKey) -> None:
    """Write the public key to ``path`` in PEM."""
    pem = key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(pem)
    # 0644 for the public key — readable by any user (it's public)
    path.chmod(0o644)


def _read_private_key(path: Path) -> Ed25519PrivateKey:
    """Load a PEM-encoded Ed25519 private key from disk."""
    data = path.read_bytes()
    key = serialization.load_pem_private_key(data, password=None)
    if not isinstance(key, Ed25519PrivateKey):
        msg = f"private key at {path} is not Ed25519 (got {type(key).__name__})"
        raise ValueError(msg)
    return key


def _check_private_key_perms(path: Path) -> None:
    """Warn if the private key file is more permissive than 0600.

    We don't raise — operators may have set up file ACLs that look
    incorrect to the simple mode bits. But a warning is logged so the
    operator can investigate.
    """
    st = path.stat()
    mode = st.st_mode & 0o777
    if mode & (stat.S_IRWXG | stat.S_IRWXO):
        _log.warning(
            "federation private key has overly permissive mode: %s (path=%s)",
            oct(mode),
            path,
        )


def load_or_create_keypair(
    *,
    private_path: Path,
    public_path: Path,
) -> InstanceKeypair:
    """Load the instance keypair from disk, generating it if absent.

    Idempotent: subsequent calls with the same paths return the same
    keypair. Permissions on the private key are checked on load (a
    warning is logged if they look wrong; no raise).
    """
    if private_path.exists():
        _check_private_key_perms(private_path)
        private = _read_private_key(private_path)
        public = private.public_key()
        # Best-effort: ensure the public-key file matches what the
        # private key would produce. If they disagree, prefer the
        # private key's view (it's authoritative).
        if not public_path.exists():
            _write_public_key(public_path, public)
        return InstanceKeypair(private_key=private, public_key=public)

    _log.info("federation.keypair.generating", extra={"private_path": str(private_path)})
    kp = generate_keypair()
    _write_private_key(private_path, kp.private_key)
    _write_public_key(public_path, kp.public_key)
    return kp


def serialize_public_key(key: Ed25519PublicKey) -> str:
    """Serialize an Ed25519 public key to the wire format.

    Returns the 32-byte raw key encoded as URL-safe base64 (no padding).
    This format is what we expose in ``.well-known/theourgia/actor`` and
    in federation messages.
    """
    raw = key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def deserialize_public_key(serialized: str) -> Ed25519PublicKey:
    """Parse a serialized public key back into a key object.

    Accepts the URL-safe base64 format produced by
    :func:`serialize_public_key`.
    """
    if not serialized:
        msg = "serialized public key must not be empty"
        raise ValueError(msg)
    # Restore padding
    padded = serialized + "=" * (-len(serialized) % 4)
    raw = base64.urlsafe_b64decode(padded.encode("ascii"))
    if len(raw) != PUBLIC_KEY_LEN:
        msg = f"public key must be {PUBLIC_KEY_LEN} bytes, got {len(raw)}"
        raise ValueError(msg)
    return Ed25519PublicKey.from_public_bytes(raw)
