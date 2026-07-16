"""AWS SES backend — HTTPS via the SES v2 SendEmail API.

Configured via ``THEOURGIA_SES_REGION`` plus
``THEOURGIA_SES_ACCESS_KEY_ID`` / ``THEOURGIA_SES_SECRET_ACCESS_KEY``
(the factory falls back to the instance-wide ``AWS_ACCESS_KEY_ID`` /
``AWS_SECRET_ACCESS_KEY`` already used for backups). Delivery is a
single JSON POST to

    https://email.{region}.amazonaws.com/v2/email/outbound-emails

signed with AWS Signature Version 4.

Why no boto3? It is only an optional ``[storage-s3]`` extra, and one
signed POST doesn't justify a hard dependency on it. SigV4 over a
fixed endpoint is ~40 lines of stdlib hmac/hashlib, implemented below
with a known-answer test against the AWS-documented example vector.

Honesty
-------

Every send is one signed POST to SES. Failures raise
:class:`EmailDeliveryError`. There is NO silent-retry queue here —
that lives in the service layer (Celery task). The backend's job is
one attempt + a clean error on failure.

Limits of the ``Simple`` content shape used here: attachments require
SES ``Raw`` (MIME) content, so the backend refuses messages carrying
attachments rather than silently dropping them. SES tag values also
have a restricted charset that Theourgia's free-form tags don't fit,
so tags are not forwarded (see :class:`EmailMessage` — backends may
ignore tags they can't represent).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
from typing import Any, Final

from theourgia.core.clock import now
from theourgia.core.email.backends.base import (
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.backends.transport import (
    EmailHTTPTransport,
    HttpxEmailTransport,
)
from theourgia.core.email.message import EmailMessage

__all__ = ["SESEmailBackend", "derive_signing_key"]


_ALGORITHM: Final[str] = "AWS4-HMAC-SHA256"
_SERVICE: Final[str] = "ses"
_PATH: Final[str] = "/v2/email/outbound-emails"

# AWS region names are strictly lowercase alphanumerics and hyphens
# (us-east-1, eu-central-2, ...). Reject anything else at construction
# so a malformed region can't warp the endpoint URL.
_REGION_RE: Final = re.compile(r"^[a-z0-9-]+$")


def _hmac_sha256(key: bytes, message: str) -> bytes:
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()


def derive_signing_key(
    secret_key: str, date_stamp: str, region: str, service: str
) -> bytes:
    """Derive the SigV4 signing key (the documented HMAC chain).

    Exposed at module level so the known-answer test can verify the
    derivation against the example vector in the AWS SigV4 docs."""
    k_date = _hmac_sha256(b"AWS4" + secret_key.encode("utf-8"), date_stamp)
    k_region = _hmac_sha256(k_date, region)
    k_service = _hmac_sha256(k_region, service)
    return _hmac_sha256(k_service, "aws4_request")


class SESEmailBackend:
    """AWS SES v2 delivery via a hand-signed SendEmail call."""

    name = "ses"

    def __init__(
        self,
        *,
        region: str,
        access_key_id: str,
        secret_access_key: str,
        session_token: str | None = None,
        transport: EmailHTTPTransport | None = None,
    ) -> None:
        if not region or not _REGION_RE.match(region):
            msg = f"SES region must be a plain AWS region name, got {region!r}"
            raise ValueError(msg)
        if not access_key_id:
            msg = "SES access key ID must not be empty"
            raise ValueError(msg)
        if not secret_access_key:
            msg = "SES secret access key must not be empty"
            raise ValueError(msg)
        self._region = region
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._session_token = session_token or None
        self._host = f"email.{region}.amazonaws.com"
        self._transport = transport if transport is not None else HttpxEmailTransport()

    async def send(self, message: EmailMessage) -> EmailSendResult:
        if message.attachments:
            raise EmailDeliveryError(
                "SES backend uses Simple content, which cannot carry "
                "attachments; use the smtp or postmark backend for "
                "attachment mail",
                provider=self.name,
                provider_error="attachments unsupported",
            )

        content = json.dumps(self._payload(message)).encode("utf-8")
        headers = self._signed_headers(content)

        try:
            status, body = await self._transport.post(
                f"https://{self._host}{_PATH}",
                headers=headers,
                content=content,
            )
        except Exception as exc:
            raise EmailDeliveryError(
                f"SES delivery failed: {exc.__class__.__name__}",
                provider=self.name,
                provider_error=str(exc),
            ) from exc

        if status >= 400:
            raise EmailDeliveryError(
                f"SES rejected the message (HTTP {status})",
                provider=self.name,
                provider_error=str(body.get("message") or f"HTTP {status}"),
            )

        message_id = str(body.get("MessageId") or "")
        return EmailSendResult(
            provider=self.name,
            provider_message_id=message_id or None,
            accepted_recipients=tuple(a.email for a in message.to),
            raw_response=repr(body)[:512],
        )

    def _payload(self, message: EmailMessage) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if message.body_text:
            body["Text"] = {"Data": message.body_text, "Charset": "UTF-8"}
        if message.body_html:
            body["Html"] = {"Data": message.body_html, "Charset": "UTF-8"}

        simple: dict[str, Any] = {
            "Subject": {"Data": message.subject, "Charset": "UTF-8"},
            "Body": body,
        }
        if message.headers:
            simple["Headers"] = [
                {"Name": k, "Value": v} for k, v in message.headers.items()
            ]

        destination: dict[str, Any] = {
            "ToAddresses": [a.formatted() for a in message.to],
        }
        if message.cc:
            destination["CcAddresses"] = [a.formatted() for a in message.cc]
        if message.bcc:
            destination["BccAddresses"] = [a.formatted() for a in message.bcc]

        payload: dict[str, Any] = {
            "FromEmailAddress": message.sender.formatted(),
            "Destination": destination,
            "Content": {"Simple": simple},
        }
        if message.reply_to:
            payload["ReplyToAddresses"] = [message.reply_to.email]
        return payload

    def _signed_headers(self, content: bytes) -> dict[str, str]:
        """Build the request headers, including the SigV4 Authorization.

        Timestamps come from the clock substrate so tests are
        deterministic (see ``theourgia.core.clock``)."""
        when = now()
        amz_date = when.strftime("%Y%m%dT%H%M%SZ")
        date_stamp = when.strftime("%Y%m%d")
        payload_hash = hashlib.sha256(content).hexdigest()

        headers = {
            "content-type": "application/json",
            "host": self._host,
            "x-amz-date": amz_date,
        }
        if self._session_token:
            headers["x-amz-security-token"] = self._session_token

        signed_header_names = ";".join(sorted(headers))
        canonical_headers = "".join(
            f"{name}:{headers[name]}\n" for name in sorted(headers)
        )
        canonical_request = "\n".join(
            (
                "POST",
                _PATH,
                "",  # no query string
                canonical_headers,
                signed_header_names,
                payload_hash,
            )
        )

        credential_scope = f"{date_stamp}/{self._region}/{_SERVICE}/aws4_request"
        string_to_sign = "\n".join(
            (
                _ALGORITHM,
                amz_date,
                credential_scope,
                hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
            )
        )

        signing_key = derive_signing_key(
            self._secret_access_key, date_stamp, self._region, _SERVICE
        )
        signature = hmac.new(
            signing_key, string_to_sign.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        headers["authorization"] = (
            f"{_ALGORITHM} "
            f"Credential={self._access_key_id}/{credential_scope}, "
            f"SignedHeaders={signed_header_names}, "
            f"Signature={signature}"
        )
        return headers
