"""Status types for backup operations.

Types here describe the *outcome* of a backup run and the
caller-visible summary an admin endpoint or CLI surfaces. They do not
touch persistence; the database mapping lives in
:mod:`theourgia.models.backups`.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime

__all__ = ["BackupOutcome", "BackupSummary"]


class BackupOutcome(str, enum.Enum):
    """High-level result of a backup run."""

    SUCCESS = "success"
    FAILURE = "failure"
    SKIPPED = "skipped"
    """Run skipped because a prior run is still in progress, or because
    the repository wasn't initialized yet."""


@dataclass(frozen=True, slots=True)
class BackupSummary:
    """A typed snapshot of one backup run.

    Constructed by :class:`ResticClient.backup` for callers (the runner
    that persists to the database, or the admin endpoint that surfaces
    health).
    """

    outcome: BackupOutcome
    started_at: datetime
    finished_at: datetime
    snapshot_id: str | None = None
    bytes_transferred: int = 0
    files_new: int = 0
    files_changed: int = 0
    duration_seconds: float = 0.0
    error_message: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)

    @property
    def succeeded(self) -> bool:
        return self.outcome == BackupOutcome.SUCCESS
