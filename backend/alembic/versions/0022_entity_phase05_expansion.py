"""Phase 05 entity expansion + alias-graph

Revision ID: 0022
Revises: 0021
Create Date: 2026-06-21

Extends the Phase 02 ``entity`` table with the Phase 05 columns
documented in `plan/05-magical-beings.md` §1, and creates the two
alias-graph tables (`entity_alias`, `entity_view`) per §11.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_NEW_ENTITY_KINDS = [
    "god", "goddess", "daemon", "angel", "demon",
    "saint", "ancestor", "beloved_dead", "familiar",
    "servitor", "egregore",
]

_RELATIONSHIP_STATUSES = [
    "open", "active", "dormant", "severed", "contracted", "observing",
]

_ENTITY_VISIBILITIES = ["personal", "viewer", "hub", "public"]

_ALIAS_KINDS = [
    "same-as", "aspect-of", "aspect-includes",
    "syncretic-with", "epithet-of",
]


def upgrade() -> None:
    # Expand entity_kind enum.
    for kind in _NEW_ENTITY_KINDS:
        op.execute(f"ALTER TYPE entity_kind ADD VALUE IF NOT EXISTS '{kind}'")

    # New enums.
    op.execute(
        f"CREATE TYPE entity_relationship_status AS ENUM "
        f"({', '.join(repr(s) for s in _RELATIONSHIP_STATUSES)})"
    )
    op.execute(
        f"CREATE TYPE entity_visibility AS ENUM "
        f"({', '.join(repr(s) for s in _ENTITY_VISIBILITIES)})"
    )
    op.execute(
        f"CREATE TYPE entity_alias_kind AS ENUM "
        f"({', '.join(repr(s) for s in _ALIAS_KINDS)})"
    )

    # Extend entity table.
    with op.batch_alter_table("entity") as batch:
        batch.add_column(sa.Column(
            "epithets",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ))
        batch.add_column(sa.Column("pronouns", sa.String(64), nullable=True))
        batch.add_column(sa.Column("gender", sa.String(64), nullable=True))
        batch.add_column(sa.Column("summary", sa.String(1024), nullable=True))
        batch.add_column(sa.Column(
            "tradition_tags",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ))
        batch.add_column(sa.Column(
            "attributions",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ))
        batch.add_column(sa.Column(
            "seal_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ))
        batch.add_column(sa.Column(
            "portrait_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ))
        batch.add_column(sa.Column(
            "relationship_status",
            postgresql.ENUM(name="entity_relationship_status", create_type=False),
            nullable=False,
            server_default="open",
        ))
        batch.add_column(sa.Column("first_contact_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("last_contact_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("notes_private", sa.Text(), nullable=True))
        batch.add_column(sa.Column("notes_shareable", sa.Text(), nullable=True))
        batch.add_column(sa.Column(
            "visibility",
            postgresql.ENUM(name="entity_visibility", create_type=False),
            nullable=False,
            server_default="personal",
        ))
        batch.add_column(sa.Column("origin", sa.String(256), nullable=True))

    op.create_index("ix_entity_relationship_status", "entity", ["relationship_status"])
    op.create_index("ix_entity_visibility", "entity", ["visibility"])
    op.create_index("ix_entity_last_contact_at", "entity", ["last_contact_at"])

    # entity_alias
    op.create_table(
        "entity_alias",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "source_entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(name="entity_alias_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
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
    op.create_index("ix_entity_alias_source_id", "entity_alias", ["source_entity_id"])
    op.create_index("ix_entity_alias_target_id", "entity_alias", ["target_entity_id"])
    op.create_index("ix_entity_alias_kind", "entity_alias", ["kind"])

    # entity_view
    op.create_table(
        "entity_view",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column(
            "member_entity_ids",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
        sa.Column("description", sa.Text(), nullable=True),
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
    op.create_index("ix_entity_view_owner_id", "entity_view", ["owner_id"])
    op.create_index("ix_entity_view_name", "entity_view", ["name"])


def downgrade() -> None:
    op.drop_index("ix_entity_view_name", table_name="entity_view")
    op.drop_index("ix_entity_view_owner_id", table_name="entity_view")
    op.drop_table("entity_view")

    op.drop_index("ix_entity_alias_kind", table_name="entity_alias")
    op.drop_index("ix_entity_alias_target_id", table_name="entity_alias")
    op.drop_index("ix_entity_alias_source_id", table_name="entity_alias")
    op.drop_table("entity_alias")

    op.drop_index("ix_entity_last_contact_at", table_name="entity")
    op.drop_index("ix_entity_visibility", table_name="entity")
    op.drop_index("ix_entity_relationship_status", table_name="entity")

    with op.batch_alter_table("entity") as batch:
        batch.drop_column("origin")
        batch.drop_column("visibility")
        batch.drop_column("notes_shareable")
        batch.drop_column("notes_private")
        batch.drop_column("last_contact_at")
        batch.drop_column("first_contact_at")
        batch.drop_column("relationship_status")
        batch.drop_column("portrait_upload_id")
        batch.drop_column("seal_upload_id")
        batch.drop_column("attributions")
        batch.drop_column("tradition_tags")
        batch.drop_column("summary")
        batch.drop_column("gender")
        batch.drop_column("pronouns")
        batch.drop_column("epithets")

    op.execute("DROP TYPE IF EXISTS entity_alias_kind")
    op.execute("DROP TYPE IF EXISTS entity_visibility")
    op.execute("DROP TYPE IF EXISTS entity_relationship_status")
    # entity_kind enum values can't be removed (Postgres limitation).
