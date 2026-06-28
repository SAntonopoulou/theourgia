"""Phase 12.5 federation outbound queue: federation_delivery table.

Stores pending outbound deliveries for the retry-with-backoff worker.

Revision ID: 0065
Revises: 0064
Create Date: 2026-06-28
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0065"
down_revision: Union[str, None] = "0064"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    delivery_status = postgresql.ENUM(
        "pending", "delivered", "dead",
        name="federation_delivery_status",
        create_type=False,
    )
    delivery_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "federation_delivery",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("recipient_did", sa.String(255), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("body_json", postgresql.JSONB, nullable=False),
        sa.Column(
            "status",
            delivery_status,
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "attempt_count",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "max_attempts",
            sa.Integer,
            nullable=False,
            server_default="6",
        ),
        sa.Column(
            "next_attempt_at", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.Column("last_error", sa.String(1000), nullable=True),
        sa.Column(
            "delivered_at", sa.DateTime(timezone=True), nullable=True,
        ),
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
    )

    op.create_index(
        "ix_federation_delivery_pending_next_attempt",
        "federation_delivery",
        ["status", "next_attempt_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_federation_delivery_pending_next_attempt",
        table_name="federation_delivery",
    )
    op.drop_table("federation_delivery")
    op.execute("DROP TYPE IF EXISTS federation_delivery_status")
