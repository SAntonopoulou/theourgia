"""Memorial-mode follow-ups — posthumous flag + executor columns.

v1-018 · plan/15 §13 (Digital inheritance / memorial mode).

Four add_column-only changes:

- ``entry.publish_on_death`` — per-entry posthumous-publication flag.
  The hourly memorial sweep publishes flagged, unsealed entries once
  the vault memorializes (and the owner opted in via
  ``posthumous_publications_enabled``).
- ``memorial_config.warning_notified_at`` — idempotency marker for the
  check-in reminder; cleared on check-in so the next lapse cycle can
  notify again.
- ``memorial_config.executor_notified_at`` — idempotency marker for
  the executor notification; cleared on reactivate.
- ``memorial_config.key_share_envelope`` — SHA-256 commitment +
  Shamir parameters for the executor key-share. Never the shares or
  the secret (see docs/architecture/memorial-key-share-threat-model.md).

Revision ID: 0079
Revises: 0078
Create Date: 2026-07-16
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0079"
down_revision: Union[str, None] = "0078"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "entry",
        sa.Column(
            "publish_on_death",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "memorial_config",
        sa.Column("warning_notified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "memorial_config",
        sa.Column("executor_notified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "memorial_config",
        sa.Column("key_share_envelope", postgresql.JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("memorial_config", "key_share_envelope")
    op.drop_column("memorial_config", "executor_notified_at")
    op.drop_column("memorial_config", "warning_notified_at")
    op.drop_column("entry", "publish_on_death")
