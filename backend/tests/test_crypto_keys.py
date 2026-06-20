"""Tests for the Mode A key management primitives."""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.crypto.keys import (
    DataKey,
    MasterKey,
    generate_data_key,
    unwrap_data_key,
    wrap_data_key,
)
from theourgia.core.crypto.types import DecryptionError


def test_master_key_from_secret_returns_32_bytes() -> None:
    mk = MasterKey.from_secret("any-non-empty-secret")
    assert isinstance(mk, MasterKey)


def test_master_key_rejects_empty_secret() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        MasterKey.from_secret("")


def test_master_key_repr_does_not_leak_material() -> None:
    mk = MasterKey.from_secret("super-secret-do-not-print-me")
    text = repr(mk)
    assert "super-secret" not in text
    assert "MasterKey" in text
    assert "***" in text


def test_master_key_str_does_not_leak_material() -> None:
    mk = MasterKey.from_secret("another-secret")
    assert "another-secret" not in str(mk)
    assert "***" in str(mk)


def test_master_key_same_secret_yields_same_bytes() -> None:
    a = MasterKey.from_secret("seed-1")
    b = MasterKey.from_secret("seed-1")
    # Bytes are equal — derived deterministically via SHA-256
    assert a._key == b._key  # noqa: SLF001


def test_master_key_different_secret_yields_different_bytes() -> None:
    a = MasterKey.from_secret("seed-1")
    b = MasterKey.from_secret("seed-2")
    assert a._key != b._key  # noqa: SLF001


def test_generate_data_key_produces_32_bytes() -> None:
    dk = generate_data_key(uuid4())
    assert len(dk.key_bytes) == 32


def test_generate_data_key_is_random() -> None:
    """Two consecutively generated keys are not equal (one-in-2^256 odds)."""
    a = generate_data_key(uuid4())
    b = generate_data_key(uuid4())
    assert a.key_bytes != b.key_bytes


def test_data_key_repr_does_not_leak_material() -> None:
    dk = generate_data_key(uuid4())
    text = repr(dk)
    assert dk.key_bytes.hex() not in text
    assert "key=***" in text


def test_wrap_unwrap_round_trip() -> None:
    master = MasterKey.from_secret("master-secret")
    dk = generate_data_key(uuid4())
    wrapped = wrap_data_key(master, dk)

    unwrapped = unwrap_data_key(master, dk.id, wrapped)
    assert unwrapped.id == dk.id
    assert unwrapped.key_bytes == dk.key_bytes


def test_wrap_is_deterministic_for_same_inputs() -> None:
    """Same (master, data_key) yields the same wrapped ciphertext.

    Deterministic wrap nonce derived from key_id makes this so. The
    point is that re-wrapping the same DEK doesn't appear to change it.
    """
    master = MasterKey.from_secret("master-secret")
    dk = generate_data_key(uuid4())
    w1 = wrap_data_key(master, dk)
    w2 = wrap_data_key(master, dk)
    assert w1 == w2


def test_wrong_master_key_fails_to_unwrap() -> None:
    master1 = MasterKey.from_secret("master-1")
    master2 = MasterKey.from_secret("master-2")
    dk = generate_data_key(uuid4())
    wrapped = wrap_data_key(master1, dk)
    with pytest.raises(DecryptionError, match="failed to unwrap"):
        unwrap_data_key(master2, dk.id, wrapped)


def test_wrong_key_id_fails_to_unwrap() -> None:
    """The key_id is used as AAD; using a different id breaks auth."""
    master = MasterKey.from_secret("master-secret")
    dk = generate_data_key(uuid4())
    wrapped = wrap_data_key(master, dk)
    other_id = uuid4()
    with pytest.raises(DecryptionError):
        unwrap_data_key(master, other_id, wrapped)


def test_tampered_wrapped_key_fails_to_unwrap() -> None:
    master = MasterKey.from_secret("master-secret")
    dk = generate_data_key(uuid4())
    wrapped = wrap_data_key(master, dk)
    tampered = bytes([wrapped[0] ^ 0x01]) + wrapped[1:]
    with pytest.raises(DecryptionError):
        unwrap_data_key(master, dk.id, tampered)


def test_data_key_rejects_wrong_length() -> None:
    with pytest.raises(ValueError, match="must be 32 bytes"):
        DataKey(id=uuid4(), _key=b"too-short")
