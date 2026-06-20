"""Tests for the email backends (console, null, resend, smtp).

Backends that hit the network (Resend, SMTP) are tested against
mocked clients — the wrapper logic is what matters, not the
upstream HTTP/SMTP library.
"""

from __future__ import annotations

import io
import sys
import types
from typing import Any

import pytest

from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
)
from theourgia.core.email.backends.console import ConsoleEmailBackend
from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.backends.resend import ResendEmailBackend
from theourgia.core.email.backends.smtp import SMTPConfig, SMTPEmailBackend
from theourgia.core.email.message import EmailAddress, EmailMessage


def _msg(**overrides: Any) -> EmailMessage:
    defaults = {
        "to": (EmailAddress(email="to@example.com", name="Recipient"),),
        "sender": EmailAddress(email="from@example.com", name="Sender"),
        "subject": "Hello",
        "body_text": "Hi there.",
    }
    defaults.update(overrides)
    return EmailMessage(**defaults)


# ── Protocol satisfaction ────────────────────────────────────────────


def test_console_backend_satisfies_protocol() -> None:
    backend: EmailBackend = ConsoleEmailBackend()
    assert backend.name == "console"


def test_null_backend_satisfies_protocol() -> None:
    backend: EmailBackend = NullEmailBackend()
    assert backend.name == "null"


# ── Console backend ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_console_backend_writes_message_to_stream() -> None:
    buffer = io.StringIO()
    backend = ConsoleEmailBackend(stream=buffer)
    result = await backend.send(_msg(subject="ConsoleTest"))
    output = buffer.getvalue()
    assert "ConsoleTest" in output
    assert "to@example.com" in output
    assert "from@example.com" in output
    assert "Hi there." in output
    assert result.provider == "console"
    assert result.accepted_recipients == ("to@example.com",)


@pytest.mark.asyncio
async def test_console_backend_includes_template_name_when_set() -> None:
    buffer = io.StringIO()
    backend = ConsoleEmailBackend(stream=buffer)
    await backend.send(_msg(template_name="auth.password_reset"))
    assert "auth.password_reset" in buffer.getvalue()


# ── Null backend ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_null_backend_records_sends() -> None:
    backend = NullEmailBackend()
    await backend.send(_msg(subject="A"))
    await backend.send(_msg(subject="B"))
    assert len(backend.sent) == 2
    assert backend.sent[0].subject == "A"
    assert backend.sent[1].subject == "B"


@pytest.mark.asyncio
async def test_null_backend_assigns_unique_provider_message_id() -> None:
    backend = NullEmailBackend()
    r1 = await backend.send(_msg(subject="A"))
    r2 = await backend.send(_msg(subject="B"))
    assert r1.provider_message_id == "null-1"
    assert r2.provider_message_id == "null-2"


@pytest.mark.asyncio
async def test_null_backend_find_by_template() -> None:
    backend = NullEmailBackend()
    await backend.send(_msg(template_name="auth.password_reset"))
    await backend.send(_msg(template_name="account.welcome"))
    await backend.send(_msg(template_name="auth.password_reset"))
    matches = backend.find_by_template("auth.password_reset")
    assert len(matches) == 2


@pytest.mark.asyncio
async def test_null_backend_find_by_recipient() -> None:
    backend = NullEmailBackend()
    await backend.send(_msg(to=(EmailAddress(email="a@x.com"),)))
    await backend.send(_msg(to=(EmailAddress(email="b@x.com"),)))
    await backend.send(_msg(to=(EmailAddress(email="a@x.com"),)))
    assert len(backend.find_by_recipient("a@x.com")) == 2


def test_null_backend_clear_resets() -> None:
    backend = NullEmailBackend()

    import asyncio

    asyncio.run(backend.send(_msg()))
    assert len(backend.sent) == 1
    backend.clear()
    assert backend.sent == []


# ── Resend backend (stubbed) ─────────────────────────────────────────


