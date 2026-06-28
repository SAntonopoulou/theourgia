"""Audit event table for H10 B4 PerUserAuditLog.

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-28
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    audit_event_type = postgresql.ENUM(
        "mcp.tools_list",
        "mcp.tools_call",
        "mcp.capability_denied",
        "run.started",
        "run.completed",
        "run.halted",
        "run.errored",
        "cap.refused_at_wake",
        "cap.halted_at_spend",
        name="audit_event_type",
        create_type=False,
    )
    audit_event_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "audit_event",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("vault_did", sa.String(255), nullable=False),
        sa.Column("run_id", sa.String(64), nullable=True),
        sa.Column(
            "install_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("event_type", audit_event_type, nullable=False),
        sa.Column("tool_name", sa.String(64), nullable=True),
        sa.Column("arguments_json", postgresql.JSONB, nullable=True),
        sa.Column(
            "allowed",
            sa.Boolean,
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "filtered_count",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("detail", sa.String(2000), nullable=True),
        sa.Column(
            "happened_at", sa.DateTime(timezone=True), nullable=False,
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

    # B4 query layer reads by (vault_did, happened_at DESC) — that's
    # the dominant index pattern. Secondary by (vault_did, event_type)
    # for the filter chip.
    op.create_index(
        "ix_audit_event_vault_happened",
        "audit_event",
        ["vault_did", sa.text("happened_at DESC")],
    )
    op.create_index(
        "ix_audit_event_vault_event_type",
        "audit_event",
        ["vault_did", "event_type"],
    )
    op.create_index(
        "ix_audit_event_run", "audit_event", ["run_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_event_run", table_name="audit_event")
    op.drop_index(
        "ix_audit_event_vault_event_type", table_name="audit_event",
    )
    op.drop_index(
        "ix_audit_event_vault_happened", table_name="audit_event",
    )
    op.drop_table("audit_event")
    op.execute("DROP TYPE IF EXISTS audit_event_type")
