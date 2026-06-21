"""Phase 04 library expansion — book_note + quote + reading_list

Revision ID: 0020
Revises: 0019
Create Date: 2026-06-21

Extends the Phase 02 ``book`` table with Phase 04 columns (editor,
edition, publisher, languages, status, holding, shelf_location,
cover_image_url), and creates the three new tables: ``book_note``,
``quote``, ``reading_list``.

Backwards compatible: every new column on ``book`` is nullable or
carries a server default.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_BOOK_STATUSES = ["owned", "reading", "read", "want", "lent_out", "unlisted"]
_HOLDINGS = ["physical", "digital", "audiobook", "none"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE book_status AS ENUM "
        f"({', '.join(repr(s) for s in _BOOK_STATUSES)})"
    )
    op.execute(
        f"CREATE TYPE book_holding AS ENUM "
        f"({', '.join(repr(s) for s in _HOLDINGS)})"
    )

    with op.batch_alter_table("book") as batch:
        batch.add_column(sa.Column("editor", sa.String(256), nullable=True))
        batch.add_column(sa.Column("edition", sa.String(64), nullable=True))
        batch.add_column(sa.Column("publisher", sa.String(256), nullable=True))
        batch.add_column(sa.Column(
            "languages", sa.String(128), nullable=False, server_default="",
        ))
        batch.add_column(sa.Column(
            "status",
            postgresql.ENUM(name="book_status", create_type=False),
            nullable=False, server_default="owned",
        ))
        batch.add_column(sa.Column(
            "holding",
            postgresql.ENUM(name="book_holding", create_type=False),
            nullable=False, server_default="physical",
        ))
        batch.add_column(sa.Column("shelf_location", sa.String(128), nullable=True))
        batch.add_column(sa.Column("cover_image_url", sa.String(512), nullable=True))

    op.create_index("ix_book_isbn", "book", ["isbn"])
    op.create_index("ix_book_status", "book", ["status"])

    # book_note
    op.create_table(
        "book_note",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "book_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("book.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("page_reference", sa.String(64), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_book_note_book_id", "book_note", ["book_id"])
    op.create_index("ix_book_note_owner_id", "book_note", ["owner_id"])

    # quote
    op.create_table(
        "quote",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "book_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("book.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("page_reference", sa.String(64), nullable=True),
        sa.Column("language", sa.String(16), nullable=True),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_quote_book_id", "quote", ["book_id"])
    op.create_index("ix_quote_owner_id", "quote", ["owner_id"])

    # reading_list
    op.create_table(
        "reading_list",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("book_ids", sa.Text(), nullable=False, server_default=""),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reading_list_owner_id", "reading_list", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_reading_list_owner_id", table_name="reading_list")
    op.drop_table("reading_list")

    op.drop_index("ix_quote_owner_id", table_name="quote")
    op.drop_index("ix_quote_book_id", table_name="quote")
    op.drop_table("quote")

    op.drop_index("ix_book_note_owner_id", table_name="book_note")
    op.drop_index("ix_book_note_book_id", table_name="book_note")
    op.drop_table("book_note")

    op.drop_index("ix_book_status", table_name="book")
    op.drop_index("ix_book_isbn", table_name="book")

    with op.batch_alter_table("book") as batch:
        batch.drop_column("cover_image_url")
        batch.drop_column("shelf_location")
        batch.drop_column("holding")
        batch.drop_column("status")
        batch.drop_column("languages")
        batch.drop_column("publisher")
        batch.drop_column("edition")
        batch.drop_column("editor")

    op.execute("DROP TYPE IF EXISTS book_holding")
    op.execute("DROP TYPE IF EXISTS book_status")
