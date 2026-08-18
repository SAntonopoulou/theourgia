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


async def _run_pg_dump_subprocess(argv: list[str], env: dict[str, str]) -> tuple[int, str]:
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
        "-h",
        url.hostname or "localhost",
        "-p",
        str(url.port or 5432),
        "-U",
        url.username or "theourgia",
        "-d",
        (url.path or "/theourgia").lstrip("/"),
        "-f",
        str(target),
    ]
    env = {**os.environ, "PGPASSWORD": url.password or ""}
    try:
        code, stderr = await _run_pg_dump_subprocess(argv, env)
    except FileNotFoundError as exc:
        raise PgDumpError(
            "pg_dump binary not found — install postgresql-client in the worker image"
        ) from exc
    if code != 0:
        raise PgDumpError(f"pg_dump exited {code}: {stderr[:2000]}")
    return target


async def _sync_media_into_spool(spool_dir: Path) -> int:
    """Fold the object-store media into the backup spool so restic snapshots
    it alongside the database dump.

    The pre-launch audit found media (S3/R2) had no backup at all — restic
    only ever snapshotted local filesystem paths. Rather than a separate,
    unversioned second bucket, media now rides the SAME restic repository as
    the dump: one encrypted, versioned, restore-drill-proven recovery path,
    unlocked by the one escrowed password. The spool is already in the
    include paths, so anything under ``spool_dir/media`` lands in the
    snapshot.

    Copy-only: a delete in the live bucket never removes the backed-up copy,
    and objects already present at the same size are not re-downloaded
    (media keys are write-once here, and restic dedups regardless). A no-op
    (returns 0) unless the store is S3/R2-backed. Returns the object count.
    """
    settings = get_settings()
    if settings.storage_backend != "s3":
        return 0
    bucket = settings.storage_s3_bucket
    endpoint = settings.storage_s3_endpoint
    if not bucket or not endpoint:
        _log.warning("backup.media.s3_unconfigured")
        return 0
    try:
        import boto3  # noqa: PLC0415
    except ImportError:
        # storage-s3 extra absent: media uploads would already be failing,
        # but the DB backup must still proceed. Loud, not fatal.
        _log.warning("backup.media.boto3_missing")
        return 0

    media_dir = spool_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    resolved_root = media_dir.resolve()

    def _sync_blocking() -> int:
        client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            region_name=settings.storage_s3_region,
            aws_access_key_id=(
                settings.storage_s3_access_key.get_secret_value()
                if settings.storage_s3_access_key
                else None
            ),
            aws_secret_access_key=(
                settings.storage_s3_secret_key.get_secret_value()
                if settings.storage_s3_secret_key
                else None
            ),
            use_ssl=settings.storage_s3_use_ssl,
        )
        count = 0
        paginator = client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                dest = (media_dir / key).resolve()
                # Refuse any key that escapes the media dir (defence in depth;
                # our own keys never do).
                if not str(dest).startswith(str(resolved_root)):
                    _log.warning("backup.media.skip_unsafe_key", extra={"key": key})
                    continue
                if dest.exists() and dest.stat().st_size == obj.get("Size", -1):
                    count += 1
                    continue
                dest.parent.mkdir(parents=True, exist_ok=True)
                client.download_file(bucket, key, str(dest))
                count += 1
        return count

    return await asyncio.to_thread(_sync_blocking)


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
            settings.aws_access_key_id.get_secret_value() if settings.aws_access_key_id else None
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


