"""Phase 04 body_snapshot + audio_attachment tables.

Revision ID: 0021
Revises: 0020
Create Date: 2026-06-21

Substrate for Batch 34's body sensation diagram + audio attachments.
The frontend renderers (SVG silhouettes for body, MediaRecorder UI
for audio) are designer hand-offs (designer_handoff_02.handoff
§6 + §7); the data layer here is design-independent.

Also wires the previously-unconstrained `entry.body_snapshot_id`
column (added in 0017) to the body_snapshot table via a real FK.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "body_snapshot",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("label", sa.String(256), nullable=True),
        sa.Column("markers_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "body_morphology",
            sa.String(64),
            nullable=False,
            server_default="default",
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
    )
    op.create_index("ix_body_snapshot_owner_id", "body_snapshot", ["owner_id"])

    # Now that the body_snapshot table exists, add a real FK on
    # entry.body_snapshot_id (the column was added unconstrained in
    # migration 0017).
    op.create_foreign_key(
        "fk_entry_body_snapshot_id",
        "entry",
        "body_snapshot",
        ["body_snapshot_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "audio_attachment",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("duration_seconds", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "mime_type",
            sa.String(64),
            nullable=False,
            server_default="audio/ogg",
        ),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("transcript_engine", sa.String(64), nullable=True),
        sa.Column("waveform_thumbnail_url", sa.String(512), nullable=True),
        sa.Column("label", sa.String(256), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
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
    )
    op.create_index("ix_audio_attachment_entry_id", "audio_attachment", ["entry_id"])
    op.create_index("ix_audio_attachment_upload_id", "audio_attachment", ["upload_id"])
    op.create_index("ix_audio_attachment_owner_id", "audio_attachment", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_audio_attachment_owner_id", table_name="audio_attachment")
    op.drop_index("ix_audio_attachment_upload_id", table_name="audio_attachment")
    op.drop_index("ix_audio_attachment_entry_id", table_name="audio_attachment")
    op.drop_table("audio_attachment")

    op.drop_constraint("fk_entry_body_snapshot_id", "entry", type_="foreignkey")

    op.drop_index("ix_body_snapshot_owner_id", table_name="body_snapshot")
    op.drop_table("body_snapshot")
