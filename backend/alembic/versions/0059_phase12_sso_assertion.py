"""B141 Phase 12 SSO assertion table.

Per ``plan/12-batches-backend.md`` § B141.

Revision ID: 0059
Revises: 0058
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0059"
down_revision: Union[str, None] = "0058"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sso_assertion",
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
            "issuer_user_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("target_did", sa.String(255), nullable=False),
        sa.Column(
            "scope_payload", postgresql.JSONB(),
            nullable=False, server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "expires_at_utc", sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "revoked_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column(
            "signature_b64", sa.String(255), nullable=True,
        ),
    )
    op.create_index(
        "ix_sso_assertion_issuer", "sso_assertion", ["issuer_user_id"],
    )
    op.create_index(
        "ix_sso_assertion_issuer_expires",
        "sso_assertion",
        ["issuer_user_id", "expires_at_utc"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_sso_assertion_issuer_expires", table_name="sso_assertion",
    )
    op.drop_index("ix_sso_assertion_issuer", table_name="sso_assertion")
    op.drop_table("sso_assertion")