def _sentry_backup_checkin(status: str, *, check_in_id: str | None = None) -> str | None:
    """Send a Sentry cron check-in for the daily backup monitor.

    A no-op when Sentry is not configured (no DSN → the SDK never
    initialised), so it costs nothing on a self-host without Sentry.
    Its own failure never touches the backup — a monitoring gap is
    logged, never raised.

    Together the three statuses ARE the dead-man's-switch: ``in_progress``
    when a backup begins, ``ok`` when it finishes, ``error`` when it
    fails. If the process dies or the host goes down, no ``ok`` arrives
    within the schedule margin and Sentry alerts — the July incident
    (backups silently stopped) is exactly what this catches, through the
    Sentry the operator already runs rather than a second service.
    """
    try:
        import sentry_sdk

        client = sentry_sdk.get_client()
        if client is None or not getattr(client, "dsn", None):
            return None  # Sentry not configured — no-op
        return sentry_sdk.crons.capture_checkin(
            monitor_slug="theourgia-scheduled-backup",
            check_in_id=check_in_id,
            status=status,
            monitor_config={
                "schedule": {"type": "crontab", "value": "15 3 * * *"},
                "checkin_margin": 30,
                "max_runtime": 60,
                "timezone": "UTC",
            },
        )
    except Exception:  # noqa: BLE001 — best-effort, never fail the backup
        _log.warning("backup.sentry_checkin_failed", exc_info=True)
        return None


async def _ping_heartbeat(url: str | None) -> None:
    """Ping the backup dead-man's-switch URL. Best-effort and silent on
    failure — a heartbeat that cannot be delivered is a monitoring gap to
    log, never a reason to fail a backup that actually succeeded."""
    if not url:
        return
    try:
        import httpx

        async with httpx.AsyncClient(timeout=10.0) as http:
            await http.get(url)
        _log.info("backup.heartbeat.sent")
    except Exception as exc:  # noqa: BLE001 — best-effort, log + continue
        _log.warning("backup.heartbeat_failed", extra={"err": str(exc)})


async def _run_scheduled_backup_async(*, incremental: bool) -> dict[str, Any]:  # noqa: PLR0915 — one linear orchestration (dump → media → snapshot → record → signal); splitting it would scatter the failure handling
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

    # Open a Sentry cron check-in for the DAILY backup — the incremental
    # runs share the task but not the monitor's schedule, so only the daily
    # one drives the dead-man's-switch.
    check_in_id = _sentry_backup_checkin("in_progress") if not incremental else None

    # Database dump pre-step (v1-023). Failure here fails the whole
    # backup loudly — see _dump_database.
    try:
        dump_path = await _dump_database(settings.backup_spool_dir)
    except PgDumpError as exc:
        _log.error("backup.pg_dump_failed", extra={"err": str(exc)})
        backup_runs_total.labels(outcome=BackupOutcome.FAILURE.value).inc()
        _sentry_backup_checkin("error", check_in_id=check_in_id)
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

    # Media pre-step: fold the object-store media into the spool so restic
    # snapshots it with the dump (audit: media was unbacked). Daily runs only
    # — the hourly ones keep to the fast DB dump. Best-effort: a media hiccup
    # is logged but must never fail the database backup, the crown jewel.
    if not incremental:
        try:
            media_count = await _sync_media_into_spool(settings.backup_spool_dir)
            if media_count:
                _log.info("backup.media.synced", extra={"objects": media_count})
        except Exception as exc:  # noqa: BLE001 — media is secondary to the DB
            _log.warning("backup.media.sync_failed", extra={"err": str(exc)})

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
        # Dead-man's-switch, two ways (whichever the operator configured):
        # a Sentry cron 'ok' check-in, and/or an external heartbeat URL.
        # Both fire ONLY on success, so a failed or absent backup withholds
        # the signal and the watcher alerts — the first line of "is anything
        # watching prod". Best-effort: a signal that cannot be sent must
        # never fail an otherwise-good backup.
        _sentry_backup_checkin("ok", check_in_id=check_in_id)
        await _ping_heartbeat(settings.backup_heartbeat_url)
    else:
        # A backup that ran but did not succeed is an active failure, not a
        # silence — tell Sentry now rather than waiting for the missed 'ok'.
        _sentry_backup_checkin("error", check_in_id=check_in_id)

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
