"""Phase 06 Geomancy: geomancy_reading.

Revision ID: 0027
Revises: 0026
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0027"
down_revision: Union[str, None] = "0026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_METHODS = ["dots", "rng", "manual"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE geomancy_method AS ENUM "
        f"({', '.join(repr(s) for s in _METHODS)})"
    )

    op.create_table(
        "geomancy_reading",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column(
            "method",
            postgresql.ENUM(name="geomancy_method", create_type=False),
            nullable=False,
            server_default="rng",
        ),
        sa.Column("seed", sa.String(256), nullable=False),
        sa.Column("drawn_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("mothers", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("judge_figure", sa.String(32), nullable=False),
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
    op.create_index("ix_geomancy_reading_owner_id", "geomancy_reading", ["owner_id"])
    op.create_index("ix_geomancy_reading_drawn_at", "geomancy_reading", ["drawn_at"])
    op.create_index("ix_geomancy_reading_judge", "geomancy_reading", ["judge_figure"])


def downgrade() -> None:
    op.drop_index("ix_geomancy_reading_judge", table_name="geomancy_reading")
    op.drop_index("ix_geomancy_reading_drawn_at", table_name="geomancy_reading")
    op.drop_index("ix_geomancy_reading_owner_id", table_name="geomancy_reading")
    op.drop_table("geomancy_reading")
    op.execute("DROP TYPE geomancy_method")
