"""Celery task wrapper for the federation delivery worker.

Every minute, the beat schedule fires :func:`run_drain_federation_delivery`
which loads the instance keypair + iterates one batch of pending
deliveries via :func:`drain_pending`. The async work is run via
``asyncio.run`` inside the sync Celery task (same pattern as Phase 04's
scheduler).
"""

from __future__ import annotations

import asyncio
import logging

from theourgia.core.config import get_settings
from theourgia.core.db import session_scope
from theourgia.core.federation.delivery_queue import drain_pending
from theourgia.core.federation.identity import make_instance_id
from theourgia.core.federation.keys import load_or_create_keypair
from theourgia.core.tasks.app import celery_app


__all__ = ["run_drain_federation_delivery", "drain_federation_delivery"]


log = logging.getLogger(__name__)


async def drain_federation_delivery() -> dict[str, int]:
    """One pass over due pending deliveries. Returns counts."""
    settings = get_settings()
    if not settings.federation_transport_enabled:
        return {"delivered": 0, "retried": 0, "dead": 0, "skipped": 1}

    keypair = load_or_create_keypair(
        private_path=settings.federation_private_key_path,
        public_path=settings.federation_public_key_path,
    )
    sender_keyid = make_instance_id(settings.instance_id)

    async with session_scope() as db:
        return await drain_pending(
            db,
            sender_keyid=sender_keyid,
            sender_private_key=keypair.private_key,
        )


@celery_app.task(
    name="theourgia.core.tasks.federation_delivery.run_drain_federation_delivery",
    bind=True,
    max_retries=3,
)
def run_drain_federation_delivery(self) -> dict[str, int]:  # type: ignore[no-untyped-def]
    try:
        return asyncio.run(drain_federation_delivery())
    except Exception as exc:
        log.exception("federation delivery drain failed")
        raise self.retry(exc=exc, countdown=60) from exc
