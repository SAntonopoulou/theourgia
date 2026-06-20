"""Notification delivery channels."""

from __future__ import annotations

from theourgia.core.notifications.channels.base import (
    NotificationChannel,
    NotificationDeliveryError,
)
from theourgia.core.notifications.channels.email import EmailChannel
from theourgia.core.notifications.channels.in_app import InAppChannel
from theourgia.core.notifications.channels.web_push import WebPushChannel

__all__ = [
    "EmailChannel",
    "InAppChannel",
    "NotificationChannel",
    "NotificationDeliveryError",
    "WebPushChannel",
]
