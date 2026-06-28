"""Agent installations + their BYO key envelopes + capability grants.

One row per (vault_id, agent_id) the magician has installed via the
H10 C3 surface. The plaintext API key NEVER appears in the database —
only the Mode-B-encrypted blob (`api_key_record_id` + `api_key_nonce`
+ `api_key_ciphertext`).

Memory directory is on disk at `/srv/theourgia/agents/<vault>/<agent>/`
(rule 59). The path is constructed at runtime from the row's
`vault_id` + `agent_id`; we don't persist it because operators may
remount the root.
"""

from __future__ import annotations

import enum
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Column, Numeric, String, UniqueConstraint
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia_agent.models.base import IDMixin, TimestampMixin


class AgentInstallState(str, enum.Enum):
    """Lifecycle state.

    - `inactive` — installed but no key configured yet (Mode B).
    - `active` — key configured + agent ready to wake.
    - `paused` — user disabled but memory preserved.
    - `cost_capped` — at-cap; refuses to wake (rule 56).
    """

    INACTIVE = "inactive"
    ACTIVE = "active"
    PAUSED = "paused"
    COST_CAPPED = "cost_capped"


class AgentInstall(IDMixin, TimestampMixin, table=True):
    __tablename__ = "agent_install"
    __table_args__ = (
        UniqueConstraint(
            "vault_id", "agent_id", name="uq_agent_install_vault_agent",
        ),
    )

    # The vault + agent identifiers. We don't FK to vault.id because
    # the daemon's DB is separate from the main app's DB; we trust the
    # vault to keep its IDs stable.
    vault_id: str = Field(sa_column=Column(String(64), nullable=False))
    agent_id: str = Field(sa_column=Column(String(64), nullable=False))

    # Display name + kind (parent-supplied at install).
    display_name: str = Field(sa_column=Column(String(255), nullable=False))
    kind: str = Field(sa_column=Column(String(64), nullable=False))

    state: AgentInstallState = Field(
        sa_column=Column(
            SQLEnum(
                AgentInstallState,
                name="agent_install_state",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    # Mode B encrypted API key. NULL when state == INACTIVE.
    api_key_record_id: bytes | None = Field(
        default=None,
        sa_column=Column("api_key_record_id", nullable=True),
    )
    api_key_nonce: bytes | None = Field(
        default=None,
        sa_column=Column("api_key_nonce", nullable=True),
    )
    api_key_ciphertext: bytes | None = Field(
        default=None,
        sa_column=Column("api_key_ciphertext", nullable=True),
    )

    # Monthly cost cap (USD). The H10 C3 install form requires the
    # user to type one explicitly; default zero is never persisted.
    monthly_cost_cap_usd: Decimal = Field(
        sa_column=Column(Numeric(10, 2), nullable=False),
    )
