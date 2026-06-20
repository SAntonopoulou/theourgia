"""Versioned binary envelope for encrypted blobs.

Every encrypted value in Theourgia is wrapped in a self-describing
envelope so that:

1. The mode is identifiable without external metadata
2. The key identifier (vault data key id, or KDF params id) is embedded,
   making rotation possible
3. The nonce travels with the ciphertext (never reused)
4. Future algorithm changes can coexist with old blobs via the version
   byte

Layout (big-endian):

    +--------+--------+----------+-----------+----------+------------+
    | ver:1  | mode:1 | key_id:16| nonce_len | nonce:N  | ciphertext |
    +--------+--------+----------+-----------+----------+------------+
                                  :1          :N         :M (incl tag)

- ``ver`` (1 byte): envelope format version. Current: 0x01.
- ``mode`` (1 byte): :class:`EncryptionMode` value (1 = Mode A, 2 = Mode B).
- ``key_id`` (16 bytes): UUID identifying the wrapping key (Mode A) or
  the KDF parameters row (Mode B). Stored as raw 16-byte UUID.
- ``nonce_len`` (1 byte): length of the nonce in bytes. 12 for AES-GCM
  (Mode A), 24 for XChaCha20-Poly1305 (Mode B).
- ``nonce`` (nonce_len bytes): cipher nonce. Random per encryption.
- ``ciphertext`` (rest): ciphertext with authentication tag appended by
  the underlying cipher (AEAD).

Constants:

- ``CURRENT_VERSION = 1``
- ``KEY_ID_LEN = 16``
- ``MODE_A_NONCE_LEN = 12`` (AES-GCM)
- ``MODE_B_NONCE_LEN = 24`` (XChaCha20-Poly1305)
- ``AEAD_TAG_LEN = 16`` (16-byte tag for both ciphers)
- ``MIN_ENVELOPE_LEN`` is the smallest legal envelope length for sanity
  checks during parsing.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from theourgia.core.crypto.types import EncryptionMode, InvalidEnvelopeError

CURRENT_VERSION: int = 1
KEY_ID_LEN: int = 16
MODE_A_NONCE_LEN: int = 12  # AES-GCM canonical 96-bit nonce
MODE_B_NONCE_LEN: int = 24  # XChaCha20-Poly1305 canonical 192-bit nonce
AEAD_TAG_LEN: int = 16
HEADER_LEN: int = 1 + 1 + KEY_ID_LEN + 1  # ver + mode + key_id + nonce_len

__all__ = [
    "Envelope",
    "encode",
    "decode",
    "CURRENT_VERSION",
    "KEY_ID_LEN",
    "MODE_A_NONCE_LEN",
    "MODE_B_NONCE_LEN",
    "AEAD_TAG_LEN",
]


@dataclass(frozen=True, slots=True)
class Envelope:
    """A parsed encrypted-blob envelope."""

    version: int
    mode: EncryptionMode
    key_id: UUID
    nonce: bytes
    ciphertext: bytes

    def to_bytes(self) -> bytes:
        """Serialize this envelope to bytes."""
        return encode(
            mode=self.mode,
            key_id=self.key_id,
            nonce=self.nonce,
            ciphertext=self.ciphertext,
        )


def encode(
    *,
    mode: EncryptionMode,
    key_id: UUID,
    nonce: bytes,
    ciphertext: bytes,
) -> bytes:
    """Serialize an envelope to bytes.

    The caller supplies a nonce of the right length for the mode (12 for
    Mode A, 24 for Mode B); a :class:`InvalidEnvelopeError` is raised if
    the nonce length is wrong.

    The ``ciphertext`` is expected to include the AEAD authentication
    tag (as both AESGCM and crypto_aead_xchacha20poly1305_ietf_encrypt
    return). This module does not separate ciphertext from tag.
    """
    if mode == EncryptionMode.MODE_A_SERVER_AT_REST:
        expected_nonce_len = MODE_A_NONCE_LEN
    elif mode == EncryptionMode.MODE_B_ZERO_KNOWLEDGE:
        expected_nonce_len = MODE_B_NONCE_LEN
    else:
        msg = f"unknown encryption mode: {mode!r}"
        raise InvalidEnvelopeError(msg)

    if len(nonce) != expected_nonce_len:
        msg = (
            f"nonce length mismatch for mode {mode.name}: "
            f"got {len(nonce)} bytes, expected {expected_nonce_len}"
        )
        raise InvalidEnvelopeError(msg)
    if len(ciphertext) < AEAD_TAG_LEN:
        msg = (
            f"ciphertext too short to contain an AEAD tag "
            f"({len(ciphertext)} < {AEAD_TAG_LEN})"
        )
        raise InvalidEnvelopeError(msg)

    return bytes(
        [CURRENT_VERSION, int(mode)],
    ) + key_id.bytes + bytes([len(nonce)]) + nonce + ciphertext


def decode(blob: bytes) -> Envelope:
    """Parse an envelope from bytes.

    Raises :class:`InvalidEnvelopeError` for unknown version, unknown
    mode, or any structural malformation.
    """
    if len(blob) < HEADER_LEN:
        msg = (
            f"envelope too short to contain a header "
            f"({len(blob)} < {HEADER_LEN})"
        )
        raise InvalidEnvelopeError(msg)

    version = blob[0]
    if version != CURRENT_VERSION:
        msg = (
            f"unsupported envelope version: {version} "
            f"(this build understands version {CURRENT_VERSION})"
        )
        raise InvalidEnvelopeError(msg)

    raw_mode = blob[1]
    try:
        mode = EncryptionMode(raw_mode)
    except ValueError as exc:
        msg = f"unknown encryption mode byte: {raw_mode}"
        raise InvalidEnvelopeError(msg) from exc

    key_id = UUID(bytes=bytes(blob[2 : 2 + KEY_ID_LEN]))

    nonce_len = blob[2 + KEY_ID_LEN]
    expected = MODE_A_NONCE_LEN if mode == EncryptionMode.MODE_A_SERVER_AT_REST else MODE_B_NONCE_LEN
    if nonce_len != expected:
        msg = (
            f"nonce length mismatch for mode {mode.name}: "
            f"envelope claims {nonce_len}, expected {expected}"
        )
        raise InvalidEnvelopeError(msg)

    nonce_start = HEADER_LEN
    nonce_end = nonce_start + nonce_len
    if len(blob) < nonce_end + AEAD_TAG_LEN:
        msg = (
            f"envelope too short to contain nonce + AEAD tag "
            f"({len(blob)} < {nonce_end + AEAD_TAG_LEN})"
        )
        raise InvalidEnvelopeError(msg)

    nonce = bytes(blob[nonce_start:nonce_end])
    ciphertext = bytes(blob[nonce_end:])

    return Envelope(
        version=version,
        mode=mode,
        key_id=key_id,
        nonce=nonce,
        ciphertext=ciphertext,
    )
