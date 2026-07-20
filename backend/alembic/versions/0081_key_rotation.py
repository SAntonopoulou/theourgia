"""key_rotation table — Mode A vault-key rotation tracking.

v1-027 · Phase 15 B5 (real key rotation behind /settings/keys).

One row per rotation run: which key replaced which, the batched
re-encryption sweep's progress (rows_total / rows_done), and a plain
String state (pending / running / done / failed — no enums). Key rows
themselves stay in ``vault_key`` (0002) and are never deleted; this
table only references them.

``old_key_id`` is NULL for the initial-provision run that creates a
vault's first DEK; ``new_key_id`` is NULL only when the rotation
failed before a new key was created (master key could not unwrap the
active DEK).

Revision ID: 0081
Revises: 0080
Create Date: 2026-07-20
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0081"
down_revision: Union[str, None] = "0080"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "key_rotation",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "vault_id",
            sa.UUID(),
            sa.ForeignKey("vault.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "old_key_id",
            sa.UUID(),
            sa.ForeignKey("vault_key.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "new_key_id",
            sa.UUID(),
            sa.ForeignKey("vault_key.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "state",
            sa.String(length=16),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "rows_total", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "rows_done", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.String(length=500), nullable=True),
    )
    op.create_index(
        "ix_key_rotation_vault_id", "key_rotation", ["vault_id"]
    )
    op.create_index(
        "ix_key_rotation_vault_state", "key_rotation", ["vault_id", "state"]
    )


def downgrade() -> None:
    op.drop_index("ix_key_rotation_vault_state", table_name="key_rotation")
    op.drop_index("ix_key_rotation_vault_id", table_name="key_rotation")
    op.drop_table("key_rotation")
