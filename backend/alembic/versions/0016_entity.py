"""add entity table

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-21 22:00:00 UTC

Phase 02 Batch 18 — Entities ledger.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ENTITY_KINDS = ["deity", "spirit", "principle", "place", "object", "other"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE entity_kind AS ENUM "
        f"({', '.join(repr(s) for s in _ENTITY_KINDS)})"
    )

    op.create_table(
        "entity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(name="entity_kind", create_type=False),
            nullable=False,
            server_default="other",
        ),
        sa.Column(
            "aliases",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "glyph", sa.String(64), nullable=False, server_default="entity"
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "tradition", sa.String(64), nullable=False, server_default=""
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_entity_owner", "entity", ["owner_id"])
    op.create_index("ix_entity_name", "entity", ["name"])
    op.create_index("ix_entity_kind", "entity", ["kind"])
    op.create_index("ix_entity_deleted_at", "entity", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_entity_deleted_at", table_name="entity")
    op.drop_index("ix_entity_kind", table_name="entity")
    op.drop_index("ix_entity_name", table_name="entity")
    op.drop_index("ix_entity_owner", table_name="entity")
    op.drop_table("entity")
    op.execute("DROP TYPE IF EXISTS entity_kind")
