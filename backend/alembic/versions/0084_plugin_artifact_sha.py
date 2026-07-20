"""plugin_install.artifact_sha256 — registry-install forensic pin.

v1-032 · Phase 14 close-out (install-from-registry).

Records the hex SHA-256 of the release archive an install came from,
alongside the existing ``signature`` / ``signature_public_key``
columns from the original plugin substrate. NULL for local / direct
installs.

NOTE (batch coordination): down_revision points at "0083", which is
owned by another in-flight v1 close-out batch and may not exist
in-tree yet. Do NOT run ``alembic upgrade`` until 0083 has landed —
the chain replays 0001→0084 once both batches are merged.

Revision ID: 0084
Revises: 0083
Create Date: 2026-07-20
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0084"
down_revision: Union[str, None] = "0083"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "plugin_install",
        sa.Column("artifact_sha256", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("plugin_install", "artifact_sha256")
