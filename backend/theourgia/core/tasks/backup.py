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


class PgDumpError(RuntimeError):
    """pg_dump failed — the backup must not pretend to be complete."""


async def _run_pg_dump_subprocess(
    argv: list[str], env: dict[str, str]
) -> tuple[int, str]:
    """Execute pg_dump. Split out so tests inject a recorder instead."""
    proc = await asyncio.create_subprocess_exec(
        *argv,
        env=env,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    return proc.returncode or 0, (stderr or b"").decode("utf-8", "replace")


async def _dump_database(spool_dir: Path) -> Path:
    """Write a pg_dump custom-format archive into the spool directory.

    The filesystem include paths never contain the live Postgres data
    directory (it lives in a Docker volume, and file-copying a running
    cluster is not restore-safe anyway — v1-023). A ``-Fc`` dump in the
    spool makes every restic snapshot self-sufficient for DR. A fixed
    filename means restic dedups across runs.

    Raises :class:`PgDumpError` on any failure: a snapshot silently
    missing the database would be worse than a loud FAILURE row.
    """
    import os
    from urllib.parse import urlsplit

    settings = get_settings()
    url = urlsplit(str(settings.database_url).replace("+asyncpg", ""))
    spool_dir.mkdir(parents=True, exist_ok=True)
    target = spool_dir / "theourgia-db.dump"
    argv = [
        "pg_dump",
        "-Fc",
        "-h", url.hostname or "localhost",
        "-p", str(url.port or 5432),
        "-U", url.username or "theourgia",
        "-d", (url.path or "/theourgia").lstrip("/"),
        "-f", str(target),
    ]
    env = {**os.environ, "PGPASSWORD": url.password or ""}
    try:
        code, stderr = await _run_pg_dump_subprocess(argv, env)
    except FileNotFoundError as exc:
        raise PgDumpError(
            "pg_dump binary not found — install postgresql-client in the "
            "worker image"
        ) from exc
    if code != 0:
        raise PgDumpError(f"pg_dump exited {code}: {stderr[:2000]}")
    return target


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

    # Database dump pre-step (v1-023). Failure here fails the whole
    # backup loudly — see _dump_database.
    try:
        dump_path = await _dump_database(settings.backup_spool_dir)
    except PgDumpError as exc:
        _log.error("backup.pg_dump_failed", extra={"err": str(exc)})
        backup_runs_total.labels(outcome=BackupOutcome.FAILURE.value).inc()
        async with task_session_scope() as session:
            from datetime import UTC, datetime as _dt

            now = _dt.now(tz=UTC)
            session.add(
                BackupRun(
                    started_at=now,
                    finished_at=now,
                    status=BackupRunStatus.FAILURE,
                    trigger=BackupTrigger.SCHEDULED,
                    duration_seconds=0,
                    error_message=f"pg_dump: {exc}"[:4000],
                    tags_csv=",".join(("hourly",) if incremental else ("daily",)),
                )
            )
            await session.commit()
        return {"outcome": BackupOutcome.FAILURE.value, "reason": "pg_dump"}
    if dump_path.parent not in paths:
        paths.append(dump_path.parent)

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
