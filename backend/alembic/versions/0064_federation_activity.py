"""Phase 12.5 federation inbox: federation_activity table.

Stores inbound signed activities verbatim — exactly the bytes that were
HTTP-signature-verified, with the sender DID and processing status.
Per-sender + per-status indexes back the dominant query patterns
(operator audit, retention sweep).

Revision ID: 0064
Revises: 0063
Create Date: 2026-06-28
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0064"
down_revision: Union[str, None] = "0063"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    activity_kind = postgresql.ENUM(
        "hub.invite",
        "hub.accept",
        "hub.decline",
        "hub.leave",
        "hub.post",
        "hub.update",
        "hub.delete",
        "follow.request",
        "follow.accept",
        "follow.decline",
        "follow.undo",
        "note.create",
        "note.update",
        "note.delete",
        "lineage.attest",
        "lineage.countersign",
        "unknown",
        name="federation_activity_kind",
        create_type=False,
    )
    activity_kind.create(op.get_bind(), checkfirst=True)

    activity_status = postgresql.ENUM(
        "pending",
        "processed",
        "errored",
        "skipped",
        name="federation_activity_status",
        create_type=False,
    )
    activity_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "federation_activity",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("sender_did", sa.String(255), nullable=False),
        sa.Column("kind", activity_kind, nullable=False),
        sa.Column("body_json", postgresql.JSONB, nullable=False),
        sa.Column(
            "received_at", sa.DateTime(timezone=True), nullable=False,
        ),
        sa.Column(
            "status",
            activity_status,
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "processed_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column("error_detail", sa.String(2000), nullable=True),
        sa.Column("target_hub_id", sa.String(64), nullable=True),
        sa.Column("target_user_id", sa.String(64), nullable=True),
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
        "ix_federation_activity_sender_received",
        "federation_activity",
        ["sender_did", "received_at"],
    )
    op.create_index(
        "ix_federation_activity_status",
        "federation_activity",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_federation_activity_status", table_name="federation_activity",
    )
    op.drop_index(
        "ix_federation_activity_sender_received",
        table_name="federation_activity",
    )
    op.drop_table("federation_activity")
    op.execute("DROP TYPE IF EXISTS federation_activity_status")
    op.execute("DROP TYPE IF EXISTS federation_activity_kind")
