"""Null email backend — silently records sends for tests.

Use this in test fixtures: features under test call
``email_service.send(...)`` and the test asserts against
``backend.sent`` to verify what would have gone out.

Pairs with ``THEOURGIA_EMAIL_BACKEND=null`` but you'd more typically
construct one directly in a fixture.
"""

from __future__ import annotations

from theourgia.core.email.backends.base import EmailBackend, EmailSendResult
from theourgia.core.email.message import EmailMessage

__all__ = ["NullEmailBackend"]


class NullEmailBackend:
    """Records every send; performs no I/O."""

    name = "null"

    def __init__(self) -> None:
        self.sent: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> EmailSendResult:
        self.sent.append(message)
        return EmailSendResult(
            provider=self.name,
            provider_message_id=f"null-{len(self.sent)}",
            accepted_recipients=tuple(a.email for a in message.to),
        )

    def clear(self) -> None:
        """Reset recorded sends. Test fixtures call this between tests."""
        self.sent.clear()

    def find_by_template(self, name: str) -> list[EmailMessage]:
        """Return all recorded messages produced by a given template."""
        return [m for m in self.sent if m.template_name == name]

    def find_by_recipient(self, email: str) -> list[EmailMessage]:
        """Return all recorded messages addressed to a specific email."""
        return [
            m
            for m in self.sent
            if any(addr.email == email for addr in m.to)
        ]
