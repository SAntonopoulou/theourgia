"""add outbox_event table

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-20 23:50:00 UTC

Transactional outbox for the domain-event substrate (Substrate Sweep
S3). Features write to this table inside their own DB transactions;
the OutboxDispatcher reads pending rows and fans them out via the
in-process EventBus.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_OUTBOX_STATUSES = ["pending", "delivered", "dead"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE outbox_status AS ENUM "
        f"({', '.join(repr(s) for s in _OUTBOX_STATUSES)})"
    )

    op.create_table(
        "outbox_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "event_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            unique=True,
        ),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="outbox_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
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

    op.create_index(
        "ix_outbox_pending_scheduled",
        "outbox_event",
        ["status", "scheduled_for"],
    )
    op.create_index("ix_outbox_event_type", "outbox_event", ["event_type"])

    # Admin-only read; the dispatcher uses a privileged role.
    op.execute("ALTER TABLE outbox_event ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY outbox_event_admin_read ON outbox_event
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
    op.execute("DROP POLICY IF EXISTS outbox_event_admin_read ON outbox_event")
    op.drop_index("ix_outbox_event_type", table_name="outbox_event")
    op.drop_index("ix_outbox_pending_scheduled", table_name="outbox_event")
    op.drop_table("outbox_event")
    op.execute("DROP TYPE IF EXISTS outbox_status")
