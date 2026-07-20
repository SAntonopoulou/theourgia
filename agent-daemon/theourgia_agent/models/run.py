"""Agent runs + per-run cost rollup.

Each agent wake produces an `AgentRun` row. The cost + token
breakdown is filled in as the run executes. Aggregates by month land
in `AgentRunSummary` (read by the cap evaluator on the next wake).
"""

from __future__ import annotations

import enum
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia_agent.models.base import IDMixin, TimestampMixin


class RunOutcome(str, enum.Enum):
    """Matches the H10 C11 activity-log vocabulary."""

    RUNNING = "running"
    COMPLETED = "completed"
    HALTED = "halted"
    ERRORED = "errored"


class AgentRun(IDMixin, TimestampMixin, table=True):
    __tablename__ = "agent_run"

    install_id: UUID = Field(
        sa_column=Column(
            ForeignKey("agent_install.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )

    # The control-plane run id (the key in POST/GET/DELETE /runs/{id}
    # and in audit rows). Distinct from the row's own UUID so the wire
    # id stays whatever the launcher issued. NOT unique — the control
    # plane reuses the install id as run id, so successive wakes share
    # a run_key; keyed lookups resolve to the latest row. Nullable
    # only for rows written before alembic 0003.
    run_key: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
    )

    # The user's task description (rule 51 — magician initiates).
    task_text: str = Field(sa_column=Column(String(8000), nullable=False))

    # Scope chosen for this run (subset of granted scope).
    scope_id: str = Field(sa_column=Column(String(64), nullable=False))

    # Cap reservation at wake-time (refunded on completion if unused).
    reserved_usd: Decimal = Field(
        sa_column=Column(Numeric(10, 4), nullable=False),
    )

    # Actuals — filled in as the run completes.
    cost_usd: Decimal = Field(
        default=Decimal("0"),
        sa_column=Column(Numeric(10, 4), nullable=False),
    )
    tokens_in: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    tokens_out: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    tokens_cache: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    # Rule 58 — fresh vs resume split is load-bearing.
    tokens_fresh: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    tokens_resume: int = Field(default=0, sa_column=Column(Integer, nullable=False))

    outcome: RunOutcome = Field(
        sa_column=Column(
            SQLEnum(
                RunOutcome,
                name="agent_run_outcome",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    # Human-readable summary for the H10 C11 activity log (rule 55 —
    # generated server-side from MCP call patterns; never the model's
    # own summary).
    summary: str | None = Field(
        default=None, sa_column=Column(String(2000), nullable=True),
    )

    started_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    ended_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
