"""Tests for TOTP 2FA and backup codes."""

from __future__ import annotations

import base64
import time

import pytest

from theourgia.core.auth.totp import (
    BACKUP_CODE_COUNT,
    TOTP_DIGITS,
    TOTP_PERIOD,
    BackupCode,
    generate_backup_codes,
    generate_code,
    generate_secret,
    provisioning_uri,
    verify_backup_code,
    verify_code,
)


# ─────────────────────────────────────────────────────────────────────────────
# TOTP
# ─────────────────────────────────────────────────────────────────────────────


def test_generate_secret_decodes_to_20_bytes() -> None:
    secret = generate_secret()
    # Re-add padding stripped on encode
    padded = secret + "=" * (-len(secret) % 8)
    raw = base64.b32decode(padded)
    assert len(raw) == 20


def test_generate_secret_uses_random() -> None:
    a = generate_secret()
    b = generate_secret()
    assert a != b


def test_generate_code_returns_six_digit_numeric() -> None:
    code = generate_code(generate_secret())
    assert len(code) == TOTP_DIGITS
    assert code.isdigit()


def test_generate_code_is_deterministic_for_same_time() -> None:
    secret = generate_secret()
    at = 1_700_000_000.0  # arbitrary frozen time
    a = generate_code(secret, at=at)
    b = generate_code(secret, at=at)
    assert a == b


def test_generate_code_changes_across_periods() -> None:
    secret = generate_secret()
    at = 1_700_000_000.0
    a = generate_code(secret, at=at)
    b = generate_code(secret, at=at + TOTP_PERIOD)
    assert a != b


def test_verify_code_accepts_current() -> None:
    secret = generate_secret()
    at = time.time()
    code = generate_code(secret, at=at)
    assert verify_code(secret, code, at=at) is True


def test_verify_code_accepts_one_step_prior() -> None:
    secret = generate_secret()
    at = 1_700_000_000.0
    prior = generate_code(secret, at=at - TOTP_PERIOD)
    assert verify_code(secret, prior, at=at, skew=1) is True


def test_verify_code_accepts_one_step_next() -> None:
    secret = generate_secret()
    at = 1_700_000_000.0
    nxt = generate_code(secret, at=at + TOTP_PERIOD)
    assert verify_code(secret, nxt, at=at, skew=1) is True


def test_verify_code_rejects_distant_skew() -> None:
    secret = generate_secret()
    at = 1_700_000_000.0
    far = generate_code(secret, at=at + TOTP_PERIOD * 5)
    assert verify_code(secret, far, at=at, skew=1) is False


def test_verify_code_rejects_empty() -> None:
    assert verify_code(generate_secret(), "") is False


def test_verify_code_rejects_non_numeric() -> None:
    assert verify_code(generate_secret(), "abcdef") is False


def test_verify_code_rejects_wrong_length() -> None:
    assert verify_code(generate_secret(), "12345") is False
    assert verify_code(generate_secret(), "1234567") is False


def test_provisioning_uri_includes_required_fields() -> None:
    secret = generate_secret()
    uri = provisioning_uri(secret, account_name="alice@example.com")
    assert uri.startswith("otpauth://totp/")
    assert "Theourgia:alice%40example.com" in uri
    assert f"secret={secret}" in uri
    assert "issuer=Theourgia" in uri
    assert "algorithm=SHA1" in uri
    assert f"digits={TOTP_DIGITS}" in uri
    assert f"period={TOTP_PERIOD}" in uri


def test_provisioning_uri_custom_issuer() -> None:
    uri = provisioning_uri(generate_secret(), account_name="x", issuer="Custom Hub")
    assert "issuer=Custom+Hub" in uri or "issuer=Custom%20Hub" in uri


def test_provisioning_uri_rejects_empty_inputs() -> None:
    with pytest.raises(ValueError):
        provisioning_uri("", account_name="x")
    with pytest.raises(ValueError):
        provisioning_uri(generate_secret(), account_name="")


def test_known_rfc4226_test_vector() -> None:
    """RFC 4226 §D Appendix D — first HOTP test vector.

    secret: ASCII '12345678901234567890' (20 bytes)
    counter 0 → '755224'
    """
    raw = b"12345678901234567890"
    secret = base64.b32encode(raw).decode("ascii").rstrip("=")
    # counter 0 corresponds to time 0 in the TOTP variant
    code = generate_code(secret, at=0.0)
    assert code == "755224"


# ─────────────────────────────────────────────────────────────────────────────
# Backup codes
# ─────────────────────────────────────────────────────────────────────────────


def test_generate_backup_codes_returns_default_count() -> None:
    codes = generate_backup_codes()
    assert len(codes) == BACKUP_CODE_COUNT


def test_generate_backup_codes_custom_count() -> None:
    codes = generate_backup_codes(count=3)
    assert len(codes) == 3


def test_generate_backup_codes_rejects_zero() -> None:
    with pytest.raises(ValueError, match="count must be"):
        generate_backup_codes(count=0)


def test_backup_code_plain_format() -> None:
    codes = generate_backup_codes(count=1)
    plain = codes[0].plain
    assert len(plain) == 9  # 4 + '-' + 4
    assert plain[4] == "-"
    # Both halves are base32 alphabet
    base32_alphabet = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")
    assert all(c in base32_alphabet for c in plain[:4])
    assert all(c in base32_alphabet for c in plain[5:])


def test_backup_codes_are_unique() -> None:
    codes = generate_backup_codes(count=10)
    plains = {c.plain for c in codes}
    hashes = {c.hash for c in codes}
    assert len(plains) == 10
    assert len(hashes) == 10


def test_verify_backup_code_matches() -> None:
    codes = generate_backup_codes(count=3)
    hashes = [c.hash for c in codes]
    matched = verify_backup_code(codes[1].plain, hashes)
    assert matched == codes[1].hash


def test_verify_backup_code_normalizes_input() -> None:
    """Hyphens, case, and surrounding spaces should not matter."""
    codes = generate_backup_codes(count=1)
    plain = codes[0].plain
    hashes = [codes[0].hash]

    assert verify_backup_code(plain, hashes) == codes[0].hash
    assert verify_backup_code(plain.lower(), hashes) == codes[0].hash
    assert verify_backup_code(plain.replace("-", ""), hashes) == codes[0].hash
    assert verify_backup_code(f"  {plain}  ".strip(), hashes) == codes[0].hash


def test_verify_backup_code_rejects_wrong_code() -> None:
    codes = generate_backup_codes(count=3)
    hashes = [c.hash for c in codes]
    assert verify_backup_code("WRON-GCDE", hashes) is None


def test_verify_backup_code_handles_empty_inputs() -> None:
    codes = generate_backup_codes(count=1)
    assert verify_backup_code("", [codes[0].hash]) is None
    assert verify_backup_code(codes[0].plain, []) is None


def test_backup_code_dataclass_is_frozen() -> None:
    c = BackupCode(plain="x", hash="y")
    with pytest.raises(Exception):  # FrozenInstanceError
        c.plain = "z"  # type: ignore[misc]
