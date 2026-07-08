"""Pilgrimage route + stops.

b108-2gx · FEATURES §13.

Revision ID: 0070
Revises: 0069
Create Date: 2026-07-08
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0070"
down_revision: Union[str, None] = "0069"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pilgrimage_route",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=240), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "visibility",
            sa.String(length=16),
            nullable=False,
            server_default="personal",
        ),
    )
    op.create_index(
        "ix_pilgrimage_route_owner", "pilgrimage_route", ["owner_id"]
    )

    op.create_table(
        "pilgrimage_route_stop",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "route_id",
            sa.UUID(),
            sa.ForeignKey("pilgrimage_route.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "site_id",
            sa.UUID(),
            sa.ForeignKey("pilgrimage_site.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_route_stop_route",
        "pilgrimage_route_stop",
        ["route_id", "order_index"],
    )
    op.create_unique_constraint(
        "uq_route_stop_order",
        "pilgrimage_route_stop",
        ["route_id", "order_index"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_route_stop_order", "pilgrimage_route_stop", type_="unique"
    )
    op.drop_index(
        "ix_route_stop_route", table_name="pilgrimage_route_stop"
    )
    op.drop_table("pilgrimage_route_stop")
    op.drop_index("ix_pilgrimage_route_owner", table_name="pilgrimage_route")
    op.drop_table("pilgrimage_route")
