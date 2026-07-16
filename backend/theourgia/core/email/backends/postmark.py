"""Postmark backend — HTTPS via the Postmark API.

Configured via ``THEOURGIA_POSTMARK_SERVER_TOKEN`` (and optionally
``THEOURGIA_POSTMARK_MESSAGE_STREAM``, default ``"outbound"``). No
optional dependency needed — delivery is a single JSON POST to

    https://api.postmarkapp.com/email

authenticated with the ``X-Postmark-Server-Token`` header.

Honesty
-------

Every send is one POST to Postmark. Failures raise
:class:`EmailDeliveryError`. There is NO silent-retry queue here —
that lives in the service layer (Celery task). The backend's job is
one attempt + a clean error on failure.

Postmark reports errors two ways: an HTTP error status, or an
``ErrorCode`` field != 0 in an otherwise-200 body. Both raise.
"""

from __future__ import annotations

import base64
import json
from typing import Any, Final

from theourgia.core.email.backends.base import (
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.backends.transport import (
    EmailHTTPTransport,
    HttpxEmailTransport,
)
from theourgia.core.email.message import EmailMessage

__all__ = ["PostmarkEmailBackend"]


_POSTMARK_URL: Final[str] = "https://api.postmarkapp.com/email"


class PostmarkEmailBackend:
    """Postmarkapp.com delivery."""

    name = "postmark"

    def __init__(
        self,
        server_token: str,
        *,
        message_stream: str = "outbound",
        transport: EmailHTTPTransport | None = None,
    ) -> None:
        if not server_token:
            msg = "Postmark server token must not be empty"
            raise ValueError(msg)
        if not message_stream:
            msg = "Postmark message stream must not be empty"
            raise ValueError(msg)
        self._server_token = server_token
        self._message_stream = message_stream
        self._transport = transport if transport is not None else HttpxEmailTransport()

    async def send(self, message: EmailMessage) -> EmailSendResult:
        payload: dict[str, Any] = {
            "From": message.sender.formatted(),
            "To": ", ".join(a.formatted() for a in message.to),
            "Subject": message.subject,
            "MessageStream": self._message_stream,
        }
        if message.cc:
            payload["Cc"] = ", ".join(a.formatted() for a in message.cc)
        if message.bcc:
            payload["Bcc"] = ", ".join(a.formatted() for a in message.bcc)
        if message.reply_to:
            payload["ReplyTo"] = message.reply_to.email
        if message.body_text:
            payload["TextBody"] = message.body_text
        if message.body_html:
            payload["HtmlBody"] = message.body_html
        if message.tags:
            # Postmark supports exactly one tag per message; extra tags
            # can't be represented and are dropped (see EmailMessage docs).
            payload["Tag"] = message.tags[0]
        if message.headers:
            payload["Headers"] = [
                {"Name": k, "Value": v} for k, v in message.headers.items()
            ]
        if message.attachments:
            payload["Attachments"] = [
                _attachment_payload(att) for att in message.attachments
            ]

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": self._server_token,
        }

        try:
            status, body = await self._transport.post(
                _POSTMARK_URL,
                headers=headers,
                content=json.dumps(payload).encode("utf-8"),
            )
        except Exception as exc:
            raise EmailDeliveryError(
                f"Postmark delivery failed: {exc.__class__.__name__}",
                provider=self.name,
                provider_error=str(exc),
            ) from exc

        error_code = _int_or_zero(body.get("ErrorCode"))
        if status >= 400 or error_code != 0:
            raise EmailDeliveryError(
                f"Postmark rejected the message (HTTP {status})",
                provider=self.name,
                provider_error=(
                    f"ErrorCode {error_code}: {body.get('Message') or 'unknown'}"
                ),
            )

        message_id = str(body.get("MessageID") or "")
        return EmailSendResult(
            provider=self.name,
            provider_message_id=message_id or None,
            accepted_recipients=tuple(a.email for a in message.to),
            raw_response=repr(body)[:512],
        )


def _attachment_payload(att: Any) -> dict[str, str]:
    entry = {
        "Name": att.filename,
        "Content": base64.b64encode(att.content).decode("ascii"),
        "ContentType": att.content_type,
    }
    if att.inline_cid:
        entry["ContentID"] = f"cid:{att.inline_cid}"
    return entry


def _int_or_zero(value: object) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0
