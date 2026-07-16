"""Mailgun backend — HTTPS via the Mailgun messages API.

Configured via ``THEOURGIA_MAILGUN_API_KEY`` +
``THEOURGIA_MAILGUN_DOMAIN`` (and ``THEOURGIA_MAILGUN_EU_REGION=true``
for domains hosted in Mailgun's EU region). No optional dependency
needed — delivery is a single form-encoded POST to

    https://api.mailgun.net/v3/{domain}/messages      (US, default)
    https://api.eu.mailgun.net/v3/{domain}/messages   (EU)

authenticated with HTTP Basic auth (``api:<key>``).

Honesty
-------

Every send is one POST to Mailgun. Failures raise
:class:`EmailDeliveryError`. There is NO silent-retry queue here —
that lives in the service layer (Celery task). The backend's job is
one attempt + a clean error on failure.

Attachments require a multipart/form-data body, which this
form-encoded backend does not speak; it refuses messages carrying
attachments rather than silently dropping them.
"""

from __future__ import annotations

import base64
import re
import urllib.parse
from typing import Final

from theourgia.core.email.backends.base import (
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.backends.transport import (
    EmailHTTPTransport,
    HttpxEmailTransport,
)
from theourgia.core.email.message import EmailMessage

__all__ = ["MailgunEmailBackend"]


_US_BASE_URL: Final[str] = "https://api.mailgun.net"
_EU_BASE_URL: Final[str] = "https://api.eu.mailgun.net"

# Sending domains are plain DNS names (mg.example.com). Reject anything
# with separators that could warp the endpoint URL.
_DOMAIN_RE: Final = re.compile(r"^[A-Za-z0-9.-]+$")


class MailgunEmailBackend:
    """Mailgun delivery."""

    name = "mailgun"

    def __init__(
        self,
        api_key: str,
        domain: str,
        *,
        eu_region: bool = False,
        transport: EmailHTTPTransport | None = None,
    ) -> None:
        if not api_key:
            msg = "Mailgun API key must not be empty"
            raise ValueError(msg)
        if not domain or not _DOMAIN_RE.match(domain):
            msg = f"Mailgun sending domain must be a plain DNS name, got {domain!r}"
            raise ValueError(msg)
        base_url = _EU_BASE_URL if eu_region else _US_BASE_URL
        self._url = f"{base_url}/v3/{domain}/messages"
        credentials = base64.b64encode(f"api:{api_key}".encode()).decode("ascii")
        self._auth_header = f"Basic {credentials}"
        self._transport = transport if transport is not None else HttpxEmailTransport()

    async def send(self, message: EmailMessage) -> EmailSendResult:
        if message.attachments:
            raise EmailDeliveryError(
                "Mailgun backend sends form-encoded requests, which "
                "cannot carry attachments; use the smtp or postmark "
                "backend for attachment mail",
                provider=self.name,
                provider_error="attachments unsupported",
            )

        fields: list[tuple[str, str]] = [
            ("from", message.sender.formatted()),
            ("subject", message.subject),
        ]
        fields.extend(("to", a.formatted()) for a in message.to)
        fields.extend(("cc", a.formatted()) for a in message.cc)
        fields.extend(("bcc", a.formatted()) for a in message.bcc)
        if message.reply_to:
            fields.append(("h:Reply-To", message.reply_to.formatted()))
        if message.body_text:
            fields.append(("text", message.body_text))
        if message.body_html:
            fields.append(("html", message.body_html))
        fields.extend(("o:tag", tag) for tag in message.tags)
        fields.extend(
            (f"h:{name}", value) for name, value in message.headers.items()
        )

        headers = {
            "Authorization": self._auth_header,
            "Content-Type": "application/x-www-form-urlencoded",
        }

        try:
            status, body = await self._transport.post(
                self._url,
                headers=headers,
                content=urllib.parse.urlencode(fields).encode("utf-8"),
            )
        except Exception as exc:
            raise EmailDeliveryError(
                f"Mailgun delivery failed: {exc.__class__.__name__}",
                provider=self.name,
                provider_error=str(exc),
            ) from exc

        if status >= 400:
            raise EmailDeliveryError(
                f"Mailgun rejected the message (HTTP {status})",
                provider=self.name,
                provider_error=str(body.get("message") or f"HTTP {status}"),
            )

        message_id = str(body.get("id") or "")
        return EmailSendResult(
            provider=self.name,
            provider_message_id=message_id or None,
            accepted_recipients=tuple(a.email for a in message.to),
            raw_response=repr(body)[:512],
        )
