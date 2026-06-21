"""Phase 06 lightweight divination: pendulum, bibliomancy, horary, scrying.

Revision ID: 0029
Revises: 0028
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0029"
down_revision: Union[str, None] = "0028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_PENDULUM_OUTCOMES = ["yes", "no", "maybe", "no_response"]
_BIBLIOMANCY_KINDS = ["line", "sentence", "paragraph"]
_SCRYING_MODES = [
    "water_bowl", "black_mirror", "crystal", "fire", "smoke",
    "ink_in_water", "candle_flame", "other",
]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE pendulum_outcome AS ENUM "
        f"({', '.join(repr(s) for s in _PENDULUM_OUTCOMES)})"
    )
    op.execute(
        f"CREATE TYPE bibliomancy_passage_kind AS ENUM "
        f"({', '.join(repr(s) for s in _BIBLIOMANCY_KINDS)})"
    )
    op.execute(
        f"CREATE TYPE scrying_mode AS ENUM "
        f"({', '.join(repr(s) for s in _SCRYING_MODES)})"
    )

    # ── pendulum_reading ────────────────────────────────────────────
    op.create_table(
        "pendulum_reading",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("asked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "outcome",
            postgresql.ENUM(name="pendulum_outcome", create_type=False),
            nullable=False,
        ),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column(
            "board_image_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("board_landing", postgresql.JSONB, nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("calibration", sa.String(32), nullable=True),
        sa.Column("calibration_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
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
    op.create_index("ix_pendulum_reading_owner_id", "pendulum_reading", ["owner_id"])
    op.create_index("ix_pendulum_reading_asked_at", "pendulum_reading", ["asked_at"])

    # ── bibliomancy_reading ─────────────────────────────────────────
    op.create_table(
        "bibliomancy_reading",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column(
            "book_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("book.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("source_label", sa.String(512), nullable=False),
        sa.Column(
            "passage_kind",
            postgresql.ENUM(name="bibliomancy_passage_kind", create_type=False),
            nullable=False,
            server_default="paragraph",
        ),
        sa.Column("seed", sa.String(256), nullable=False),
        sa.Column("drawn_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("drawn_passage", sa.Text(), nullable=False),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("passage_index", sa.Integer(), nullable=False),
        sa.Column("total_passages", sa.Integer(), nullable=False),
        sa.Column("interpretation", sa.Text(), nullable=True),
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
    op.create_index("ix_bibliomancy_reading_owner_id", "bibliomancy_reading", ["owner_id"])
    op.create_index("ix_bibliomancy_reading_drawn_at", "bibliomancy_reading", ["drawn_at"])
    op.create_index("ix_bibliomancy_reading_book_id", "bibliomancy_reading", ["book_id"])

    # ── horary_reading ──────────────────────────────────────────────
    op.create_table(
        "horary_reading",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("asked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("location_label", sa.String(256), nullable=True),
        sa.Column("chart_snapshot", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("significator_querent", sa.String(64), nullable=True),
        sa.Column("significator_quesited", sa.String(64), nullable=True),
        sa.Column("perfection_notes", sa.Text(), nullable=True),
        sa.Column("interpretation", sa.Text(), nullable=True),
        sa.Column("retrospective_rating", sa.Integer(), nullable=True),
        sa.Column("retrospective_notes", sa.Text(), nullable=True),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
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
    op.create_index("ix_horary_reading_owner_id", "horary_reading", ["owner_id"])
    op.create_index("ix_horary_reading_asked_at", "horary_reading", ["asked_at"])

    # ── scrying_session ─────────────────────────────────────────────
    op.create_table(
        "scrying_session",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "mode",
            postgresql.ENUM(name="scrying_mode", create_type=False),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("intention", sa.Text(), nullable=True),
        sa.Column("preparation_notes", sa.Text(), nullable=True),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("vision_notes", sa.Text(), nullable=True),
        sa.Column("symbols", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "sketch_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "voice_memo_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("planetary_hour", sa.String(32), nullable=True),
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
    op.create_index("ix_scrying_session_owner_id", "scrying_session", ["owner_id"])
    op.create_index("ix_scrying_session_started_at", "scrying_session", ["started_at"])
    op.create_index("ix_scrying_session_mode", "scrying_session", ["mode"])


def downgrade() -> None:
    for tbl in (
        "scrying_session",
        "horary_reading",
        "bibliomancy_reading",
        "pendulum_reading",
    ):
        op.drop_table(tbl)
    op.execute("DROP TYPE scrying_mode")
    op.execute("DROP TYPE bibliomancy_passage_kind")
    op.execute("DROP TYPE pendulum_outcome")
