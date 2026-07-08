"""Publication · content_format + file_url + file_size_bytes.

b108-2gv adds inline PDF / EPUB reader support. Publications gain:

- `content_format` enum ("html" | "pdf" | "epub"); default "html".
- `file_url` (nullable text) — R2 object URL for the PDF/EPUB byte
  stream when content_format != "html".
- `file_size_bytes` (nullable bigint) — surfaces "23.4 MB" hints in
  the download strip.

Revision ID: 0068
Revises: 0067
Create Date: 2026-07-08
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0068"
down_revision: Union[str, None] = "0067"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONTENT_FORMAT_ENUM = sa.Enum(
    "html",
    "pdf",
    "epub",
    name="publication_content_format",
)


def upgrade() -> None:
    CONTENT_FORMAT_ENUM.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "publication",
        sa.Column(
            "content_format",
            CONTENT_FORMAT_ENUM,
            nullable=False,
            server_default="html",
        ),
    )
    op.add_column(
        "publication",
        sa.Column("file_url", sa.String(length=1024), nullable=True),
    )
    op.add_column(
        "publication",
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("publication", "file_size_bytes")
    op.drop_column("publication", "file_url")
    op.drop_column("publication", "content_format")
    CONTENT_FORMAT_ENUM.drop(op.get_bind(), checkfirst=True)
