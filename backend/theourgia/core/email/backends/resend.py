"""Resend backend — HTTPS via the Resend API.

Configured via ``THEOURGIA_RESEND_API_KEY``. Requires the ``resend``
package (install with the ``[email-resend]`` extra).

Resend is Sophia's chosen production provider; this backend is the
canonical reference implementation other HTTPS-based backends (SES,
Postmark, Mailgun) follow.
"""

from __future__ import annotations

from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.message import EmailMessage

__all__ = ["ResendEmailBackend"]


class ResendEmailBackend:
    """Resend.com delivery."""

    name = "resend"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            msg = "Resend API key must not be empty"
            raise ValueError(msg)
        # Lazy import so a default install without the [email-resend]
        # extra can still import this module — we only fail when an
        # operator actually selects this backend.
        try:
            import resend as _resend_module
        except ImportError as exc:
            msg = (
                "ResendEmailBackend requires the 'resend' package. "
                "Install with `pip install theourgia[email-resend]`."
            )
            raise EmailDeliveryError(
                msg, provider=self.name, provider_error="import failed"
            ) from exc
        self._resend = _resend_module
        self._resend.api_key = api_key  # type: ignore[attr-defined]

    async def send(self, message: EmailMessage) -> EmailSendResult:
        payload: dict[str, object] = {
            "from": message.sender.formatted(),
            "to": [a.email for a in message.to],
            "subject": message.subject,
        }
        if message.cc:
            payload["cc"] = [a.email for a in message.cc]
        if message.bcc:
            payload["bcc"] = [a.email for a in message.bcc]
        if message.reply_to:
            payload["reply_to"] = message.reply_to.email
        if message.body_text:
            payload["text"] = message.body_text
        if message.body_html:
            payload["html"] = message.body_html
        if message.tags:
            payload["tags"] = [{"name": t} for t in message.tags]
        if message.headers:
            payload["headers"] = dict(message.headers)
        if message.attachments:
            payload["attachments"] = [
                {
                    "filename": att.filename,
                    "content": list(att.content),
                    "content_type": att.content_type,
                }
                for att in message.attachments
            ]

        try:
            # The resend client is sync; running its `send` is a quick
            # HTTP POST. We don't wrap with to_thread here because the
            # Resend SDK already uses httpx underneath.
            response = self._resend.Emails.send(payload)  # type: ignore[attr-defined]
        except Exception as exc:  # noqa: BLE001
            raise EmailDeliveryError(
                f"Resend delivery failed: {exc.__class__.__name__}",
                provider=self.name,
                provider_error=str(exc),
            ) from exc

        message_id = ""
        if isinstance(response, dict):
            message_id = str(response.get("id") or "")
        return EmailSendResult(
            provider=self.name,
            provider_message_id=message_id or None,
            accepted_recipients=tuple(a.email for a in message.to),
            raw_response=repr(response)[:512],
        )
