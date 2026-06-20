"""TOTP 2FA and backup codes.

Implements RFC 6238 (TOTP) on top of RFC 4226 (HOTP) using only the
Python standard library (``hmac``, ``hashlib``, ``secrets``,
``struct``). External libraries (``pyotp``) are deliberately avoided
here because the algorithm is simple and verifiable, and the surface
area of a single stdlib-based implementation is easier to review.

Public functions:

- :func:`generate_secret` — fresh 160-bit base32 secret per RFC 4226
- :func:`provisioning_uri` — ``otpauth://`` URI consumable by any TOTP
  app (Aegis, Authy, Google Authenticator, 1Password, …) for QR display
- :func:`generate_code` — compute the 6-digit code for a given time
- :func:`verify_code` — verify a presented code with ±1 step tolerance

Backup codes (one-time-use recovery codes) live in
:func:`generate_backup_codes` / :func:`verify_backup_code`.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time
from dataclasses import dataclass
from urllib.parse import quote, urlencode

__all__ = [
    "TOTP_PERIOD",
    "TOTP_DIGITS",
    "generate_secret",
    "provisioning_uri",
    "generate_code",
    "verify_code",
    "BackupCode",
    "generate_backup_codes",
    "verify_backup_code",
]


# ─────────────────────────────────────────────────────────────────────────────
# TOTP
# ─────────────────────────────────────────────────────────────────────────────

TOTP_PERIOD: int = 30  # seconds, per RFC 6238 standard
TOTP_DIGITS: int = 6
TOTP_ALGORITHM: str = "SHA1"  # RFC 6238 default; all authenticator apps support
_TOTP_SECRET_BYTES: int = 20  # 160 bits, per RFC 4226 §4 R1


def generate_secret() -> str:
    """Generate a fresh base32-encoded TOTP secret.

    Returns the base32 representation without padding (commonly accepted
    by authenticator apps).
    """
    raw = secrets.token_bytes(_TOTP_SECRET_BYTES)
    return base64.b32encode(raw).decode("ascii").rstrip("=")


def provisioning_uri(
    secret: str,
    *,
    account_name: str,
    issuer: str = "Theourgia",
) -> str:
    """Return an ``otpauth://totp/...`` URI for the given secret.

    The URI is what authenticator apps consume from a scanned QR code.
    Both the label and the explicit ``issuer`` parameter are populated
    (some apps use one or the other).
    """
    if not secret:
        msg = "secret must not be empty"
        raise ValueError(msg)
    if not account_name:
        msg = "account_name must not be empty"
        raise ValueError(msg)

    label = f"{quote(issuer)}:{quote(account_name)}"
    params = {
        "secret": secret,
        "issuer": issuer,
        "algorithm": TOTP_ALGORITHM,
        "digits": str(TOTP_DIGITS),
        "period": str(TOTP_PERIOD),
    }
    return f"otpauth://totp/{label}?{urlencode(params)}"


def generate_code(secret: str, *, at: float | None = None) -> str:
    """Compute the TOTP code for the given time (default: now)."""
    if at is None:
        at = time.time()
    counter = int(at) // TOTP_PERIOD
    return _hotp(secret, counter)


def verify_code(secret: str, code: str, *, at: float | None = None, skew: int = 1) -> bool:
    """Verify a presented TOTP code with a ``±skew`` step tolerance.

    Default ``skew=1`` allows the code from the previous or next 30-second
    window — accommodates clock drift up to ~30s on either side.

    Returns ``False`` for empty or malformed codes; constant-time at the
    comparison step.
    """
    if not code:
        return False
    code = code.strip()
    if not code.isdigit() or len(code) != TOTP_DIGITS:
        return False

    if at is None:
        at = time.time()
    counter = int(at) // TOTP_PERIOD

    for offset in range(-skew, skew + 1):
        candidate = _hotp(secret, counter + offset)
        if hmac.compare_digest(candidate, code):
            return True
    return False


def _hotp(secret: str, counter: int) -> str:
    """Compute the HOTP value for ``counter`` per RFC 4226."""
    # Re-add base32 padding the encoder stripped
    padded = secret + "=" * (-len(secret) % 8)
    try:
        key = base64.b32decode(padded, casefold=True)
    except Exception as exc:
        msg = "invalid base32 TOTP secret"
        raise ValueError(msg) from exc
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    truncated = (
        (digest[offset] & 0x7F) << 24
        | digest[offset + 1] << 16
        | digest[offset + 2] << 8
        | digest[offset + 3]
    )
    code = truncated % (10**TOTP_DIGITS)
    return str(code).zfill(TOTP_DIGITS)


# ─────────────────────────────────────────────────────────────────────────────
# Backup codes
# ─────────────────────────────────────────────────────────────────────────────

BACKUP_CODE_COUNT: int = 10
_BACKUP_CODE_BYTES: int = 5  # → 8 base32 chars before formatting


@dataclass(frozen=True, slots=True)
class BackupCode:
    """A backup code pair: plain (show once to user) and hash (store).

    Never persist the plain value beyond the one display to the user.
    Only the hash is durable.
    """

    plain: str
    hash: str


def generate_backup_codes(count: int = BACKUP_CODE_COUNT) -> list[BackupCode]:
    """Generate ``count`` fresh backup codes.

    Codes are formatted as ``XXXX-XXXX`` (8 base32 characters with a
    hyphen for readability). The hash is normalized first: uppercased,
    hyphens stripped.
    """
    if count < 1:
        msg = "count must be >= 1"
        raise ValueError(msg)

    result: list[BackupCode] = []
    for _ in range(count):
        raw = base64.b32encode(secrets.token_bytes(_BACKUP_CODE_BYTES)).decode("ascii").rstrip("=")
        plain = f"{raw[:4]}-{raw[4:]}"
        result.append(BackupCode(plain=plain, hash=_hash_backup_code(plain)))
    return result


def verify_backup_code(plain: str, stored_hashes: list[str]) -> str | None:
    """Verify a presented backup code against a list of stored hashes.

    Returns the matching stored hash on success (caller marks that code
    used). Returns ``None`` on no match. Constant-time per stored hash.
    """
    if not plain or not stored_hashes:
        return None
    candidate = _hash_backup_code(plain)
    matched: str | None = None
    for stored in stored_hashes:
        # Constant-time across all entries: don't short-circuit
        if hmac.compare_digest(candidate, stored):
            matched = stored
    return matched


def _hash_backup_code(plain: str) -> str:
    """SHA-256 hex of the normalized (uppercased, hyphens stripped) code."""
    normalized = plain.replace("-", "").replace(" ", "").upper()
    if not normalized:
        msg = "backup code is empty after normalization"
        raise ValueError(msg)
    return hashlib.sha256(normalized.encode("ascii")).hexdigest()
