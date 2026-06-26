"""B111 Phase 08 Linguistic: gematria_index table.

Per ``plan/08-batches-backend.md`` § B111.

Revision ID: 0039
Revises: 0038
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0039"
down_revision: Union[str, None] = "0038"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "gematria_index",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "cipher_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cipher.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("phrase", sa.String(240), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("digit_sum", sa.Integer(), nullable=False),
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
            "entry_id", "cipher_id", "phrase",
            name="uq_gematria_entry_cipher_phrase",
        ),
    )
    op.create_index(
        "ix_gematria_index_owner_id", "gematria_index", ["owner_id"],
    )
    op.create_index(
        "ix_gematria_index_entry_id", "gematria_index", ["entry_id"],
    )
    op.create_index(
        "ix_gematria_index_cipher_id", "gematria_index", ["cipher_id"],
    )
    op.create_index("ix_gematria_value", "gematria_index", ["value"])
    op.create_index(
        "ix_gematria_owner_value", "gematria_index", ["owner_id", "value"],
    )
    op.create_index(
        "ix_gematria_owner_cipher_value",
        "gematria_index",
        ["owner_id", "cipher_id", "value"],
    )
    op.create_index(
        "ix_gematria_digit_sum", "gematria_index", ["digit_sum"],
    )


def downgrade() -> None:
    op.drop_index("ix_gematria_digit_sum", table_name="gematria_index")
    op.drop_index(
        "ix_gematria_owner_cipher_value", table_name="gematria_index",
    )
    op.drop_index("ix_gematria_owner_value", table_name="gematria_index")
    op.drop_index("ix_gematria_value", table_name="gematria_index")
    op.drop_index("ix_gematria_index_cipher_id", table_name="gematria_index")
    op.drop_index("ix_gematria_index_entry_id", table_name="gematria_index")
    op.drop_index("ix_gematria_index_owner_id", table_name="gematria_index")
    op.drop_table("gematria_index")
