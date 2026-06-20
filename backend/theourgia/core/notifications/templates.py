"""Notification template registry.

Each :class:`NotificationTemplate` declares the channels it can use,
the kind for preference lookup, and the rendered subject + bodies for
each channel. The :class:`NotificationService` consults the user's
preferences before deciding which channels actually fire.

Templates use ``string.Template`` ``$key`` substitution — same engine
as the email substrate, kept consistent so feature writers learn one
syntax.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from string import Template
from typing import Final

from theourgia.core.notifications.message import DeliveryChannel

__all__ = [
    "NotificationTemplate",
    "NotificationTemplateRegistry",
    "RenderedNotification",
    "default_notification_registry",
]


@dataclass(frozen=True, slots=True)
class RenderedNotification:
    """Output of :meth:`NotificationTemplate.render`."""

    subject: str
    body_text: str
    body_html: str | None
    action_url: str | None
    action_label: str | None


@dataclass(frozen=True, slots=True)
class NotificationTemplate:
    """A registered notification template.

    Attributes:
        name: Dotted identifier (``"entity.merged"``, ``"auth.session_revoked"``).
        kind: Coarse category for preference lookup (``"social"`` /
            ``"administrative"`` / ``"federation"`` / etc.). Users
            disable a whole kind, not individual templates.
        subject: One-line summary template.
        body_text: Plain-text body template. Required.
        body_html: Optional HTML body. When present, the email channel
            sends multipart.
        action_url: Optional deep-link template.
        action_label: Optional button label.
        default_channels: Channels enabled by default before
            preferences are consulted. A user can disable any of them.
        description: One-line summary for the admin catalog.
    """

    name: str
    kind: str
    subject: str
    body_text: str
    body_html: str | None = None
    action_url: str | None = None
    action_label: str | None = None
    default_channels: tuple[DeliveryChannel, ...] = field(
        default_factory=lambda: (DeliveryChannel.IN_APP,)
    )
    description: str = ""

    def __post_init__(self) -> None:
        if not self.name or "." not in self.name:
            raise ValueError(
                f"NotificationTemplate.name must be dotted; got {self.name!r}"
            )
        if not self.kind:
            raise ValueError("NotificationTemplate.kind must not be empty")
        if not self.subject:
            raise ValueError("NotificationTemplate.subject must not be empty")
        if not self.body_text:
            raise ValueError("NotificationTemplate.body_text must not be empty")
        if not self.default_channels:
            raise ValueError(
                "NotificationTemplate.default_channels must contain at least one"
            )

    def render(self, context: Mapping[str, object] | None = None) -> RenderedNotification:
        ctx = dict(context or {})
        return RenderedNotification(
            subject=Template(self.subject).substitute(ctx),
            body_text=Template(self.body_text).substitute(ctx),
            body_html=(Template(self.body_html).substitute(ctx) if self.body_html else None),
            action_url=(Template(self.action_url).substitute(ctx) if self.action_url else None),
            action_label=self.action_label,
        )


class NotificationTemplateRegistry:
    """Names → :class:`NotificationTemplate`. Duplicate registration
    raises by default — typos caught at import time."""

    def __init__(self) -> None:
        self._templates: dict[str, NotificationTemplate] = {}

    def register(
        self, template: NotificationTemplate, *, overwrite: bool = False
    ) -> NotificationTemplate:
        if template.name in self._templates and not overwrite:
            msg = f"notification template already registered: {template.name!r}"
            raise ValueError(msg)
        self._templates[template.name] = template
        return template

    def get(self, name: str) -> NotificationTemplate:
        try:
            return self._templates[name]
        except KeyError as exc:
            raise KeyError(f"notification template not registered: {name!r}") from exc

    def has(self, name: str) -> bool:
        return name in self._templates

    def all(self) -> list[NotificationTemplate]:
        return list(self._templates.values())

    def by_kind(self, kind: str) -> list[NotificationTemplate]:
        return [t for t in self._templates.values() if t.kind == kind]

    def clear(self) -> None:
        self._templates.clear()


default_notification_registry: Final[NotificationTemplateRegistry] = (
    NotificationTemplateRegistry()
)
"""Process-wide notification template registry."""
