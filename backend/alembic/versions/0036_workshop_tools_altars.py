"""B106 Phase 07 Workshop: tool + altar tables.

Per ``plan/07-batches-backend.md`` § B106 + the H05 designer handoff
(Tool & Altar Registry).

Revision ID: 0036
Revises: 0035
Create Date: 2026-06-23
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0036"
down_revision: Union[str, None] = "0035"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TOOL_KINDS = (
    "athame", "wand", "chalice", "pentacle", "censer", "bell",
    "sword", "lamp", "mirror", "bowl", "statue", "robe", "cingulum",
    "other",
)


def upgrade() -> None:
    tool_kind_enum = postgresql.ENUM(
        *TOOL_KINDS, name="tool_kind", create_type=False,
    )
    tool_kind_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "tool",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(
                *TOOL_KINDS, name="tool_kind", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "materials",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "dimensions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "photo_upload_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("provenance", sa.Text(), nullable=True),
        sa.Column("acquisition_date", sa.Date(), nullable=True),
        sa.Column("consecration_date", sa.Date(), nullable=True),
        sa.Column(
            "consecration_working_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("current_location", sa.String(480), nullable=True),
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
    op.create_index("ix_tool_owner", "tool", ["owner_id"])
    op.create_index("ix_tool_kind", "tool", ["kind"])

    op.create_table(
        "altar",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "tool_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("arrangement_diagram_svg", sa.Text(), nullable=True),
        sa.Column(
            "photo_upload_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "is_permanent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "linked_working_entry_ids",
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
    )
    op.create_index("ix_altar_owner", "altar", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_altar_owner", table_name="altar")
    op.drop_table("altar")
    op.drop_index("ix_tool_kind", table_name="tool")
    op.drop_index("ix_tool_owner", table_name="tool")
    op.drop_table("tool")
    postgresql.ENUM(name="tool_kind").drop(op.get_bind(), checkfirst=True)
