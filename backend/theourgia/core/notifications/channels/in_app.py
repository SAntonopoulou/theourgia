"""In-app notification channel.

Writes a :class:`Notification` row that the user's dashboard renders
as an inbox / badge / dropdown item. The frontend polls or subscribes
via web sockets (Phase 02+); the channel itself just persists.

The channel requires a database session — injected per-call so it
participates in the caller's transaction. When no session is
available (e.g., scheduled task firing into the void), the channel
opens its own short-lived session.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from theourgia.core.db import session_scope
from theourgia.core.notifications.channels.base import (
    NotificationChannel,
    NotificationDeliveryError,
)
from theourgia.core.notifications.message import (
    DeliveryChannel,
    NotificationMessage,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["InAppChannel"]


class InAppChannel:
    """Persists notifications to the database for in-app display."""

    channel = DeliveryChannel.IN_APP

    def __init__(self, session: "AsyncSession | None" = None) -> None:
        # When a session is supplied, the channel writes within it.
        # When None, the channel opens its own scope on each send.
        self._session = session

    async def send(self, message: NotificationMessage) -> None:
        if self._session is not None:
            self._persist(self._session, message)
            return

        try:
            async with session_scope() as session:
                self._persist(session, message)
                await session.commit()
        except Exception as exc:  # noqa: BLE001
            raise NotificationDeliveryError(
                f"in-app channel persistence failed: {exc.__class__.__name__}",
                channel=self.channel,
                provider_error=str(exc),
            ) from exc

    def _persist(
        self, session: "AsyncSession", message: NotificationMessage
    ) -> None:
        # Late import — keeps the model out of the substrate's import graph
        from theourgia.models.notifications import Notification

        row = Notification(
            user_id=message.user_id,
            template_name=message.template_name,
            kind=message.kind,
            subject=message.subject,
            body_text=message.body_text,
            body_html=message.body_html,
            action_url=message.action_url,
            action_label=message.action_label,
        )
        session.add(row)
