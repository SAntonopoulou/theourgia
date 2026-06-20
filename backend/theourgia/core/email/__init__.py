"""Email substrate — outbound mail dispatch with pluggable providers.

Features call into :class:`EmailService` (typically via the FastAPI
dependency :func:`theourgia.api.deps.EmailServiceDep`) and never know
which provider does the actual delivery::

    await email_service.send_template(
        "auth.password_reset",
        to=user.email,
        context={"reset_url": url, "user_name": user.display_name},
    )

The provider that performs the SMTP / HTTPS handshake is chosen at
process start by the operator via ``THEOURGIA_EMAIL_BACKEND``. Real
provider libraries (resend, postmarker, boto3, etc.) are opt-in
``[email-*]`` extras — a default install carries only the stdlib SMTP
backend plus the dev/test backends (console, null).

Templates live in :mod:`theourgia.core.email.templates`. Features that
own a template register it at module import time alongside the feature
code, so the template definition stays next to the feature that
triggers it.
"""

from __future__ import annotations

from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.factory import build_email_service
from theourgia.core.email.message import (
    Attachment,
    EmailAddress,
    EmailMessage,
)
from theourgia.core.email.service import EmailService
from theourgia.core.email.templates import (
    EmailTemplate,
    RenderedEmail,
    TemplateRegistry,
    default_registry,
)

__all__ = [
    "Attachment",
    "EmailAddress",
    "EmailBackend",
    "EmailDeliveryError",
    "EmailMessage",
    "EmailSendResult",
    "EmailService",
    "EmailTemplate",
    "RenderedEmail",
    "TemplateRegistry",
    "build_email_service",
    "default_registry",
]
