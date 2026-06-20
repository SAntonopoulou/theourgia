"""Email backend Protocol and shared types.

Any backend that satisfies :class:`EmailBackend` plugs into the email
substrate. Backends MUST be async-callable (FastAPI / Celery already
run an event loop) and MUST raise :class:`EmailDeliveryError` for any
provider failure — wrapping the underlying exception so callers can
catch a single type.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

from theourgia.core.email.message import EmailMessage

__all__ = [
    "EmailBackend",
    "EmailDeliveryError",
    "EmailSendResult",
]


class EmailDeliveryError(Exception):
    """Raised when a backend fails to deliver a message.

    Wraps the underlying provider exception (if any) — backends never
    leak provider-specific exception types to callers."""

    def __init__(
        self,
        message: str,
        *,
        provider: str,
        provider_error: str | None = None,
    ):
        super().__init__(message)
        self.provider = provider
        self.provider_error = provider_error


@dataclass(frozen=True, slots=True)
class EmailSendResult:
    """Outcome of one ``EmailBackend.send`` call.

    Attributes:
        provider: Name of the backend that handled the send (e.g.
            ``"resend"``, ``"smtp"``).
        provider_message_id: Provider-assigned identifier for tracking
            (Resend message ID, SES message ID, SMTP Message-ID, etc.).
            None if the backend doesn't return one.
        accepted_recipients: Recipients the provider accepted.
        rejected_recipients: Recipients the provider explicitly rejected
            (typically only meaningful for SMTP / SES).
        raw_response: Provider response in whatever shape it gave —
            recorded for diagnostics, not for programmatic consumption.
    """

    provider: str
    provider_message_id: str | None = None
    accepted_recipients: tuple[str, ...] = ()
    rejected_recipients: tuple[str, ...] = ()
    raw_response: str = ""


@runtime_checkable
class EmailBackend(Protocol):
    """Pluggable email-delivery interface."""

    @property
    def name(self) -> str:
        """Short identifier for this backend (e.g. ``"resend"``)."""
        ...

    async def send(self, message: EmailMessage) -> EmailSendResult:
        """Deliver ``message``. Raise :class:`EmailDeliveryError` on
        failure; the caller persists the failure to :class:`EmailLog`
        and may retry via Celery."""
        ...
