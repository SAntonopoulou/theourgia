"""Journal-as-CMS columns: slug, meta_description, categories.

The journal is the main feature of the self-hosted edition (Sophia,
22 Aug), and its public face needed what any publication needs: a slug
so a post has a URL of its own (/blog/{slug}) instead of a UUID query
string; a meta description so search results read as written, not as
truncated; and categories — the curated shelf a post sits on, as
against free-form tags — for readers and for articleSection in the
structured data.

The slug is unique and KEPT after soft-delete: a dead URL 404s honestly
rather than being silently reassigned to a different article.

Chained off the committed head 0089. The uncommitted talisman 0088
still branches from 0087b; the merge revision remains that work's
reconciliation when it lands, as noted in 0089.

Revision ID: 0090_journal_cms
Revises: 0089_voce_ipa_text
"""

from __future__ import annotations

import re
import unicodedata
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0090_journal_cms"
down_revision: Union[str, None] = "0089_voce_ipa_text"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "entry",
        sa.Column("slug", sa.String(length=320), nullable=True),
    )
    op.create_index("ix_entry_slug", "entry", ["slug"], unique=True)
    op.add_column(
        "entry",
        sa.Column(
            "meta_description",
            sa.String(length=320),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "entry",
        sa.Column("categories", JSONB(), nullable=False, server_default="[]"),
    )

    # Backfill: every already-public post gets its slug now, so the new
    # /blog/{slug} pages exist for the archive the moment this lands —
    # not only for posts republished afterwards. Same derivation as the
    # API's publish path (title → lowercase-hyphen, unique-ified).
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT id, title FROM entry "
            "WHERE visibility = 'public' AND deleted_at IS NULL "
            "AND slug IS NULL ORDER BY created_at"
        )
    ).fetchall()
    taken: set[str] = set()
    for row_id, title in rows:
        base = unicodedata.normalize("NFKD", title or "").encode(
            "ascii", "ignore"
        ).decode().lower()
        base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
        base = re.sub(r"-{2,}", "-", base)[:128].strip("-") or "entry"
        candidate = base
        suffix = 2
        while candidate in taken or bind.execute(
            sa.text("SELECT 1 FROM entry WHERE slug = :slug LIMIT 1"),
            {"slug": candidate},
        ).first():
            candidate = f"{base[: 128 - len(str(suffix)) - 1]}-{suffix}"
            suffix += 1
        taken.add(candidate)
        bind.execute(
            sa.text("UPDATE entry SET slug = :slug WHERE id = :id"),
            {"slug": candidate, "id": row_id},
        )


def downgrade() -> None:
    op.drop_column("entry", "categories")
    op.drop_column("entry", "meta_description")
    op.drop_index("ix_entry_slug", table_name="entry")
    op.drop_column("entry", "slug")
