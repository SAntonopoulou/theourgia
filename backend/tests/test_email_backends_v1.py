"""Tests for the v1-006 email backends (Postmark, SES, Mailgun).

All three speak HTTPS through the injectable ``EmailHTTPTransport``
Protocol, so every test runs against an in-memory stub — no network,
no provider SDKs. SES signing is additionally verified against the
AWS-documented SigV4 key-derivation example vector.
"""

from __future__ import annotations

import base64
import json
import re
import urllib.parse
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import SecretStr

from theourgia.core.clock import FakeClock, configure_clock, reset_clock
from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
)
from theourgia.core.email.backends.mailgun import MailgunEmailBackend
from theourgia.core.email.backends.postmark import PostmarkEmailBackend
from theourgia.core.email.backends.ses import (
    SESEmailBackend,
    derive_signing_key,
)
from theourgia.core.email.factory import build_backend_from_settings
from theourgia.core.email.message import (
    Attachment,
    EmailAddress,
    EmailMessage,
)


def _msg(**overrides: Any) -> EmailMessage:
    defaults = {
        "to": (EmailAddress(email="to@example.com", name="Recipient"),),
        "sender": EmailAddress(email="from@example.com", name="Sender"),
        "subject": "Hello",
        "body_text": "Hi there.",
    }
    defaults.update(overrides)
    return EmailMessage(**defaults)


class StubTransport:
    """In-memory EmailHTTPTransport — records calls, returns a canned
    response or raises a configured exception."""

    def __init__(
        self,
        *,
        status: int = 200,
        body: dict[str, Any] | None = None,
        exc: Exception | None = None,
    ) -> None:
        self.status = status
        self.body = body if body is not None else {}
        self.exc = exc
        self.calls: list[dict[str, Any]] = []

    async def post(
        self,
        url: str,
        *,
        headers: dict[str, str],
        content: bytes,
    ) -> tuple[int, dict[str, Any]]:
        self.calls.append({"url": url, "headers": headers, "content": content})
        if self.exc is not None:
            raise self.exc
        return self.status, self.body


@pytest.fixture
def fixed_clock() -> Any:
    """Pin the clock substrate so SigV4 timestamps are deterministic
    (FakeClock defaults to 2026-01-01T00:00:00Z)."""
    clock = FakeClock()
    configure_clock(clock)
    yield clock
    reset_clock()


# ── Protocol satisfaction ────────────────────────────────────────────


def test_postmark_backend_satisfies_protocol() -> None:
    backend: EmailBackend = PostmarkEmailBackend(
        "pm-token", transport=StubTransport()
    )
    assert backend.name == "postmark"


def test_ses_backend_satisfies_protocol() -> None:
    backend: EmailBackend = SESEmailBackend(
        region="eu-west-1",
        access_key_id="AKIDEXAMPLE",
        secret_access_key="secret",
        transport=StubTransport(),
    )
    assert backend.name == "ses"


def test_mailgun_backend_satisfies_protocol() -> None:
    backend: EmailBackend = MailgunEmailBackend(
        "key-xyz", "mg.example.com", transport=StubTransport()
    )
    assert backend.name == "mailgun"


# ── Postmark backend ─────────────────────────────────────────────────


def test_postmark_backend_requires_server_token() -> None:
    with pytest.raises(ValueError, match="server token"):
        PostmarkEmailBackend("", transport=StubTransport())


def test_postmark_backend_requires_message_stream() -> None:
    with pytest.raises(ValueError, match="message stream"):
        PostmarkEmailBackend(
            "pm-token", message_stream="", transport=StubTransport()
        )


