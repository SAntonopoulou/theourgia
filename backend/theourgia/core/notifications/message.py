"""Notification value types.

A :class:`NotificationMessage` is what reaches a channel. It carries
the recipient, the rendered subject + body for each delivery channel,
and the metadata the channel needs to dispatch (e.g. the user's email
address for the email channel).
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from uuid import UUID

__all__ = ["DeliveryChannel", "NotificationMessage"]


class DeliveryChannel(str, enum.Enum):
    """The channels Theourgia can dispatch a notification through."""

    IN_APP = "in_app"
    """User's in-app inbox (Notification table row)."""

    EMAIL = "email"
    """Bridges to the email substrate."""

    WEB_PUSH = "web_push"
    """Web Push via VAPID (stubbed at S4; real delivery in Phase 02+)."""

    MATRIX = "matrix"
    """Matrix / Element channel — posts to a room via the client-server
    API. (b108-2hv, FEATURES §13 reference plugin 7/7.)"""


@dataclass(frozen=True, slots=True)
class NotificationMessage:
    """A fully-rendered notification ready for a channel to dispatch.

    Constructed by :class:`NotificationService.send_to_user` after
    looking up the recipient, rendering the template, and consulting
    preferences. Channels consume this and produce side effects.

    Attributes:
        user_id: Recipient. Always a real user; the service refuses
            to dispatch to unknown user ids.
        template_name: Registered template that produced this message.
            Recorded on the in-app row for grouping / dismissal.
        kind: Coarse-grained category for preference lookup (e.g.
            ``"social"``, ``"administrative"``, ``"federation"``).
            A user may disable a whole kind across channels.
        subject: One-line summary. Used as the in-app title and the
            email subject.
        body_text: Plain-text body. Required.
        body_html: Optional HTML body for the email channel.
        action_url: Deep link the recipient can follow. Optional.
        action_label: Human-readable label for the action button.
        recipient_email: Pre-resolved email address for the email
            channel. None when the email channel is not in scope.
        push_subscriptions: User's Web Push subscription endpoints.
            Empty when the user hasn't registered any.
        metadata: Free-form context channels may use (vault_id,
            entity_id, etc.).
    """

    user_id: UUID
    template_name: str
    kind: str
    subject: str
    body_text: str
    body_html: str | None = None
    action_url: str | None = None
    action_label: str | None = None
    recipient_email: str | None = None
    push_subscriptions: tuple[str, ...] = field(default_factory=tuple)
    metadata: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.template_name:
            raise ValueError("NotificationMessage.template_name must not be empty")
        if not self.kind:
            raise ValueError("NotificationMessage.kind must not be empty")
        if not self.subject:
            raise ValueError("NotificationMessage.subject must not be empty")
        if not self.body_text:
            raise ValueError("NotificationMessage.body_text must not be empty")
