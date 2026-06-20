"""add email_log table

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-20 23:30:00 UTC

Per-send audit log for outbound mail. Populated by EmailService when a
database session is supplied. Admin-only read by default.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_EMAIL_LOG_STATUSES = ["sent", "failed", "queued"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE email_log_status AS ENUM "
        f"({', '.join(repr(s) for s in _EMAIL_LOG_STATUSES)})"
    )

    op.create_table(
        "email_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_name", sa.String(128), nullable=True),
        sa.Column("sender_email", sa.String(320), nullable=False),
        sa.Column("recipient_csv", sa.String(2000), nullable=False),
        sa.Column("subject", sa.String(998), nullable=False),
        sa.Column("provider", sa.String(64), nullable=False),
        sa.Column("provider_message_id", sa.String(255), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="email_log_status", create_type=False),
            nullable=False,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("tags_csv", sa.String(500), nullable=False, server_default=""),
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

    op.create_index("ix_email_log_template", "email_log", ["template_name"])
    op.create_index(
        "ix_email_log_status_created",
        "email_log",
        ["status", "created_at"],
    )

    # Admin-only read; per-user / per-vault policies can layer later.
    op.execute("ALTER TABLE email_log ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY email_log_admin_read ON email_log
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
    op.execute("DROP POLICY IF EXISTS email_log_admin_read ON email_log")
    op.drop_index("ix_email_log_status_created", table_name="email_log")
    op.drop_index("ix_email_log_template", table_name="email_log")
    op.drop_table("email_log")
    op.execute("DROP TYPE IF EXISTS email_log_status")
