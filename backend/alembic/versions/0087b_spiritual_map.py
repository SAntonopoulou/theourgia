"""spiritual maps — the correspondence charts, from the phone

Sophia, 15 August 2026: *"we need to add the correspondances charts to the web
app … the mobile application being the source of truth."*

One table. The model is the PHONE's, almost verbatim — see
`theourgia/models/spiritual_map.py` for why a map is stored whole rather than
shredded into rows: a correspondence attaches to whatever *carries* it, and a
relational decomposition would have to be migrated every time the phone learns
a new carrier.

⚠ **Numbered 0087b for the same reason 0087a was.** Production runs 0087a and
`0088_talisman_lifecycle_scrying_protocol` is still uncommitted and unapplied,
so this parents on 0087a and 0088 keeps its place after both. The chain is
0087 → 0087a → 0087b → 0088.

Revision ID: 0087b
Revises: 0087a
Create Date: 2026-08-15
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0087b"
down_revision: Union[str, None] = "0087a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "spiritual_map",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("tradition", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        # The map itself: nodes, edges, lines, shapes, groups, ascent, words.
        sa.Column("document", postgresql.JSONB(), nullable=False),
        sa.Column("node_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "correspondence_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("source_slug", sa.String(length=128), nullable=False, server_default=""),
        # ⚠ Reimporting the same pack UPDATES rather than accumulates. A
        # practitioner who reinstalls their order's calendar should not end up
        # holding two Tetraktyses.
        sa.UniqueConstraint("owner_id", "slug", name="uq_spiritual_map_owner_slug"),
    )
    op.create_index("ix_spiritual_map_owner", "spiritual_map", ["owner_id", "deleted_at"])
    op.create_index("ix_spiritual_map_tradition", "spiritual_map", ["tradition"])


def downgrade() -> None:
    op.drop_index("ix_spiritual_map_tradition", table_name="spiritual_map")
    op.drop_index("ix_spiritual_map_owner", table_name="spiritual_map")
    op.drop_table("spiritual_map")
