"""Notification substrate — multi-channel user notifications.

Features call into :class:`NotificationService` and never know which
channel(s) actually deliver. Three channels at MVP:

- **in_app** — writes a :class:`Notification` row; the user sees a
  badge / inbox in their dashboard.
- **email** — bridges to the email substrate (S1). Each template here
  references an email template by name; the service renders both
  in-app and email versions from a single :class:`NotificationTemplate`.
- **web_push** — Web Push via VAPID. Stubbed at this batch; the real
  delivery lands when the frontend ships a service worker (Phase 02+).

Per-user preferences (:class:`NotificationPreference`) gate which
channels actually fire for a given notification kind. The service
consults them before dispatching.

Canonical call point::

    await notification_service.send_to_user(
        user_id=user.id,
        template="entity.merged",
        context={"entity_name": "...", "merged_into": "..."},
    )
"""

from __future__ import annotations

from theourgia.core.notifications.channels.base import (
    NotificationChannel,
    NotificationDeliveryError,
)
from theourgia.core.notifications.channels.email import EmailChannel
from theourgia.core.notifications.channels.in_app import InAppChannel
from theourgia.core.notifications.channels.web_push import WebPushChannel
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)
from theourgia.core.notifications.preferences import (
    PreferenceResolver,
    PreferenceSet,
)
from theourgia.core.notifications.service import (
    NotificationService,
    RecipientLookup,
)
from theourgia.core.notifications.templates import (
    NotificationTemplate,
    NotificationTemplateRegistry,
    default_notification_registry,
)

__all__ = [
    "DeliveryChannel",
    "EmailChannel",
    "InAppChannel",
    "NotificationChannel",
    "NotificationDeliveryError",
    "NotificationMessage",
    "NotificationService",
    "NotificationTemplate",
    "NotificationTemplateRegistry",
    "PreferenceResolver",
    "PreferenceSet",
    "RecipientLookup",
    "WebPushChannel",
    "default_notification_registry",
]
