"""Phase 15 hardening (H10 Cluster B3): user.scheduled_for_deletion_at.

Adds the 30-day grace-period column to the user table. Nullable +
indexed. The background reaper job (operator-runnable for v1) sweeps
rows where ``scheduled_for_deletion_at < now()``.

Revision ID: 0063
Revises: 0062
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0063"
down_revision: Union[str, None] = "0062"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column(
            "scheduled_for_deletion_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_user_scheduled_for_deletion_at",
        "user",
        ["scheduled_for_deletion_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_scheduled_for_deletion_at", table_name="user",
    )
    op.drop_column("user", "scheduled_for_deletion_at")
