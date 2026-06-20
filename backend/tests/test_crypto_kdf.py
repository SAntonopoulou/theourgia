"""Tests for the Argon2id KDF used by Mode B."""

from __future__ import annotations

import pytest

from theourgia.core.crypto.kdf import KdfParams, derive_key, generate_params


def test_generate_params_produces_valid_defaults() -> None:
    params = generate_params()
    assert len(params.salt) == 16
    assert params.time_cost >= 1
    assert params.memory_cost >= 8192
    assert params.parallelism >= 1
    assert params.key_length == 32


def test_generate_params_yields_random_salt() -> None:
    a = generate_params()
    b = generate_params()
    assert a.salt != b.salt


def test_derive_key_is_deterministic() -> None:
    params = generate_params()
    k1 = derive_key("my passphrase", params)
    k2 = derive_key("my passphrase", params)
    assert k1 == k2


def test_derive_key_changes_with_passphrase() -> None:
    params = generate_params()
    k1 = derive_key("passphrase one", params)
    k2 = derive_key("passphrase two", params)
    assert k1 != k2


def test_derive_key_changes_with_salt() -> None:
    p1 = generate_params()
    p2 = generate_params()  # different salt
    k1 = derive_key("same passphrase", p1)
    k2 = derive_key("same passphrase", p2)
    assert k1 != k2


def test_derive_key_returns_requested_length() -> None:
    p32 = KdfParams(salt=b"\x01" * 16, key_length=32)
    p64 = KdfParams(salt=b"\x01" * 16, key_length=64)
    assert len(derive_key("x", p32)) == 32
    assert len(derive_key("x", p64)) == 64


def test_derive_key_rejects_empty_passphrase() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        derive_key("", generate_params())


def test_params_reject_bad_salt_length() -> None:
    with pytest.raises(ValueError, match="salt must be"):
        KdfParams(salt=b"too-short")


def test_params_reject_low_memory_cost() -> None:
    with pytest.raises(ValueError, match="memory_cost"):
        KdfParams(salt=b"\x00" * 16, memory_cost=1024)


def test_params_reject_zero_time_cost() -> None:
    with pytest.raises(ValueError, match="time_cost"):
        KdfParams(salt=b"\x00" * 16, time_cost=0)


def test_params_reject_zero_parallelism() -> None:
    with pytest.raises(ValueError, match="parallelism"):
        KdfParams(salt=b"\x00" * 16, parallelism=0)


def test_params_reject_unusual_key_length() -> None:
    with pytest.raises(ValueError, match="key_length"):
        KdfParams(salt=b"\x00" * 16, key_length=17)
