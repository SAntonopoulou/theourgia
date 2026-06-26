"""B120 Phase 09 Synchronicity: synchronicity table.

Per ``plan/09-batches-backend.md`` § B120.

Revision ID: 0043
Revises: 0042
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0043"
down_revision: Union[str, None] = "0042"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CATEGORIES = (
    "number_sequence",
    "name_occurrence",
    "dream_spillover",
    "animal_omen",
    "song_lyric",
    "overheard_speech",
    "weather",
    "object_encounter",
    "electromagnetic",
    "custom",
)


def upgrade() -> None:
    cat_enum = postgresql.ENUM(
        *CATEGORIES, name="synchronicity_category", create_type=False,
    )
    cat_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "synchronicity",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                *CATEGORIES,
                name="synchronicity_category",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "intensity", sa.Integer(), nullable=False, server_default="5",
        ),
        sa.Column(
            "structured_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "astro_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "calendar_stamp",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "weather_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column(
            "location_precision",
            sa.String(16),
            nullable=False,
            server_default="hidden",
        ),
        sa.Column(
            "linked_entry_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "linked_entity_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "linked_working_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
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
        sa.CheckConstraint(
            "intensity BETWEEN 1 AND 10", name="ck_sync_intensity_range",
        ),
        sa.CheckConstraint(
            "location_precision IN "
            "('exact', '1km', '10km', 'country', 'hidden')",
            name="ck_sync_location_precision",
        ),
    )
    op.create_index("ix_sync_owner", "synchronicity", ["owner_id"])
    op.create_index(
        "ix_sync_occurred_at", "synchronicity", ["occurred_at"],
    )
    op.create_index("ix_sync_category", "synchronicity", ["category"])
    op.create_index(
        "ix_sync_owner_occurred",
        "synchronicity",
        ["owner_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_sync_owner_occurred", table_name="synchronicity")
    op.drop_index("ix_sync_category", table_name="synchronicity")
    op.drop_index("ix_sync_occurred_at", table_name="synchronicity")
    op.drop_index("ix_sync_owner", table_name="synchronicity")
    op.drop_table("synchronicity")
    postgresql.ENUM(name="synchronicity_category").drop(
        op.get_bind(), checkfirst=True,
    )
