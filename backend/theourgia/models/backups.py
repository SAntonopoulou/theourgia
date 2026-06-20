"""Backup run history.

One row per backup attempt (scheduled or on-demand). The admin
dashboard surfaces the most recent run plus aggregate stats from this
table; the DR runbook references the same data when investigating
backup health.

Backup runs are NOT scoped to a vault — they're instance-wide
operations performed by the operator. Visibility is admin-only.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Index, Integer, String, Text
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["BackupRun", "BackupRunStatus", "BackupTrigger"]


class BackupRunStatus(str, enum.Enum):
    """Outcome of a backup attempt."""

    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"
    SKIPPED = "skipped"


class BackupTrigger(str, enum.Enum):
    """How a backup run was initiated."""

    SCHEDULED = "scheduled"
    """Cron-style scheduled run (Celery beat)."""

    MANUAL_API = "manual_api"
    """Admin endpoint triggered the run."""

    MANUAL_CLI = "manual_cli"
    """Operator invoked ``just backup`` or similar."""

    PRE_MIGRATION = "pre_migration"
    """Automatic snapshot before a schema migration."""


class BackupRun(IDMixin, TimestampMixin, table=True):
    """A single backup attempt and its result."""

    __tablename__ = "backup_run"
    __table_args__ = (
        Index("ix_backup_run_started", "started_at"),
        Index("ix_backup_run_status_started", "status", "started_at"),
    )

    started_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    finished_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    status: BackupRunStatus = Field(
        sa_column=Column(
            SQLEnum(BackupRunStatus, name="backup_run_status"),
            nullable=False,
        ),
    )

    trigger: BackupTrigger = Field(
        sa_column=Column(
            SQLEnum(BackupTrigger, name="backup_trigger"),
            nullable=False,
        ),
    )

    snapshot_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description="Restic snapshot id (on success)",
    )

    bytes_transferred: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    files_new: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    files_changed: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    duration_seconds: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False),
        description="Wall-clock seconds the run took (or attempted to)",
    )

    error_message: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="On failure, the Restic stderr (truncated)",
    )

    # Free-form tags applied to the snapshot (Restic-side)
    tags_csv: str = Field(
        default="",
        sa_column=Column(String(1000), nullable=False, server_default=""),
        description="Comma-separated list of tags this snapshot carries",
    )
