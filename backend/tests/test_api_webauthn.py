"""WebAuthn router shape + config-gate tests.

Live ceremony verification is exercised by the deploy round-trip
(browser navigator.credentials.* against dev.theourgia.com); this
suite covers wiring, schema shapes, and the 503-when-unconfigured
guarantee.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.webauthn import (
    AssertFinishInput,
    RegisterFinishInput,
    UpdateCredentialInput,
    WebauthnCredentialListResponse,
    WebauthnCredentialRead,
    get_webauthn_service,
)


def test_register_finish_input_requires_credential() -> None:
    with pytest.raises(ValidationError):
        RegisterFinishInput()  # type: ignore[call-arg]


def test_register_finish_input_defaults_nickname_empty() -> None:
    payload = RegisterFinishInput(credential={"id": "abc"})
    assert payload.nickname == ""


def test_register_finish_input_rejects_long_nickname() -> None:
    with pytest.raises(ValidationError):
        RegisterFinishInput(credential={"id": "x"}, nickname="a" * 129)


def test_assert_finish_input_requires_credential() -> None:
    with pytest.raises(ValidationError):
        AssertFinishInput()  # type: ignore[call-arg]


def test_update_credential_input_requires_nonempty_nickname() -> None:
    with pytest.raises(ValidationError):
        UpdateCredentialInput(nickname="")


def test_update_credential_input_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        UpdateCredentialInput(nickname="ok", sneaky=True)  # type: ignore[call-arg]


def test_credential_read_extra_forbidden() -> None:
    from datetime import UTC, datetime

    when = datetime(2026, 7, 5, tzinfo=UTC)
    with pytest.raises(ValidationError):
        WebauthnCredentialRead(  # type: ignore[call-arg]
            id="x",
            nickname="key",
            transports="usb",
            sign_count=0,
            created_at=when,
            last_used_at=None,
            sneaky=True,
        )


def test_credential_list_shape() -> None:
    from datetime import UTC, datetime

    when = datetime(2026, 7, 5, tzinfo=UTC)
    listing = WebauthnCredentialListResponse(
        credentials=[
            WebauthnCredentialRead(
                id="x",
                nickname="key",
                transports="usb,internal",
                sign_count=0,
                created_at=when,
                last_used_at=None,
            )
        ]
    )
    assert len(listing.credentials) == 1


def test_get_webauthn_service_503s_when_unconfigured(monkeypatch) -> None:
    from fastapi import HTTPException

    from theourgia.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "webauthn_rp_id", None)
    monkeypatch.setattr(settings, "webauthn_origin", None)

    with pytest.raises(HTTPException) as info:
        get_webauthn_service()
    assert info.value.status_code == 503
    assert info.value.detail == "webauthn not configured"


def test_get_webauthn_service_builds_when_configured(monkeypatch) -> None:
    from theourgia.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "webauthn_rp_id", "theourgia.example.com")
    monkeypatch.setattr(
        settings, "webauthn_origin", "https://theourgia.example.com"
    )
    monkeypatch.setattr(settings, "webauthn_rp_name", "Theourgia Test")

    service = get_webauthn_service()
    assert service is not None


def test_webauthn_router_is_registered_on_v1() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    paths = set(schema["paths"].keys())
    assert "/api/v1/auth/webauthn/register/begin" in paths
    assert "/api/v1/auth/webauthn/register/finish" in paths
    assert "/api/v1/auth/webauthn/assert/begin" in paths
    assert "/api/v1/auth/webauthn/assert/finish" in paths
    assert "/api/v1/auth/webauthn/credentials" in paths
    assert "/api/v1/auth/webauthn/credentials/{credential_id}" in paths
