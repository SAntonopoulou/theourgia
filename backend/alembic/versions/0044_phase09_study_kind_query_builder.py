"""B121 Phase 09 Analytics: add QUERY_BUILDER to study_kind enum.

Per ``plan/09-batches-backend.md`` § B121.

Postgres enums use ``ALTER TYPE ... ADD VALUE`` to extend safely.

Revision ID: 0044
Revises: 0043
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0044"
down_revision: Union[str, None] = "0043"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction in
    # older Postgres, but the modern (12+) versions allow it. Alembic
    # opens an autocommit block via op.execute when needed.
    op.execute(
        "ALTER TYPE study_kind ADD VALUE IF NOT EXISTS 'query_builder'"
    )


def downgrade() -> None:
    # Postgres has no native ALTER TYPE ... DROP VALUE. The standard
    # workaround is to recreate the enum, which means rewriting every
    # row that uses the dropped value. Phase 09 ships forward-only;
    # downgrade is a no-op (and the alembic chain captures the
    # intent in the upgrade direction).
    pass
