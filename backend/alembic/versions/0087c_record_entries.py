"""record entries — the phone's record, shelved whole for sync

Sophia, 17 August 2026: the alignment programme's first protocol piece —
*"we need to get the web app and mobile app playing together … but not the
record which is the set of practises done each day"* stays the phone-shaped
ledger, separate from the journal, never flattened into it.

One table and one sequence. Why documents rather than columns, why last
writer wins on the DEVICE's clock, and why pull cursors are sequence
positions is argued in `theourgia/models/record_entry.py`.

⚠ **Numbered 0087c for the same reason 0087b was.** The uncommitted
`0088_talisman_lifecycle_scrying_protocol` keeps its place after the
letter chain: 0087 → 0087a → 0087b → 0087c → 0088.

Revision ID: 0087c
Revises: 0087b
Create Date: 2026-08-17
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0087c"
down_revision: Union[str, None] = "0087b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The sequence is created by hand rather than as a BIGSERIAL because
    # updates bump it too (the router does this), and a named sequence is
    # the only honest way to share one counter between both paths.
    op.execute(sa.schema.CreateSequence(sa.Sequence("record_entry_seq")))

    op.create_table(
        "record_entry",
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        # The DEVICE mints the id — it is the row's uuid in the phone's own
        # database, which is what lets two devices on one account
        # interleave without renumbering.
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("doc", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at_utc", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "synced_seq",
            sa.BigInteger(),
            nullable=False,
            server_default=sa.text("nextval('record_entry_seq')"),
        ),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_record_entry_synced_seq", "record_entry", ["synced_seq"])
    op.create_index(
        "ix_record_entry_owner_seq", "record_entry", ["owner_id", "synced_seq"]
    )


def downgrade() -> None:
    op.drop_index("ix_record_entry_owner_seq", table_name="record_entry")
    op.drop_index("ix_record_entry_synced_seq", table_name="record_entry")
    op.drop_table("record_entry")
    op.execute(sa.schema.DropSequence(sa.Sequence("record_entry_seq")))
