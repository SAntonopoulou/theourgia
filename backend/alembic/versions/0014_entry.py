"""add entry table

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-21 20:35:00 UTC

Phase 02 Batch 10 — journal-entry table. Anonymous-author allowed
during Phase 02 (owner_id nullable); tightened to NOT NULL when the
auth HTTP routes ship.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ENTRY_TYPES = ["observation", "ritual", "divination", "synchronicity", "capture"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE entry_type AS ENUM "
        f"({', '.join(repr(s) for s in _ENTRY_TYPES)})"
    )

    op.create_table(
        "entry",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(name="entry_type", create_type=False),
            nullable=False,
            server_default="observation",
        ),
        sa.Column("excerpt", sa.String(1024), nullable=False, server_default=""),
        sa.Column("glyph", sa.String(64), nullable=False, server_default="feather"),
        sa.Column("body", sa.Text(), nullable=True),
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
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index("ix_entry_owner", "entry", ["owner_id"])
    op.create_index("ix_entry_type", "entry", ["type"])
    op.create_index("ix_entry_created_at", "entry", ["created_at"])
    op.create_index("ix_entry_deleted_at", "entry", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_entry_deleted_at", table_name="entry")
    op.drop_index("ix_entry_created_at", table_name="entry")
    op.drop_index("ix_entry_type", table_name="entry")
    op.drop_index("ix_entry_owner", table_name="entry")
    op.drop_table("entry")
    op.execute("DROP TYPE IF EXISTS entry_type")
