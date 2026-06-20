"""Email template registry.

Features register templates by name; the email service looks them up
when a feature calls ``send_template(name, to, context)``. Templates
live as :class:`EmailTemplate` instances, typically declared at module
scope inside the feature package so the template stays next to the
code that triggers it.

Rendering uses :class:`string.Template`'s ``$`` substitution — simple,
predictable, no Jinja-style logic in templates. If a template needs
real conditionals or loops, the feature should render its own body
strings before constructing the message.
"""

from __future__ import annotations

from dataclasses import dataclass
from string import Template
from typing import Mapping

__all__ = [
    "EmailTemplate",
    "RenderedEmail",
    "TemplateRegistry",
    "default_registry",
]


@dataclass(frozen=True, slots=True)
class RenderedEmail:
    """Output of :meth:`EmailTemplate.render`. Caller wraps in an
    :class:`EmailMessage` with the appropriate recipient and sender."""

    subject: str
    body_text: str | None
    body_html: str | None


@dataclass(frozen=True, slots=True)
class EmailTemplate:
    """A registered template.

    Subject / body are :class:`string.Template`-style with ``$key`` /
    ``${key}`` placeholders. Missing keys raise :class:`KeyError`
    during render (use ``safe_substitute=True`` to swap for partial
    rendering).

    Attributes:
        name: Dotted identifier (``"auth.password_reset"``,
            ``"federation.peer_invited"``). Stable — used in EmailLog
            and admin / observability dashboards.
        subject: Subject-line template.
        body_text: Plain-text body template. Strongly recommended.
        body_html: HTML body template. Optional.
        description: One-line summary for the operator's template
            catalog (admin dashboard, docs).
        safe_substitute: When True, missing placeholders render as
            empty strings instead of raising. Off by default — missing
            placeholders are usually bugs.
    """

    name: str
    subject: str
    body_text: str
    body_html: str | None = None
    description: str = ""
    safe_substitute: bool = False

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("EmailTemplate.name must not be empty")
        if not self.subject:
            raise ValueError("EmailTemplate.subject must not be empty")
        if not self.body_text and not self.body_html:
            raise ValueError(
                "EmailTemplate must have at least one of body_text / body_html"
            )

    def render(self, context: Mapping[str, object] | None = None) -> RenderedEmail:
        ctx = dict(context or {})
        return RenderedEmail(
            subject=self._sub(self.subject, ctx),
            body_text=self._sub(self.body_text, ctx) if self.body_text else None,
            body_html=self._sub(self.body_html, ctx) if self.body_html else None,
        )

    def _sub(self, template: str, ctx: Mapping[str, object]) -> str:
        t = Template(template)
        if self.safe_substitute:
            return t.safe_substitute(ctx)
        return t.substitute(ctx)


class TemplateRegistry:
    """Names → :class:`EmailTemplate`. Re-registration raises by default
    so duplicate names are caught at import time."""

    def __init__(self) -> None:
        self._templates: dict[str, EmailTemplate] = {}

    def register(self, template: EmailTemplate, *, overwrite: bool = False) -> None:
        if template.name in self._templates and not overwrite:
            msg = (
                f"template {template.name!r} already registered; "
                "pass overwrite=True to replace"
            )
            raise ValueError(msg)
        self._templates[template.name] = template

    def get(self, name: str) -> EmailTemplate:
        try:
            return self._templates[name]
        except KeyError as exc:
            msg = f"email template not registered: {name!r}"
            raise KeyError(msg) from exc

    def has(self, name: str) -> bool:
        return name in self._templates

    def all(self) -> list[EmailTemplate]:
        """Snapshot of every registered template — used by the admin
        catalog page and the operator-docs generator."""
        return list(self._templates.values())

    def clear(self) -> None:
        """Reset to empty. Tests use this between scenarios; production
        code should never call it."""
        self._templates.clear()


default_registry: TemplateRegistry = TemplateRegistry()
"""Process-wide template registry. Features register here at import
time. Tests may swap their own registry into an :class:`EmailService`
instance for isolation."""
