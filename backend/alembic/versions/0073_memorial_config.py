"""memorial_config table.

b108-2hg · FEATURES §18.

Revision ID: 0073
Revises: 0072
Create Date: 2026-07-08
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0073"
down_revision: Union[str, None] = "0072"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "memorial_config",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "check_in_cadence_days",
            sa.Integer(),
            nullable=False,
            server_default="180",
        ),
        sa.Column(
            "warning_window_days",
            sa.Integer(),
            nullable=False,
            server_default="30",
        ),
        sa.Column("last_check_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("executor_name", sa.String(length=240), nullable=True),
        sa.Column("executor_email", sa.String(length=480), nullable=True),
        sa.Column("memorial_message", sa.Text(), nullable=True),
        sa.Column(
            "posthumous_publications_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("memorialized_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_memorial_config_owner",
        "memorial_config",
        ["owner_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_memorial_config_owner", table_name="memorial_config")
    op.drop_table("memorial_config")
