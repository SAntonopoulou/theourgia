"""Backup and restore tooling.

Restic-based backups to S3-compatible object storage (default:
Cloudflare R2). Triggered on a schedule (Celery beat — wired up in
Phase 01 Batch 9 / Observability) and on demand via CLI / admin
endpoint.

This package wraps the ``restic`` binary as a subprocess, exposes a
typed Python API, and tracks each run in the database
(:class:`BackupRun`) so the admin dashboard can surface status, history,
and DR readiness.

The encryption posture: Restic encrypts every snapshot under an
operator-controlled passphrase (``RESTIC_PASSWORD``) before any bytes
leave the process. The S3-compatible backend therefore stores opaque
ciphertext; a leaked R2 token cannot decrypt the backups.
"""

from __future__ import annotations

from theourgia.core.backups.policy import RetentionPolicy
from theourgia.core.backups.restic import (
    ResticClient,
    ResticError,
    ResticResult,
    Snapshot,
)
from theourgia.core.backups.status import BackupOutcome, BackupSummary

__all__ = [
    "BackupOutcome",
    "BackupSummary",
    "RetentionPolicy",
    "ResticClient",
    "ResticError",
    "ResticResult",
    "Snapshot",
]