@pytest.fixture
def fake_resend(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Inject a fake `resend` package into sys.modules."""
    captured: dict[str, Any] = {"payload": None, "should_raise": None}

    fake = types.ModuleType("resend")

    class _Emails:
        @staticmethod
        def send(payload: dict[str, Any]) -> dict[str, Any]:
            if captured["should_raise"] is not None:
                raise captured["should_raise"]
            captured["payload"] = payload
            return {"id": "resend-msg-id-123"}

    fake.Emails = _Emails  # type: ignore[attr-defined]
    fake.api_key = None  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "resend", fake)
    return captured


@pytest.mark.asyncio
async def test_resend_backend_requires_api_key() -> None:
    with pytest.raises(ValueError, match="API key"):
        ResendEmailBackend(api_key="")


@pytest.mark.asyncio
async def test_resend_backend_sets_api_key_on_module(
    fake_resend: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    ResendEmailBackend(api_key="re_test_key")
    import resend

    assert resend.api_key == "re_test_key"


@pytest.mark.asyncio
async def test_resend_backend_send_builds_payload(
    fake_resend: dict[str, Any],
) -> None:
    backend = ResendEmailBackend(api_key="re_test_key")
    result = await backend.send(
        _msg(
            subject="Hello",
            body_text="text body",
            body_html="<p>html body</p>",
            tags=("welcome",),
        )
    )
    payload = fake_resend["payload"]
    assert payload["from"] == '"Sender" <from@example.com>'
    assert payload["to"] == ["to@example.com"]
    assert payload["subject"] == "Hello"
    assert payload["text"] == "text body"
    assert payload["html"] == "<p>html body</p>"
    assert payload["tags"] == [{"name": "welcome"}]
    assert result.provider == "resend"
    assert result.provider_message_id == "resend-msg-id-123"


@pytest.mark.asyncio
async def test_resend_backend_wraps_provider_errors(
    fake_resend: dict[str, Any],
) -> None:
    fake_resend["should_raise"] = RuntimeError("upstream is down")
    backend = ResendEmailBackend(api_key="re_test_key")
    with pytest.raises(EmailDeliveryError, match="Resend delivery failed"):
        await backend.send(_msg())


def test_resend_backend_import_error_when_package_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If the resend package is genuinely absent (not even our fake),
    instantiation raises a clear EmailDeliveryError instead of an
    obscure ImportError."""
    monkeypatch.delitem(sys.modules, "resend", raising=False)
    # Force the import to fail by injecting None
    monkeypatch.setitem(sys.modules, "resend", None)
    with pytest.raises(EmailDeliveryError, match="resend"):
        ResendEmailBackend(api_key="re_test_key")


# ── SMTP backend (stubbed) ───────────────────────────────────────────


def test_smtp_config_requires_host() -> None:
    with pytest.raises(ValueError, match="host"):
        SMTPEmailBackend(SMTPConfig(host=""))


@pytest.mark.asyncio
async def test_smtp_backend_calls_send_message(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """We stub smtplib.SMTP so the test doesn't hit a real server."""
    captured: dict[str, Any] = {}

    class _StubSMTP:
        def __init__(self, host: str, port: int, timeout: float) -> None:
            captured["host"] = host
            captured["port"] = port

        def ehlo(self) -> None:
            captured.setdefault("ehlo_count", 0)
            captured["ehlo_count"] += 1

        def starttls(self, context: Any) -> None:
            captured["starttls"] = True

        def login(self, username: str, password: str) -> None:
            captured["login"] = (username, password)

        def send_message(self, mime: Any, *, from_addr: str, to_addrs: list[str]) -> dict:
            captured["from_addr"] = from_addr
            captured["to_addrs"] = to_addrs
            captured["mime"] = mime
            return {}

        def quit(self) -> None:
            captured["quit"] = True

    import smtplib

    monkeypatch.setattr(smtplib, "SMTP", _StubSMTP)

    backend = SMTPEmailBackend(
        SMTPConfig(
            host="smtp.example.com",
            port=587,
            username="user",
            password="pass",
            use_starttls=True,
        )
    )
    result = await backend.send(_msg(subject="SMTPTest"))

    assert captured["host"] == "smtp.example.com"
    assert captured["port"] == 587
    assert captured["starttls"] is True
    assert captured["login"] == ("user", "pass")
    assert captured["from_addr"] == "from@example.com"
    assert "to@example.com" in captured["to_addrs"]
    assert result.provider == "smtp"
    assert result.rejected_recipients == ()


@pytest.mark.asyncio
async def test_smtp_backend_wraps_smtp_exceptions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import smtplib

    class _BoomSMTP:
        def __init__(self, host: str, port: int, timeout: float) -> None:
            raise smtplib.SMTPConnectError(421, "service not available")

    monkeypatch.setattr(smtplib, "SMTP", _BoomSMTP)

    backend = SMTPEmailBackend(SMTPConfig(host="smtp.example.com"))
    with pytest.raises(EmailDeliveryError, match="SMTP delivery failed"):
        await backend.send(_msg())
