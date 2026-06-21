"""Phase 05 offerings + recurring_offering tables.

Revision ID: 0023
Revises: 0022
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_RECEPTIONS = ["none", "faint", "clear", "strong", "overwhelming"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE offering_reception AS ENUM "
        f"({', '.join(repr(s) for s in _RECEPTIONS)})"
    )

    op.create_table(
        "offering",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "working_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("offered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location", sa.String(256), nullable=True),
        sa.Column("location_lat", sa.Float(), nullable=True),
        sa.Column("location_lon", sa.Float(), nullable=True),
        sa.Column("items", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("intention", sa.Text(), nullable=True),
        sa.Column(
            "reception_perceived",
            postgresql.ENUM(name="offering_reception", create_type=False),
            nullable=True,
        ),
        sa.Column("outcome_notes", sa.Text(), nullable=True),
        sa.Column("astro_snapshot", sa.Text(), nullable=True),
        sa.Column("calendar_snapshot", sa.Text(), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_offering_owner_id", "offering", ["owner_id"])
    op.create_index("ix_offering_entity_id", "offering", ["entity_id"])
    op.create_index("ix_offering_offered_at", "offering", ["offered_at"])

    op.create_table(
        "recurring_offering",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(256), nullable=False),
        sa.Column("cadence", sa.String(128), nullable=False),
        sa.Column("items_template", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("next_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_recurring_offering_owner_id", "recurring_offering", ["owner_id"])
    op.create_index("ix_recurring_offering_entity_id", "recurring_offering", ["entity_id"])
    op.create_index("ix_recurring_offering_next_due_at", "recurring_offering", ["next_due_at"])


def downgrade() -> None:
    op.drop_index("ix_recurring_offering_next_due_at", table_name="recurring_offering")
    op.drop_index("ix_recurring_offering_entity_id", table_name="recurring_offering")
    op.drop_index("ix_recurring_offering_owner_id", table_name="recurring_offering")
    op.drop_table("recurring_offering")

    op.drop_index("ix_offering_offered_at", table_name="offering")
    op.drop_index("ix_offering_entity_id", table_name="offering")
    op.drop_index("ix_offering_owner_id", table_name="offering")
    op.drop_table("offering")

    op.execute("DROP TYPE IF EXISTS offering_reception")
