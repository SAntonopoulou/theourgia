"""B138 Phase 12 private viewer grant table.

Per ``plan/12-batches-backend.md`` § B138.

Distinct from the Phase 01 ``private_viewer`` table — this is
for credential issuance to non-Theourgia recipients (the H08
surface 11 flow).

Revision ID: 0057
Revises: 0056
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0057"
down_revision: Union[str, None] = "0056"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    scope_kind = postgresql.ENUM(
        "full",
        "tag",
        "kind",
        "specific",
        name="private_viewer_scope_kind",
        create_type=False,
    )
    scope_kind.create(op.get_bind(), checkfirst=True)

    delivery = postgresql.ENUM(
        "signed_link",
        "passphrase",
        name="private_viewer_delivery",
        create_type=False,
    )
    delivery.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "private_viewer_grant",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("label", sa.String(length=240), nullable=False),
        sa.Column(
            "email_or_handle",
            sa.String(length=320),
            nullable=False,
        ),
        sa.Column(
            "scope_kind",
            scope_kind,
            nullable=False,
            server_default="tag",
        ),
        sa.Column(
            "scope_payload",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "delivery",
            delivery,
            nullable=False,
            server_default="signed_link",
        ),
        sa.Column(
            "credential_hash", sa.LargeBinary(), nullable=False,
        ),
        sa.Column(
            "credential_salt", sa.LargeBinary(), nullable=False,
        ),
        sa.Column(
            "last_used_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column(
            "revoked_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.CheckConstraint(
            "scope_kind IN ('full', 'tag', 'kind', 'specific')",
            name="ck_pvg_scope_kind",
        ),
        sa.CheckConstraint(
            "delivery IN ('signed_link', 'passphrase')",
            name="ck_pvg_delivery",
        ),
    )
    op.create_index("ix_pvg_owner", "private_viewer_grant", ["owner_id"])
    op.create_index(
        "ix_pvg_owner_revoked",
        "private_viewer_grant",
        ["owner_id", "revoked_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_pvg_owner_revoked", table_name="private_viewer_grant")
    op.drop_index("ix_pvg_owner", table_name="private_viewer_grant")
    op.drop_table("private_viewer_grant")
    sa.Enum(name="private_viewer_delivery").drop(
        op.get_bind(), checkfirst=True,
    )
    sa.Enum(name="private_viewer_scope_kind").drop(
        op.get_bind(), checkfirst=True,
    )
