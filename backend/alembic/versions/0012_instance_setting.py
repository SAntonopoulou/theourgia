"""add instance_setting table

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-21 14:00:00 UTC

Substrate sweep S11 — instance-wide dynamic settings.

One row per key (no user_id). RLS: only hub_admin / hub_officer can
INSERT / UPDATE / DELETE. SELECT policy is enforced at the service
layer via the ``public`` flag on each definition (so anonymous
visitors can read public settings without a DB-policy round trip).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "instance_setting",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(128), nullable=False, unique=True),
        sa.Column("value_json", sa.Text(), nullable=False),
        sa.Column(
            "schema_version", sa.Integer(), nullable=False, server_default="1"
        ),
        sa.Column(
            "last_changed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
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
    )

    op.create_index("ix_instance_setting_key", "instance_setting", ["key"], unique=True)

    # All authenticated users SELECT (service layer filters by the
    # registry's public flag); only admins WRITE.
    op.execute("ALTER TABLE instance_setting ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY instance_setting_authenticated_read ON instance_setting
            FOR SELECT
            USING (
                current_setting('theourgia.current_user_id', true) IS NOT NULL
                AND current_setting('theourgia.current_user_id', true) <> ''
            );
        """
    )
    op.execute(
        """
        CREATE POLICY instance_setting_admin_write ON instance_setting
            FOR ALL
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
    op.execute("DROP POLICY IF EXISTS instance_setting_admin_write ON instance_setting")
    op.execute(
        "DROP POLICY IF EXISTS instance_setting_authenticated_read ON instance_setting"
    )
    op.drop_index("ix_instance_setting_key", table_name="instance_setting")
    op.drop_table("instance_setting")
