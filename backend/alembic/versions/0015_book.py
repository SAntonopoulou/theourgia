"""add book table

Revision ID: 0015
Revises: 0014
Create Date: 2026-06-21 21:50:00 UTC

Phase 02 Batch 17 — Library substrate.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "book",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("author", sa.String(256), nullable=False, server_default=""),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("isbn", sa.String(32), nullable=False, server_default=""),
        sa.Column("tradition", sa.String(64), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=True),
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
    op.create_index("ix_book_owner", "book", ["owner_id"])
    op.create_index("ix_book_title", "book", ["title"])
    op.create_index("ix_book_deleted_at", "book", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_book_deleted_at", table_name="book")
    op.drop_index("ix_book_title", table_name="book")
    op.drop_index("ix_book_owner", table_name="book")
    op.drop_table("book")
