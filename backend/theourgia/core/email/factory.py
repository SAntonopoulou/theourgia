"""Construct an :class:`EmailService` from settings.

Called once at app startup (via the FastAPI lifespan) and once at
Celery-worker startup. Production code goes through this; tests
construct services directly with a :class:`NullEmailBackend`.
"""

from __future__ import annotations

from theourgia.core.email.backends.base import EmailBackend
from theourgia.core.email.backends.console import ConsoleEmailBackend
from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.backends.resend import ResendEmailBackend
from theourgia.core.email.backends.smtp import SMTPConfig, SMTPEmailBackend
from theourgia.core.email.message import EmailAddress
from theourgia.core.email.service import EmailService

__all__ = ["build_email_service", "build_backend_from_settings"]


def build_backend_from_settings(settings: object) -> EmailBackend:
    """Pick the right backend based on ``THEOURGIA_EMAIL_BACKEND``.

    ``settings`` is the application ``Settings`` instance; this function
    reads the email-related attributes from it without taking a
    concrete Pydantic dependency (so tests can pass a SimpleNamespace).
    """
    name = (getattr(settings, "email_backend", None) or "console").lower()

    if name == "console":
        return ConsoleEmailBackend()

    if name == "null":
        return NullEmailBackend()

    if name == "resend":
        api_key = _secret(getattr(settings, "resend_api_key", None))
        if not api_key:
            msg = "THEOURGIA_RESEND_API_KEY required when EMAIL_BACKEND=resend"
            raise ValueError(msg)
        return ResendEmailBackend(api_key=api_key)

    if name == "smtp":
        host = getattr(settings, "smtp_host", "") or ""
        if not host:
            msg = "THEOURGIA_SMTP_HOST required when EMAIL_BACKEND=smtp"
            raise ValueError(msg)
        return SMTPEmailBackend(
            SMTPConfig(
                host=host,
                port=int(getattr(settings, "smtp_port", 587) or 587),
                username=getattr(settings, "smtp_username", "") or "",
                password=_secret(getattr(settings, "smtp_password", None)) or "",
                use_starttls=bool(getattr(settings, "smtp_use_starttls", True)),
                use_ssl=bool(getattr(settings, "smtp_use_ssl", False)),
            )
        )

    msg = (
        f"unknown email backend: {name!r}. "
        "Set THEOURGIA_EMAIL_BACKEND to one of: console, null, resend, smtp"
    )
    raise ValueError(msg)


def build_email_service(settings: object) -> EmailService:
    """Construct the process-wide :class:`EmailService`."""
    backend = build_backend_from_settings(settings)

    default_from = getattr(settings, "email_default_from", "") or ""
    if not default_from:
        msg = (
            "THEOURGIA_EMAIL_DEFAULT_FROM required "
            "(operator's From: address for outbound mail)"
        )
        raise ValueError(msg)

    sender = EmailAddress(
        email=default_from,
        name=getattr(settings, "email_default_from_name", None) or None,
    )

    return EmailService(
        backend=backend,
        default_sender=sender,
        dry_run=bool(getattr(settings, "email_dry_run", False)),
    )


def _secret(value: object) -> str:
    """Extract a string from a Pydantic SecretStr or pass through."""
    if value is None:
        return ""
    if hasattr(value, "get_secret_value"):
        return value.get_secret_value() or ""
    return str(value)
