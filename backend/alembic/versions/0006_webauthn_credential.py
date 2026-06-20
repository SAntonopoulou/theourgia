"""add webauthn_credential table

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-20 22:30:00 UTC

A user may register many WebAuthn credentials (hardware keys, phone
passkeys, platform authenticators). Each row tracks the credential's
public key, sign counter, and lifecycle (last_used / revoked).

RLS: the row's user_id must match the requester. Admin operations on
this table go through application-layer checks against the audit table.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "webauthn_credential",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("credential_id", sa.LargeBinary(), nullable=False),
        sa.Column("public_key", sa.LargeBinary(), nullable=False),
        sa.Column(
            "sign_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "transports_csv",
            sa.String(200),
            nullable=False,
            server_default="",
        ),
        sa.Column("aaguid", sa.String(36), nullable=True),
        sa.Column("attestation_format", sa.String(64), nullable=True),
        sa.Column("credential_device_type", sa.String(32), nullable=True),
        sa.Column(
            "credential_backed_up",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("label", sa.String(120), nullable=False, server_default=""),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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

    op.create_index(
        "ix_webauthn_credential_user", "webauthn_credential", ["user_id"]
    )
    op.create_index(
        "uq_webauthn_credential_id",
        "webauthn_credential",
        ["credential_id"],
        unique=True,
    )

    # Row-Level Security: only the credential's owner may read or write
    op.execute("ALTER TABLE webauthn_credential ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY webauthn_credential_owner_rw ON webauthn_credential
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS webauthn_credential_owner_rw ON webauthn_credential"
    )
    op.drop_index(
        "uq_webauthn_credential_id", table_name="webauthn_credential"
    )
    op.drop_index(
        "ix_webauthn_credential_user", table_name="webauthn_credential"
    )
    op.drop_table("webauthn_credential")
