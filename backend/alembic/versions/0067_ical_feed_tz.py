"""iCal feed · last_regenerated_at → timezone-aware.

The column was created as TIMESTAMP WITHOUT TIME ZONE but the code
sets it to `datetime.now(tz=UTC)`, so asyncpg raised
"can't subtract offset-naive and offset-aware datetimes" on every
regenerate call. Convert the column to TIMESTAMP WITH TIME ZONE
in-place; existing values are treated as UTC.

Revision ID: 0067
Revises: 0066
Create Date: 2026-07-05
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0067"
down_revision: Union[str, None] = "0066"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE ical_feed "
        "ALTER COLUMN last_regenerated_at "
        "TYPE TIMESTAMP WITH TIME ZONE "
        "USING last_regenerated_at AT TIME ZONE 'UTC'"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE ical_feed "
        "ALTER COLUMN last_regenerated_at "
        "TYPE TIMESTAMP WITHOUT TIME ZONE "
        "USING last_regenerated_at AT TIME ZONE 'UTC'"
    )
