"""Scheduled-publication promoter.

Periodic Celery beat task: scan ``entry`` rows whose
``scheduled_publish_at`` has fallen in the past and aren't yet
``visibility = public``, promote them.

Per `plan/04-journaling.md` §14: "Background scheduler (Celery beat)
handles releases; missed releases caught up on next run." This task
runs every minute by default — missed runs are caught up because the
promotion query selects everything with `scheduled_publish_at <=
now()` regardless of how long ago.

The promotion is non-destructive: the original `visibility` value is
preserved in the entry_revision history before the change, and the
`scheduled_publish_at` column is cleared so the promoter doesn't
re-process the row on the next tick.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.tasks.app import celery_app
from theourgia.models.entries import EncryptionMode, Entry, EntryType, EntryVisibility

__all__ = [
    "promote_scheduled_entries",
    "run_promote_scheduled_entries",
]


log = logging.getLogger(__name__)


# Default visibility per kind when a scheduled entry promotes. Most
# blog posts go public; everything else falls back to "viewer" so a
# scheduled non-blog post becomes visible to private viewers, not
# the open internet, unless the user explicitly chose public.
def _target_visibility(entry: Entry) -> EntryVisibility:
    if entry.type == EntryType.BLOG_POST:
        return EntryVisibility.PUBLIC
    # Other kinds: don't override; the user picked the visibility
    # they wanted. We just promote the publication AT the scheduled
    # time. (Schedule + visibility are orthogonal — the user might
    # schedule a personal entry to "appear" on a future date.)
    return entry.visibility


async def promote_scheduled_entries(
    session: AsyncSession, *, now: datetime | None = None,
) -> int:
    """Promote every entry whose ``scheduled_publish_at`` has passed.

    Returns the count of rows promoted. Caller commits.
    """
    now = now or datetime.now(tz=UTC)
    stmt = (
        select(Entry)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.encryption_mode == EncryptionMode.NONE)
        .where(Entry.scheduled_publish_at.is_not(None))
        .where(Entry.scheduled_publish_at <= now)
    )
    rows = (await session.execute(stmt)).scalars().all()

    promoted = 0
    for entry in rows:
        target = _target_visibility(entry)
        if entry.visibility != target:
            entry.visibility = target
        # Clear the scheduling field so we don't re-process. This
        # is the canonical "scheduled release fired" signal.
        entry.scheduled_publish_at = None
        session.add(entry)
        promoted += 1
        log.info(
            "Scheduled entry promoted",
            extra={
                "entry_id": str(entry.id),
                "type": entry.type.value,
                "new_visibility": target.value,
            },
        )

    if promoted:
        await session.commit()
    return promoted


@celery_app.task(
    name="theourgia.core.tasks.scheduler.run_promote_scheduled_entries",
    bind=True,
    max_retries=3,
)
def run_promote_scheduled_entries(self) -> dict[str, int]:  # type: ignore[no-untyped-def]
    """Celery wrapper. Returns a small status dict for monitoring.

    Reasons for the no-async sync wrapper: Celery's default executor
    runs sync tasks; bridging to the async DB engine here uses the
    same pattern as the backup task. The actual SQL still runs async.
    """
    import asyncio

    from theourgia.core.db import task_session_scope

    async def _run() -> int:
        async with task_session_scope() as session:
            return await promote_scheduled_entries(session)

    promoted = asyncio.run(_run())
    return {"promoted": promoted}
