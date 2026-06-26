"""B128 Phase 10 Publishing: subscription_tier + subscriber tables.

Per ``plan/10-batches-backend.md`` § B128.

Revision ID: 0050
Revises: 0049
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0050"
down_revision: Union[str, None] = "0049"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SUB_STATUSES = (
    "pending_confirmation", "active", "failed_payment", "unsubscribed",
)


def upgrade() -> None:
    status_enum = postgresql.ENUM(
        *SUB_STATUSES, name="subscriber_status", create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "subscription_tier",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("monthly_amount_cents", sa.Integer(), nullable=False),
        sa.Column(
            "currency", sa.String(8), nullable=False, server_default="usd",
        ),
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "is_primary",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("stripe_price_id", sa.String(64), nullable=True),
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
            "monthly_amount_cents >= 0",
            name="ck_subscription_tier_amount_nonneg",
        ),
    )
    op.create_index(
        "ix_subscription_tier_owner", "subscription_tier", ["owner_id"],
    )

    op.create_table(
        "subscriber",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(480), nullable=False),
        sa.Column(
            "tier_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subscription_tier.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                *SUB_STATUSES,
                name="subscriber_status",
                create_type=False,
            ),
            nullable=False,
            server_default="pending_confirmation",
        ),
        sa.Column("confirmation_token", sa.String(128), nullable=False),
        sa.Column(
            "confirmed_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column("unsubscribe_token", sa.String(128), nullable=False),
        sa.Column(
            "unsubscribed_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column(
            "stripe_subscription_id",
            sa.String(64),
            nullable=True,
            unique=True,
        ),
        sa.Column(
            "last_failed_payment_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "last_confirmation_sent_at",
            sa.DateTime(timezone=True),
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
        sa.UniqueConstraint(
            "owner_id", "email", name="uq_subscriber_owner_email",
        ),
    )
    op.create_index("ix_subscriber_owner", "subscriber", ["owner_id"])
    op.create_index(
        "ix_subscriber_confirmation_token",
        "subscriber",
        ["confirmation_token"],
        unique=True,
    )
    op.create_index(
        "ix_subscriber_unsubscribe_token",
        "subscriber",
        ["unsubscribe_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_subscriber_unsubscribe_token", table_name="subscriber",
    )
    op.drop_index(
        "ix_subscriber_confirmation_token", table_name="subscriber",
    )
    op.drop_index("ix_subscriber_owner", table_name="subscriber")
    op.drop_table("subscriber")
    op.drop_index(
        "ix_subscription_tier_owner", table_name="subscription_tier",
    )
    op.drop_table("subscription_tier")
    postgresql.ENUM(name="subscriber_status").drop(
        op.get_bind(), checkfirst=True,
    )
