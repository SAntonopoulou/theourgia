"""Tests for Argon2id password hashing."""

from __future__ import annotations

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from theourgia.core.auth.passwords import hash_password, needs_rehash, verify_password


def test_hash_password_returns_phc_format() -> None:
    h = hash_password("a-strong-passphrase-of-some-sort")
    assert h.startswith("$argon2id$")
    # PHC format: $argon2id$v=N$m=N,t=N,p=N$salt$hash — parameters after
    # ``m=`` are comma-joined, not each prefixed with $.
    assert "$v=" in h
    assert "m=" in h
    assert "t=" in h
    assert "p=" in h


def test_hash_password_rejects_empty_string() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        hash_password("")


def test_verify_password_round_trip() -> None:
    pw = "Hekate's keys at the crossroads"
    h = hash_password(pw)
    assert verify_password(pw, h) is True


def test_verify_password_rejects_wrong_password() -> None:
    h = hash_password("right")
    assert verify_password("wrong", h) is False


def test_verify_password_returns_false_for_empty_inputs() -> None:
    assert verify_password("", "$argon2id$nonempty") is False
    assert verify_password("password", "") is False
    assert verify_password("", "") is False


def test_verify_password_returns_false_for_malformed_hash() -> None:
    assert verify_password("password", "not-a-valid-argon2-hash") is False
    assert verify_password("password", "$argon2id$bad-but-prefixed") is False


def test_each_hash_uses_fresh_salt() -> None:
    """Same password hashed twice yields different ciphertexts (different salts)."""
    a = hash_password("identical")
    b = hash_password("identical")
    assert a != b
    assert verify_password("identical", a) is True
    assert verify_password("identical", b) is True


def test_needs_rehash_returns_false_for_current_params() -> None:
    h = hash_password("test")
    assert needs_rehash(h) is False


def test_needs_rehash_returns_true_for_weaker_params() -> None:
    """A hash created with weaker parameters (e.g., t=1) signals rehash needed."""
    from argon2 import PasswordHasher

    weak = PasswordHasher(time_cost=1, memory_cost=8192, parallelism=1).hash("test")
    assert needs_rehash(weak) is True


@given(password=st.text(min_size=1, max_size=256))
@settings(max_examples=10, deadline=None)
def test_property_round_trip(password: str) -> None:
    """Property: any non-empty password round-trips through hash/verify."""
    h = hash_password(password)
    assert verify_password(password, h) is True
