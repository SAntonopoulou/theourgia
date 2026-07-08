"""tea_leaf_reading table.

b108-2hj · FEATURES §13 (reference plugin: tea-leaf reading log).

Revision ID: 0074
Revises: 0073
Create Date: 2026-07-08
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0074"
down_revision: Union[str, None] = "0073"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tea_leaf_reading",
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column("tea_variety", sa.String(length=120), nullable=True),
        sa.Column(
            "symbols_observed",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("interpretation", sa.Text(), nullable=True),
        sa.Column("intuitive_notes", sa.Text(), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )
    op.create_index("ix_tea_leaf_owner", "tea_leaf_reading", ["owner_id"])
    op.create_index(
        "ix_tea_leaf_occurred_at", "tea_leaf_reading", ["occurred_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_tea_leaf_occurred_at", table_name="tea_leaf_reading")
    op.drop_index("ix_tea_leaf_owner", table_name="tea_leaf_reading")
    op.drop_table("tea_leaf_reading")