@pytest.mark.asyncio
async def test_postmark_backend_send_builds_payload() -> None:
    transport = StubTransport(
        body={"MessageID": "pm-msg-1", "ErrorCode": 0, "Message": "OK"}
    )
    backend = PostmarkEmailBackend("pm-token", transport=transport)
    result = await backend.send(
        _msg(
            body_text="text body",
            body_html="<p>html body</p>",
            reply_to=EmailAddress(email="reply@example.com"),
            tags=("welcome", "dropped-second-tag"),
            headers={"X-Custom": "1"},
        )
    )

    call = transport.calls[0]
    assert call["url"] == "https://api.postmarkapp.com/email"
    assert call["headers"]["X-Postmark-Server-Token"] == "pm-token"
    assert call["headers"]["Content-Type"] == "application/json"

    payload = json.loads(call["content"])
    assert payload["From"] == '"Sender" <from@example.com>'
    assert payload["To"] == '"Recipient" <to@example.com>'
    assert payload["Subject"] == "Hello"
    assert payload["TextBody"] == "text body"
    assert payload["HtmlBody"] == "<p>html body</p>"
    assert payload["MessageStream"] == "outbound"
    assert payload["ReplyTo"] == "reply@example.com"
    assert payload["Tag"] == "welcome"  # Postmark carries exactly one tag
    assert payload["Headers"] == [{"Name": "X-Custom", "Value": "1"}]

    assert result.provider == "postmark"
    assert result.provider_message_id == "pm-msg-1"
    assert result.accepted_recipients == ("to@example.com",)


@pytest.mark.asyncio
async def test_postmark_backend_configurable_message_stream() -> None:
    transport = StubTransport(body={"ErrorCode": 0})
    backend = PostmarkEmailBackend(
        "pm-token", message_stream="broadcast", transport=transport
    )
    await backend.send(_msg())
    payload = json.loads(transport.calls[0]["content"])
    assert payload["MessageStream"] == "broadcast"


@pytest.mark.asyncio
async def test_postmark_backend_encodes_attachments_base64() -> None:
    transport = StubTransport(body={"ErrorCode": 0})
    backend = PostmarkEmailBackend("pm-token", transport=transport)
    await backend.send(
        _msg(
            attachments=(
                Attachment(
                    filename="sigil.png",
                    content_type="image/png",
                    content=b"\x89PNG",
                ),
            )
        )
    )
    payload = json.loads(transport.calls[0]["content"])
    assert payload["Attachments"] == [
        {
            "Name": "sigil.png",
            "Content": base64.b64encode(b"\x89PNG").decode("ascii"),
            "ContentType": "image/png",
        }
    ]


@pytest.mark.asyncio
async def test_postmark_backend_raises_on_error_code() -> None:
    """Postmark can report failure inside an HTTP 200 body."""
    transport = StubTransport(
        body={"ErrorCode": 300, "Message": "Invalid 'From' address."}
    )
    backend = PostmarkEmailBackend("pm-token", transport=transport)
    with pytest.raises(EmailDeliveryError, match="Postmark rejected") as excinfo:
        await backend.send(_msg())
    assert "ErrorCode 300" in (excinfo.value.provider_error or "")


@pytest.mark.asyncio
async def test_postmark_backend_raises_on_http_error() -> None:
    transport = StubTransport(status=500, body={})
    backend = PostmarkEmailBackend("pm-token", transport=transport)
    with pytest.raises(EmailDeliveryError, match="HTTP 500"):
        await backend.send(_msg())


@pytest.mark.asyncio
async def test_postmark_backend_wraps_transport_errors() -> None:
    transport = StubTransport(exc=RuntimeError("connection refused"))
    backend = PostmarkEmailBackend("pm-token", transport=transport)
    with pytest.raises(EmailDeliveryError, match="Postmark delivery failed"):
        await backend.send(_msg())


# ── SES backend ──────────────────────────────────────────────────────


def test_ses_signing_key_matches_aws_documented_vector() -> None:
    """Known-answer test from the AWS SigV4 docs ("Examples of how to
    derive a signing key"): secret wJalr.../20120215/us-east-1/iam."""
    key = derive_signing_key(
        "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
        "20120215",
        "us-east-1",
        "iam",
    )
    assert key.hex() == (
        "f4780e2d9f65fa895f9c67b32ce1baf0b0d8a43505a000a1a9e090d414db404d"
    )


def test_ses_backend_requires_region() -> None:
    with pytest.raises(ValueError, match="region"):
        SESEmailBackend(
            region="",
            access_key_id="AKIDEXAMPLE",
            secret_access_key="secret",
            transport=StubTransport(),
        )


def test_ses_backend_rejects_malformed_region() -> None:
    with pytest.raises(ValueError, match="region"):
        SESEmailBackend(
            region="eu-west-1/../evil",
            access_key_id="AKIDEXAMPLE",
            secret_access_key="secret",
            transport=StubTransport(),
        )


