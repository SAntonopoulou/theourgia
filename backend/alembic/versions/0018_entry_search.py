"""Phase 04 entry FTS — search_tsvector + GIN index.

Revision ID: 0018
Revises: 0017
Create Date: 2026-06-21

Adds Postgres full-text search support to ``entry`` via a stored
generated ``search_tsvector`` column and a GIN index. The search
column concatenates ``title`` and ``body_text`` with English-language
stemming so practitioner searches like "Hekate offering" find rows
where the body mentions "Hekate's offerings" without exact match.

Why a generated column: writes are simpler (no app-level update
trigger), reads use the GIN index directly, and Postgres maintains
the column atomically on every insert / update.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Stored generated tsvector. ``coalesce`` so a NULL body_text
    # doesn't blank the whole column.
    op.execute(
        """
        ALTER TABLE entry
        ADD COLUMN search_tsvector tsvector
        GENERATED ALWAYS AS (
            to_tsvector(
                'english',
                coalesce(title, '') || ' ' || coalesce(body_text, '')
            )
        ) STORED
        """,
    )
    # GIN index for fast @@ matches.
    op.execute(
        "CREATE INDEX ix_entry_search_tsvector ON entry USING gin (search_tsvector)",
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_entry_search_tsvector")
    op.execute("ALTER TABLE entry DROP COLUMN IF EXISTS search_tsvector")
