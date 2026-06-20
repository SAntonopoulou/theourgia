"""add backup_code and password_reset_token tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-20 19:00:00 UTC

Lands the two auxiliary tables used by the authentication flow:

- ``backup_code`` — one-time-use TOTP backup codes, hash-stored
- ``password_reset_token`` — single-use short-lived reset tokens,
  hash-stored, with explicit expiry

Both tables enable Row-Level Security; only the owning user can
read or mutate their own rows.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "backup_code",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
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
    op.create_index("ix_backup_code_user", "backup_code", ["user_id"])
    op.create_index(
        "ix_backup_code_user_active", "backup_code", ["user_id", "used_at"]
    )

    op.create_table(
        "password_reset_token",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("requested_from_ip", sa.String(45), nullable=True),
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
    op.create_index("ix_password_reset_user", "password_reset_token", ["user_id"])

    # Row-Level Security
    op.execute("ALTER TABLE backup_code ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE password_reset_token ENABLE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY backup_code_self ON backup_code
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )
    op.execute(
        """
        CREATE POLICY password_reset_self ON password_reset_token
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS password_reset_self ON password_reset_token")
    op.execute("DROP POLICY IF EXISTS backup_code_self ON backup_code")
    op.drop_table("password_reset_token")
    op.drop_table("backup_code")
