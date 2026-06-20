"""Web Push notification channel.

Stubbed at substrate S4 — Web Push requires VAPID keys, a service
worker registered by the frontend, and per-subscription endpoint
storage. The real implementation lands once the frontend (Phase 02+)
ships its service worker.

For now, this channel:

- Accepts notifications routed to it.
- Iterates the user's registered push subscriptions.
- Logs a placeholder event indicating what would have been pushed.
- Returns success (so notification dispatch isn't blocked).

Once the real implementation lands, ``send`` will POST encrypted
payloads to each subscription endpoint using ``pywebpush`` (or
similar) signed with VAPID keys from settings.
"""

from __future__ import annotations

import logging

from theourgia.core.notifications.channels.base import NotificationChannel
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)

__all__ = ["WebPushChannel"]


_log = logging.getLogger(__name__)


class WebPushChannel:
    """Web Push delivery — stub. See module docstring."""

    channel = DeliveryChannel.WEB_PUSH

    def __init__(self) -> None:
        pass

    async def send(self, message: NotificationMessage) -> None:
        if not message.push_subscriptions:
            # No subscriptions = nothing to push. Not an error.
            return
        _log.info(
            "notification.web_push.stub",
            extra={
                "user_id": str(message.user_id),
                "template": message.template_name,
                "subscription_count": len(message.push_subscriptions),
            },
        )
