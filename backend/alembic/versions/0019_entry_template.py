"""Phase 04 entry templates

Revision ID: 0019
Revises: 0018
Create Date: 2026-06-21

Adds the ``entry_template`` table for reusable entry scaffolds.
Personal / vault-shared / publishable scopes. Built-in templates
ship via a data-load seeder (separate from the Alembic chain).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TEMPLATE_SCOPES = ["personal", "vault_shared", "publishable"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE template_scope AS ENUM "
        f"({', '.join(repr(s) for s in _TEMPLATE_SCOPES)})"
    )

    op.create_table(
        "entry_template",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.String(1024), nullable=False, server_default=""),
        sa.Column(
            "kind",
            postgresql.ENUM(name="entry_type", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "scope",
            postgresql.ENUM(name="template_scope", create_type=False),
            nullable=False,
            server_default="personal",
        ),
        sa.Column("body_template", sa.Text(), nullable=False),
        sa.Column("default_title_pattern", sa.String(256), nullable=True),
        sa.Column("default_glyph", sa.String(64), nullable=False, server_default="feather"),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("tradition", sa.String(64), nullable=True),
        sa.Column("license", sa.String(64), nullable=True),
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
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index("ix_entry_template_owner_id", "entry_template", ["owner_id"])
    op.create_index("ix_entry_template_kind", "entry_template", ["kind"])
    op.create_index("ix_entry_template_scope", "entry_template", ["scope"])
    op.create_index(
        "ix_entry_template_deleted_at", "entry_template", ["deleted_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_entry_template_deleted_at", table_name="entry_template")
    op.drop_index("ix_entry_template_scope", table_name="entry_template")
    op.drop_index("ix_entry_template_kind", table_name="entry_template")
    op.drop_index("ix_entry_template_owner_id", table_name="entry_template")
    op.drop_table("entry_template")
    op.execute("DROP TYPE IF EXISTS template_scope")
