"""H01-H03 backend gaps: adoration log + today ledger view.

Revision ID: 0031
Revises: 0030
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0031"
down_revision: Union[str, None] = "0030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TRANSITIONS = ["sunrise", "noon", "sunset", "midnight"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE resh_transition AS ENUM "
        f"({', '.join(repr(s) for s in _TRANSITIONS)})"
    )

    op.create_table(
        "adoration",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("civil_date", sa.Date(), nullable=False),
        sa.Column(
            "transition",
            postgresql.ENUM(name="resh_transition", create_type=False),
            nullable=False,
        ),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("location_label", sa.String(256), nullable=True),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
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
    op.create_index("ix_adoration_owner_id", "adoration", ["owner_id"])
    op.create_index("ix_adoration_civil_date", "adoration", ["civil_date"])
    op.create_index("ix_adoration_observed_at", "adoration", ["observed_at"])


def downgrade() -> None:
    op.drop_index("ix_adoration_observed_at", table_name="adoration")
    op.drop_index("ix_adoration_civil_date", table_name="adoration")
    op.drop_index("ix_adoration_owner_id", table_name="adoration")
    op.drop_table("adoration")
    op.execute("DROP TYPE resh_transition")
