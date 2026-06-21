"""Phase 06 practice logs: body_practice_session + banishing_log.

Revision ID: 0030
Revises: 0029
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0030"
down_revision: Union[str, None] = "0029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_BODY_KINDS = ["asana", "pranayama", "other"]
_BANISHING_METHODS = [
    "lbrp", "star_ruby", "simple_ground", "breath",
    "water", "salt", "bell", "incense", "khephra", "other",
]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE body_practice_kind AS ENUM "
        f"({', '.join(repr(s) for s in _BODY_KINDS)})"
    )
    op.execute(
        f"CREATE TYPE banishing_method AS ENUM "
        f"({', '.join(repr(s) for s in _BANISHING_METHODS)})"
    )

    op.create_table(
        "body_practice_session",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "kind",
            postgresql.ENUM(name="body_practice_kind", create_type=False),
            nullable=False,
            server_default="asana",
        ),
        sa.Column("posture_or_pattern", sa.String(128), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("breaks_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("observation_notes", sa.Text(), nullable=True),
        sa.Column(
            "body_snapshot_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("body_snapshot.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
    op.create_index("ix_body_practice_owner_id", "body_practice_session", ["owner_id"])
    op.create_index("ix_body_practice_started_at", "body_practice_session", ["started_at"])
    op.create_index("ix_body_practice_kind", "body_practice_session", ["kind"])
    op.create_index("ix_body_practice_posture", "body_practice_session", ["posture_or_pattern"])

    op.create_table(
        "banishing_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "method",
            postgresql.ENUM(name="banishing_method", create_type=False),
            nullable=False,
        ),
        sa.Column("method_label", sa.String(128), nullable=True),
        sa.Column("performed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("state_before", sa.Text(), nullable=True),
        sa.Column("state_after", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("correspondences", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
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
    op.create_index("ix_banishing_log_owner_id", "banishing_log", ["owner_id"])
    op.create_index("ix_banishing_log_performed_at", "banishing_log", ["performed_at"])
    op.create_index("ix_banishing_log_method", "banishing_log", ["method"])


def downgrade() -> None:
    op.drop_table("banishing_log")
    op.drop_table("body_practice_session")
    op.execute("DROP TYPE banishing_method")
    op.execute("DROP TYPE body_practice_kind")
