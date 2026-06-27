"""Phase 12.5 federation replay-nonce store: 1 table.

Per ``plan/12-federation.md`` § Phase 12.5 (transport).

Revision ID: 0062
Revises: 0061
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0062"
down_revision: Union[str, None] = "0061"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "federation_nonce",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("nonce_key", sa.String(255), nullable=False),
        sa.Column(
            "observed_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "nonce_key", name="uq_federation_nonce_key",
        ),
    )
    op.create_index(
        "ix_federation_nonce_expires",
        "federation_nonce",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_federation_nonce_expires", table_name="federation_nonce",
    )
    op.drop_table("federation_nonce")
