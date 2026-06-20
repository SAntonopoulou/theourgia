"""Email notification channel.

Bridges to the email substrate (S1). Each notification template that
opts into email delivery maps to an email template by following the
naming convention ``"notif.<template_name>"`` — so notification
``entity.merged`` sends through email template ``notif.entity.merged``.

Features that own a notification register both the notification
template and the matching email template at import time. The bridge
performs no rendering itself; it constructs an :class:`EmailMessage`
from the already-rendered :class:`NotificationMessage`.
"""

from __future__ import annotations

from theourgia.core.email.message import EmailAddress, EmailMessage
from theourgia.core.email.service import EmailService
from theourgia.core.notifications.channels.base import (
    NotificationChannel,
    NotificationDeliveryError,
)
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)

__all__ = ["EmailChannel"]


class EmailChannel:
    """Delivers notifications via the email substrate."""

    channel = DeliveryChannel.EMAIL

    def __init__(
        self,
        email_service: EmailService,
        *,
        default_sender: EmailAddress | None = None,
    ) -> None:
        self._email_service = email_service
        self._sender = default_sender

    async def send(self, message: NotificationMessage) -> None:
        if not message.recipient_email:
            raise NotificationDeliveryError(
                "email channel selected but recipient_email is unset",
                channel=self.channel,
            )

        body_text = message.body_text
        if message.action_url and message.action_label:
            body_text = (
                f"{body_text}\n\n{message.action_label}: {message.action_url}\n"
            )

        body_html = message.body_html
        if body_html and message.action_url and message.action_label:
            body_html = (
                f"{body_html}\n"
                f'<p><a href="{message.action_url}">{message.action_label}</a></p>'
            )

        email_message = EmailMessage(
            to=(EmailAddress(email=message.recipient_email),),
            sender=self._sender or self._email_service._default_sender,  # type: ignore[attr-defined]
            subject=message.subject,
            body_text=body_text,
            body_html=body_html,
            tags=("notification", message.kind),
            template_name=f"notif.{message.template_name}",
        )

        try:
            await self._email_service.send(email_message)
        except Exception as exc:  # noqa: BLE001
            raise NotificationDeliveryError(
                f"email channel delivery failed: {exc.__class__.__name__}",
                channel=self.channel,
                provider_error=str(exc),
            ) from exc
