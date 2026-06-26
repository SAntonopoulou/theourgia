"""B133 Phase 11 Media: media_upload_session table.

Per ``plan/11-batches-backend.md`` § B133.

Revision ID: 0053
Revises: 0052
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0053"
down_revision: Union[str, None] = "0052"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


STATUSES = ("pending", "completed", "cancelled", "expired")


def upgrade() -> None:
    status_enum = postgresql.ENUM(
        *STATUSES,
        name="media_upload_session_status",
        create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "media_upload_session",
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
            "status",
            postgresql.ENUM(
                *STATUSES,
                name="media_upload_session_status",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "r2_object_key", sa.String(480), nullable=False, unique=True,
        ),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("filename", sa.String(240), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column(
            "sealed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("exif_policy", sa.String(16), nullable=True),
        sa.Column(
            "expires_at", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.Column(
            "media_asset_id", postgresql.UUID(as_uuid=True), nullable=True,
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
        sa.CheckConstraint(
            "size_bytes >= 0", name="ck_upload_session_size_nonneg",
        ),
    )
    op.create_index(
        "ix_upload_session_owner", "media_upload_session", ["owner_id"],
    )
    op.create_index(
        "ix_upload_session_status", "media_upload_session", ["status"],
    )
    op.create_index(
        "ix_upload_session_expires",
        "media_upload_session",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_upload_session_expires", table_name="media_upload_session",
    )
    op.drop_index(
        "ix_upload_session_status", table_name="media_upload_session",
    )
    op.drop_index(
        "ix_upload_session_owner", table_name="media_upload_session",
    )
    op.drop_table("media_upload_session")
    postgresql.ENUM(name="media_upload_session_status").drop(
        op.get_bind(), checkfirst=True,
    )
