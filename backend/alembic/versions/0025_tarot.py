"""Phase 06 Tarot: deck, card, spread, tarot_reading.

Revision ID: 0025
Revises: 0024
Create Date: 2026-06-21
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TRADITIONS = [
    "marseille", "rider_waite", "thoth", "etteilla",
    "sola_busca", "oracle", "custom", "other",
]
_SUITS = ["major", "wands", "cups", "swords", "pentacles"]
_SPREAD_KINDS = [
    "single", "three_card", "horseshoe", "celtic_cross",
    "tree_of_life", "year_ahead", "relationship", "custom",
]
_DRAW_METHODS = ["browser_rng", "physical", "hash_of_question", "mental"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE deck_tradition AS ENUM "
        f"({', '.join(repr(s) for s in _TRADITIONS)})"
    )
    op.execute(
        f"CREATE TYPE card_suit AS ENUM "
        f"({', '.join(repr(s) for s in _SUITS)})"
    )
    op.execute(
        f"CREATE TYPE spread_kind AS ENUM "
        f"({', '.join(repr(s) for s in _SPREAD_KINDS)})"
    )
    op.execute(
        f"CREATE TYPE tarot_draw_method AS ENUM "
        f"({', '.join(repr(s) for s in _DRAW_METHODS)})"
    )

    # ── deck ────────────────────────────────────────────────────────
    op.create_table(
        "deck",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("creator", sa.String(256), nullable=True),
        sa.Column("license", sa.String(128), nullable=True),
        sa.Column("language", sa.String(16), nullable=False, server_default="en"),
        sa.Column(
            "tradition",
            postgresql.ENUM(name="deck_tradition", create_type=False),
            nullable=False,
            server_default="other",
        ),
        sa.Column(
            "reversal_convention",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column("art_set", sa.String(64), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_builtin", sa.Boolean(), nullable=False, server_default="false"),
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
    op.create_index("ix_deck_owner_id", "deck", ["owner_id"])
    op.create_index("ix_deck_tradition", "deck", ["tradition"])
    op.create_index("ix_deck_is_builtin", "deck", ["is_builtin"])
    op.create_index("ix_deck_slug", "deck", ["slug"], unique=False)

    # ── card ────────────────────────────────────────────────────────
    op.create_table(
        "card",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "deck_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("deck.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column(
            "suit",
            postgresql.ENUM(name="card_suit", create_type=False),
            nullable=False,
            server_default="major",
        ),
        sa.Column("arcana_number", sa.Integer(), nullable=True),
        sa.Column("upright_meaning", sa.Text(), nullable=True),
        sa.Column("reversed_meaning", sa.Text(), nullable=True),
        sa.Column(
            "correspondences",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "name_translations",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "image_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
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
        sa.UniqueConstraint("deck_id", "position", name="uq_card_deck_position"),
    )
    op.create_index("ix_card_deck_id", "card", ["deck_id"])
    op.create_index("ix_card_position", "card", ["deck_id", "position"])

    # ── spread ──────────────────────────────────────────────────────
    op.create_table(
        "spread",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(name="spread_kind", create_type=False),
            nullable=False,
            server_default="custom",
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("positions", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("layout_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("is_builtin", sa.Boolean(), nullable=False, server_default="false"),
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
    op.create_index("ix_spread_owner_id", "spread", ["owner_id"])
    op.create_index("ix_spread_kind", "spread", ["kind"])
    op.create_index("ix_spread_is_builtin", "spread", ["is_builtin"])
    op.create_index("ix_spread_slug", "spread", ["slug"])

    # ── tarot_reading ───────────────────────────────────────────────
    op.create_table(
        "tarot_reading",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "deck_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("deck.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "spread_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("spread.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column("querent", sa.String(64), nullable=False, server_default="self"),
        sa.Column(
            "draw_method",
            postgresql.ENUM(name="tarot_draw_method", create_type=False),
            nullable=False,
            server_default="browser_rng",
        ),
        sa.Column("seed", sa.String(256), nullable=False),
        sa.Column("drawn_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("drawn_cards", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("overall_interpretation", sa.Text(), nullable=True),
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
            "working_id",
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
    op.create_index("ix_tarot_reading_owner_id", "tarot_reading", ["owner_id"])
    op.create_index("ix_tarot_reading_drawn_at", "tarot_reading", ["drawn_at"])
    op.create_index("ix_tarot_reading_entity_id", "tarot_reading", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_tarot_reading_entity_id", table_name="tarot_reading")
    op.drop_index("ix_tarot_reading_drawn_at", table_name="tarot_reading")
    op.drop_index("ix_tarot_reading_owner_id", table_name="tarot_reading")
    op.drop_table("tarot_reading")

    op.drop_index("ix_spread_slug", table_name="spread")
    op.drop_index("ix_spread_is_builtin", table_name="spread")
    op.drop_index("ix_spread_kind", table_name="spread")
    op.drop_index("ix_spread_owner_id", table_name="spread")
    op.drop_table("spread")

    op.drop_index("ix_card_position", table_name="card")
    op.drop_index("ix_card_deck_id", table_name="card")
    op.drop_table("card")

    op.drop_index("ix_deck_slug", table_name="deck")
    op.drop_index("ix_deck_is_builtin", table_name="deck")
    op.drop_index("ix_deck_tradition", table_name="deck")
    op.drop_index("ix_deck_owner_id", table_name="deck")
    op.drop_table("deck")

    op.execute("DROP TYPE tarot_draw_method")
    op.execute("DROP TYPE spread_kind")
    op.execute("DROP TYPE card_suit")
    op.execute("DROP TYPE deck_tradition")
