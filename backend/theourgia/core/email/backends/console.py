"""Console email backend — pretty-prints to stderr for development.

Use this when you want to see what the app would have sent without
actually sending. Pairs with ``THEOURGIA_EMAIL_BACKEND=console``.
"""

from __future__ import annotations

import sys

from theourgia.core.email.backends.base import EmailBackend, EmailSendResult
from theourgia.core.email.message import EmailMessage

__all__ = ["ConsoleEmailBackend"]


class ConsoleEmailBackend:
    """Prints messages to stderr. Always succeeds."""

    name = "console"

    def __init__(self, stream: object = None) -> None:
        # Stream is a file-like; defaults to sys.stderr. Tests can pass
        # an io.StringIO to capture output.
        self._stream = stream if stream is not None else sys.stderr

    async def send(self, message: EmailMessage) -> EmailSendResult:
        lines: list[str] = [
            "─── EMAIL ─────────────────────────────────────────────────────────",
            f"From:    {message.sender.formatted()}",
            f"To:      {', '.join(a.formatted() for a in message.to)}",
        ]
        if message.cc:
            lines.append(f"Cc:      {', '.join(a.formatted() for a in message.cc)}")
        if message.bcc:
            lines.append(f"Bcc:     {', '.join(a.formatted() for a in message.bcc)}")
        if message.reply_to:
            lines.append(f"Reply-To: {message.reply_to.formatted()}")
        lines.append(f"Subject: {message.subject}")
        if message.template_name:
            lines.append(f"X-Template: {message.template_name}")
        if message.tags:
            lines.append(f"X-Tags:     {', '.join(message.tags)}")
        lines.append("")
        if message.body_text:
            lines.append(message.body_text)
        if message.body_html and not message.body_text:
            lines.append("[HTML body — text body omitted]")
        lines.append("───────────────────────────────────────────────────────────────────")
        lines.append("")
        self._stream.write("\n".join(lines))
        self._stream.flush() if hasattr(self._stream, "flush") else None

        return EmailSendResult(
            provider=self.name,
            accepted_recipients=tuple(a.email for a in message.to),
        )
