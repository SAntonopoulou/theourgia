"""entry.tags + entry.tradition_tags.

v1-001 · first-class entry tagging (FEATURES §2) plus the tradition
tags the closed-tradition substrate (Phase 15 §14) checks before any
public visibility path.

Revision ID: 0076
Revises: 0075
Create Date: 2026-07-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0076"
down_revision: Union[str, None] = "0075"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "entry",
        sa.Column(
            "tags", postgresql.JSONB, nullable=False, server_default="[]",
        ),
    )
    op.add_column(
        "entry",
        sa.Column(
            "tradition_tags",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("entry", "tradition_tags")
    op.drop_column("entry", "tags")
