"""Phase 15 hardening: webauthn_credential table.

Stores enrolled WebAuthn credentials for the passwordless / passkey
sign-in ceremony that supersedes the Phase-02 demo-signin.

The columns mirror `theourgia.models.webauthn.WebauthnCredential`.

Revision ID: 0066
Revises: 0065
Create Date: 2026-07-05
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0066"
down_revision: Union[str, None] = "0065"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # v1-017 replay guard: 0006 already creates this exact table (plus
    # its RLS policy). This migration only ever succeeded on databases
    # where the table had been dropped out-of-band during the 2026-07-05
    # deploy recovery. On a fresh replay the table exists — skip, keeping
    # 0006's shape and policy. 0078 re-asserts the RLS policy for
    # databases that took the recreate path without it.
    bind = op.get_bind()
    exists = bind.execute(
        sa.text("SELECT to_regclass('public.webauthn_credential') IS NOT NULL")
    ).scalar()
    if exists:
        return

    op.create_table(
        "webauthn_credential",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
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
            "user_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("credential_id", sa.LargeBinary(), nullable=False),
        sa.Column("public_key", sa.LargeBinary(), nullable=False),
        sa.Column(
            "sign_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "transports_csv",
            sa.String(length=200),
            nullable=False,
            server_default="",
        ),
        sa.Column("aaguid", sa.String(length=36), nullable=True),
        sa.Column("attestation_format", sa.String(length=64), nullable=True),
        sa.Column("credential_device_type", sa.String(length=32), nullable=True),
        sa.Column(
            "credential_backed_up",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "label",
            sa.String(length=120),
            nullable=False,
            server_default="",
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_webauthn_credential_user",
        "webauthn_credential",
        ["user_id"],
    )
    op.create_index(
        "uq_webauthn_credential_id",
        "webauthn_credential",
        ["credential_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_webauthn_credential_id", table_name="webauthn_credential")
    op.drop_index("ix_webauthn_credential_user", table_name="webauthn_credential")
    op.drop_table("webauthn_credential")
