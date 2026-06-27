"""B139 Phase 12 group rituals: 4 new tables.

Per ``plan/12-batches-backend.md`` § B139.

Revision ID: 0058
Revises: 0057
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0058"
down_revision: Union[str, None] = "0057"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    location = postgresql.ENUM(
        "physical", "virtual", "dispersed",
        name="group_ritual_location",
        create_type=False,
    )
    location.create(op.get_bind(), checkfirst=True)

    status_e = postgresql.ENUM(
        "draft", "invited", "in_progress", "completed",
        name="group_ritual_status",
        create_type=False,
    )
    status_e.create(op.get_bind(), checkfirst=True)

    participant_status = postgresql.ENUM(
        "invited", "accepted", "declined", "in_ritual", "completed",
        name="group_ritual_participant_status",
        create_type=False,
    )
    participant_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "group_ritual",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True),
            primary_key=True, nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "deleted_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column(
            "organizer_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "hub_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hub.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "scheduled_for_utc", sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "location", location,
            nullable=False, server_default="dispersed",
        ),
        sa.Column("location_detail", sa.String(500), nullable=True),
        sa.Column("shared_script", sa.Text(), nullable=True),
        sa.Column(
            "correspondences_payload", postgresql.JSONB(),
            nullable=False, server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "egregore_entity_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status", status_e,
            nullable=False, server_default="draft",
        ),
    )
    op.create_index(
        "ix_group_ritual_organizer", "group_ritual", ["organizer_id"],
    )
    op.create_index(
        "ix_group_ritual_hub", "group_ritual", ["hub_id"],
    )
    op.create_index(
        "ix_group_ritual_status", "group_ritual", ["status"],
    )

    op.create_table(
        "group_ritual_participant",
        sa.Column(
            "ritual_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status", participant_status,
            nullable=False, server_default="invited",
        ),
        sa.Column(
            "role_in_ritual", sa.String(120), nullable=True,
        ),
        sa.PrimaryKeyConstraint(
            "ritual_id", "user_id",
            name="pk_group_ritual_participant",
        ),
    )
    op.create_index(
        "ix_group_ritual_participant_user",
        "group_ritual_participant", ["user_id"],
    )

    op.create_table(
        "group_ritual_fragment",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True),
            primary_key=True, nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "ritual_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "posted_at_utc", sa.DateTime(timezone=True),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_group_ritual_fragment_ritual",
        "group_ritual_fragment", ["ritual_id"],
    )

    op.create_table(
        "group_ritual_reflection",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True),
            primary_key=True, nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "ritual_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "ritual_id", "author_id",
            name="uq_reflection_ritual_author",
        ),
    )
    op.create_index(
        "ix_group_ritual_reflection_ritual",
        "group_ritual_reflection", ["ritual_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_group_ritual_reflection_ritual",
        table_name="group_ritual_reflection",
    )
    op.drop_table("group_ritual_reflection")
    op.drop_index(
        "ix_group_ritual_fragment_ritual",
        table_name="group_ritual_fragment",
    )
    op.drop_table("group_ritual_fragment")
    op.drop_index(
        "ix_group_ritual_participant_user",
        table_name="group_ritual_participant",
    )
    op.drop_table("group_ritual_participant")
    op.drop_index("ix_group_ritual_status", table_name="group_ritual")
    op.drop_index("ix_group_ritual_hub", table_name="group_ritual")
    op.drop_index(
        "ix_group_ritual_organizer", table_name="group_ritual",
    )
    op.drop_table("group_ritual")
    sa.Enum(name="group_ritual_participant_status").drop(
        op.get_bind(), checkfirst=True,
    )
    sa.Enum(name="group_ritual_status").drop(
        op.get_bind(), checkfirst=True,
    )
    sa.Enum(name="group_ritual_location").drop(
        op.get_bind(), checkfirst=True,
    )
