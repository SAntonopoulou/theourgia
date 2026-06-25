"""B105 Phase 07 Workshop: circle table.

Per ``plan/07-batches-backend.md`` § B105 + the H05 designer handoff
(Magical Circles).

Revision ID: 0035
Revises: 0034
Create Date: 2026-06-23
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0035"
down_revision: Union[str, None] = "0034"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COMPASS_TRADITIONS = (
    "archangels",
    "greek_winds",
    "watchtowers",
    "vedic_dikpalas",
    "custom",
)


def upgrade() -> None:
    compass_enum = postgresql.ENUM(
        *COMPASS_TRADITIONS,
        name="compass_tradition",
        create_type=False,
    )
    compass_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "circle",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column(
            "diameter_m",
            sa.Float(),
            nullable=False,
            server_default="2.0",
        ),
        sa.Column(
            "rings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "compass_tradition",
            postgresql.ENUM(
                *COMPASS_TRADITIONS,
                name="compass_tradition",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "compass_points",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "centre_element",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("citation", sa.String(480), nullable=True),
        sa.Column(
            "parent_circle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("circle.id", ondelete="SET NULL"),
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
        sa.CheckConstraint(
            "diameter_m > 0 AND diameter_m <= 20",
            name="ck_circle_diameter_range",
        ),
    )
    op.create_index("ix_circle_owner", "circle", ["owner_id"])
    op.create_index("ix_circle_parent", "circle", ["parent_circle_id"])


def downgrade() -> None:
    op.drop_index("ix_circle_parent", table_name="circle")
    op.drop_index("ix_circle_owner", table_name="circle")
    op.drop_table("circle")
    postgresql.ENUM(name="compass_tradition").drop(
        op.get_bind(), checkfirst=True,
    )
