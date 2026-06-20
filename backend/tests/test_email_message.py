"""Tests for the email message data shapes."""

from __future__ import annotations

import pytest

from theourgia.core.email.message import (
    Attachment,
    EmailAddress,
    EmailMessage,
)


# ── EmailAddress ─────────────────────────────────────────────────────


def test_email_address_basic() -> None:
    addr = EmailAddress(email="alice@example.com")
    assert addr.email == "alice@example.com"
    assert addr.name is None
    assert addr.formatted() == "alice@example.com"


def test_email_address_with_name() -> None:
    addr = EmailAddress(email="alice@example.com", name="Alice Example")
    assert addr.formatted() == '"Alice Example" <alice@example.com>'


def test_email_address_name_with_quotes_is_escaped() -> None:
    addr = EmailAddress(email="a@b.com", name='Alice "Quoted" Example')
    assert addr.formatted() == '"Alice \\"Quoted\\" Example" <a@b.com>'


@pytest.mark.parametrize(
    "bad",
    ["", "no-at-sign", "@missing-local", "missing-domain@", "spaces in@email.com"],
)
def test_email_address_rejects_invalid(bad: str) -> None:
    with pytest.raises(ValueError, match="invalid email"):
        EmailAddress(email=bad)


def test_email_address_parse_passes_through() -> None:
    addr = EmailAddress(email="x@y.com")
    assert EmailAddress.parse(addr) is addr


def test_email_address_parse_coerces_string() -> None:
    addr = EmailAddress.parse("x@y.com")
    assert isinstance(addr, EmailAddress)
    assert addr.email == "x@y.com"


# ── Attachment ───────────────────────────────────────────────────────


def test_attachment_round_trip() -> None:
    att = Attachment(
        filename="report.pdf",
        content_type="application/pdf",
        content=b"%PDF-1.7\n...",
    )
    assert att.filename == "report.pdf"
    assert att.inline_cid is None


def test_attachment_rejects_empty_filename() -> None:
    with pytest.raises(ValueError, match="filename"):
        Attachment(filename="", content_type="text/plain", content=b"x")


def test_attachment_rejects_bad_content_type() -> None:
    with pytest.raises(ValueError, match="content_type"):
        Attachment(filename="x.txt", content_type="not-a-mime", content=b"x")


def test_attachment_size_limit() -> None:
    huge = b"x" * (26 * 1024 * 1024)
    with pytest.raises(ValueError, match="too large"):
        Attachment(filename="huge.bin", content_type="application/octet-stream", content=huge)


# ── EmailMessage ─────────────────────────────────────────────────────


def _addr(email: str = "a@b.com") -> EmailAddress:
    return EmailAddress(email=email)


def test_email_message_minimal_text() -> None:
    msg = EmailMessage(
        to=(_addr("to@x.com"),),
        sender=_addr("from@x.com"),
        subject="Hi",
        body_text="hello",
    )
    assert msg.subject == "Hi"
    assert msg.primary_recipient.email == "to@x.com"


def test_email_message_html_only() -> None:
    msg = EmailMessage(
        to=(_addr("to@x.com"),),
        sender=_addr("from@x.com"),
        subject="Hi",
        body_html="<p>hello</p>",
    )
    assert msg.body_html == "<p>hello</p>"
    assert msg.body_text is None


def test_email_message_rejects_no_recipients() -> None:
    with pytest.raises(ValueError, match="at least one recipient"):
        EmailMessage(to=(), sender=_addr(), subject="x", body_text="y")


def test_email_message_rejects_empty_subject() -> None:
    with pytest.raises(ValueError, match="subject"):
        EmailMessage(
            to=(_addr(),), sender=_addr("from@x.com"), subject="", body_text="x"
        )


def test_email_message_rejects_no_body() -> None:
    with pytest.raises(ValueError, match="body_text"):
        EmailMessage(
            to=(_addr(),), sender=_addr("from@x.com"), subject="hi"
        )


def test_email_message_carries_template_name() -> None:
    msg = EmailMessage(
        to=(_addr(),),
        sender=_addr("from@x.com"),
        subject="hi",
        body_text="x",
        template_name="auth.password_reset",
    )
    assert msg.template_name == "auth.password_reset"
