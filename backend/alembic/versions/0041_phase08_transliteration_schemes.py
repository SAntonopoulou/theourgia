"""B113 Phase 08 Linguistic: transliteration_scheme table.

Per ``plan/08-batches-backend.md`` § B113.

Revision ID: 0041
Revises: 0040
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0041"
down_revision: Union[str, None] = "0040"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DIRECTIONS = ("script_to_latin", "latin_to_script")


def upgrade() -> None:
    dir_enum = postgresql.ENUM(
        *DIRECTIONS, name="scheme_direction", create_type=False,
    )
    dir_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "transliteration_scheme",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("source_script", sa.String(40), nullable=False),
        sa.Column(
            "direction",
            postgresql.ENUM(
                *DIRECTIONS, name="scheme_direction", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "mapping",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_citation", sa.String(480), nullable=False),
        sa.Column("round_trip_status", sa.String(16), nullable=False),
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
        "ix_translit_scheme_slug",
        "transliteration_scheme",
        ["slug"],
        unique=True,
    )
    op.create_index(
        "ix_translit_scheme_source_script",
        "transliteration_scheme",
        ["source_script"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_translit_scheme_source_script", table_name="transliteration_scheme",
    )
    op.drop_index(
        "ix_translit_scheme_slug", table_name="transliteration_scheme",
    )
    op.drop_table("transliteration_scheme")
    postgresql.ENUM(name="scheme_direction").drop(
        op.get_bind(), checkfirst=True,
    )
