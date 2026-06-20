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

Additional providers (SES, Postmark, Mailgun) follow the same pattern
and land as separate modules when an operator needs them.
"""

from __future__ import annotations

from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.backends.console import ConsoleEmailBackend
from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.backends.resend import ResendEmailBackend
from theourgia.core.email.backends.smtp import SMTPEmailBackend

__all__ = [
    "ConsoleEmailBackend",
    "EmailBackend",
    "EmailDeliveryError",
    "EmailSendResult",
    "NullEmailBackend",
    "ResendEmailBackend",
    "SMTPEmailBackend",
]
