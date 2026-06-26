"""B127 Phase 10 Publishing: stripe_connect_account + purchase tables.

Per ``plan/10-batches-backend.md`` § B127.

Revision ID: 0049
Revises: 0048
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0049"
down_revision: Union[str, None] = "0048"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


ONBOARDING_STATUSES = (
    "pending", "active", "restricted", "rejected", "disconnected",
)


def upgrade() -> None:
    status_enum = postgresql.ENUM(
        *ONBOARDING_STATUSES,
        name="stripe_onboarding_status",
        create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "stripe_connect_account",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "stripe_account_id", sa.String(64), nullable=True, unique=True,
        ),
        sa.Column(
            "onboarding_status",
            postgresql.ENUM(
                *ONBOARDING_STATUSES,
                name="stripe_onboarding_status",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "payouts_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "charges_enabled",
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
    )
    op.create_index(
        "ix_stripe_account_owner",
        "stripe_connect_account",
        ["owner_id"],
        unique=True,
    )

    op.create_table(
        "purchase",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "publication_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("publication.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("buyer_email", sa.String(480), nullable=False),
        sa.Column(
            "buyer_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "stripe_payment_intent_id", sa.String(64), nullable=False,
        ),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column(
            "currency", sa.String(8), nullable=False, server_default="usd",
        ),
        sa.Column(
            "paid_at", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.Column(
            "refunded_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column("refund_reason", sa.Text(), nullable=True),
        sa.Column("download_token", sa.String(128), nullable=False),
        sa.Column(
            "download_token_expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "download_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "download_count_limit",
            sa.Integer(),
            nullable=False,
            server_default="5",
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
        sa.CheckConstraint(
            "amount_cents >= 0", name="ck_purchase_amount_nonneg",
        ),
        sa.CheckConstraint(
            "download_count >= 0", name="ck_purchase_dl_count_nonneg",
        ),
        sa.CheckConstraint(
            "download_count_limit >= 1", name="ck_purchase_dl_limit_pos",
        ),
    )
    op.create_index("ix_purchase_publication", "purchase", ["publication_id"])
    op.create_index("ix_purchase_buyer_email", "purchase", ["buyer_email"])
    op.create_index(
        "ix_purchase_download_token", "purchase", ["download_token"],
        unique=True,
    )
    op.create_index(
        "ix_purchase_stripe_pi",
        "purchase",
        ["stripe_payment_intent_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_purchase_stripe_pi", table_name="purchase")
    op.drop_index("ix_purchase_download_token", table_name="purchase")
    op.drop_index("ix_purchase_buyer_email", table_name="purchase")
    op.drop_index("ix_purchase_publication", table_name="purchase")
    op.drop_table("purchase")
    op.drop_index(
        "ix_stripe_account_owner", table_name="stripe_connect_account",
    )
    op.drop_table("stripe_connect_account")
    postgresql.ENUM(name="stripe_onboarding_status").drop(
        op.get_bind(), checkfirst=True,
    )
