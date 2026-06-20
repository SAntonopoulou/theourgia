"""Tests for the email-service factory (backend selection from settings)."""

from __future__ import annotations

import sys
import types
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import SecretStr

from theourgia.core.email.backends.console import ConsoleEmailBackend
from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.backends.resend import ResendEmailBackend
from theourgia.core.email.backends.smtp import SMTPEmailBackend
from theourgia.core.email.factory import (
    build_backend_from_settings,
    build_email_service,
)


def _settings(**kwargs: Any) -> SimpleNamespace:
    """Minimal settings stand-in matching the attrs the factory reads."""
    defaults = dict(
        email_backend="console",
        email_default_from="from@example.com",
        email_default_from_name="Sender",
        email_dry_run=False,
        resend_api_key=None,
        smtp_host="",
        smtp_port=587,
        smtp_username="",
        smtp_password=None,
        smtp_use_starttls=True,
        smtp_use_ssl=False,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_console_backend_selected_by_default() -> None:
    backend = build_backend_from_settings(_settings(email_backend="console"))
    assert isinstance(backend, ConsoleEmailBackend)


def test_null_backend_selected_when_configured() -> None:
    backend = build_backend_from_settings(_settings(email_backend="null"))
    assert isinstance(backend, NullEmailBackend)


def test_resend_backend_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(ValueError, match="RESEND_API_KEY"):
        build_backend_from_settings(
            _settings(email_backend="resend", resend_api_key=None)
        )


def test_resend_backend_constructed_with_secret_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = types.ModuleType("resend")
    fake.api_key = None  # type: ignore[attr-defined]
    fake.Emails = types.SimpleNamespace(send=lambda payload: {})  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "resend", fake)

    backend = build_backend_from_settings(
        _settings(
            email_backend="resend",
            resend_api_key=SecretStr("re_secret_xyz"),
        )
    )
    assert isinstance(backend, ResendEmailBackend)
    import resend

    assert resend.api_key == "re_secret_xyz"


def test_smtp_backend_requires_host() -> None:
    with pytest.raises(ValueError, match="SMTP_HOST"):
        build_backend_from_settings(_settings(email_backend="smtp", smtp_host=""))


def test_smtp_backend_constructed_with_credentials() -> None:
    backend = build_backend_from_settings(
        _settings(
            email_backend="smtp",
            smtp_host="smtp.example.com",
            smtp_port=587,
            smtp_username="u",
            smtp_password=SecretStr("p"),
        )
    )
    assert isinstance(backend, SMTPEmailBackend)


def test_unknown_backend_raises() -> None:
    with pytest.raises(ValueError, match="unknown email backend"):
        build_backend_from_settings(_settings(email_backend="carrier_pigeon"))


def test_build_email_service_requires_default_from() -> None:
    with pytest.raises(ValueError, match="EMAIL_DEFAULT_FROM"):
        build_email_service(_settings(email_default_from=""))


def test_build_email_service_default_sender_has_name_when_set() -> None:
    service = build_email_service(
        _settings(email_default_from="x@y.com", email_default_from_name="Theourgia")
    )
    # Verifiable indirectly via sending — exposed via the service's
    # internal state. Inspect the private attr for the assertion.
    assert service._default_sender.email == "x@y.com"  # type: ignore[attr-defined]
    assert service._default_sender.name == "Theourgia"  # type: ignore[attr-defined]


def test_build_email_service_respects_dry_run_flag() -> None:
    service = build_email_service(
        _settings(email_default_from="x@y.com", email_dry_run=True)
    )
    assert service.dry_run is True
