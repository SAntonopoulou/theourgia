"""Celery task that wraps :class:`EmailService` for async dispatch.

Features that want fire-and-forget delivery enqueue this task instead
of awaiting the send inline. Use cases:

- Slow providers — the API responds quickly while delivery happens in
  the background.
- Retry — if the provider is transiently unreachable, Celery retries.
- Workload isolation — long mail campaigns don't share an event loop
  with serving traffic.

The task constructs a fresh :class:`EmailService` from process settings
on each run (Celery workers reuse this; construction is cheap and
keeps the worker process unaware of the API process's service object).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from theourgia.core.email.factory import build_email_service
from theourgia.core.tasks.app import celery_app

__all__ = ["send_email_async"]

_log = logging.getLogger(__name__)


@celery_app.task(
    name="theourgia.core.tasks.email.send_email_async",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
)
def send_email_async(
    self: Any,  # noqa: ARG001 — Celery's bound `self`
    *,
    template_name: str,
    to: list[str],
    context: dict[str, Any] | None = None,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    reply_to: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Render and send a templated email.

    Parameters mirror :meth:`EmailService.send_template` but accept
    only JSON-serializable types (Celery's serializer is JSON).
    """
    from theourgia.core.config import get_settings

    settings = get_settings()
    service = build_email_service(settings)

    async def _run() -> Any:
        return await service.send_template(
            template_name,
            to=to,
            context=context or {},
            cc=cc or (),
            bcc=bcc or (),
            reply_to=reply_to,
            tags=tags or (),
        )

    result = asyncio.run(_run())
    _log.info(
        "email.async.sent",
        extra={
            "template": template_name,
            "provider": result.provider,
            "message_id": result.provider_message_id,
        },
    )
    return {
        "provider": result.provider,
        "provider_message_id": result.provider_message_id,
        "accepted_recipients": list(result.accepted_recipients),
    }
