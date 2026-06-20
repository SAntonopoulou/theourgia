"""Tests for opaque token generation, hashing, and comparison."""

from __future__ import annotations

import pytest

from theourgia.core.auth.tokens import (
    TOKEN_ENTROPY_BYTES,
    generate_token,
    hash_token,
    tokens_match,
)


def test_generate_token_has_expected_length() -> None:
    token = generate_token()
    # URL-safe base64 of 32 bytes is 43 chars without padding
    assert len(token) == 43


def test_generate_token_is_random() -> None:
    a = generate_token()
    b = generate_token()
    assert a != b


def test_generate_token_uses_safe_alphabet() -> None:
    token = generate_token()
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")
    assert all(c in allowed for c in token)


def test_token_entropy_bytes_is_32() -> None:
    assert TOKEN_ENTROPY_BYTES == 32


def test_hash_token_returns_64_hex_chars() -> None:
    h = hash_token(generate_token())
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_hash_token_is_deterministic() -> None:
    token = generate_token()
    assert hash_token(token) == hash_token(token)


def test_hash_token_changes_with_input() -> None:
    assert hash_token("alpha") != hash_token("beta")


def test_hash_token_rejects_empty() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        hash_token("")


def test_tokens_match_round_trip() -> None:
    token = generate_token()
    h = hash_token(token)
    assert tokens_match(token, h) is True


def test_tokens_match_rejects_wrong_token() -> None:
    h = hash_token(generate_token())
    assert tokens_match("definitely-not-the-token", h) is False


def test_tokens_match_handles_empty_inputs() -> None:
    h = hash_token(generate_token())
    assert tokens_match("", h) is False
    assert tokens_match("anything", "") is False
    assert tokens_match("", "") is False
