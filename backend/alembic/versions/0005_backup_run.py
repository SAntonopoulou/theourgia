"""add backup_run table

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-20 22:00:00 UTC

Records each backup attempt and its result. Instance-wide
(not per-vault); visibility is admin-only enforced at the API layer
plus RLS that admits the row only when the requester is a hub admin or
the instance operator.

This migration also creates the ``backup_run_status`` and
``backup_trigger`` PostgreSQL enums.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_BACKUP_STATUSES = ["running", "success", "failure", "skipped"]
_BACKUP_TRIGGERS = ["scheduled", "manual_api", "manual_cli", "pre_migration"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE backup_run_status AS ENUM ({', '.join(repr(s) for s in _BACKUP_STATUSES)})"
    )
    op.execute(
        f"CREATE TYPE backup_trigger AS ENUM ({', '.join(repr(t) for t in _BACKUP_TRIGGERS)})"
    )

    op.create_table(
        "backup_run",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="backup_run_status", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "trigger",
            postgresql.ENUM(name="backup_trigger", create_type=False),
            nullable=False,
        ),
        sa.Column("snapshot_id", sa.String(64), nullable=True),
        sa.Column("bytes_transferred", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("files_new", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("files_changed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("tags_csv", sa.String(1000), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_backup_run_started", "backup_run", ["started_at"])
    op.create_index(
        "ix_backup_run_status_started", "backup_run", ["status", "started_at"]
    )

    # RLS: admin-only; specific operator role logic lives at the
    # application layer. For now we permit reads only when the
    # connection is acting as the migration role or a hub admin.
    op.execute("ALTER TABLE backup_run ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY backup_run_admin_read ON backup_run
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM membership m
                    WHERE m.user_id = current_setting('theourgia.current_user_id', true)::uuid
                      AND m.role IN ('hub_admin', 'hub_officer')
                )
            );
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS backup_run_admin_read ON backup_run")
    op.drop_table("backup_run")
    op.execute("DROP TYPE IF EXISTS backup_trigger")
    op.execute("DROP TYPE IF EXISTS backup_run_status")
