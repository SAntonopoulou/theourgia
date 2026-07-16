"""installed_bundle table + sandbox bundle columns.

v1-011 · Magickal Bundle Format (ADR-0011). One ``installed_bundle``
row per MBF import — the attribution + provenance anchor (attribution
NOT NULL: cannot be stripped). ``sandbox`` gains the two columns the
bundle-preview flow stashes state in (manifest JSONB + storage key)
without materializing content.

No enums anywhere: ``type`` and ``signature_verdict`` are Strings —
the type catalog is open and the CREATE TYPE gotcha does not apply.

Revision ID: 0077
Revises: 0076
Create Date: 2026-07-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0077"
down_revision: Union[str, None] = "0076"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "installed_bundle",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("version", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("manifest", postgresql.JSONB(), nullable=False),
        sa.Column(
            "signature_verdict", sa.String(length=16), nullable=False
        ),
        sa.Column(
            "imported_item_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "provenance",
            postgresql.JSONB(),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "closed_tradition",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("attribution", sa.Text(), nullable=False),
        sa.Column("source_file_key", sa.String(length=500), nullable=True),
    )
    op.create_index(
        "ix_installed_bundle_owner", "installed_bundle", ["owner_id"]
    )
    op.create_index(
        "ix_installed_bundle_slug", "installed_bundle", ["slug"]
    )

    op.add_column(
        "sandbox",
        sa.Column("bundle_manifest", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "sandbox",
        sa.Column("bundle_file_key", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sandbox", "bundle_file_key")
    op.drop_column("sandbox", "bundle_manifest")
    op.drop_index("ix_installed_bundle_slug", table_name="installed_bundle")
    op.drop_index("ix_installed_bundle_owner", table_name="installed_bundle")
    op.drop_table("installed_bundle")
