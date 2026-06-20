"""Email message data shapes.

Frozen dataclasses describing a message ready to send. All construction
goes through :class:`EmailMessage`; backends consume it and translate
into provider-specific formats. The shape is provider-neutral so
features never tie themselves to a particular vendor.

Why frozen dataclasses (not Pydantic models)? These types travel inside
a single process and don't cross a JSON boundary; the runtime
validation overhead pays for nothing here. Construction-time validation
happens in ``__post_init__`` where it matters (email-address shape, at
least one body, attachment size sanity).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Final

__all__ = ["Attachment", "EmailAddress", "EmailMessage"]


# A deliberately permissive email-shape regex. Full RFC 5322 validation
# is undecidable in regex; we screen out the obviously-wrong here and
# trust the provider's own validation for the rest.
_EMAIL_RE: Final = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

_MAX_ATTACHMENT_SIZE: Final[int] = 25 * 1024 * 1024  # 25 MiB
"""Most providers cap individual attachments around 25 MiB; refuse
larger to fail fast at construction rather than at the provider."""


@dataclass(frozen=True, slots=True)
class EmailAddress:
    """An RFC 5322 mailbox — email + optional display name."""

    email: str
    name: str | None = None

    def __post_init__(self) -> None:
        if not _EMAIL_RE.match(self.email):
            msg = f"invalid email address: {self.email!r}"
            raise ValueError(msg)

    def formatted(self) -> str:
        """RFC 5322 ``Name <email>`` form for headers."""
        if self.name:
            # Quote names that contain commas/special chars
            escaped = self.name.replace('"', '\\"')
            return f'"{escaped}" <{self.email}>'
        return self.email

    @classmethod
    def parse(cls, value: "EmailAddress | str") -> "EmailAddress":
        """Coerce a string into an :class:`EmailAddress`; pass through if
        already one. Convenience for callers that accept either."""
        if isinstance(value, EmailAddress):
            return value
        return cls(email=value)


@dataclass(frozen=True, slots=True)
class Attachment:
    """A file attached to the message.

    Attributes:
        filename: Name as the recipient sees it.
        content_type: MIME type (e.g. ``"application/pdf"``).
        content: Raw bytes. For large attachments, see
            :data:`_MAX_ATTACHMENT_SIZE`.
        inline_cid: When set, the attachment is treated as an inline
            resource referenced by HTML ``<img src="cid:..."`` tags.
    """

    filename: str
    content_type: str
    content: bytes
    inline_cid: str | None = None

    def __post_init__(self) -> None:
        if not self.filename:
            raise ValueError("attachment filename must not be empty")
        if "/" not in self.content_type:
            msg = f"invalid content_type for attachment: {self.content_type!r}"
            raise ValueError(msg)
        if len(self.content) > _MAX_ATTACHMENT_SIZE:
            msg = (
                f"attachment {self.filename!r} too large "
                f"({len(self.content)} bytes; max {_MAX_ATTACHMENT_SIZE})"
            )
            raise ValueError(msg)


@dataclass(frozen=True, slots=True)
class EmailMessage:
    """A message ready to send.

    Backends consume this and translate to their provider-specific shape.
    At least one of ``body_text`` or ``body_html`` must be present.

    Attributes:
        to: Recipients (at least one).
        sender: ``From:`` address. Operator-configured default if a
            feature doesn't override.
        subject: Subject line. Should be already-rendered (templates
            handle their own rendering before construction).
        body_text: Plain-text body. Strongly recommended even when HTML
            is present — clients that prefer text get a graceful
            fallback.
        body_html: HTML body. Optional.
        cc / bcc: Standard.
        reply_to: ``Reply-To:`` header value.
        headers: Extra RFC 822 headers. Provider may filter some
            (``Bcc`` etc.) — set those via the dedicated fields.
        tags: Provider-specific labels for analytics / filtering. Not
            every provider supports them; the backend ignores tags it
            can't represent.
        attachments: Files to attach.
        template_name: When a template produced this message, its
            registered name. Recorded in :class:`EmailLog` and used in
            audit / metrics.
    """

    to: tuple[EmailAddress, ...]
    sender: EmailAddress
    subject: str
    body_text: str | None = None
    body_html: str | None = None
    cc: tuple[EmailAddress, ...] = ()
    bcc: tuple[EmailAddress, ...] = ()
    reply_to: EmailAddress | None = None
    headers: dict[str, str] = field(default_factory=dict)
    tags: tuple[str, ...] = ()
    attachments: tuple[Attachment, ...] = ()
    template_name: str | None = None

    def __post_init__(self) -> None:
        if not self.to:
            raise ValueError("EmailMessage.to must contain at least one recipient")
        if not self.subject:
            raise ValueError("EmailMessage.subject must not be empty")
        if not self.body_text and not self.body_html:
            raise ValueError(
                "EmailMessage must have at least one of body_text / body_html"
            )

    @property
    def primary_recipient(self) -> EmailAddress:
        """Convenience for logging / audit when one address is enough."""
        return self.to[0]