def test_ses_backend_requires_credentials() -> None:
    with pytest.raises(ValueError, match="access key"):
        SESEmailBackend(
            region="eu-west-1",
            access_key_id="",
            secret_access_key="secret",
            transport=StubTransport(),
        )
    with pytest.raises(ValueError, match="secret access key"):
        SESEmailBackend(
            region="eu-west-1",
            access_key_id="AKIDEXAMPLE",
            secret_access_key="",
            transport=StubTransport(),
        )


@pytest.mark.asyncio
async def test_ses_backend_send_builds_signed_request(fixed_clock: Any) -> None:
    transport = StubTransport(body={"MessageId": "ses-msg-1"})
    backend = SESEmailBackend(
        region="eu-west-1",
        access_key_id="AKIDEXAMPLE",
        secret_access_key="secret",
        transport=transport,
    )
    result = await backend.send(
        _msg(
            body_text="text body",
            body_html="<p>html body</p>",
            cc=(EmailAddress(email="cc@example.com"),),
            reply_to=EmailAddress(email="reply@example.com"),
        )
    )

    call = transport.calls[0]
    assert call["url"] == (
        "https://email.eu-west-1.amazonaws.com/v2/email/outbound-emails"
    )
    headers = call["headers"]
    assert headers["host"] == "email.eu-west-1.amazonaws.com"
    assert headers["x-amz-date"] == "20260101T000000Z"  # FakeClock epoch
    assert re.fullmatch(
        r"AWS4-HMAC-SHA256 "
        r"Credential=AKIDEXAMPLE/20260101/eu-west-1/ses/aws4_request, "
        r"SignedHeaders=content-type;host;x-amz-date, "
        r"Signature=[0-9a-f]{64}",
        headers["authorization"],
    )

    payload = json.loads(call["content"])
    assert payload["FromEmailAddress"] == '"Sender" <from@example.com>'
    assert payload["Destination"]["ToAddresses"] == [
        '"Recipient" <to@example.com>'
    ]
    assert payload["Destination"]["CcAddresses"] == ["cc@example.com"]
    assert payload["ReplyToAddresses"] == ["reply@example.com"]
    simple = payload["Content"]["Simple"]
    assert simple["Subject"] == {"Data": "Hello", "Charset": "UTF-8"}
    assert simple["Body"]["Text"] == {"Data": "text body", "Charset": "UTF-8"}
    assert simple["Body"]["Html"] == {
        "Data": "<p>html body</p>",
        "Charset": "UTF-8",
    }

    assert result.provider == "ses"
    assert result.provider_message_id == "ses-msg-1"
    assert result.accepted_recipients == ("to@example.com",)


@pytest.mark.asyncio
async def test_ses_backend_signs_session_token_when_present(
    fixed_clock: Any,
) -> None:
    transport = StubTransport(body={"MessageId": "ses-msg-2"})
    backend = SESEmailBackend(
        region="eu-west-1",
        access_key_id="AKIDEXAMPLE",
        secret_access_key="secret",
        session_token="FwoGZXIvYXdzEXAMPLE",
        transport=transport,
    )
    await backend.send(_msg())
    headers = transport.calls[0]["headers"]
    assert headers["x-amz-security-token"] == "FwoGZXIvYXdzEXAMPLE"
    assert (
        "SignedHeaders=content-type;host;x-amz-date;x-amz-security-token"
        in headers["authorization"]
    )


@pytest.mark.asyncio
async def test_ses_backend_refuses_attachments() -> None:
    backend = SESEmailBackend(
        region="eu-west-1",
        access_key_id="AKIDEXAMPLE",
        secret_access_key="secret",
        transport=StubTransport(),
    )
    with pytest.raises(EmailDeliveryError, match="attachments"):
        await backend.send(
            _msg(
                attachments=(
                    Attachment(
                        filename="a.txt",
                        content_type="text/plain",
                        content=b"x",
                    ),
                )
            )
        )


@pytest.mark.asyncio
async def test_ses_backend_raises_on_http_error(fixed_clock: Any) -> None:
    transport = StubTransport(
        status=400, body={"message": "Email address is not verified."}
    )
    backend = SESEmailBackend(
        region="eu-west-1",
        access_key_id="AKIDEXAMPLE",
        secret_access_key="secret",
        transport=transport,
    )
    with pytest.raises(EmailDeliveryError, match="SES rejected") as excinfo:
        await backend.send(_msg())
    assert "not verified" in (excinfo.value.provider_error or "")


