"""add notification + notification_preference tables

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-21 00:00:00 UTC

Substrate sweep S4 — notification persistence.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_READ_STATES = ["unread", "read", "dismissed"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE notification_read_state AS ENUM "
        f"({', '.join(repr(s) for s in _READ_STATES)})"
    )

    op.create_table(
        "notification",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("template_name", sa.String(128), nullable=False),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("action_url", sa.String(1000), nullable=True),
        sa.Column("action_label", sa.String(128), nullable=True),
        sa.Column(
            "read_state",
            postgresql.ENUM(name="notification_read_state", create_type=False),
            nullable=False,
            server_default="unread",
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
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
        "ix_notification_user_state", "notification", ["user_id", "read_state"]
    )
    op.create_index(
        "ix_notification_user_created", "notification", ["user_id", "created_at"]
    )
    op.create_index("ix_notification_template", "notification", ["template_name"])

    op.execute("ALTER TABLE notification ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY notification_owner_rw ON notification
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )

    op.create_table(
        "notification_preference",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("channels_csv", sa.String(200), nullable=False, server_default=""),
        sa.Column(
            "fully_muted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
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
        sa.UniqueConstraint(
            "user_id", "kind", name="uq_notification_preference_user_kind"
        ),
    )

    op.execute("ALTER TABLE notification_preference ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY notification_preference_owner_rw ON notification_preference
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS notification_preference_owner_rw ON notification_preference"
    )
    op.drop_table("notification_preference")

    op.execute("DROP POLICY IF EXISTS notification_owner_rw ON notification")
    op.drop_index("ix_notification_template", table_name="notification")
    op.drop_index("ix_notification_user_created", table_name="notification")
    op.drop_index("ix_notification_user_state", table_name="notification")
    op.drop_table("notification")
    op.execute("DROP TYPE IF EXISTS notification_read_state")
