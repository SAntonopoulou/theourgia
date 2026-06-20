"""Tests for the per-instance Ed25519 keypair management."""

from __future__ import annotations

import stat
from pathlib import Path

import pytest

from theourgia.core.federation.keys import (
    InstanceKeypair,
    deserialize_public_key,
    generate_keypair,
    load_or_create_keypair,
    serialize_public_key,
)


def test_generate_keypair_returns_ed25519() -> None:
    kp = generate_keypair()
    assert isinstance(kp, InstanceKeypair)
    # Verify it's a working keypair by signing + verifying
    sig = kp.private_key.sign(b"hello")
    kp.public_key.verify(sig, b"hello")


def test_generate_keypair_is_random() -> None:
    a = generate_keypair()
    b = generate_keypair()
    a_pub = a.public_key.public_bytes_raw()
    b_pub = b.public_key.public_bytes_raw()
    assert a_pub != b_pub


def test_keypair_repr_does_not_leak() -> None:
    kp = generate_keypair()
    text = repr(kp)
    assert "private=***" in text
    assert "public=***" in text
    # No long base64-looking strings escape
    assert "InstanceKeypair" in text


def test_serialize_round_trip() -> None:
    kp = generate_keypair()
    s = serialize_public_key(kp.public_key)
    # URL-safe base64, no padding, ASCII
    assert s.isascii()
    assert "=" not in s
    parsed = deserialize_public_key(s)
    assert parsed.public_bytes_raw() == kp.public_key.public_bytes_raw()


def test_deserialize_rejects_empty() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        deserialize_public_key("")


def test_deserialize_rejects_wrong_length() -> None:
    import base64

    raw = b"\x00" * 16  # too short
    serialized = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    with pytest.raises(ValueError, match="32 bytes"):
        deserialize_public_key(serialized)


def test_load_or_create_generates_when_absent(tmp_path: Path) -> None:
    priv = tmp_path / "fed.key"
    pub = tmp_path / "fed.pub"
    assert not priv.exists()
    assert not pub.exists()

    kp = load_or_create_keypair(private_path=priv, public_path=pub)
    assert isinstance(kp, InstanceKeypair)
    assert priv.exists()
    assert pub.exists()


def test_load_or_create_writes_private_key_with_restrictive_perms(tmp_path: Path) -> None:
    priv = tmp_path / "fed.key"
    pub = tmp_path / "fed.pub"
    load_or_create_keypair(private_path=priv, public_path=pub)
    mode = priv.stat().st_mode & 0o777
    # No group / other access
    assert not (mode & (stat.S_IRWXG | stat.S_IRWXO))
    # Owner read at minimum
    assert mode & stat.S_IRUSR


def test_load_or_create_reuses_existing(tmp_path: Path) -> None:
    priv = tmp_path / "fed.key"
    pub = tmp_path / "fed.pub"
    kp1 = load_or_create_keypair(private_path=priv, public_path=pub)
    kp2 = load_or_create_keypair(private_path=priv, public_path=pub)
    assert kp1.public_key.public_bytes_raw() == kp2.public_key.public_bytes_raw()


def test_load_or_create_recreates_public_if_missing(tmp_path: Path) -> None:
    priv = tmp_path / "fed.key"
    pub = tmp_path / "fed.pub"
    kp1 = load_or_create_keypair(private_path=priv, public_path=pub)
    pub.unlink()  # remove just the public-key file
    kp2 = load_or_create_keypair(private_path=priv, public_path=pub)
    assert pub.exists()
    assert kp1.public_key.public_bytes_raw() == kp2.public_key.public_bytes_raw()


def test_load_rejects_non_ed25519_key(tmp_path: Path) -> None:
    """If someone puts an RSA key at the path, loading must refuse."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.rsa import generate_private_key

    priv = tmp_path / "fed.key"
    pub = tmp_path / "fed.pub"
    rsa_key = generate_private_key(public_exponent=65537, key_size=2048)
    pem = rsa_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    priv.write_bytes(pem)
    priv.chmod(0o600)

    with pytest.raises(ValueError, match="not Ed25519"):
        load_or_create_keypair(private_path=priv, public_path=pub)
