"""add user_setting table

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-21 12:00:00 UTC

Substrate sweep S10 — per-user settings persistence.

One row per (user, key) pair. JSON-encoded value; validation lives in
the service layer against the registry. RLS: owner-RW only.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_setting",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key", sa.String(128), nullable=False),
        sa.Column("value_json", sa.Text(), nullable=False),
        sa.Column(
            "schema_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column("source", sa.String(32), nullable=True),
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
            "user_id", "key", name="uq_user_setting_user_key"
        ),
    )

    op.create_index("ix_user_setting_user_key", "user_setting", ["user_id", "key"])

    # RLS: owners read/write only their own settings.
    op.execute("ALTER TABLE user_setting ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY user_setting_owner_rw ON user_setting
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS user_setting_owner_rw ON user_setting")
    op.drop_index("ix_user_setting_user_key", table_name="user_setting")
    op.drop_table("user_setting")
