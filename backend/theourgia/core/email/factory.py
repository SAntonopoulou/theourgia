"""Construct an :class:`EmailService` from settings.

Called once at app startup (via the FastAPI lifespan) and once at
Celery-worker startup. Production code goes through this; tests
construct services directly with a :class:`NullEmailBackend`.
"""

from __future__ import annotations

from theourgia.core.email.backends.base import EmailBackend
from theourgia.core.email.backends.console import ConsoleEmailBackend
from theourgia.core.email.backends.mailgun import MailgunEmailBackend
from theourgia.core.email.backends.null import NullEmailBackend
from theourgia.core.email.backends.postmark import PostmarkEmailBackend
from theourgia.core.email.backends.resend import ResendEmailBackend
from theourgia.core.email.backends.ses import SESEmailBackend
from theourgia.core.email.backends.smtp import SMTPConfig, SMTPEmailBackend
from theourgia.core.email.message import EmailAddress
from theourgia.core.email.service import EmailService

__all__ = ["build_backend_from_settings", "build_email_service"]


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

    if name == "postmark":
        server_token = _secret(getattr(settings, "postmark_server_token", None))
        if not server_token:
            msg = (
                "THEOURGIA_POSTMARK_SERVER_TOKEN required "
                "when EMAIL_BACKEND=postmark"
            )
            raise ValueError(msg)
        return PostmarkEmailBackend(
            server_token=server_token,
            message_stream=(
                getattr(settings, "postmark_message_stream", "") or "outbound"
            ),
        )

    if name == "ses":
        region = getattr(settings, "ses_region", "") or ""
        if not region:
            msg = "THEOURGIA_SES_REGION required when EMAIL_BACKEND=ses"
            raise ValueError(msg)
        # Dedicated SES credentials win; fall back to the instance-wide
        # AWS credentials already configured for backups.
        access_key_id = _secret(
            getattr(settings, "ses_access_key_id", None)
        ) or _secret(getattr(settings, "aws_access_key_id", None))
        secret_access_key = _secret(
            getattr(settings, "ses_secret_access_key", None)
        ) or _secret(getattr(settings, "aws_secret_access_key", None))
        if not access_key_id or not secret_access_key:
            msg = (
                "SES credentials required when EMAIL_BACKEND=ses: set "
                "THEOURGIA_SES_ACCESS_KEY_ID + THEOURGIA_SES_SECRET_ACCESS_KEY "
                "(or the instance-wide AWS_ACCESS_KEY_ID + "
                "AWS_SECRET_ACCESS_KEY)"
            )
            raise ValueError(msg)
        return SESEmailBackend(
            region=region,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            session_token=_secret(getattr(settings, "ses_session_token", None))
            or None,
        )

    if name == "mailgun":
        api_key = _secret(getattr(settings, "mailgun_api_key", None))
        if not api_key:
            msg = "THEOURGIA_MAILGUN_API_KEY required when EMAIL_BACKEND=mailgun"
            raise ValueError(msg)
        domain = getattr(settings, "mailgun_domain", "") or ""
        if not domain:
            msg = "THEOURGIA_MAILGUN_DOMAIN required when EMAIL_BACKEND=mailgun"
            raise ValueError(msg)
        return MailgunEmailBackend(
            api_key=api_key,
            domain=domain,
            eu_region=bool(getattr(settings, "mailgun_eu_region", False)),
        )

    msg = (
        f"unknown email backend: {name!r}. "
        "Set THEOURGIA_EMAIL_BACKEND to one of: console, null, resend, smtp, "
        "postmark, ses, mailgun"
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
