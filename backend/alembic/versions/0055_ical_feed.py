"""B135 Phase 11 iCal feed: ical_feed table.

Per ``plan/11-batches-backend.md`` § B135.

Revision ID: 0055
Revises: 0054
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0055"
down_revision: Union[str, None] = "0054"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ical_feed",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "name",
            sa.String(240),
            nullable=False,
            server_default="My practice calendar",
        ),
        sa.Column(
            "include_resh",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "include_workings",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "include_pilgrimage_anniversaries",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "include_lunar_events",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "include_planetary_hours",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "include_custom",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("custom_cron", sa.String(120), nullable=True),
        sa.Column(
            "visibility",
            sa.String(16),
            nullable=False,
            server_default="private",
        ),
        sa.Column(
            "url_token", sa.String(64), nullable=False, unique=True,
        ),
        sa.Column(
            "last_regenerated_at",
            sa.DateTime(timezone=True),
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
        sa.CheckConstraint(
            "visibility IN ('private', 'public')",
            name="ck_ical_feed_visibility",
        ),
    )
    op.create_index("ix_ical_feed_owner", "ical_feed", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_ical_feed_owner", table_name="ical_feed")
    op.drop_table("ical_feed")
