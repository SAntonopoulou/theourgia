"""Cross-instance group rituals + hub DP aggregate opt-in.

v1-033 · Tier 2 #15 (group ritual + egregore flow) + Tier 3 #20
(cross-vault DP aggregates). Per
``docs/developer/federation-protocol.md`` §4.7/§4.8.

Changes:

- ``federation_activity_kind`` gains the ``ritual.schedule`` +
  ``ritual.update`` wire keys (ALTER TYPE inside an autocommit block —
  the 0072 gotcha).
- ``group_ritual`` gains ``egregore_name`` (the egregore creation
  declaration), ``origin_did`` + ``origin_ritual_id`` (mirror rows for
  rituals organized on another instance; unique partial index on the
  origin id), and ``organizer_id`` becomes nullable (a mirror has no
  local organizer).
- ``group_ritual_fragment`` / ``group_ritual_reflection`` gain
  ``author_did`` and their ``author_id`` becomes nullable — remote
  authors are vault DIDs, never local user rows.
- New ``group_ritual_remote_participant`` — the cross-instance roster.
- New ``hub_aggregate_optin`` — per-member consent for hub-scoped
  differential-privacy aggregates. No row, no data in any aggregate.

Revision ID: 0085
Revises: 0084
Create Date: 2026-07-20
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0085"
down_revision: Union[str, None] = "0084"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New federation wire keys. ALTER TYPE ADD VALUE cannot run inside
    # a transaction block — autocommit per the 0072_family_tree gotcha.
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE federation_activity_kind "
            "ADD VALUE IF NOT EXISTS 'ritual.schedule'"
        )
        op.execute(
            "ALTER TYPE federation_activity_kind "
            "ADD VALUE IF NOT EXISTS 'ritual.update'"
        )

    # ── group_ritual: egregore declaration + mirror columns ────────
    op.add_column(
        "group_ritual",
        sa.Column("egregore_name", sa.String(256), nullable=True),
    )
    op.add_column(
        "group_ritual",
        sa.Column("origin_did", sa.String(255), nullable=True),
    )
    op.add_column(
        "group_ritual",
        sa.Column(
            "origin_ritual_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ux_group_ritual_origin_ritual",
        "group_ritual",
        ["origin_ritual_id"],
        unique=True,
        postgresql_where=sa.text("origin_ritual_id IS NOT NULL"),
    )
    op.alter_column(
        "group_ritual",
        "organizer_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    # ── remote fragment / reflection authors ───────────────────────
    op.add_column(
        "group_ritual_fragment",
        sa.Column("author_did", sa.String(255), nullable=True),
    )
    op.alter_column(
        "group_ritual_fragment",
        "author_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.add_column(
        "group_ritual_reflection",
        sa.Column("author_did", sa.String(255), nullable=True),
    )
    op.alter_column(
        "group_ritual_reflection",
        "author_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    # ── cross-instance roster ──────────────────────────────────────
    op.create_table(
        "group_ritual_remote_participant",
        sa.Column(
            "ritual_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("group_ritual.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("did", sa.String(255), nullable=False),
        sa.Column("role_in_ritual", sa.String(120), nullable=True),
        sa.Column(
            "invited_at", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.PrimaryKeyConstraint(
            "ritual_id", "did",
            name="pk_group_ritual_remote_participant",
        ),
    )

    # ── hub aggregate consent (Tier 3 #20) ─────────────────────────
    op.create_table(
        "hub_aggregate_optin",
        sa.Column(
            "hub_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hub.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "opted_in_at", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.PrimaryKeyConstraint(
            "hub_id", "user_id", name="pk_hub_aggregate_optin",
        ),
    )
    op.create_index(
        "ix_hub_aggregate_optin_user",
        "hub_aggregate_optin",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_hub_aggregate_optin_user", table_name="hub_aggregate_optin",
    )
    op.drop_table("hub_aggregate_optin")
    op.drop_table("group_ritual_remote_participant")

    # Remote-authored rows (author_id NULL) cannot survive the NOT
    # NULL restore — delete them first so the downgrade is replayable.
    op.execute(
        "DELETE FROM group_ritual_reflection WHERE author_id IS NULL"
    )
    op.alter_column(
        "group_ritual_reflection",
        "author_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_column("group_ritual_reflection", "author_did")
    op.execute(
        "DELETE FROM group_ritual_fragment WHERE author_id IS NULL"
    )
    op.alter_column(
        "group_ritual_fragment",
        "author_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_column("group_ritual_fragment", "author_did")

    # Mirror rows (organizer_id NULL) likewise.
    op.execute("DELETE FROM group_ritual WHERE organizer_id IS NULL")
    op.alter_column(
        "group_ritual",
        "organizer_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_index(
        "ux_group_ritual_origin_ritual", table_name="group_ritual",
    )
    op.drop_column("group_ritual", "origin_ritual_id")
    op.drop_column("group_ritual", "origin_did")
    op.drop_column("group_ritual", "egregore_name")

    # Postgres cannot remove enum values; the extra wire keys are
    # harmless on downgrade (rows using them are inbox audit rows).
