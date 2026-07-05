"""TOTP router shape + route-registration tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.totp import (
    TotpBackupCodesResponse,
    TotpBeginResponse,
    TotpChallengeInput,
    TotpChallengeResponse,
    TotpStatusResponse,
    TotpVerifyInput,
    TotpVerifyResponse,
)


def test_begin_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        TotpBeginResponse(  # type: ignore[call-arg]
            secret="x",
            uri="otpauth://totp/x",
            account_name="a",
            issuer="i",
            sneaky=True,
        )


def test_verify_input_requires_6_char_min() -> None:
    with pytest.raises(ValidationError):
        TotpVerifyInput(code="123")


def test_verify_input_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        TotpVerifyInput(code="123456", sneaky=True)  # type: ignore[call-arg]


def test_verify_response_backup_codes_shape() -> None:
    r = TotpVerifyResponse(enrolled=True, backup_codes=["ABCD-EFGH"])
    assert r.enrolled is True
    assert r.backup_codes == ["ABCD-EFGH"]


def test_challenge_input_accepts_totp_and_backup() -> None:
    TotpChallengeInput(code="123456")
    TotpChallengeInput(code="ABCD-EFGH")


def test_challenge_response_flags_backup_use() -> None:
    r = TotpChallengeResponse(ok=True, used_backup_code=True, remaining_backup_codes=9)
    assert r.used_backup_code is True
    assert r.remaining_backup_codes == 9


def test_status_response_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        TotpStatusResponse(  # type: ignore[call-arg]
            enrolled=False,
            remaining_backup_codes=0,
            sneaky=True,
        )


def test_backup_codes_response_shape() -> None:
    r = TotpBackupCodesResponse(backup_codes=["ABCD-EFGH", "IJKL-MNOP"])
    assert len(r.backup_codes) == 2


def test_totp_router_is_registered_on_v1() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    paths = set(schema["paths"].keys())
    assert "/api/v1/auth/totp/status" in paths
    assert "/api/v1/auth/totp/begin" in paths
    assert "/api/v1/auth/totp/verify" in paths
    assert "/api/v1/auth/totp/challenge" in paths
    assert "/api/v1/auth/totp/backup-codes" in paths
    # DELETE + GET share the /auth/totp path via method routing
    assert "/api/v1/auth/totp" in paths
