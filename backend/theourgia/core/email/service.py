"""Email service — orchestrates message construction, rendering, and
dispatch.

Features call into this and never touch backends or providers
directly. The service:

1. Resolves a template name into a :class:`RenderedEmail`.
2. Builds an :class:`EmailMessage` with the configured default sender.
3. Hands it to the operator-selected :class:`EmailBackend`.
4. Persists the result (success or failure) into :class:`EmailLog`
   *if* a database session was supplied.
5. Returns the :class:`EmailSendResult` to the caller.

Dry-run mode short-circuits step 3 — useful for staging / preview
environments where the operator wants the system to behave as if it
were sending but not actually deliver.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable, Mapping
from typing import TYPE_CHECKING

from theourgia.core.email.backends.base import (
    EmailBackend,
    EmailDeliveryError,
    EmailSendResult,
)
from theourgia.core.email.message import EmailAddress, EmailMessage
from theourgia.core.email.templates import TemplateRegistry, default_registry

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = ["EmailService"]

_log = logging.getLogger(__name__)


class EmailService:
    """Orchestrator between feature code and email backends.

    Constructed once at app start by :func:`build_email_service` and
    injected via :data:`theourgia.api.deps.EmailServiceDep`. Tests
    construct directly with a :class:`NullEmailBackend` for assertion.
    """

    def __init__(
        self,
        *,
        backend: EmailBackend,
        default_sender: EmailAddress,
        registry: TemplateRegistry | None = None,
        dry_run: bool = False,
    ) -> None:
        self._backend = backend
        self._default_sender = default_sender
        self._registry = registry or default_registry
        self._dry_run = dry_run

    @property
    def backend_name(self) -> str:
        return self._backend.name

    @property
    def dry_run(self) -> bool:
        return self._dry_run

    @property
    def registry(self) -> TemplateRegistry:
        return self._registry

    # ── Sending ──────────────────────────────────────────────────────

    async def send(
        self,
        message: EmailMessage,
        *,
        db_session: "AsyncSession | None" = None,
    ) -> EmailSendResult:
        """Deliver a fully-constructed message.

        Persists the result to :class:`EmailLog` when ``db_session`` is
        supplied. The caller is responsible for the surrounding
        transaction — this method does not commit.
        """
        if self._dry_run:
            _log.info(
                "email.dry_run",
                extra={
                    "to": [a.email for a in message.to],
                    "template": message.template_name,
                    "subject": message.subject,
                },
            )
            result = EmailSendResult(
                provider=f"{self._backend.name}+dry-run",
                accepted_recipients=tuple(a.email for a in message.to),
            )
        else:
            try:
                result = await self._backend.send(message)
            except EmailDeliveryError as exc:
                _log.warning(
                    "email.failed",
                    extra={
                        "to": [a.email for a in message.to],
                        "template": message.template_name,
                        "provider": exc.provider,
                        "error": exc.provider_error,
                    },
                )
                await self._persist_log(db_session, message, None, exc)
                raise

        await self._persist_log(db_session, message, result, None)
        return result

    async def send_template(
        self,
        name: str,
        *,
        to: EmailAddress | str | Iterable[EmailAddress | str],
        context: Mapping[str, object] | None = None,
        sender: EmailAddress | None = None,
        cc: Iterable[EmailAddress | str] = (),
        bcc: Iterable[EmailAddress | str] = (),
        reply_to: EmailAddress | str | None = None,
        tags: Iterable[str] = (),
        db_session: "AsyncSession | None" = None,
    ) -> EmailSendResult:
        """Resolve a template by name, render with ``context``, send.

        Most features go through this path rather than constructing
        :class:`EmailMessage` directly. Keeps message construction in
        one place and ensures every send records its
        ``template_name``.
        """
        template = self._registry.get(name)
        rendered = template.render(context)

        to_list = tuple(EmailAddress.parse(addr) for addr in _ensure_iterable(to))
        cc_list = tuple(EmailAddress.parse(addr) for addr in cc)
        bcc_list = tuple(EmailAddress.parse(addr) for addr in bcc)
        reply_to_addr = EmailAddress.parse(reply_to) if reply_to else None

        message = EmailMessage(
            to=to_list,
            cc=cc_list,
            bcc=bcc_list,
            sender=sender or self._default_sender,
            subject=rendered.subject,
            body_text=rendered.body_text,
            body_html=rendered.body_html,
            reply_to=reply_to_addr,
            tags=tuple(tags),
            template_name=name,
        )

        return await self.send(message, db_session=db_session)

    # ── Persistence ──────────────────────────────────────────────────

    async def _persist_log(
        self,
        db_session: "AsyncSession | None",
        message: EmailMessage,
        result: EmailSendResult | None,
        error: EmailDeliveryError | None,
    ) -> None:
        """Persist an audit row. No-op when no session is supplied."""
        if db_session is None:
            return
        # Late import to keep model dependencies out of the substrate's
        # import graph (the substrate is importable in test contexts
        # that don't construct the ORM metadata).
        from theourgia.models.email import EmailLog, EmailLogStatus

        log = EmailLog(
            template_name=message.template_name,
            sender_email=message.sender.email,
            recipient_csv=",".join(a.email for a in message.to),
            subject=message.subject,
            provider=(result.provider if result else (error.provider if error else "unknown")),
            provider_message_id=(result.provider_message_id if result else None),
            status=(
                EmailLogStatus.SENT
                if result is not None
                else EmailLogStatus.FAILED
            ),
            error_message=(str(error) if error else None),
            tags_csv=",".join(message.tags),
        )
        db_session.add(log)


def _ensure_iterable(
    value: EmailAddress | str | Iterable[EmailAddress | str],
) -> tuple[EmailAddress | str, ...]:
    if isinstance(value, (str, EmailAddress)):
        return (value,)
    return tuple(value)
