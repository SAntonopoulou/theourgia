"""B104 Phase 07 Workshop: talisman table (composite + Mode B sealed).

Per ``plan/07-batches-backend.md`` § B104 + the H05 designer handoff
worked example (Talisman Designer).

Reuses the existing ``entry_encryption_mode`` Postgres enum (created
in migration 0017) — same pattern as Oath (migration 0024) and
Initiation.

Revision ID: 0034
Revises: 0033
Create Date: 2026-06-23
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0034"
down_revision: Union[str, None] = "0033"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "talisman",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        # Plaintext composition — NULL when sealed.
        sa.Column("front_svg", sa.Text(), nullable=True),
        sa.Column("back_svg", sa.Text(), nullable=True),
        sa.Column(
            "components",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("materials_notes", sa.Text(), nullable=True),
        # Election + consecration links.
        sa.Column(
            "linked_election",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "linked_consecration_working_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Sealed (Mode B) state — reuse existing entry_encryption_mode enum.
        sa.Column(
            "encryption_mode",
            postgresql.ENUM(
                name="entry_encryption_mode", create_type=False,
            ),
            nullable=False,
            server_default="none",
        ),
        sa.Column("encrypted_payload", sa.LargeBinary(), nullable=True),
        sa.Column("encryption_iv", sa.LargeBinary(), nullable=True),
        # Versioning.
        sa.Column(
            "parent_talisman_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("talisman.id", ondelete="SET NULL"),
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
    op.create_index("ix_talisman_owner", "talisman", ["owner_id"])
    op.create_index("ix_talisman_parent", "talisman", ["parent_talisman_id"])


def downgrade() -> None:
    op.drop_index("ix_talisman_parent", table_name="talisman")
    op.drop_index("ix_talisman_owner", table_name="talisman")
    op.drop_table("talisman")
