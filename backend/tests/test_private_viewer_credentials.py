"""Unit tests for the private viewer credential primitives (B138).

The H08 honesty rules covered:

  · Plaintext is cryptographically random + URL-safe.
  · Salt is 16 bytes.
  · Hash is deterministic for fixed inputs.
  · verify_credential is correct for matching + mismatched
    plaintext, salts, and tampered hashes.
"""

from __future__ import annotations

from theourgia.core.private_viewer_credentials import (
    HASH_BYTES,
    PBKDF2_ITERATIONS,
    SALT_BYTES,
    generate_plaintext,
    generate_salt,
    hash_credential,
    verify_credential,
)


def test_pbkdf2_iterations_is_industry_baseline() -> None:
    """OWASP 2025 baseline for PBKDF2-SHA256 is 600k; we use
    100k. Document the floor so future tightening is intentional."""
    assert PBKDF2_ITERATIONS >= 100_000


def test_salt_bytes_is_sixteen() -> None:
    assert SALT_BYTES == 16


def test_hash_bytes_is_thirty_two() -> None:
    assert HASH_BYTES == 32


def test_generate_plaintext_is_urlsafe() -> None:
    plaintext = generate_plaintext()
    # base64url alphabet: A-Z, a-z, 0-9, '-', '_'.
    # 32 random bytes encode to 43 characters (no '=' padding
    # from token_urlsafe).
    assert len(plaintext) >= 32
    for ch in plaintext:
        assert ch.isalnum() or ch in "-_"


def test_generate_plaintext_is_unique_per_call() -> None:
    """100 fresh tokens should all differ — the unique-token
    invariant is cryptographic."""
    tokens = {generate_plaintext() for _ in range(100)}
    assert len(tokens) == 100


def test_generate_salt_returns_sixteen_bytes() -> None:
    assert len(generate_salt()) == SALT_BYTES


def test_generate_salt_is_unique_per_call() -> None:
    salts = {generate_salt() for _ in range(100)}
    assert len(salts) == 100


def test_hash_is_deterministic_for_fixed_inputs() -> None:
    salt = b"\x00" * 16
    a = hash_credential("the-plaintext", salt)
    b = hash_credential("the-plaintext", salt)
    assert a == b
    assert len(a) == HASH_BYTES


def test_hash_differs_with_different_salts() -> None:
    salt_a = b"\x00" * 16
    salt_b = b"\xff" * 16
    a = hash_credential("the-plaintext", salt_a)
    b = hash_credential("the-plaintext", salt_b)
    assert a != b


def test_hash_differs_with_different_plaintexts() -> None:
    salt = b"\x00" * 16
    a = hash_credential("the-plaintext", salt)
    b = hash_credential("another-plaintext", salt)
    assert a != b


def test_verify_correct_plaintext_returns_true() -> None:
    salt = generate_salt()
    plaintext = generate_plaintext()
    expected = hash_credential(plaintext, salt)
    assert verify_credential(plaintext, salt, expected) is True


def test_verify_wrong_plaintext_returns_false() -> None:
    salt = generate_salt()
    expected = hash_credential("the-plaintext", salt)
    assert verify_credential("wrong", salt, expected) is False


def test_verify_wrong_salt_returns_false() -> None:
    salt_a = generate_salt()
    salt_b = generate_salt()
    expected = hash_credential("the-plaintext", salt_a)
    assert (
        verify_credential("the-plaintext", salt_b, expected) is False
    )


def test_verify_tampered_hash_returns_false() -> None:
    salt = generate_salt()
    expected = hash_credential("the-plaintext", salt)
    tampered = bytes([expected[0] ^ 0x01]) + expected[1:]
    assert (
        verify_credential("the-plaintext", salt, tampered) is False
    )
