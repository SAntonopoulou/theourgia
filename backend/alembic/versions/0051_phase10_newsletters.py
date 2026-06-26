"""B129 Phase 10 Publishing: newsletter_issue table.

Per ``plan/10-batches-backend.md`` § B129.

Revision ID: 0051
Revises: 0050
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0051"
down_revision: Union[str, None] = "0050"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


STATUSES = ("draft", "scheduled", "sending", "sent", "cancelled")


def upgrade() -> None:
    status_enum = postgresql.ENUM(
        *STATUSES, name="newsletter_issue_status", create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "newsletter_issue",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("subject", sa.String(240), nullable=False),
        sa.Column("preview_text", sa.String(480), nullable=True),
        sa.Column(
            "body",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                *STATUSES,
                name="newsletter_issue_status",
                create_type=False,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "targeted_tier_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("reply_to", sa.String(480), nullable=True),
        sa.Column(
            "scheduled_send_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "recipient_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "delivered_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "bounced_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
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
        sa.CheckConstraint(
            "recipient_count >= 0", name="ck_newsletter_recipients_nonneg",
        ),
        sa.CheckConstraint(
            "delivered_count >= 0", name="ck_newsletter_delivered_nonneg",
        ),
        sa.CheckConstraint(
            "bounced_count >= 0", name="ck_newsletter_bounced_nonneg",
        ),
    )
    op.create_index(
        "ix_newsletter_issue_owner",
        "newsletter_issue",
        ["owner_id"],
    )
    op.create_index(
        "ix_newsletter_issue_owner_status",
        "newsletter_issue",
        ["owner_id", "status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_newsletter_issue_owner_status",
        table_name="newsletter_issue",
    )
    op.drop_index(
        "ix_newsletter_issue_owner",
        table_name="newsletter_issue",
    )
    op.drop_table("newsletter_issue")
    postgresql.ENUM(name="newsletter_issue_status").drop(
        op.get_bind(), checkfirst=True,
    )
