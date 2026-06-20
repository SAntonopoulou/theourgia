"""Notification channel Protocol."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)

__all__ = ["NotificationChannel", "NotificationDeliveryError"]


class NotificationDeliveryError(Exception):
    """Raised when a channel fails to deliver. Wraps the underlying
    error so callers can catch a single type."""

    def __init__(
        self,
        message: str,
        *,
        channel: DeliveryChannel,
        provider_error: str | None = None,
    ) -> None:
        super().__init__(message)
        self.channel = channel
        self.provider_error = provider_error


@runtime_checkable
class NotificationChannel(Protocol):
    """A channel that delivers :class:`NotificationMessage`s."""

    channel: DeliveryChannel

    async def send(self, message: NotificationMessage) -> None:
        ...
