"""Phase 06 I Ching: hexagram + iching_reading.

Revision ID: 0026
Revises: 0025
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0026"
down_revision: Union[str, None] = "0025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TRIGRAMS = ["qian", "dui", "li", "zhen", "xun", "kan", "gen", "kun"]
_CAST_METHODS = ["three_coins", "yarrow_stalks"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE trigram AS ENUM "
        f"({', '.join(repr(s) for s in _TRIGRAMS)})"
    )
    op.execute(
        f"CREATE TYPE iching_cast_method AS ENUM "
        f"({', '.join(repr(s) for s in _CAST_METHODS)})"
    )

    op.create_table(
        "hexagram",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("name_pinyin", sa.String(64), nullable=False),
        sa.Column("name_english", sa.String(128), nullable=False),
        sa.Column("binary_pattern", sa.String(6), nullable=False),
        sa.Column(
            "lower_trigram",
            postgresql.ENUM(name="trigram", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "upper_trigram",
            postgresql.ENUM(name="trigram", create_type=False),
            nullable=False,
        ),
        sa.Column("judgment", sa.Text(), nullable=True),
        sa.Column("image", sa.Text(), nullable=True),
        sa.Column("line_texts", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "correspondences",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
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
        sa.UniqueConstraint("number", name="uq_hexagram_number"),
    )
    op.create_index("ix_hexagram_number", "hexagram", ["number"])
    op.create_index("ix_hexagram_lower_trigram", "hexagram", ["lower_trigram"])
    op.create_index("ix_hexagram_upper_trigram", "hexagram", ["upper_trigram"])

    op.create_table(
        "iching_reading",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column(
            "method",
            postgresql.ENUM(name="iching_cast_method", create_type=False),
            nullable=False,
            server_default="three_coins",
        ),
        sa.Column("seed", sa.String(256), nullable=False),
        sa.Column("drawn_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lines", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("primary_hexagram_number", sa.Integer(), nullable=False),
        sa.Column("transformation_hexagram_number", sa.Integer(), nullable=True),
        sa.Column(
            "changing_line_indices",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
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
    op.create_index("ix_iching_reading_owner_id", "iching_reading", ["owner_id"])
    op.create_index("ix_iching_reading_drawn_at", "iching_reading", ["drawn_at"])
    op.create_index(
        "ix_iching_reading_primary",
        "iching_reading",
        ["primary_hexagram_number"],
    )


def downgrade() -> None:
    op.drop_index("ix_iching_reading_primary", table_name="iching_reading")
    op.drop_index("ix_iching_reading_drawn_at", table_name="iching_reading")
    op.drop_index("ix_iching_reading_owner_id", table_name="iching_reading")
    op.drop_table("iching_reading")

    op.drop_index("ix_hexagram_upper_trigram", table_name="hexagram")
    op.drop_index("ix_hexagram_lower_trigram", table_name="hexagram")
    op.drop_index("ix_hexagram_number", table_name="hexagram")
    op.drop_table("hexagram")

    op.execute("DROP TYPE iching_cast_method")
    op.execute("DROP TYPE trigram")
