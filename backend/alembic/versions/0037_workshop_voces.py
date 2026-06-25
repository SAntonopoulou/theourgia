"""B107 Phase 07 Workshop: voce_magicae + voce_recording tables.

Per ``plan/07-batches-backend.md`` § B107 + the H05 designer handoff
(Voces Magicae).

Revision ID: 0037
Revises: 0036
Create Date: 2026-06-23
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0037"
down_revision: Union[str, None] = "0036"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCRIPTS = (
    "greek", "hebrew", "latin", "coptic", "arabic", "sanskrit", "custom",
)


def upgrade() -> None:
    script_enum = postgresql.ENUM(
        *SCRIPTS, name="voce_source_script", create_type=False,
    )
    script_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "voce_magicae",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column(
            "source_script",
            postgresql.ENUM(
                *SCRIPTS, name="voce_source_script", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("transliteration", sa.Text(), nullable=True),
        sa.Column("ipa", sa.String(480), nullable=True),
        sa.Column("source_citation", sa.String(480), nullable=False),
        sa.Column(
            "planetary_associations",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "elemental_associations",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "linked_entity_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "forked_from_bundled_id", sa.String(120), nullable=True,
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
    op.create_index("ix_voce_owner", "voce_magicae", ["owner_id"])
    op.create_index(
        "ix_voce_source_script", "voce_magicae", ["source_script"],
    )

    op.create_table(
        "voce_recording",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "voce_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("voce_magicae.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "audio_attachment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("audio_attachment.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "duration_seconds >= 0",
            name="ck_voce_recording_duration_nonneg",
        ),
    )
    op.create_index(
        "ix_voce_recording_voce", "voce_recording", ["voce_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_voce_recording_voce", table_name="voce_recording")
    op.drop_table("voce_recording")
    op.drop_index("ix_voce_source_script", table_name="voce_magicae")
    op.drop_index("ix_voce_owner", table_name="voce_magicae")
    op.drop_table("voce_magicae")
    postgresql.ENUM(name="voce_source_script").drop(
        op.get_bind(), checkfirst=True,
    )
