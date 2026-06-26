"""B124 Phase 09 Analytics: digest + digest_item tables.

Per ``plan/09-batches-backend.md`` § B124.

Revision ID: 0047
Revises: 0044
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0047"
down_revision: Union[str, None] = "0044"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "digest",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "period_start", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.Column(
            "period_end", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.Column(
            "summary",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
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
        sa.UniqueConstraint(
            "owner_id", "period_start", name="uq_digest_owner_period",
        ),
    )
    op.create_index(
        "ix_digest_owner_period",
        "digest",
        ["owner_id", "period_start"],
    )

    op.create_table(
        "digest_item",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "digest_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("digest.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("headline", sa.String(240), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column(
            "structured",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "sample_size", sa.Integer(), nullable=False, server_default="0",
        ),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column(
            "dismissed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
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
    op.create_index(
        "ix_digest_item_digest", "digest_item", ["digest_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_digest_item_digest", table_name="digest_item")
    op.drop_table("digest_item")
    op.drop_index("ix_digest_owner_period", table_name="digest")
    op.drop_table("digest")
