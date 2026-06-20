"""End-to-end tests for the notification service."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest

from theourgia.core.notifications.channels.base import (
    NotificationChannel,
    NotificationDeliveryError,
)
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)
from theourgia.core.notifications.preferences import (
    InMemoryPreferenceResolver,
    PreferenceSet,
)
from theourgia.core.notifications.service import (
    InMemoryRecipientLookup,
    NotificationService,
    RecipientInfo,
)
from theourgia.core.notifications.templates import (
    NotificationTemplate,
    NotificationTemplateRegistry,
)


class _RecordingChannel:
    """A test channel that records what it would deliver."""

    def __init__(self, channel: DeliveryChannel, *, fail: bool = False) -> None:
        self.channel = channel
        self.received: list[NotificationMessage] = []
        self._fail = fail

    async def send(self, message: NotificationMessage) -> None:
        if self._fail:
            raise NotificationDeliveryError(
                "test failure", channel=self.channel
            )
        self.received.append(message)


@pytest.fixture
def registry() -> NotificationTemplateRegistry:
    r = NotificationTemplateRegistry()
    r.register(
        NotificationTemplate(
            name="entity.merged",
            kind="social",
            subject="Entity $name merged",
            body_text="Your entity $name was merged.",
            default_channels=(DeliveryChannel.IN_APP, DeliveryChannel.EMAIL),
        )
    )
    r.register(
        NotificationTemplate(
            name="auth.session_revoked",
            kind="security",
            subject="Session revoked",
            body_text="A session was revoked.",
            default_channels=(DeliveryChannel.IN_APP,),
        )
    )
    return r


@pytest.fixture
def recipients() -> InMemoryRecipientLookup:
    lookup = InMemoryRecipientLookup()
    return lookup


@pytest.fixture
def preferences() -> InMemoryPreferenceResolver:
    return InMemoryPreferenceResolver()


def _seed_recipient(
    recipients: InMemoryRecipientLookup,
    *,
    user_id: UUID | None = None,
    email: str | None = "a@b.com",
) -> UUID:
    uid = user_id or uuid4()
    recipients.set(
        RecipientInfo(user_id=uid, email=email, display_name="Test User")
    )
    return uid


@pytest.mark.asyncio
async def test_service_requires_at_least_one_channel(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    with pytest.raises(ValueError, match="at least one channel"):
        NotificationService(
            channels=[],
            recipients=recipients,
            preferences=preferences,
            registry=registry,
        )


@pytest.mark.asyncio
async def test_send_dispatches_to_default_channels(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    email = _RecordingChannel(DeliveryChannel.EMAIL)
    service = NotificationService(
        channels=[in_app, email],
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )

    uid = _seed_recipient(recipients)
    fired = await service.send_to_user(
        user_id=uid,
        template="entity.merged",
        context={"name": "Hekate"},
    )

    assert set(fired) == {DeliveryChannel.IN_APP, DeliveryChannel.EMAIL}
    assert len(in_app.received) == 1
    assert in_app.received[0].subject == "Entity Hekate merged"
    assert in_app.received[0].kind == "social"
    assert len(email.received) == 1


@pytest.mark.asyncio
async def test_preferences_restrict_active_channels(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    email = _RecordingChannel(DeliveryChannel.EMAIL)
    service = NotificationService(
        channels=[in_app, email],
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )

    uid = _seed_recipient(recipients)
    preferences.set(
        uid,
        PreferenceSet(enabled={"social": frozenset({DeliveryChannel.IN_APP})}),
    )

    fired = await service.send_to_user(
        user_id=uid, template="entity.merged", context={"name": "X"}
    )

    assert fired == (DeliveryChannel.IN_APP,)
    assert len(in_app.received) == 1
    assert len(email.received) == 0


@pytest.mark.asyncio
async def test_fully_muted_user_receives_nothing(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    service = NotificationService(
        channels=[in_app],
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )

    uid = _seed_recipient(recipients)
    preferences.set(uid, PreferenceSet(fully_muted=True))
    fired = await service.send_to_user(
        user_id=uid, template="entity.merged", context={"name": "X"}
    )
    assert fired == ()
    assert len(in_app.received) == 0


@pytest.mark.asyncio
async def test_unknown_recipient_raises(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    service = NotificationService(
        channels=[in_app],
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )
    with pytest.raises(ValueError, match="unknown recipient"):
        await service.send_to_user(
            user_id=uuid4(),
            template="entity.merged",
            context={"name": "X"},
        )


@pytest.mark.asyncio
async def test_missing_template_raises(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    service = NotificationService(
        channels=[in_app],
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )
    uid = _seed_recipient(recipients)
    with pytest.raises(KeyError):
        await service.send_to_user(
            user_id=uid, template="nope.template", context={}
        )


@pytest.mark.asyncio
async def test_one_channel_failure_does_not_prevent_others(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    failing_email = _RecordingChannel(DeliveryChannel.EMAIL, fail=True)
    service = NotificationService(
        channels=[in_app, failing_email],
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )

    uid = _seed_recipient(recipients)
    fired = await service.send_to_user(
        user_id=uid, template="entity.merged", context={"name": "X"}
    )

    # In-app fired; email failed; the error is swallowed because
    # at least one channel succeeded.
    assert DeliveryChannel.IN_APP in fired
    assert DeliveryChannel.EMAIL not in fired
    assert len(in_app.received) == 1


@pytest.mark.asyncio
async def test_all_channels_failing_re_raises(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    failing_in_app = _RecordingChannel(DeliveryChannel.IN_APP, fail=True)
    failing_email = _RecordingChannel(DeliveryChannel.EMAIL, fail=True)
    service = NotificationService(
        channels=[failing_in_app, failing_email],
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )

    uid = _seed_recipient(recipients)
    with pytest.raises(NotificationDeliveryError):
        await service.send_to_user(
            user_id=uid, template="entity.merged", context={"name": "X"}
        )


@pytest.mark.asyncio
async def test_channel_not_registered_is_silently_skipped(
    recipients: InMemoryRecipientLookup,
    preferences: InMemoryPreferenceResolver,
    registry: NotificationTemplateRegistry,
) -> None:
    """Template defaults include EMAIL but the service only runs IN_APP —
    the email default is silently skipped."""
    in_app = _RecordingChannel(DeliveryChannel.IN_APP)
    service = NotificationService(
        channels=[in_app],  # no EMAIL channel installed
        recipients=recipients,
        preferences=preferences,
        registry=registry,
    )

    uid = _seed_recipient(recipients)
    fired = await service.send_to_user(
        user_id=uid, template="entity.merged", context={"name": "X"}
    )
    # Only in_app fired even though template defaults include EMAIL
    assert fired == (DeliveryChannel.IN_APP,)
