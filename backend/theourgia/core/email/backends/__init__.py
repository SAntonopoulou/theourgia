"""Email delivery backends.

Each backend implements :class:`EmailBackend` and translates an
:class:`EmailMessage` into a provider-specific call. Construct one via
the factory, not directly — the factory picks the right backend from
settings and gracefully degrades when an opt-in provider library is
missing.

Available backends:

- :class:`ConsoleEmailBackend` — dev: pretty-prints to stderr.
- :class:`NullEmailBackend` — tests: silently records sends.
- :class:`SMTPEmailBackend` — stdlib SMTP. Works against any SMTP relay.
- :class:`ResendEmailBackend` — Resend (HTTPS). Requires the ``resend`` package (``[email-resend]`` extra).
- :class:`PostmarkEmailBackend` — Postmark (HTTPS). No extra needed.
- :class:`SESEmailBackend` — AWS SES v2 (HTTPS + SigV4). No extra needed.
- :class:`MailgunEmailBackend` — Mailgun (HTTPS). No extra needed.

The HTTPS backends speak through :class:`EmailHTTPTransport` (an
injectable Protocol; production default is httpx) so tests never
touch the network.
"""

from __future__ import annotations

from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.backends.console import ConsoleEmailBackend
from theourgia.core.email.backends.mailgun import MailgunEmailBackend
from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.backends.postmark import PostmarkEmailBackend
from theourgia.core.email.backends.resend import ResendEmailBackend
from theourgia.core.email.backends.ses import SESEmailBackend
from theourgia.core.email.backends.smtp import SMTPEmailBackend
from theourgia.core.email.backends.transport import (
    EmailHTTPTransport,
    HttpxEmailTransport,
)

__all__ = [
    "ConsoleEmailBackend",
    "EmailBackend",
    "EmailDeliveryError",
    "EmailHTTPTransport",
    "EmailSendResult",
    "HttpxEmailTransport",
    "MailgunEmailBackend",
    "NullEmailBackend",
    "PostmarkEmailBackend",
    "ResendEmailBackend",
    "SESEmailBackend",
    "SMTPEmailBackend",
]
