"""agent_run.run_key — control-plane run id on the persisted row.

v1-031: the runs control plane now writes through to agent_run rows
(replacing the in-memory reservation map), keyed by the wire run id.
The column is nullable so pre-0003 rows stay valid; new rows always
carry it.

NOT unique: the control plane reuses the install id as the run id
(one live run per install), so successive wakes of the same agent
share a run_key. Keyed lookups resolve to the LATEST row (started_at
DESC) — the same "latest run wins" semantic as the in-memory
RunRegistry — while history keeps one row per run for the cost
summary. Indexed with started_at for that access pattern.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-20
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "agent_run",
        sa.Column("run_key", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_agent_run_run_key_started",
        "agent_run",
        ["run_key", sa.text("started_at DESC")],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_agent_run_run_key_started", table_name="agent_run",
    )
    op.drop_column("agent_run", "run_key")
