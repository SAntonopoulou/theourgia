"""Phase 04 entry expansion

Revision ID: 0017
Revises: 0016
Create Date: 2026-06-21

Extends the Phase 02 ``entry`` table for Phase 04 (Journaling):

* Adds 12 new values to the ``entry_type`` enum (note, ritual_log,
  dream, working, magical_record, pathworking, scrying, body_practice,
  meeting_note, study_note, liber_resh, blog_post).
* Creates ``entry_visibility`` and ``entry_encryption_mode`` enums.
* Adds the Phase 04 columns to ``entry``: body_text, visibility,
  encryption_mode, encrypted_payload, occurred_at, occurred_at_tz,
  location_{lat,lon}, astro_snapshot, calendar_snapshot, mood, energy,
  health_notes, body_snapshot_id, parent_id, scheduled_publish_at,
  authored_by_persona_id.
* Creates ``entry_revision`` table for version history.

Backwards compatible: existing entry rows are not modified. The new
columns are all nullable or carry server defaults so any legacy row
stays valid.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_NEW_ENTRY_TYPES = [
    "note", "ritual_log", "dream", "working", "magical_record",
    "pathworking", "scrying", "body_practice", "meeting_note",
    "study_note", "liber_resh", "blog_post",
]

_VISIBILITIES = ["personal", "viewer", "hub", "public"]
_ENCRYPTION_MODES = ["none", "sealed"]


def upgrade() -> None:
    # Expand the entry_type enum with the Phase 04 kinds. Postgres
    # requires this via ALTER TYPE ... ADD VALUE; each value must be
    # added as a separate statement.
    for kind in _NEW_ENTRY_TYPES:
        op.execute(f"ALTER TYPE entry_type ADD VALUE IF NOT EXISTS '{kind}'")

    # New enums for visibility + encryption mode.
    op.execute(
        f"CREATE TYPE entry_visibility AS ENUM "
        f"({', '.join(repr(s) for s in _VISIBILITIES)})"
    )
    op.execute(
        f"CREATE TYPE entry_encryption_mode AS ENUM "
        f"({', '.join(repr(s) for s in _ENCRYPTION_MODES)})"
    )

    # Add the Phase 04 columns to entry.
    with op.batch_alter_table("entry") as batch:
        batch.add_column(sa.Column("body_text", sa.Text(), nullable=True))
        batch.add_column(sa.Column(
            "authored_by_persona_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persona.id", ondelete="SET NULL"),
            nullable=True,
        ))
        batch.add_column(sa.Column(
            "visibility",
            postgresql.ENUM(name="entry_visibility", create_type=False),
            nullable=False,
            server_default="personal",
        ))
        batch.add_column(sa.Column(
            "encryption_mode",
            postgresql.ENUM(name="entry_encryption_mode", create_type=False),
            nullable=False,
            server_default="none",
        ))
        batch.add_column(sa.Column("encrypted_payload", sa.LargeBinary(), nullable=True))
        batch.add_column(sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("occurred_at_tz", sa.String(64), nullable=True))
        batch.add_column(sa.Column("location_lat", sa.Float(), nullable=True))
        batch.add_column(sa.Column("location_lon", sa.Float(), nullable=True))
        batch.add_column(sa.Column("astro_snapshot", sa.Text(), nullable=True))
        batch.add_column(sa.Column("calendar_snapshot", sa.Text(), nullable=True))
        batch.add_column(sa.Column("mood", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("energy", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("health_notes", sa.Text(), nullable=True))
        batch.add_column(sa.Column("body_snapshot_id", postgresql.UUID(as_uuid=True), nullable=True))
        batch.add_column(sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ))
        batch.add_column(sa.Column("scheduled_publish_at", sa.DateTime(timezone=True), nullable=True))

    # New indexes on the columns the search + scheduler will read.
    op.create_index("ix_entry_occurred_at", "entry", ["occurred_at"])
    op.create_index("ix_entry_visibility", "entry", ["visibility"])
    op.create_index("ix_entry_parent_id", "entry", ["parent_id"])
    op.create_index("ix_entry_scheduled_publish_at", "entry", ["scheduled_publish_at"])
    op.create_index("ix_entry_authored_by_persona_id", "entry", ["authored_by_persona_id"])
    op.create_index("ix_entry_body_snapshot_id", "entry", ["body_snapshot_id"])

    # entry_revision table.
    op.create_table(
        "entry_revision",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("title_at_revision", sa.String(256), nullable=False),
        sa.Column("body_at_revision", sa.Text(), nullable=True),
        sa.Column("body_text_at_revision", sa.Text(), nullable=True),
        sa.Column(
            "type_at_revision",
            postgresql.ENUM(name="entry_type", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "visibility_at_revision",
            postgresql.ENUM(name="entry_visibility", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "edited_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("edit_summary", sa.String(1024), nullable=True),
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
        sa.UniqueConstraint("entry_id", "revision_number", name="uq_entry_revision_entry_rev"),
    )
    op.create_index("ix_entry_revision_entry_id", "entry_revision", ["entry_id"])
    op.create_index("ix_entry_revision_created_at", "entry_revision", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_entry_revision_created_at", table_name="entry_revision")
    op.drop_index("ix_entry_revision_entry_id", table_name="entry_revision")
    op.drop_table("entry_revision")

    op.drop_index("ix_entry_body_snapshot_id", table_name="entry")
    op.drop_index("ix_entry_authored_by_persona_id", table_name="entry")
    op.drop_index("ix_entry_scheduled_publish_at", table_name="entry")
    op.drop_index("ix_entry_parent_id", table_name="entry")
    op.drop_index("ix_entry_visibility", table_name="entry")
    op.drop_index("ix_entry_occurred_at", table_name="entry")

    with op.batch_alter_table("entry") as batch:
        batch.drop_column("scheduled_publish_at")
        batch.drop_column("parent_id")
        batch.drop_column("body_snapshot_id")
        batch.drop_column("health_notes")
        batch.drop_column("energy")
        batch.drop_column("mood")
        batch.drop_column("calendar_snapshot")
        batch.drop_column("astro_snapshot")
        batch.drop_column("location_lon")
        batch.drop_column("location_lat")
        batch.drop_column("occurred_at_tz")
        batch.drop_column("occurred_at")
        batch.drop_column("encrypted_payload")
        batch.drop_column("encryption_mode")
        batch.drop_column("visibility")
        batch.drop_column("authored_by_persona_id")
        batch.drop_column("body_text")

    op.execute("DROP TYPE IF EXISTS entry_encryption_mode")
    op.execute("DROP TYPE IF EXISTS entry_visibility")
    # Note: we don't shrink the entry_type enum on downgrade — Postgres
    # doesn't support DROP VALUE, and any rows using the new kinds
    # would be invalidated. The empty-string downgrade is the documented
    # ergonomic compromise.
