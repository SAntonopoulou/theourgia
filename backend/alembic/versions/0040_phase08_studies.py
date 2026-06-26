"""B112 Phase 08 Linguistic: study + study_snapshot tables.

Per ``plan/08-batches-backend.md`` § B112.

Revision ID: 0040
Revises: 0039
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0040"
down_revision: Union[str, None] = "0039"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


STUDY_KINDS = ("gematria_search", "gematria_calculation")
STUDY_VISIBILITIES = ("personal", "viewer", "hub", "public")


def upgrade() -> None:
    kind_enum = postgresql.ENUM(
        *STUDY_KINDS, name="study_kind", create_type=False,
    )
    kind_enum.create(op.get_bind(), checkfirst=True)

    vis_enum = postgresql.ENUM(
        *STUDY_VISIBILITIES, name="study_visibility", create_type=False,
    )
    vis_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "study",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(
                *STUDY_KINDS, name="study_kind", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "query",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "visibility",
            postgresql.ENUM(
                *STUDY_VISIBILITIES, name="study_visibility", create_type=False,
            ),
            nullable=False,
            server_default="personal",
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
    op.create_index("ix_study_owner", "study", ["owner_id"])
    op.create_index("ix_study_kind", "study", ["kind"])

    op.create_table(
        "study_snapshot",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "study_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("study.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "results",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
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
    )
    op.create_index(
        "ix_study_snapshot_study", "study_snapshot", ["study_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_study_snapshot_study", table_name="study_snapshot",
    )
    op.drop_table("study_snapshot")
    op.drop_index("ix_study_kind", table_name="study")
    op.drop_index("ix_study_owner", table_name="study")
    op.drop_table("study")
    postgresql.ENUM(name="study_visibility").drop(
        op.get_bind(), checkfirst=True,
    )
    postgresql.ENUM(name="study_kind").drop(
        op.get_bind(), checkfirst=True,
    )
