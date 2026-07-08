"""Recipe table.

b108-2gy · FEATURES §10.

Revision ID: 0071
Revises: 0070
Create Date: 2026-07-08
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0071"
down_revision: Union[str, None] = "0070"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipe_kind') THEN "
        "CREATE TYPE recipe_kind AS ENUM ('incense', 'oil', 'wash', 'philtre', 'other'); "
        "END IF; END $$;"
    )
    kind_ref = postgresql.ENUM(
        "incense", "oil", "wash", "philtre", "other",
        name="recipe_kind",
        create_type=False,
    )
    op.create_table(
        "recipe",
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
        sa.Column("kind", kind_ref, nullable=False),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "ingredients",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "steps",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "correspondences",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "library_source_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "entity_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "visibility",
            sa.String(length=16),
            nullable=False,
            server_default="personal",
        ),
    )
    op.create_index("ix_recipe_owner", "recipe", ["owner_id"])
    op.create_index("ix_recipe_owner_kind", "recipe", ["owner_id", "kind"])


def downgrade() -> None:
    op.drop_index("ix_recipe_owner_kind", table_name="recipe")
    op.drop_index("ix_recipe_owner", table_name="recipe")
    op.drop_table("recipe")
    op.execute("DROP TYPE IF EXISTS recipe_kind")
