"""Tests for Mode A — server-side AES-256-GCM encryption."""

from __future__ import annotations

from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from theourgia.core.crypto import mode_a
from theourgia.core.crypto.envelope import decode
from theourgia.core.crypto.keys import DataKey, generate_data_key
from theourgia.core.crypto.types import DecryptionError, EncryptionMode


@pytest.fixture
def dk() -> DataKey:
    return generate_data_key(uuid4())


def test_round_trip(dk: DataKey) -> None:
    plaintext = b"a chant of seven names spoken on the dark moon"
    blob = mode_a.encrypt(plaintext, dk)
    assert mode_a.decrypt(blob, dk) == plaintext


def test_envelope_carries_correct_mode(dk: DataKey) -> None:
    blob = mode_a.encrypt(b"x", dk)
    env = decode(blob)
    assert env.mode == EncryptionMode.MODE_A_SERVER_AT_REST
    assert env.key_id == dk.id


def test_each_encryption_uses_fresh_nonce(dk: DataKey) -> None:
    """Two encryptions of the same plaintext produce different ciphertexts.

    The nonce is randomly generated per encryption; AES-GCM with a fresh
    nonce produces distinct ciphertext even for identical plaintext.
    """
    a = mode_a.encrypt(b"identical", dk)
    b = mode_a.encrypt(b"identical", dk)
    assert a != b
    assert mode_a.decrypt(a, dk) == mode_a.decrypt(b, dk) == b"identical"


def test_decrypt_with_wrong_key_fails() -> None:
    dk1 = generate_data_key(uuid4())
    dk2 = generate_data_key(uuid4())
    blob = mode_a.encrypt(b"secret", dk1)
    with pytest.raises(DecryptionError, match="does not match"):
        mode_a.decrypt(blob, dk2)


def test_decrypt_tampered_ciphertext_fails(dk: DataKey) -> None:
    blob = mode_a.encrypt(b"secret", dk)
    # Flip a bit in the body (avoid envelope header)
    body_index = -5
    tampered = blob[:body_index] + bytes([blob[body_index] ^ 0x01]) + blob[body_index + 1 :]
    with pytest.raises(DecryptionError):
        mode_a.decrypt(tampered, dk)


def test_aad_binding_prevents_swap(dk: DataKey) -> None:
    """If a value is encrypted with AAD = X, decrypting with AAD = Y fails."""
    blob = mode_a.encrypt(b"private notes", dk, associated_data=b"entry-id-A")
    with pytest.raises(DecryptionError):
        mode_a.decrypt(blob, dk, associated_data=b"entry-id-B")


def test_aad_required_for_decrypt_if_used_for_encrypt(dk: DataKey) -> None:
    blob = mode_a.encrypt(b"x", dk, associated_data=b"context")
    with pytest.raises(DecryptionError):
        mode_a.decrypt(blob, dk)  # missing AAD


@given(
    plaintext=st.binary(min_size=0, max_size=2048),
    aad=st.one_of(st.none(), st.binary(min_size=0, max_size=64)),
)
@settings(max_examples=25, deadline=None)
def test_property_round_trip(plaintext: bytes, aad: bytes | None) -> None:
    """Property: any plaintext + AAD round-trips through Mode A."""
    dk = generate_data_key(uuid4())
    blob = mode_a.encrypt(plaintext, dk, associated_data=aad)
    assert mode_a.decrypt(blob, dk, associated_data=aad) == plaintext


def test_empty_plaintext_round_trips(dk: DataKey) -> None:
    blob = mode_a.encrypt(b"", dk)
    assert mode_a.decrypt(blob, dk) == b""


def test_large_plaintext_round_trips(dk: DataKey) -> None:
    plaintext = b"Praise be to Hekate" * 5_000  # ~95 KB
    blob = mode_a.encrypt(plaintext, dk)
    assert mode_a.decrypt(blob, dk) == plaintext
