"""Four-station rite: home/xenos observance mode.

Sprint I-A (Hellenic daily-practice core). The Liber Resh module is
generalized into a configurable four-station daily rite; station
labels + the minimum-viable-station streak anchor live in per-user
settings (``resh.*`` keys — no schema change needed there). The one
schema addition is the per-observance liturgy-form marker:

- New ``resh_mode`` enum (``home`` | ``xenos``) — the operator runs
  different liturgy forms when in Greece vs abroad.
- ``adoration`` gains ``mode`` (NOT NULL, default ``home``) so every
  recorded adoration carries which form was performed.

Revision ID: 0086
Revises: 0085
Create Date: 2026-07-25
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0086"
down_revision: Union[str, None] = "0085"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_MODES = ["home", "xenos"]


def upgrade() -> None:
    op.execute(
        f"CREATE TYPE resh_mode AS ENUM "
        f"({', '.join(repr(m) for m in _MODES)})"
    )
    op.add_column(
        "adoration",
        sa.Column(
            "mode",
            postgresql.ENUM(name="resh_mode", create_type=False),
            nullable=False,
            server_default="home",
        ),
    )


def downgrade() -> None:
    op.drop_column("adoration", "mode")
    op.execute("DROP TYPE resh_mode")
