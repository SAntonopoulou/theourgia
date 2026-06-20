"""add vault_key and sealed_kdf_params tables for the encryption layer

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-20 18:00:00 UTC

Lands the tables required by the Mode A and Mode B encryption layers:

- ``vault_key`` — per-vault Mode A data keys (DEKs), each in wrapped form
  under the server master key. At most one row per vault has
  ``active = true`` at any time; rotation creates a new active row and
  marks the prior as inactive.

- ``sealed_kdf_params`` — Argon2id parameters per user (scope = 'personal'
  initially) for deriving Mode B keys from a passphrase. The browser
  uses these parameters + the typed passphrase to derive the key; the
  server never sees the passphrase or the derived key.

Both tables enable Row-Level Security with scope-appropriate policies.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vault_key",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vault.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("wrapped_key", sa.LargeBinary(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_vault_key_vault_active", "vault_key", ["vault_id", "active"])

    # Partial unique index: at most one active key per vault.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_vault_key_one_active
            ON vault_key (vault_id)
            WHERE active = true
        """
    )

    op.create_table(
        "sealed_kdf_params",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "scope",
            sa.String(64),
            nullable=False,
            server_default="personal",
        ),
        sa.Column("salt", sa.LargeBinary(), nullable=False),
        sa.Column("time_cost", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("memory_cost_kib", sa.Integer(), nullable=False, server_default="65536"),
        sa.Column("parallelism", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("key_length", sa.Integer(), nullable=False, server_default="32"),
        sa.Column("recovery_fingerprint", sa.LargeBinary(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("user_id", "scope", name="uq_sealed_kdf_user_scope"),
    )
    op.create_index("ix_sealed_kdf_user", "sealed_kdf_params", ["user_id"])

    # Row-Level Security
    op.execute("ALTER TABLE vault_key ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE sealed_kdf_params ENABLE ROW LEVEL SECURITY")

    # vault_key: vault owner or members may read; only the owner may write
    op.execute(
        """
        CREATE POLICY vault_key_member_read ON vault_key
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM vault v
                    WHERE v.id = vault_key.vault_id
                      AND (
                          v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                          OR EXISTS (
                              SELECT 1 FROM membership m
                              WHERE m.vault_id = v.id
                                AND m.user_id = current_setting('theourgia.current_user_id', true)::uuid
                          )
                      )
                )
            );
        """
    )
    op.execute(
        """
        CREATE POLICY vault_key_owner_write ON vault_key
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM vault v
                    WHERE v.id = vault_key.vault_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM vault v
                    WHERE v.id = vault_key.vault_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            );
        """
    )

    # sealed_kdf_params: only the user themselves can see / modify their KDF params
    op.execute(
        """
        CREATE POLICY sealed_kdf_self ON sealed_kdf_params
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS sealed_kdf_self ON sealed_kdf_params")
    op.execute("DROP POLICY IF EXISTS vault_key_owner_write ON vault_key")
    op.execute("DROP POLICY IF EXISTS vault_key_member_read ON vault_key")
    op.execute("DROP INDEX IF EXISTS uq_vault_key_one_active")
    op.drop_table("sealed_kdf_params")
    op.drop_table("vault_key")
