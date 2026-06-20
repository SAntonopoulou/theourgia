"""Tests for the notification channel implementations."""

from __future__ import annotations

import io
from uuid import uuid4

import pytest

from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.message import EmailAddress
from theourgia.core.email.service import EmailService
from theourgia.core.email.templates import TemplateRegistry as EmailTemplateRegistry
from theourgia.core.notifications.channels.base import (
    NotificationChannel,
    NotificationDeliveryError,
)
from theourgia.core.notifications.channels.email import EmailChannel
from theourgia.core.notifications.channels.web_push import WebPushChannel
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)


def _msg(**overrides) -> NotificationMessage:
    defaults = dict(
        user_id=uuid4(),
        template_name="x.y",
        kind="k",
        subject="s",
        body_text="b",
    )
    defaults.update(overrides)
    return NotificationMessage(**defaults)


# ── Protocol satisfaction ────────────────────────────────────────────


def test_web_push_channel_satisfies_protocol() -> None:
    channel: NotificationChannel = WebPushChannel()
    assert channel.channel == DeliveryChannel.WEB_PUSH


# ── Web push (stub) ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_web_push_with_no_subscriptions_is_a_noop() -> None:
    channel = WebPushChannel()
    msg = _msg(push_subscriptions=())
    await channel.send(msg)  # should not raise


@pytest.mark.asyncio
async def test_web_push_with_subscriptions_logs() -> None:
    channel = WebPushChannel()
    msg = _msg(push_subscriptions=("https://endpoint1", "https://endpoint2"))
    # Stub channel just logs; we verify it doesn't raise.
    await channel.send(msg)


# ── Email channel ────────────────────────────────────────────────────


@pytest.fixture
def email_service() -> tuple[EmailService, NullEmailBackend]:
    backend = NullEmailBackend()
    service = EmailService(
        backend=backend,
        default_sender=EmailAddress(email="theourgia@example.com"),
        registry=EmailTemplateRegistry(),
    )
    return service, backend


@pytest.mark.asyncio
async def test_email_channel_requires_recipient_email(
    email_service: tuple[EmailService, NullEmailBackend],
) -> None:
    service, _ = email_service
    channel = EmailChannel(service)
    with pytest.raises(NotificationDeliveryError, match="recipient_email"):
        await channel.send(_msg(recipient_email=None))


@pytest.mark.asyncio
async def test_email_channel_delivers_via_email_service(
    email_service: tuple[EmailService, NullEmailBackend],
) -> None:
    service, backend = email_service
    channel = EmailChannel(service)
    msg = _msg(
        subject="Welcome",
        body_text="Hi there",
        recipient_email="user@example.com",
        template_name="auth.welcome",
        kind="account",
    )
    await channel.send(msg)
    assert len(backend.sent) == 1
    sent = backend.sent[0]
    assert sent.subject == "Welcome"
    assert sent.to[0].email == "user@example.com"
    assert sent.template_name == "notif.auth.welcome"
    assert "notification" in sent.tags
    assert "account" in sent.tags


@pytest.mark.asyncio
async def test_email_channel_appends_action_link_to_text_body(
    email_service: tuple[EmailService, NullEmailBackend],
) -> None:
    service, backend = email_service
    channel = EmailChannel(service)
    msg = _msg(
        recipient_email="user@example.com",
        action_url="https://t.example/x",
        action_label="View it",
    )
    await channel.send(msg)
    text = backend.sent[0].body_text or ""
    assert "View it" in text
    assert "https://t.example/x" in text


@pytest.mark.asyncio
async def test_email_channel_appends_action_button_to_html(
    email_service: tuple[EmailService, NullEmailBackend],
) -> None:
    service, backend = email_service
    channel = EmailChannel(service)
    msg = _msg(
        recipient_email="user@example.com",
        body_html="<p>hi</p>",
        action_url="https://t.example/x",
        action_label="View it",
    )
    await channel.send(msg)
    html = backend.sent[0].body_html or ""
    assert "View it" in html
    assert 'href="https://t.example/x"' in html


@pytest.mark.asyncio
async def test_email_channel_wraps_underlying_errors(
    email_service: tuple[EmailService, NullEmailBackend],
) -> None:
    service, _backend = email_service

    # Replace the backend with one that raises
    class _Boom:
        name = "boom"

        async def send(self, message):  # type: ignore[no-untyped-def]
            raise RuntimeError("upstream is dead")

    service._backend = _Boom()  # type: ignore[attr-defined]
    channel = EmailChannel(service)
    with pytest.raises(NotificationDeliveryError, match="email channel delivery failed"):
        await channel.send(_msg(recipient_email="x@y.com"))
