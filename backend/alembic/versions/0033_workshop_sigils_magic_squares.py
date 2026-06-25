"""B103 Phase 07 Workshop foundation: sigil + magic_square tables.

Per ``plan/07-batches-backend.md`` § B103 + the H05 designer handoff.

The seven Agrippa planetary magic squares do NOT live in this
migration — they ship as Python constants
(``theourgia.core.workshop.planetary_squares``) and are served via
the dedicated planetary-squares endpoint. The ``magic_square`` table
holds only **custom user squares**.

Revision ID: 0033
Revises: 0032
Create Date: 2026-06-23
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0033"
down_revision: Union[str, None] = "0032"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_SIGIL_MODES = [
    "spare",
    "kamea",
    "rose_cross",
    "pythagorean",
    "hebrew",
    "greek",
    "hashed",
    "harmonograph",
    "formula",
    "freeform",
    "image",
]
_SIGIL_PURPOSES = [
    "workshop_draft",
    "consecrated",
    "gift",
    "personal_study",
]


def upgrade() -> None:
    # ── Postgres enums ───────────────────────────────────────────────
    op.execute(
        "CREATE TYPE sigil_mode AS ENUM "
        f"({', '.join(repr(s) for s in _SIGIL_MODES)})"
    )
    op.execute(
        "CREATE TYPE sigil_purpose AS ENUM "
        f"({', '.join(repr(s) for s in _SIGIL_PURPOSES)})"
    )

    # ── sigil table ──────────────────────────────────────────────────
    op.create_table(
        "sigil",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("intention", sa.Text(), nullable=False),
        sa.Column(
            "mode",
            postgresql.ENUM(name="sigil_mode", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "parameters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("svg", sa.Text(), nullable=False),
        sa.Column("seed", sa.String(64), nullable=True),
        sa.Column(
            "purpose",
            postgresql.ENUM(name="sigil_purpose", create_type=False),
            nullable=False,
            server_default="workshop_draft",
        ),
        sa.Column("citation", sa.String(480), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "linked_entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "linked_working_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "parent_sigil_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sigil.id", ondelete="SET NULL"),
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
    op.create_index("ix_sigil_owner", "sigil", ["owner_id"])
    op.create_index("ix_sigil_mode", "sigil", ["mode"])
    op.create_index("ix_sigil_parent", "sigil", ["parent_sigil_id"])

    # ── magic_square table ───────────────────────────────────────────
    op.create_table(
        "magic_square",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(240), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column(
            "cells",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("attribution", sa.String(480), nullable=True),
        sa.Column(
            "is_magic",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
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
        # Enforce order range at the DB level too — the API also
        # validates but defence in depth is cheap.
        sa.CheckConstraint(
            '"order" >= 3 AND "order" <= 12',
            name="ck_magic_square_order_range",
        ),
    )
    op.create_index("ix_magic_square_owner", "magic_square", ["owner_id"])
    op.create_index("ix_magic_square_order", "magic_square", ["order"])


def downgrade() -> None:
    op.drop_index("ix_magic_square_order", table_name="magic_square")
    op.drop_index("ix_magic_square_owner", table_name="magic_square")
    op.drop_table("magic_square")

    op.drop_index("ix_sigil_parent", table_name="sigil")
    op.drop_index("ix_sigil_mode", table_name="sigil")
    op.drop_index("ix_sigil_owner", table_name="sigil")
    op.drop_table("sigil")

    op.execute("DROP TYPE sigil_purpose")
    op.execute("DROP TYPE sigil_mode")
