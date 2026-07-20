"""Release artifact hosting · v1-032.

One bytea-backed row per uploaded release archive. See
``theourgia_registry/models/artifact.py`` for the storage-choice
rationale (DB bytea capped 10 MB; no object-storage substrate on the
registry side).

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-20
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "release_artifact",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "plugin_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plugin_version.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("signature_base64", sa.String(255), nullable=False),
        sa.Column(
            "content_type",
            sa.String(64),
            nullable=False,
            server_default="application/gzip",
        ),
        sa.Column(
            "uploaded_by_author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("author.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint(
            "plugin_version_id", name="uq_release_artifact_version",
        ),
    )


def downgrade() -> None:
    op.drop_table("release_artifact")
