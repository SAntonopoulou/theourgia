"""Scheduled backup task.

Celery beat fires :func:`run_scheduled_backup` per the schedule
declared in :mod:`theourgia.core.tasks.app`. The task wraps
:class:`ResticClient`, records the run in the database
(:class:`BackupRun`), and emits Prometheus counters / histograms.

The task itself is synchronous (as Celery tasks are) but the underlying
:class:`ResticClient` is async; we bridge with :func:`asyncio.run`.
Each task invocation gets its own event loop, which is fine for
batch-style jobs.

Failure semantics: a Restic non-zero exit produces a
:class:`BackupRun` row with ``status=FAILURE`` and the captured stderr,
*not* a task-level exception. We don't want the task to be retried on a
configuration mistake (wrong R2 token, etc.) — that just burns retries
without progress. Genuine infrastructure errors (broker dropouts,
database unreachable) propagate as exceptions and Celery handles them.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

from theourgia.core.backups.policy import DEFAULT_POLICY
from theourgia.core.backups.restic import ResticClient
from theourgia.core.backups.status import BackupOutcome
from theourgia.core.config import get_settings
from theourgia.core.db import task_session_scope
from theourgia.core.observability.metrics import (
    backup_bytes_transferred_total,
    backup_run_duration_seconds,
    backup_runs_total,
)
from theourgia.core.tasks.app import celery_app
from theourgia.models.backups import BackupRun, BackupRunStatus, BackupTrigger

__all__ = ["run_scheduled_backup", "build_restic_client_from_settings"]

_log = logging.getLogger(__name__)


def build_restic_client_from_settings() -> ResticClient | None:
    """Construct the configured :class:`ResticClient`, or ``None`` if the
    repository is not configured.

    Separated out so tests can stub it. Returns ``None`` when
    ``RESTIC_REPOSITORY`` / ``RESTIC_PASSWORD`` are not set, signalling
    "backups disabled" rather than raising — operators may legitimately
    run an instance without backups (e.g., dev).
    """
    settings = get_settings()
    repo = settings.restic_repository
    pw = settings.restic_password.get_secret_value() if settings.restic_password else ""
    if not repo or not pw:
        return None

    return ResticClient(
        repository=repo,
        password=pw,
        aws_access_key_id=(
            settings.aws_access_key_id.get_secret_value()
            if settings.aws_access_key_id
            else None
        ),
        aws_secret_access_key=(
            settings.aws_secret_access_key.get_secret_value()
            if settings.aws_secret_access_key
            else None
        ),
        aws_default_region=settings.aws_default_region,
    )


@celery_app.task(
    name="theourgia.core.tasks.backup.run_scheduled_backup",
    bind=True,
    autoretry_for=(),
    max_retries=0,
)
def run_scheduled_backup(
    self: Any,  # noqa: ARG001 — Celery's bound `self`, unused but conventional
    *,
    incremental: bool = False,
) -> dict[str, Any]:
    """Run a scheduled backup. Persists the result and emits metrics.

    Returns a small dict suitable for inspection in flower / logs::

        {
            "outcome": "success" | "failure" | "skipped",
            "snapshot_id": "<id-or-none>",
            "duration_seconds": <float>,
            "bytes_transferred": <int>,
        }
    """
    return asyncio.run(_run_scheduled_backup_async(incremental=incremental))


async def _run_scheduled_backup_async(*, incremental: bool) -> dict[str, Any]:
    settings = get_settings()
    client = build_restic_client_from_settings()
    if client is None:
        _log.info("backup.skipped.no_config")
        backup_runs_total.labels(outcome=BackupOutcome.SKIPPED.value).inc()
        return {"outcome": BackupOutcome.SKIPPED.value, "reason": "no_restic_config"}

    paths: list[Path] = list(settings.backup_include_paths)
    if not paths:
        _log.info("backup.skipped.no_paths")
        backup_runs_total.labels(outcome=BackupOutcome.SKIPPED.value).inc()
        return {"outcome": BackupOutcome.SKIPPED.value, "reason": "no_paths"}

    tags = ("hourly",) if incremental else ("daily",)
    triggered_by = "scheduled"

    summary = await client.backup(
        paths=paths,
        host=settings.instance_id,
        tags=tags,
        exclude_patterns=settings.backup_exclude_patterns,
        triggered_by=triggered_by,
    )

    # Metrics
    backup_runs_total.labels(outcome=summary.outcome.value).inc()
    backup_run_duration_seconds.observe(summary.duration_seconds)
    if summary.bytes_transferred:
        backup_bytes_transferred_total.inc(summary.bytes_transferred)

    # Persist
    async with task_session_scope() as session:
        status_map = {
            BackupOutcome.SUCCESS: BackupRunStatus.SUCCESS,
            BackupOutcome.FAILURE: BackupRunStatus.FAILURE,
            BackupOutcome.SKIPPED: BackupRunStatus.SKIPPED,
        }
        run = BackupRun(
            started_at=summary.started_at,
            finished_at=summary.finished_at,
            status=status_map[summary.outcome],
            trigger=BackupTrigger.SCHEDULED,
            snapshot_id=summary.snapshot_id,
            bytes_transferred=summary.bytes_transferred,
            files_new=summary.files_new,
            files_changed=summary.files_changed,
            duration_seconds=int(summary.duration_seconds),
            error_message=(summary.error_message or "")[:4000] or None,
            tags_csv=",".join(summary.tags),
        )
        session.add(run)
        await session.commit()

    # If we succeeded, opportunistically apply retention. Failure here
    # is logged but does not flip the outcome.
    if summary.succeeded:
        try:
            await client.prune(policy=DEFAULT_POLICY)
        except Exception as exc:  # noqa: BLE001 — log + continue
            _log.warning("backup.prune_failed", extra={"err": str(exc)})

    _log.info(
        "backup.complete",
        extra={
            "outcome": summary.outcome.value,
            "snapshot_id": summary.snapshot_id,
            "bytes": summary.bytes_transferred,
            "duration_s": summary.duration_seconds,
        },
    )

    return {
        "outcome": summary.outcome.value,
        "snapshot_id": summary.snapshot_id,
        "duration_seconds": summary.duration_seconds,
        "bytes_transferred": summary.bytes_transferred,
    }
