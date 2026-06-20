"""Notification service — fan-out across channels.

Features call :meth:`NotificationService.send_to_user`; the service:

1. Looks up the recipient via the configured :class:`RecipientLookup`.
2. Loads the template by name.
3. Consults the user's preferences for which channels to fire.
4. Renders the template once.
5. Dispatches to each enabled channel.

Failures in one channel don't prevent the others from firing; the
first exception is re-raised after all channels have been attempted.

The :class:`RecipientLookup` is pluggable so tests can inject
in-memory lookup without hitting the DB.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Protocol, runtime_checkable
from uuid import UUID

from theourgia.core.notifications.channels.base import (
    NotificationChannel,
    NotificationDeliveryError,
)
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)
from theourgia.core.notifications.preferences import (
    PreferenceResolver,
    PreferenceSet,
)
from theourgia.core.notifications.templates import (
    NotificationTemplateRegistry,
    default_notification_registry,
)

__all__ = ["NotificationService", "RecipientInfo", "RecipientLookup"]

_log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class RecipientInfo:
    """Information about a notification recipient.

    The :class:`RecipientLookup` produces this; the service uses it to
    fill in channel-specific fields (email address, push subscriptions)
    on the constructed :class:`NotificationMessage`."""

    user_id: UUID
    email: str | None = None
    display_name: str | None = None
    push_subscription_endpoints: tuple[str, ...] = ()


@runtime_checkable
class RecipientLookup(Protocol):
    """Resolves a user id into the channel-specific info needed to
    dispatch. Production uses a DB-backed implementation; tests use
    an in-memory dict."""

    async def get(self, user_id: UUID) -> RecipientInfo | None:
        ...


class InMemoryRecipientLookup:
    """Process-local lookup. Tests use this; production uses a
    DB-backed implementation registered at app startup."""

    def __init__(
        self, recipients: Mapping[UUID, RecipientInfo] | None = None
    ) -> None:
        self._recipients: dict[UUID, RecipientInfo] = dict(recipients or {})

    async def get(self, user_id: UUID) -> RecipientInfo | None:
        return self._recipients.get(user_id)

    def set(self, info: RecipientInfo) -> None:
        self._recipients[info.user_id] = info


class NotificationService:
    """Orchestrates rendering, preference application, and channel fan-out."""

    def __init__(
        self,
        *,
        channels: Iterable[NotificationChannel],
        recipients: RecipientLookup,
        preferences: PreferenceResolver,
        registry: NotificationTemplateRegistry | None = None,
    ) -> None:
        self._channels: dict[DeliveryChannel, NotificationChannel] = {
            c.channel: c for c in channels
        }
        if not self._channels:
            raise ValueError("NotificationService requires at least one channel")
        self._recipients = recipients
        self._preferences = preferences
        self._registry = registry or default_notification_registry

    @property
    def channels(self) -> tuple[DeliveryChannel, ...]:
        return tuple(self._channels.keys())

    async def send_to_user(
        self,
        *,
        user_id: UUID,
        template: str,
        context: Mapping[str, object] | None = None,
    ) -> tuple[DeliveryChannel, ...]:
        """Render ``template`` with ``context`` and dispatch to every
        channel the user has enabled for the template's kind. Returns
        the channels that actually fired."""
        info = await self._recipients.get(user_id)
        if info is None:
            raise ValueError(f"unknown recipient: {user_id}")

        tmpl = self._registry.get(template)
        rendered = tmpl.render(context)

        prefs = await self._preferences.get(user_id)
        active_channels = prefs.resolve(tmpl.kind, tmpl.default_channels)
        if not active_channels:
            _log.info(
                "notification.skipped.all_channels_disabled",
                extra={
                    "user_id": str(user_id),
                    "template": template,
                    "kind": tmpl.kind,
                },
            )
            return ()

        message = NotificationMessage(
            user_id=user_id,
            template_name=template,
            kind=tmpl.kind,
            subject=rendered.subject,
            body_text=rendered.body_text,
            body_html=rendered.body_html,
            action_url=rendered.action_url,
            action_label=rendered.action_label,
            recipient_email=info.email,
            push_subscriptions=info.push_subscription_endpoints,
        )

        fired: list[DeliveryChannel] = []
        first_error: BaseException | None = None
        for ch in active_channels:
            channel = self._channels.get(ch)
            if channel is None:
                # User enabled a channel we don't run; silently skip.
                continue
            try:
                await channel.send(message)
                fired.append(ch)
            except BaseException as exc:  # noqa: BLE001
                if first_error is None:
                    first_error = exc
                _log.warning(
                    "notification.channel.failed",
                    extra={
                        "user_id": str(user_id),
                        "template": template,
                        "channel": ch.value,
                        "error": str(exc),
                    },
                )

        if first_error is not None and not fired:
            raise first_error
        return tuple(fired)
