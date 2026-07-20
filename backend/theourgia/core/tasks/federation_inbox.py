"""Celery task wrapper for the federation inbox processor — v1-026.

Every minute, the beat schedule fires :func:`run_process_federation_inbox`
which drains one batch of PENDING :class:`FederationActivity` rows via
:func:`theourgia.core.federation.inbox_processor.process_pending`. The
async work runs via ``asyncio.run`` inside the sync Celery task (same
pattern as the delivery drain).

Gated on ``settings.federation_transport_enabled`` — mirrors the
outbound drain so instances that haven't opted in do nothing.
"""

from __future__ import annotations

import asyncio
import logging

from theourgia.core.config import get_settings
from theourgia.core.db import task_session_scope
from theourgia.core.federation.inbox_processor import process_pending
from theourgia.core.tasks.app import celery_app

__all__ = ["process_federation_inbox", "run_process_federation_inbox"]


log = logging.getLogger(__name__)


async def process_federation_inbox() -> dict[str, int]:
    """One pass over pending inbound activities. Returns counts."""
    settings = get_settings()
    if not settings.federation_transport_enabled:
        return {"processed": 0, "skipped": 0, "errored": 0, "disabled": 1}

    async with task_session_scope() as db:
        return await process_pending(db)


@celery_app.task(
    name="theourgia.core.tasks.federation_inbox.run_process_federation_inbox",
    bind=True,
    max_retries=0,
)
def run_process_federation_inbox(self) -> dict[str, int]:  # type: ignore[no-untyped-def]  # noqa: ARG001
    """Celery wrapper — per-minute beat entry point.

    No retries: the next tick IS the retry. Per-row failures are
    already isolated inside :func:`process_pending` (rows flip to
    ERRORED); a whole-sweep crash is caught up on the next minute.
    """
    return asyncio.run(process_federation_inbox())
