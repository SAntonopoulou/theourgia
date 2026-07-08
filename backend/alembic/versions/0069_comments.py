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

revision: str = "0069"
down_revision: Union[str, None] = "0068"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TARGET_KIND_ENUM = sa.Enum(
    "entry", "publication", name="comment_target_kind"
)
COMMENT_STATE_ENUM = sa.Enum(
    "pending", "approved", "rejected", "spam", name="comment_state"
)


def upgrade() -> None:
    TARGET_KIND_ENUM.create(op.get_bind(), checkfirst=True)
    COMMENT_STATE_ENUM.create(op.get_bind(), checkfirst=True)

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
        sa.Column("target_kind", TARGET_KIND_ENUM, nullable=False),
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
            COMMENT_STATE_ENUM,
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
    COMMENT_STATE_ENUM.drop(op.get_bind(), checkfirst=True)
    TARGET_KIND_ENUM.drop(op.get_bind(), checkfirst=True)
