"""add upload table

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-21 00:30:00 UTC

Substrate sweep S5 — object-storage audit log.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_UPLOAD_STATUSES = ["active", "deleted", "failed"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE upload_status AS ENUM "
        f"({', '.join(repr(s) for s in _UPLOAD_STATUSES)})"
    )

    op.create_table(
        "upload",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("storage_key", sa.String(1000), nullable=False),
        sa.Column("content_type", sa.String(127), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("etag", sa.String(255), nullable=False, server_default=""),
        sa.Column("backend", sa.String(32), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="upload_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "owner_id",
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

    op.create_index("ix_upload_owner", "upload", ["owner_id"])
    op.create_index("ix_upload_storage_key", "upload", ["storage_key"], unique=True)
    op.create_index("ix_upload_status", "upload", ["status"])

    # RLS: owners see their own rows; admins see all.
    op.execute("ALTER TABLE upload ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY upload_owner_read ON upload
            FOR SELECT
            USING (
                owner_id = current_setting('theourgia.current_user_id', true)::uuid
                OR EXISTS (
                    SELECT 1 FROM membership m
                    WHERE m.user_id = current_setting('theourgia.current_user_id', true)::uuid
                      AND m.role IN ('hub_admin', 'hub_officer')
                )
            );
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS upload_owner_read ON upload")
    op.drop_index("ix_upload_status", table_name="upload")
    op.drop_index("ix_upload_storage_key", table_name="upload")
    op.drop_index("ix_upload_owner", table_name="upload")
    op.drop_table("upload")
    op.execute("DROP TYPE IF EXISTS upload_status")
