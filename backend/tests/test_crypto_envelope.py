"""Tests for the encrypted-blob envelope format."""

from __future__ import annotations

from uuid import UUID, uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from theourgia.core.crypto import envelope
from theourgia.core.crypto.types import EncryptionMode, InvalidEnvelopeError


@pytest.fixture
def key_id() -> UUID:
    return uuid4()


def test_round_trip_mode_a(key_id: UUID) -> None:
    nonce = b"\x01" * envelope.MODE_A_NONCE_LEN
    ciphertext = b"some-ciphertext" + b"\x00" * envelope.AEAD_TAG_LEN
    blob = envelope.encode(
        mode=EncryptionMode.MODE_A_SERVER_AT_REST,
        key_id=key_id,
        nonce=nonce,
        ciphertext=ciphertext,
    )
    decoded = envelope.decode(blob)
    assert decoded.version == envelope.CURRENT_VERSION
    assert decoded.mode == EncryptionMode.MODE_A_SERVER_AT_REST
    assert decoded.key_id == key_id
    assert decoded.nonce == nonce
    assert decoded.ciphertext == ciphertext


def test_round_trip_mode_b(key_id: UUID) -> None:
    nonce = b"\x02" * envelope.MODE_B_NONCE_LEN
    ciphertext = b"x" + b"\x00" * envelope.AEAD_TAG_LEN
    blob = envelope.encode(
        mode=EncryptionMode.MODE_B_ZERO_KNOWLEDGE,
        key_id=key_id,
        nonce=nonce,
        ciphertext=ciphertext,
    )
    decoded = envelope.decode(blob)
    assert decoded.mode == EncryptionMode.MODE_B_ZERO_KNOWLEDGE
    assert decoded.nonce == nonce


def test_envelope_to_bytes_round_trips(key_id: UUID) -> None:
    env = envelope.Envelope(
        version=envelope.CURRENT_VERSION,
        mode=EncryptionMode.MODE_A_SERVER_AT_REST,
        key_id=key_id,
        nonce=b"\x05" * envelope.MODE_A_NONCE_LEN,
        ciphertext=b"ct" + b"\x00" * envelope.AEAD_TAG_LEN,
    )
    assert envelope.decode(env.to_bytes()) == env


def test_decode_rejects_unknown_version(key_id: UUID) -> None:
    nonce = b"\x01" * envelope.MODE_A_NONCE_LEN
    blob = envelope.encode(
        mode=EncryptionMode.MODE_A_SERVER_AT_REST,
        key_id=key_id,
        nonce=nonce,
        ciphertext=b"x" + b"\x00" * envelope.AEAD_TAG_LEN,
    )
    tampered = bytes([0xFF]) + blob[1:]
    with pytest.raises(InvalidEnvelopeError, match="unsupported envelope version"):
        envelope.decode(tampered)


def test_decode_rejects_unknown_mode(key_id: UUID) -> None:
    nonce = b"\x01" * envelope.MODE_A_NONCE_LEN
    blob = envelope.encode(
        mode=EncryptionMode.MODE_A_SERVER_AT_REST,
        key_id=key_id,
        nonce=nonce,
        ciphertext=b"x" + b"\x00" * envelope.AEAD_TAG_LEN,
    )
    tampered = bytes([blob[0], 0x99]) + blob[2:]
    with pytest.raises(InvalidEnvelopeError, match="unknown encryption mode"):
        envelope.decode(tampered)


def test_encode_rejects_wrong_nonce_length(key_id: UUID) -> None:
    with pytest.raises(InvalidEnvelopeError, match="nonce length mismatch"):
        envelope.encode(
            mode=EncryptionMode.MODE_A_SERVER_AT_REST,
            key_id=key_id,
            nonce=b"too-short",
            ciphertext=b"x" + b"\x00" * envelope.AEAD_TAG_LEN,
        )


def test_decode_rejects_truncated_envelope() -> None:
    with pytest.raises(InvalidEnvelopeError, match="too short"):
        envelope.decode(b"\x01\x01")


def test_decode_rejects_ciphertext_missing_tag(key_id: UUID) -> None:
    # Build a valid envelope, then strip bytes off the end to leave less than tag length
    nonce = b"\x01" * envelope.MODE_A_NONCE_LEN
    blob = envelope.encode(
        mode=EncryptionMode.MODE_A_SERVER_AT_REST,
        key_id=key_id,
        nonce=nonce,
        ciphertext=b"x" + b"\x00" * envelope.AEAD_TAG_LEN,
    )
    truncated = blob[: -envelope.AEAD_TAG_LEN]
    with pytest.raises(InvalidEnvelopeError, match="AEAD tag"):
        envelope.decode(truncated)


def test_encode_rejects_short_ciphertext(key_id: UUID) -> None:
    with pytest.raises(InvalidEnvelopeError, match="too short to contain an AEAD tag"):
        envelope.encode(
            mode=EncryptionMode.MODE_A_SERVER_AT_REST,
            key_id=key_id,
            nonce=b"\x01" * envelope.MODE_A_NONCE_LEN,
            ciphertext=b"only-15-bytes-x",
        )


@given(
    plaintext_len=st.integers(min_value=0, max_value=4096),
    mode_value=st.sampled_from([1, 2]),
)
@settings(max_examples=30, deadline=None)
def test_property_round_trip(plaintext_len: int, mode_value: int) -> None:
    """Property: encode → decode reconstructs the same envelope, regardless of size or mode."""
    mode = EncryptionMode(mode_value)
    nonce_len = envelope.MODE_A_NONCE_LEN if mode == EncryptionMode.MODE_A_SERVER_AT_REST else envelope.MODE_B_NONCE_LEN
    key_id = uuid4()
    nonce = bytes(range(nonce_len))
    ciphertext = bytes(range(plaintext_len)) + b"\x00" * envelope.AEAD_TAG_LEN
    blob = envelope.encode(mode=mode, key_id=key_id, nonce=nonce, ciphertext=ciphertext)
    decoded = envelope.decode(blob)
    assert decoded.mode == mode
    assert decoded.key_id == key_id
    assert decoded.nonce == nonce
    assert decoded.ciphertext == ciphertext
