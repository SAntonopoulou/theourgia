"""Mode A vault-key rotation sweep — v1-027 · Phase 15 B5.

Dispatched on demand by ``POST /api/v1/keys/rotate`` (no beat entry —
rotations are user-initiated, not scheduled). The task loads the
:class:`~theourgia.models.crypto.KeyRotation` row and runs the batched
re-encryption sweep in :func:`theourgia.core.crypto.rotation.sweep_rotation`.

Failure + resume semantics live in the sweep itself: a re-encrypted
row stops matching the retired-key predicate, so re-dispatching the
task for a ``running`` (worker died) or ``failed`` (marked + audited)
rotation simply continues with whatever still matches. Old envelopes
are decryptable throughout — ``vault_key`` rows are never deleted.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from theourgia.core.tasks.app import celery_app

__all__ = ["run_key_rotation_sweep"]


log = logging.getLogger(__name__)


@celery_app.task(
    name="theourgia.core.tasks.key_rotation.run_key_rotation_sweep",
    bind=True,
    max_retries=0,
)
def run_key_rotation_sweep(self: Any, rotation_id: str) -> dict[str, int | str]:  # noqa: ARG001
    """Celery wrapper — runs (or resumes) one rotation's sweep.

    No retries: the sweep is resumable by design, and a failed run is
    marked + audited by the sweep itself. The operator (or a later
    rotation) re-dispatches; nothing is lost in between.
    """
    from uuid import UUID

    from theourgia.core.config import get_settings
    from theourgia.core.crypto.keys import MasterKey
    from theourgia.core.crypto.rotation import sweep_rotation
    from theourgia.core.db import task_session_scope
    from theourgia.models.crypto import KeyRotation

    async def _run() -> dict[str, int | str]:
        master = MasterKey.from_secret(
            get_settings().master_encryption_key.get_secret_value()
        )
        async with task_session_scope() as session:
            rotation = await session.get(KeyRotation, UUID(rotation_id))
            if rotation is None:
                log.warning(
                    "key_rotation.sweep.missing",
                    extra={"rotation_id": rotation_id},
                )
                return {"state": "missing", "rotation_id": rotation_id}
            rotation = await sweep_rotation(session, rotation, master=master)
            return {
                "state": rotation.state,
                "rows_total": rotation.rows_total,
                "rows_done": rotation.rows_done,
            }

    return asyncio.run(_run())
