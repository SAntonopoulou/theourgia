"""SMTP backend — stdlib-only. Works against any SMTP relay.

Configured via ``THEOURGIA_SMTP_*`` env vars (host, port, username,
password, STARTTLS / SSL flags). No optional dependency needed; this
backend is always available in the default install.

Implementation: builds the MIME message via :mod:`email.message`,
delivers via :mod:`smtplib` in a thread (the stdlib SMTP client is
sync; we wrap it with :func:`asyncio.to_thread` to play nicely with
the rest of the async stack).
"""

from __future__ import annotations

import asyncio
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage as MIMEMessage
from typing import Final

from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.message import EmailMessage

__all__ = ["SMTPConfig", "SMTPEmailBackend"]


_DEFAULT_TIMEOUT: Final[float] = 30.0


@dataclass(frozen=True, slots=True)
class SMTPConfig:
    """Connection parameters for an SMTP relay."""

    host: str
    port: int = 587
    username: str = ""
    password: str = ""
    use_starttls: bool = True
    use_ssl: bool = False
    timeout: float = _DEFAULT_TIMEOUT


class SMTPEmailBackend:
    """SMTP delivery via :mod:`smtplib`."""

    name = "smtp"

    def __init__(self, config: SMTPConfig) -> None:
        if not config.host:
            raise ValueError("SMTPConfig.host must not be empty")
        self._config = config

    async def send(self, message: EmailMessage) -> EmailSendResult:
        mime = _build_mime(message)
        try:
            rejected = await asyncio.to_thread(self._send_sync, mime, message)
        except (smtplib.SMTPException, OSError, ssl.SSLError) as exc:
            raise EmailDeliveryError(
                f"SMTP delivery failed: {exc.__class__.__name__}",
                provider=self.name,
                provider_error=str(exc),
            ) from exc

        accepted = tuple(
            a.email for a in (*message.to, *message.cc, *message.bcc)
            if a.email not in rejected
        )
        return EmailSendResult(
            provider=self.name,
            provider_message_id=mime.get("Message-ID"),
            accepted_recipients=accepted,
            rejected_recipients=tuple(rejected),
        )

    def _send_sync(self, mime: MIMEMessage, message: EmailMessage) -> set[str]:
        cfg = self._config
        recipients = [a.email for a in (*message.to, *message.cc, *message.bcc)]

        if cfg.use_ssl:
            context = ssl.create_default_context()
            client: smtplib.SMTP = smtplib.SMTP_SSL(
                cfg.host, cfg.port, timeout=cfg.timeout, context=context
            )
        else:
            client = smtplib.SMTP(cfg.host, cfg.port, timeout=cfg.timeout)

        try:
            client.ehlo()
            if cfg.use_starttls and not cfg.use_ssl:
                context = ssl.create_default_context()
                client.starttls(context=context)
                client.ehlo()
            if cfg.username:
                client.login(cfg.username, cfg.password)
            send_errors = client.send_message(
                mime,
                from_addr=message.sender.email,
                to_addrs=recipients,
            )
            return set(send_errors.keys())
        finally:
            try:
                client.quit()
            except smtplib.SMTPException:
                # quit failures don't matter once delivery succeeded
                pass


def _build_mime(message: EmailMessage) -> MIMEMessage:
    """Translate :class:`EmailMessage` into a stdlib :class:`MIMEMessage`."""
    mime = MIMEMessage()
    mime["From"] = message.sender.formatted()
    mime["To"] = ", ".join(a.formatted() for a in message.to)
    if message.cc:
        mime["Cc"] = ", ".join(a.formatted() for a in message.cc)
    if message.bcc:
        mime["Bcc"] = ", ".join(a.formatted() for a in message.bcc)
    if message.reply_to:
        mime["Reply-To"] = message.reply_to.formatted()
    mime["Subject"] = message.subject

    for header_name, header_value in message.headers.items():
        # Don't let user-headers override the canonical fields above
        if header_name.lower() not in {"from", "to", "cc", "bcc", "reply-to", "subject"}:
            mime[header_name] = header_value

    if message.template_name:
        mime["X-Theourgia-Template"] = message.template_name
    if message.tags:
        mime["X-Theourgia-Tags"] = ",".join(message.tags)

    if message.body_text and message.body_html:
        mime.set_content(message.body_text)
        mime.add_alternative(message.body_html, subtype="html")
    elif message.body_html:
        mime.set_content(message.body_html, subtype="html")
    else:
        mime.set_content(message.body_text or "")

    for att in message.attachments:
        maintype, _, subtype = att.content_type.partition("/")
        mime.add_attachment(
            att.content,
            maintype=maintype or "application",
            subtype=subtype or "octet-stream",
            filename=att.filename,
        )
    return mime