@pytest.mark.asyncio
async def test_ses_backend_wraps_transport_errors(fixed_clock: Any) -> None:
    transport = StubTransport(exc=RuntimeError("connection refused"))
    backend = SESEmailBackend(
        region="eu-west-1",
        access_key_id="AKIDEXAMPLE",
        secret_access_key="secret",
        transport=transport,
    )
    with pytest.raises(EmailDeliveryError, match="SES delivery failed"):
        await backend.send(_msg())


# ── Mailgun backend ──────────────────────────────────────────────────


def test_mailgun_backend_requires_api_key() -> None:
    with pytest.raises(ValueError, match="API key"):
        MailgunEmailBackend("", "mg.example.com", transport=StubTransport())


def test_mailgun_backend_requires_domain() -> None:
    with pytest.raises(ValueError, match="domain"):
        MailgunEmailBackend("key-xyz", "", transport=StubTransport())


def test_mailgun_backend_rejects_malformed_domain() -> None:
    with pytest.raises(ValueError, match="domain"):
        MailgunEmailBackend(
            "key-xyz", "mg.example.com/evil", transport=StubTransport()
        )


@pytest.mark.asyncio
async def test_mailgun_backend_send_builds_form_request() -> None:
    transport = StubTransport(
        body={"id": "<mg-msg-1@mg.example.com>", "message": "Queued."}
    )
    backend = MailgunEmailBackend(
        "key-xyz", "mg.example.com", transport=transport
    )
    result = await backend.send(
        _msg(
            body_text="text body",
            body_html="<p>html body</p>",
            tags=("welcome", "onboarding"),
            headers={"X-Custom": "1"},
        )
    )

    call = transport.calls[0]
    assert call["url"] == "https://api.mailgun.net/v3/mg.example.com/messages"
    expected_auth = base64.b64encode(b"api:key-xyz").decode("ascii")
    assert call["headers"]["Authorization"] == f"Basic {expected_auth}"
    assert (
        call["headers"]["Content-Type"] == "application/x-www-form-urlencoded"
    )

    fields = urllib.parse.parse_qs(call["content"].decode("utf-8"))
    assert fields["from"] == ['"Sender" <from@example.com>']
    assert fields["to"] == ['"Recipient" <to@example.com>']
    assert fields["subject"] == ["Hello"]
    assert fields["text"] == ["text body"]
    assert fields["html"] == ["<p>html body</p>"]
    assert fields["o:tag"] == ["welcome", "onboarding"]
    assert fields["h:X-Custom"] == ["1"]

    assert result.provider == "mailgun"
    assert result.provider_message_id == "<mg-msg-1@mg.example.com>"
    assert result.accepted_recipients == ("to@example.com",)


@pytest.mark.asyncio
async def test_mailgun_backend_eu_region_base_url() -> None:
    transport = StubTransport(body={"id": "x"})
    backend = MailgunEmailBackend(
        "key-xyz", "mg.example.com", eu_region=True, transport=transport
    )
    await backend.send(_msg())
    assert transport.calls[0]["url"] == (
        "https://api.eu.mailgun.net/v3/mg.example.com/messages"
    )


@pytest.mark.asyncio
async def test_mailgun_backend_refuses_attachments() -> None:
    backend = MailgunEmailBackend(
        "key-xyz", "mg.example.com", transport=StubTransport()
    )
    with pytest.raises(EmailDeliveryError, match="attachments"):
        await backend.send(
            _msg(
                attachments=(
                    Attachment(
                        filename="a.txt",
                        content_type="text/plain",
                        content=b"x",
                    ),
                )
            )
        )


@pytest.mark.asyncio
async def test_mailgun_backend_raises_on_http_error() -> None:
    transport = StubTransport(status=401, body={"message": "Forbidden"})
    backend = MailgunEmailBackend(
        "key-xyz", "mg.example.com", transport=transport
    )
    with pytest.raises(EmailDeliveryError, match="HTTP 401") as excinfo:
        await backend.send(_msg())
    assert excinfo.value.provider_error == "Forbidden"


