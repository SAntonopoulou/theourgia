"""Phase 14 plugin/bundle sandbox: 1 table.

Per ``plan/14-plugin-ecosystem.md`` § 11.

Revision ID: 0061
Revises: 0060
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0061"
down_revision: Union[str, None] = "0060"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    kind = postgresql.ENUM(
        "bundle", "plugin",
        name="sandbox_kind",
        create_type=False,
    )
    kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "sandbox",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vault.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", kind, nullable=False),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("source", sa.String(500), nullable=False),
        sa.Column(
            "notes", sa.String(2000), nullable=False, server_default="",
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "promoted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "discarded_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_sandbox_owner", "sandbox", ["owner_id"])
    op.create_index("ix_sandbox_vault", "sandbox", ["vault_id"])
    op.create_index("ix_sandbox_expires", "sandbox", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_sandbox_expires", table_name="sandbox")
    op.drop_index("ix_sandbox_vault", table_name="sandbox")
    op.drop_index("ix_sandbox_owner", table_name="sandbox")
    op.drop_table("sandbox")
    kind = postgresql.ENUM(
        "bundle", "plugin", name="sandbox_kind",
    )
    kind.drop(op.get_bind(), checkfirst=True)
