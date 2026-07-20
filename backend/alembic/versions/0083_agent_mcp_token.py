"""agent_mcp_token table — vault-side MCP bearer tokens.

v1-031 · Phase 16 close-out.

One row per token the vault mints for an agent run. The agent daemon
presents the plaintext as ``Authorization: Bearer`` on
``POST /api/v1/mcp``; the vault stores only the SHA-256 hex hash.
A dedicated table (not ``session``) keeps the credential scoped: a
leaked MCP token resolves nowhere except the read-only MCP endpoint.

Revision ID: 0083
Revises: 0082
Create Date: 2026-07-20
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0083"
down_revision: Union[str, None] = "0082"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_mcp_token",
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
        sa.Column(
            "user_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("install_id", sa.String(length=64), nullable=False),
        sa.Column(
            "token_hash", sa.String(length=64), nullable=False, unique=True
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_agent_mcp_token_user_id", "agent_mcp_token", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_agent_mcp_token_user_id", table_name="agent_mcp_token")
    op.drop_table("agent_mcp_token")
