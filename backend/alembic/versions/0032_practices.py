"""B87 Daily Practice Tracker: custom_practice + practice_completion.

Per ``plan/06-divination-and-practice.md`` and the H04 sprint B80
frontend. Two new tables backing the Daily Practice Tracker surface.

Revision ID: 0032
Revises: 0031
Create Date: 2026-06-22
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0032"
down_revision: Union[str, None] = "0031"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_CADENCES = [
    "daily", "weekly", "morning", "before-sleep", "dark-moon", "custom",
]
_COMPLETION_STATUSES = ["done", "skip"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE practice_cadence AS ENUM "
        f"({', '.join(repr(s) for s in _CADENCES)})"
    )
    op.execute(
        f"CREATE TYPE practice_completion_status AS ENUM "
        f"({', '.join(repr(s) for s in _COMPLETION_STATUSES)})"
    )

    op.create_table(
        "custom_practice",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column(
            "cadence",
            postgresql.ENUM(name="practice_cadence", create_type=False),
            nullable=False,
            server_default="daily",
        ),
        sa.Column("cadence_custom", sa.String(128), nullable=True),
        sa.Column("intention", sa.Text(), nullable=True),
        sa.Column("glyph", sa.String(16), nullable=True),
        sa.Column(
            "linked_entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("preferred_anchor", sa.String(64), nullable=True),
        sa.Column(
            "streak_label",
            sa.String(64),
            nullable=False,
            server_default="day streak",
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
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
    op.create_index(
        "ix_custom_practice_owner_id", "custom_practice", ["owner_id"],
    )
    op.create_index(
        "ix_custom_practice_cadence", "custom_practice", ["cadence"],
    )
    op.create_index(
        "ix_custom_practice_archived_at",
        "custom_practice",
        ["archived_at"],
    )

    op.create_table(
        "practice_completion",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "practice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("custom_practice.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                name="practice_completion_status", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "linked_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "recorded_at", sa.DateTime(timezone=True), nullable=False,
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
            "practice_id", "date", name="uq_completion_practice_date",
        ),
    )
    op.create_index(
        "ix_completion_practice_id", "practice_completion", ["practice_id"],
    )
    op.create_index(
        "ix_completion_owner_id", "practice_completion", ["owner_id"],
    )
    op.create_index("ix_completion_date", "practice_completion", ["date"])


def downgrade() -> None:
    op.drop_index("ix_completion_date", table_name="practice_completion")
    op.drop_index("ix_completion_owner_id", table_name="practice_completion")
    op.drop_index(
        "ix_completion_practice_id", table_name="practice_completion",
    )
    op.drop_table("practice_completion")
    op.drop_index(
        "ix_custom_practice_archived_at", table_name="custom_practice",
    )
    op.drop_index("ix_custom_practice_cadence", table_name="custom_practice")
    op.drop_index("ix_custom_practice_owner_id", table_name="custom_practice")
    op.drop_table("custom_practice")
    op.execute("DROP TYPE practice_completion_status")
    op.execute("DROP TYPE practice_cadence")
