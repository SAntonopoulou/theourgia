"""Federation peer directory: federation_peer table.

v1-026 · Phase 12.5/13 completion. Backs /api/v1/federation/peers and
the Network Browser surface. ``status`` is a plain string (handshake
vocabulary: successful / pending / refused / blocked) — deliberately
NOT a DB enum so new states never need a migration.

Revision ID: 0080
Revises: 0079
Create Date: 2026-07-20
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0080"
down_revision: Union[str, None] = "0079"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "federation_peer",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("instance_did", sa.String(255), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column(
            "status",
            sa.String(32),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("capability_token", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("base_url", name="uq_federation_peer_base_url"),
    )


def downgrade() -> None:
    op.drop_table("federation_peer")