@pytest.mark.asyncio
async def test_mailgun_backend_wraps_transport_errors() -> None:
    transport = StubTransport(exc=RuntimeError("connection refused"))
    backend = MailgunEmailBackend(
        "key-xyz", "mg.example.com", transport=transport
    )
    with pytest.raises(EmailDeliveryError, match="Mailgun delivery failed"):
        await backend.send(_msg())


# ── Factory selection ────────────────────────────────────────────────


def _settings(**kwargs: Any) -> SimpleNamespace:
    """Minimal settings stand-in matching the attrs the factory reads."""
    defaults = dict(
        email_backend="console",
        email_default_from="from@example.com",
        postmark_server_token=None,
        postmark_message_stream="",
        ses_region="",
        ses_access_key_id=None,
        ses_secret_access_key=None,
        ses_session_token=None,
        aws_access_key_id=None,
        aws_secret_access_key=None,
        mailgun_api_key=None,
        mailgun_domain="",
        mailgun_eu_region=False,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_factory_selects_postmark_backend() -> None:
    backend = build_backend_from_settings(
        _settings(
            email_backend="postmark",
            postmark_server_token=SecretStr("pm-token"),
        )
    )
    assert isinstance(backend, PostmarkEmailBackend)


def test_factory_postmark_requires_server_token() -> None:
    with pytest.raises(ValueError, match="POSTMARK_SERVER_TOKEN"):
        build_backend_from_settings(_settings(email_backend="postmark"))


def test_factory_postmark_passes_message_stream() -> None:
    backend = build_backend_from_settings(
        _settings(
            email_backend="postmark",
            postmark_server_token=SecretStr("pm-token"),
            postmark_message_stream="broadcast",
        )
    )
    assert isinstance(backend, PostmarkEmailBackend)
    assert backend._message_stream == "broadcast"


def test_factory_selects_ses_backend() -> None:
    backend = build_backend_from_settings(
        _settings(
            email_backend="ses",
            ses_region="eu-west-1",
            ses_access_key_id=SecretStr("AKIDEXAMPLE"),
            ses_secret_access_key=SecretStr("secret"),
        )
    )
    assert isinstance(backend, SESEmailBackend)


def test_factory_ses_falls_back_to_instance_aws_credentials() -> None:
    backend = build_backend_from_settings(
        _settings(
            email_backend="ses",
            ses_region="eu-west-1",
            aws_access_key_id=SecretStr("AKIDEXAMPLE"),
            aws_secret_access_key=SecretStr("secret"),
        )
    )
    assert isinstance(backend, SESEmailBackend)


def test_factory_ses_requires_region() -> None:
    with pytest.raises(ValueError, match="SES_REGION"):
        build_backend_from_settings(_settings(email_backend="ses"))


def test_factory_ses_requires_credentials() -> None:
    with pytest.raises(ValueError, match="SES credentials required"):
        build_backend_from_settings(
            _settings(email_backend="ses", ses_region="eu-west-1")
        )


def test_factory_selects_mailgun_backend() -> None:
    backend = build_backend_from_settings(
        _settings(
            email_backend="mailgun",
            mailgun_api_key=SecretStr("key-xyz"),
            mailgun_domain="mg.example.com",
        )
    )
    assert isinstance(backend, MailgunEmailBackend)


def test_factory_mailgun_requires_api_key() -> None:
    with pytest.raises(ValueError, match="MAILGUN_API_KEY"):
        build_backend_from_settings(
            _settings(email_backend="mailgun", mailgun_domain="mg.example.com")
        )


def test_factory_mailgun_requires_domain() -> None:
    with pytest.raises(ValueError, match="MAILGUN_DOMAIN"):
        build_backend_from_settings(
            _settings(
                email_backend="mailgun", mailgun_api_key=SecretStr("key-xyz")
            )
        )


def test_factory_mailgun_passes_eu_region_flag() -> None:
    backend = build_backend_from_settings(
        _settings(
            email_backend="mailgun",
            mailgun_api_key=SecretStr("key-xyz"),
            mailgun_domain="mg.example.com",
            mailgun_eu_region=True,
        )
    )
    assert isinstance(backend, MailgunEmailBackend)
    assert backend._url.startswith("https://api.eu.mailgun.net/")


def test_factory_unknown_backend_lists_new_providers() -> None:
    with pytest.raises(ValueError, match="postmark, ses, mailgun"):
        build_backend_from_settings(_settings(email_backend="carrier_pigeon"))
