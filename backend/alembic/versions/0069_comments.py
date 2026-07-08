"""Comment table + comments_enabled on Publication and Entry.

b108-2gw · FEATURES §2 (blog) + §12 (publications) closes
"Comments with moderation — per-post opt-in".

Creates:
- comment table (target_kind + target_id + owner_id + author fields
  + state + moderator_note + ip_address).
- publication.comments_enabled (bool, default false).
- entry.comments_enabled (bool, default false).

Enums (created idempotently):
- comment_target_kind {entry, publication}
- comment_state {pending, approved, rejected, spam}

Revision ID: 0069
Revises: 0068
Create Date: 2026-07-08
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0069"
down_revision: Union[str, None] = "0068"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enums explicitly with IF NOT EXISTS via raw SQL so
    # re-runs against a partially-migrated DB don't hit
    # DuplicateObjectError. The column defs use `create_type=False`
    # so op.create_table doesn't re-emit CREATE TYPE.
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_target_kind') THEN "
        "CREATE TYPE comment_target_kind AS ENUM ('entry', 'publication'); "
        "END IF; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_state') THEN "
        "CREATE TYPE comment_state AS ENUM ('pending', 'approved', 'rejected', 'spam'); "
        "END IF; END $$;"
    )

    target_kind_ref = postgresql.ENUM(
        "entry", "publication",
        name="comment_target_kind",
        create_type=False,
    )
    state_ref = postgresql.ENUM(
        "pending", "approved", "rejected", "spam",
        name="comment_state",
        create_type=False,
    )

    op.create_table(
        "comment",
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
        sa.Column("target_kind", target_kind_ref, nullable=False),
        sa.Column("target_id", sa.UUID(), nullable=False),
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("author_name", sa.String(length=120), nullable=False),
        sa.Column("author_email", sa.String(length=320), nullable=True),
        sa.Column("author_url", sa.String(length=480), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "state",
            state_ref,
            nullable=False,
            server_default="pending",
        ),
        sa.Column("moderator_note", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_comment_target", "comment", ["target_kind", "target_id"]
    )
    op.create_index(
        "ix_comment_owner_state", "comment", ["owner_id", "state"]
    )

    op.add_column(
        "publication",
        sa.Column(
            "comments_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "entry",
        sa.Column(
            "comments_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("entry", "comments_enabled")
    op.drop_column("publication", "comments_enabled")
    op.drop_index("ix_comment_owner_state", table_name="comment")
    op.drop_index("ix_comment_target", table_name="comment")
    op.drop_table("comment")
    op.execute("DROP TYPE IF EXISTS comment_state")
    op.execute("DROP TYPE IF EXISTS comment_target_kind")
