"""B134 Phase 11 Pilgrimage: pilgrimage_site table.

Per ``plan/11-batches-backend.md`` § B134.

Revision ID: 0054
Revises: 0053
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0054"
down_revision: Union[str, None] = "0053"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


KINDS = ("sacred", "ancestral", "working", "pilgrimage", "other")


def upgrade() -> None:
    kind_enum = postgresql.ENUM(
        *KINDS, name="pilgrimage_site_kind", create_type=False,
    )
    kind_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "pilgrimage_site",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(
                *KINDS, name="pilgrimage_site_kind", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("story", sa.Text(), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lng", sa.Float(), nullable=True),
        sa.Column(
            "stored_precision",
            sa.String(16),
            nullable=False,
            server_default="hidden",
        ),
        sa.Column(
            "sealed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
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
            "(location_lat IS NULL AND location_lng IS NULL) "
            "OR (location_lat IS NOT NULL AND location_lng IS NOT NULL)",
            name="ck_pilgrimage_lat_lng_paired",
        ),
        sa.CheckConstraint(
            "stored_precision IN ('exact', '1km', '10km', "
            "'country', 'hidden')",
            name="ck_pilgrimage_precision",
        ),
    )
    op.create_index("ix_pilgrimage_owner", "pilgrimage_site", ["owner_id"])
    op.create_index(
        "ix_pilgrimage_owner_kind",
        "pilgrimage_site",
        ["owner_id", "kind"],
    )
    op.create_index(
        "ix_pilgrimage_owner_sealed",
        "pilgrimage_site",
        ["owner_id", "sealed"],
    )


def downgrade() -> None:
    op.drop_index("ix_pilgrimage_owner_sealed", table_name="pilgrimage_site")
    op.drop_index("ix_pilgrimage_owner_kind", table_name="pilgrimage_site")
    op.drop_index("ix_pilgrimage_owner", table_name="pilgrimage_site")
    op.drop_table("pilgrimage_site")
    postgresql.ENUM(name="pilgrimage_site_kind").drop(
        op.get_bind(), checkfirst=True,
    )
