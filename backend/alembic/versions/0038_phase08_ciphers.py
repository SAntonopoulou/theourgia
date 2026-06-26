"""B110 Phase 08 Linguistic: cipher table.

Per ``plan/08-batches-backend.md`` § B110.

Revision ID: 0038
Revises: 0037
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0038"
down_revision: Union[str, None] = "0037"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LANGUAGES = (
    "greek", "hebrew", "english", "coptic", "arabic", "sanskrit", "custom",
)


def upgrade() -> None:
    lang_enum = postgresql.ENUM(
        *LANGUAGES, name="cipher_language", create_type=False,
    )
    lang_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "cipher",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column(
            "language",
            postgresql.ENUM(
                *LANGUAGES, name="cipher_language", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "mapping",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source_citation", sa.String(480), nullable=True),
        sa.Column(
            "personal",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("bundled_slug", sa.String(120), nullable=True),
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
    op.create_index("ix_cipher_owner", "cipher", ["owner_id"])
    op.create_index("ix_cipher_language", "cipher", ["language"])
    op.create_index(
        "ix_cipher_bundled_slug",
        "cipher",
        ["bundled_slug"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_cipher_bundled_slug", table_name="cipher")
    op.drop_index("ix_cipher_language", table_name="cipher")
    op.drop_index("ix_cipher_owner", table_name="cipher")
    op.drop_table("cipher")
    postgresql.ENUM(name="cipher_language").drop(
        op.get_bind(), checkfirst=True,
    )
