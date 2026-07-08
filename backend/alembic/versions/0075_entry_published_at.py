"""entry.published_at.

b108-2hm · adds the timestamp Editor uses to render "Published on X"
alongside the visibility chip.

Revision ID: 0075
Revises: 0074
Create Date: 2026-07-09
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0075"
down_revision: Union[str, None] = "0074"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "entry",
        sa.Column(
            "published_at", sa.DateTime(timezone=True), nullable=True,
        ),
    )
    op.create_index(
        "ix_entry_published_at", "entry", ["published_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_entry_published_at", table_name="entry")
    op.drop_column("entry", "published_at")
