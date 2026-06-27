"""Phase 13 ActivityPub adapter stub: 3 tables.

Per ``plan/13-activitypub.md``.

Revision ID: 0060
Revises: 0059
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0060"
down_revision: Union[str, None] = "0059"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    approval = postgresql.ENUM(
        "manual", "auto",
        name="ap_follower_approval",
        create_type=False,
    )
    approval.create(op.get_bind(), checkfirst=True)

    state = postgresql.ENUM(
        "pending", "accepted", "rejected",
        name="ap_follow_request_state",
        create_type=False,
    )
    state.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "activitypub_settings",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True),
            primary_key=True, nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "owner_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "enabled", sa.Boolean(),
            nullable=False, server_default=sa.false(),
        ),
        sa.Column(
            "display_name_override", sa.String(255), nullable=True,
        ),
        sa.Column("bio_override", sa.String(2000), nullable=True),
        sa.Column(
            "follower_approval", approval,
            nullable=False, server_default="manual",
        ),
        sa.Column(
            "broadcast_creates", sa.Boolean(),
            nullable=False, server_default=sa.true(),
        ),
        sa.Column(
            "broadcast_updates", sa.Boolean(),
            nullable=False, server_default=sa.true(),
        ),
        sa.Column(
            "broadcast_deletes", sa.Boolean(),
            nullable=False, server_default=sa.false(),
        ),
        sa.Column(
            "object_type_mapping", postgresql.JSONB(),
            nullable=False, server_default=sa.text("'{}'::jsonb"),
        ),
        sa.UniqueConstraint("owner_id", name="uq_aps_owner"),
    )

    op.create_table(
        "activitypub_follower",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True),
            primary_key=True, nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "owner_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("follower_did", sa.String(500), nullable=False),
        sa.Column("follower_handle", sa.String(320), nullable=True),
        sa.Column("follower_inbox_url", sa.String(500), nullable=True),
        sa.Column(
            "last_delivery_at", sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "owner_id", "follower_did",
            name="uq_ap_follower_owner_did",
        ),
    )
    op.create_index(
        "ix_ap_follower_owner", "activitypub_follower", ["owner_id"],
    )

    op.create_table(
        "activitypub_follow_request",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True),
            primary_key=True, nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "owner_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("follower_did", sa.String(500), nullable=False),
        sa.Column("follower_handle", sa.String(320), nullable=True),
        sa.Column(
            "state", state,
            nullable=False, server_default="pending",
        ),
        sa.Column(
            "resolved_at", sa.DateTime(timezone=True), nullable=True,
        ),
    )
    op.create_index(
        "ix_ap_follow_request_owner",
        "activitypub_follow_request",
        ["owner_id"],
    )
    op.create_index(
        "ix_ap_follow_request_owner_state",
        "activitypub_follow_request",
        ["owner_id", "state"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ap_follow_request_owner_state",
        table_name="activitypub_follow_request",
    )
    op.drop_index(
        "ix_ap_follow_request_owner",
        table_name="activitypub_follow_request",
    )
    op.drop_table("activitypub_follow_request")

    op.drop_index(
        "ix_ap_follower_owner", table_name="activitypub_follower",
    )
    op.drop_table("activitypub_follower")

    op.drop_table("activitypub_settings")
    sa.Enum(name="ap_follow_request_state").drop(
        op.get_bind(), checkfirst=True,
    )
    sa.Enum(name="ap_follower_approval").drop(
        op.get_bind(), checkfirst=True,
    )
