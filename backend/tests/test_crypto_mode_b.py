"""Tests for Mode B — zero-knowledge XChaCha20-Poly1305 encryption.

Reminder: in production the encryption happens in the browser. These
tests exercise the Python reference implementation against the canonical
contract so that frontend implementations have a known-good oracle.
"""

from __future__ import annotations

import secrets
from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from theourgia.core.crypto import mode_b
from theourgia.core.crypto.envelope import decode
from theourgia.core.crypto.types import DecryptionError, EncryptionError, EncryptionMode


@pytest.fixture
def key() -> bytes:
    return secrets.token_bytes(32)


def test_round_trip(key: bytes) -> None:
    plaintext = b"sealed: my initiation notes"
    kdf_id = uuid4()
    blob = mode_b.encrypt(plaintext, key, kdf_params_id=kdf_id)
    assert mode_b.decrypt(blob, key) == plaintext


def test_envelope_carries_mode_b(key: bytes) -> None:
    blob = mode_b.encrypt(b"x", key, kdf_params_id=uuid4())
    env = decode(blob)
    assert env.mode == EncryptionMode.MODE_B_ZERO_KNOWLEDGE


def test_each_encryption_uses_fresh_nonce(key: bytes) -> None:
    kdf_id = uuid4()
    a = mode_b.encrypt(b"identical", key, kdf_params_id=kdf_id)
    b = mode_b.encrypt(b"identical", key, kdf_params_id=kdf_id)
    assert a != b


def test_decrypt_with_wrong_key_fails(key: bytes) -> None:
    blob = mode_b.encrypt(b"secret", key, kdf_params_id=uuid4())
    other = secrets.token_bytes(32)
    with pytest.raises(DecryptionError):
        mode_b.decrypt(blob, other)


def test_decrypt_tampered_ciphertext_fails(key: bytes) -> None:
    blob = mode_b.encrypt(b"secret", key, kdf_params_id=uuid4())
    tampered = blob[:-5] + bytes([blob[-5] ^ 0x01]) + blob[-4:]
    with pytest.raises(DecryptionError):
        mode_b.decrypt(tampered, key)


def test_aad_binding(key: bytes) -> None:
    blob = mode_b.encrypt(b"x", key, kdf_params_id=uuid4(), associated_data=b"ctx-A")
    with pytest.raises(DecryptionError):
        mode_b.decrypt(blob, key, associated_data=b"ctx-B")


def test_encrypt_rejects_wrong_key_length() -> None:
    with pytest.raises(EncryptionError, match="32 bytes"):
        mode_b.encrypt(b"x", b"too-short", kdf_params_id=uuid4())


def test_decrypt_rejects_wrong_key_length() -> None:
    blob = mode_b.encrypt(b"x", secrets.token_bytes(32), kdf_params_id=uuid4())
    with pytest.raises(DecryptionError, match="32 bytes"):
        mode_b.decrypt(blob, b"too-short")


@given(
    plaintext=st.binary(min_size=0, max_size=2048),
    aad=st.one_of(st.none(), st.binary(min_size=0, max_size=64)),
)
@settings(max_examples=20, deadline=None)
def test_property_round_trip(plaintext: bytes, aad: bytes | None) -> None:
    key = secrets.token_bytes(32)
    blob = mode_b.encrypt(plaintext, key, kdf_params_id=uuid4(), associated_data=aad)
    assert mode_b.decrypt(blob, key, associated_data=aad) == plaintext
