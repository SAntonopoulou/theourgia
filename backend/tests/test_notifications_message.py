"""Tests for NotificationMessage construction-time invariants."""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)


def test_delivery_channel_values() -> None:
    assert DeliveryChannel.IN_APP.value == "in_app"
    assert DeliveryChannel.EMAIL.value == "email"
    assert DeliveryChannel.WEB_PUSH.value == "web_push"


def _kwargs(**overrides) -> dict:
    defaults = dict(
        user_id=uuid4(),
        template_name="x.y",
        kind="k",
        subject="s",
        body_text="b",
    )
    defaults.update(overrides)
    return defaults


def test_minimal_message_constructs() -> None:
    msg = NotificationMessage(**_kwargs())
    assert msg.template_name == "x.y"
    assert msg.body_html is None
    assert msg.action_url is None
    assert msg.recipient_email is None


def test_message_rejects_empty_template_name() -> None:
    with pytest.raises(ValueError, match="template_name"):
        NotificationMessage(**_kwargs(template_name=""))


def test_message_rejects_empty_kind() -> None:
    with pytest.raises(ValueError, match="kind"):
        NotificationMessage(**_kwargs(kind=""))


def test_message_rejects_empty_subject() -> None:
    with pytest.raises(ValueError, match="subject"):
        NotificationMessage(**_kwargs(subject=""))


def test_message_rejects_empty_body() -> None:
    with pytest.raises(ValueError, match="body_text"):
        NotificationMessage(**_kwargs(body_text=""))


def test_message_carries_recipient_email() -> None:
    msg = NotificationMessage(**_kwargs(recipient_email="user@example.com"))
    assert msg.recipient_email == "user@example.com"


def test_message_carries_push_subscriptions() -> None:
    msg = NotificationMessage(
        **_kwargs(
            push_subscriptions=("https://fcm.example/abc", "https://wp.example/def"),
        )
    )
    assert len(msg.push_subscriptions) == 2
