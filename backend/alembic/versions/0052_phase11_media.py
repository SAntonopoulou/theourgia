"""B132 Phase 11 Media: media_asset + media_link tables.

Per ``plan/11-batches-backend.md`` § B132.

Revision ID: 0052
Revises: 0051
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0052"
down_revision: Union[str, None] = "0051"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


KINDS = ("image", "audio", "video", "document")
EXIF_POLICIES = ("retained", "stripped")


def upgrade() -> None:
    kind_enum = postgresql.ENUM(
        *KINDS, name="media_kind", create_type=False,
    )
    kind_enum.create(op.get_bind(), checkfirst=True)

    exif_enum = postgresql.ENUM(
        *EXIF_POLICIES, name="exif_policy", create_type=False,
    )
    exif_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "media_asset",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(*KINDS, name="media_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("filename", sa.String(240), nullable=False),
        sa.Column("r2_object_key", sa.String(480), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("width_px", sa.Integer(), nullable=True),
        sa.Column("height_px", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("alt_text", sa.Text(), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "sealed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "exif_policy",
            postgresql.ENUM(
                *EXIF_POLICIES, name="exif_policy", create_type=False,
            ),
            nullable=True,
        ),
        sa.Column(
            "exif_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "link_count", sa.Integer(), nullable=False, server_default="0",
        ),
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
        sa.UniqueConstraint("r2_object_key", name="uq_media_r2_key"),
        sa.CheckConstraint("size_bytes >= 0", name="ck_media_size_nonneg"),
        sa.CheckConstraint(
            "link_count >= 0", name="ck_media_link_count_nonneg",
        ),
        sa.CheckConstraint(
            "(width_px IS NULL OR width_px >= 0) "
            "AND (height_px IS NULL OR height_px >= 0)",
            name="ck_media_dims_nonneg",
        ),
        sa.CheckConstraint(
            "duration_seconds IS NULL OR duration_seconds >= 0",
            name="ck_media_duration_nonneg",
        ),
    )
    op.create_index("ix_media_owner", "media_asset", ["owner_id"])
    op.create_index(
        "ix_media_owner_kind", "media_asset", ["owner_id", "kind"],
    )
    op.create_index(
        "ix_media_owner_sealed",
        "media_asset",
        ["owner_id", "sealed"],
    )

    op.create_table(
        "media_link",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True,
        ),
        sa.Column(
            "media_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("media_asset.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("ref_kind", sa.String(32), nullable=False),
        sa.Column(
            "ref_id", postgresql.UUID(as_uuid=True), nullable=False,
        ),
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
        sa.UniqueConstraint(
            "media_id", "ref_kind", "ref_id", name="uq_media_link",
        ),
    )
    op.create_index("ix_media_link_media", "media_link", ["media_id"])
    op.create_index(
        "ix_media_link_ref", "media_link", ["ref_kind", "ref_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_media_link_ref", table_name="media_link")
    op.drop_index("ix_media_link_media", table_name="media_link")
    op.drop_table("media_link")
    op.drop_index("ix_media_owner_sealed", table_name="media_asset")
    op.drop_index("ix_media_owner_kind", table_name="media_asset")
    op.drop_index("ix_media_owner", table_name="media_asset")
    op.drop_table("media_asset")
    postgresql.ENUM(name="exif_policy").drop(
        op.get_bind(), checkfirst=True,
    )
    postgresql.ENUM(name="media_kind").drop(
        op.get_bind(), checkfirst=True,
    )
