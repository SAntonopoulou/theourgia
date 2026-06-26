"""B114 Phase 08 Linguistic: voce_per_vault_state table.

Per ``plan/08-batches-backend.md`` § B114.

Adds a per-vault join table so a practitioner can attach private
notes to a (bundled or per-vault) voce and hide individual voces
from their own library without affecting the canonical row.

Revision ID: 0042
Revises: 0041
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0042"
down_revision: Union[str, None] = "0041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "voce_per_vault_state",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "voce_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("voce_magicae.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("private_note", sa.Text(), nullable=True),
        sa.Column(
            "hidden",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
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
        sa.UniqueConstraint(
            "voce_id", "owner_id", name="uq_voce_per_vault",
        ),
    )
    op.create_index(
        "ix_voce_pvs_owner", "voce_per_vault_state", ["owner_id"],
    )
    op.create_index(
        "ix_voce_pvs_voce", "voce_per_vault_state", ["voce_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_voce_pvs_voce", table_name="voce_per_vault_state")
    op.drop_index("ix_voce_pvs_owner", table_name="voce_per_vault_state")
    op.drop_table("voce_per_vault_state")
