"""Phase 06 Runes: rune_reading.

Revision ID: 0028
Revises: 0027
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0028"
down_revision: Union[str, None] = "0027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_RUNE_SETS = [
    "elder_futhark", "younger_futhark", "anglo_saxon_futhorc",
    "armanen", "northumbrian",
]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE rune_set AS ENUM "
        f"({', '.join(repr(s) for s in _RUNE_SETS)})"
    )

    op.create_table(
        "rune_reading",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column(
            "rune_set",
            postgresql.ENUM(name="rune_set", create_type=False),
            nullable=False,
            server_default="elder_futhark",
        ),
        sa.Column("spread_name", sa.String(64), nullable=False),
        sa.Column("position_count", sa.Integer(), nullable=False),
        sa.Column("seed", sa.String(256), nullable=False),
        sa.Column("drawn_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("drawn_runes", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("interpretation", sa.Text(), nullable=True),
        sa.Column("retrospective_rating", sa.Integer(), nullable=True),
        sa.Column("retrospective_notes", sa.Text(), nullable=True),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "working_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
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
    op.create_index("ix_rune_reading_owner_id", "rune_reading", ["owner_id"])
    op.create_index("ix_rune_reading_drawn_at", "rune_reading", ["drawn_at"])
    op.create_index("ix_rune_reading_set", "rune_reading", ["rune_set"])


def downgrade() -> None:
    op.drop_index("ix_rune_reading_set", table_name="rune_reading")
    op.drop_index("ix_rune_reading_drawn_at", table_name="rune_reading")
    op.drop_index("ix_rune_reading_owner_id", table_name="rune_reading")
    op.drop_table("rune_reading")
    op.execute("DROP TYPE rune_set")
