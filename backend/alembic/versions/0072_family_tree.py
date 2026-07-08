"""Family-tree kinship + ancestor profile.

b108-2ha · FEATURES §3.

Adds three kinship values to the entity_alias_kind enum and an
``ancestor_profile`` JSONB column to the entity table. The three
new enum values are added via ``ALTER TYPE ... ADD VALUE IF NOT
EXISTS`` — Postgres 12+.

Revision ID: 0072
Revises: 0071
Create Date: 2026-07-08
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0072"
down_revision: Union[str, None] = "0071"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_KINSHIP_VALUES = ("parent-of", "sibling-of", "spouse-of")


def upgrade() -> None:
    # ALTER TYPE ADD VALUE cannot run inside a transaction that
    # also uses the new value later, but here we only add the value
    # and use it at query time — safe. AUTOCOMMIT is set on the
    # alembic connection when needed.
    with op.get_context().autocommit_block():
        for value in NEW_KINSHIP_VALUES:
            op.execute(
                f"ALTER TYPE entity_alias_kind ADD VALUE IF NOT EXISTS '{value}'"
            )

    op.add_column(
        "entity",
        sa.Column(
            "ancestor_profile",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
    )


def downgrade() -> None:
    op.drop_column("entity", "ancestor_profile")
    # Removing enum values is not supported natively by Postgres
    # without recreating the type. Leaving the three kinship values
    # present after downgrade is harmless — no rows will reference
    # them once the ancestor_profile column is gone and the app
    # code drops the kinship endpoints.
