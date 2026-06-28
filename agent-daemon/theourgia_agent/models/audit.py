"""Per-agent-call audit log.

Every MCP `tools/call` writes a row. Run lifecycle transitions
(start / complete / halt / cost-cap-refuse / cost-cap-halt) also
write rows. The H10 B4 PerUserAuditLog surface reads these.

Rule 49 — honesty by construction: the audit row records what the
daemon DID, not what the agent CLAIMED it did. The filtered_count
field surfaces the number of records the rule 52/53 filter dropped
(content never leaves the daemon; only the count does).
"""

from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia_agent.models.base import IDMixin, TimestampMixin


class AuditEventType(str, enum.Enum):
    """Vocabulary of events the audit log records.

    The strings here are stable across daemon versions — the B4 query
    layer filters by them and the activity-log copy maps from them."""

    # MCP traffic
    MCP_TOOLS_LIST = "mcp.tools_list"
    MCP_TOOLS_CALL = "mcp.tools_call"
    MCP_CAPABILITY_DENIED = "mcp.capability_denied"

    # Run lifecycle
    RUN_STARTED = "run.started"
    RUN_COMPLETED = "run.completed"
    RUN_HALTED = "run.halted"
    RUN_ERRORED = "run.errored"

    # Cost cap
    CAP_REFUSED_AT_WAKE = "cap.refused_at_wake"
    """Run never started — at-wake estimate exceeded remaining cap."""
    CAP_HALTED_AT_SPEND = "cap.halted_at_spend"
    """Run terminated because actual spend exceeded reservation."""


class AuditEvent(IDMixin, TimestampMixin, table=True):
    __tablename__ = "audit_event"

    # Denormalised vault DID so B4 can query without joining install.
    vault_did: str = Field(sa_column=Column(String(255), nullable=False))

    # Optional — set when the event is bound to a run.
    run_id: str | None = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
    )

    # Optional — install row this event belongs to (foreign key by UUID
    # not enforced because the daemon's DB has cascade rules that we
    # don't want to bleed into the audit table — audit lives forever,
    # installs can be deleted).
    install_id: UUID | None = Field(
        default=None,
        sa_column=Column("install_id", nullable=True),
    )

    event_type: AuditEventType = Field(
        sa_column=Column(
            SQLEnum(
                AuditEventType,
                name="audit_event_type",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    # MCP-tool-call specific. NULL for non-mcp events.
    tool_name: str | None = Field(
        default=None, sa_column=Column(String(64), nullable=True),
    )
    arguments_json: dict | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
        description="Sanitised arguments — secrets stripped at emission time.",
    )

    # Was the action allowed? False on capability_denied / cap.refused.
    allowed: bool = Field(default=True, sa_column=Column("allowed", nullable=False))

    # How many records the filter pass dropped. 0 for non-filtering events.
    filtered_count: int = Field(
        default=0, sa_column=Column(Integer, nullable=False, server_default="0"),
    )

    # Optional human/machine-readable detail. For errors: the error string.
    # For cap halts: the verbatim H10 C7 copy. Truncated at 2000 chars.
    detail: str | None = Field(
        default=None, sa_column=Column(String(2000), nullable=True),
    )

    happened_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        description="Server-side timestamp (rule 58 — never trust the subprocess clock).",
    )
