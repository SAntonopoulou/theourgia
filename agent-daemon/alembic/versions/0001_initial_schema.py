"""Agent daemon initial schema · agent_install + agent_run.

Revision ID: 0001
Revises:
Create Date: 2026-06-28
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    install_state = postgresql.ENUM(
        "inactive", "active", "paused", "cost_capped",
        name="agent_install_state",
        create_type=False,
    )
    install_state.create(op.get_bind(), checkfirst=True)

    run_outcome = postgresql.ENUM(
        "running", "completed", "halted", "errored",
        name="agent_run_outcome",
        create_type=False,
    )
    run_outcome.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "agent_install",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("vault_id", sa.String(64), nullable=False),
        sa.Column("agent_id", sa.String(64), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("state", install_state, nullable=False),
        sa.Column("api_key_record_id", sa.LargeBinary, nullable=True),
        sa.Column("api_key_nonce", sa.LargeBinary, nullable=True),
        sa.Column("api_key_ciphertext", sa.LargeBinary, nullable=True),
        sa.Column("monthly_cost_cap_usd", sa.Numeric(10, 2), nullable=False),
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
        sa.UniqueConstraint(
            "vault_id", "agent_id", name="uq_agent_install_vault_agent",
        ),
    )

    op.create_table(
        "agent_run",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "install_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agent_install.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("task_text", sa.String(8000), nullable=False),
        sa.Column("scope_id", sa.String(64), nullable=False),
        sa.Column("reserved_usd", sa.Numeric(10, 4), nullable=False),
        sa.Column(
            "cost_usd",
            sa.Numeric(10, 4),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "tokens_in",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "tokens_out",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "tokens_cache",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "tokens_fresh",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "tokens_resume",
            sa.Integer,
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("outcome", run_outcome, nullable=False),
        sa.Column("summary", sa.String(2000), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
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
        "ix_agent_run_install", "agent_run", ["install_id"],
    )
    op.create_index(
        "ix_agent_run_started_at", "agent_run", ["started_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_agent_run_started_at", table_name="agent_run")
    op.drop_index("ix_agent_run_install", table_name="agent_run")
    op.drop_table("agent_run")
    op.drop_table("agent_install")
    op.execute("DROP TYPE IF EXISTS agent_run_outcome")
    op.execute("DROP TYPE IF EXISTS agent_install_state")
