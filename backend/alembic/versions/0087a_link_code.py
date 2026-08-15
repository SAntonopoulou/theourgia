"""Device link codes.

One table. A short-lived, single-use, hash-stored code a signed-in user
mints here and types into a companion application, which its server then
redeems for the user's identity. See ``theourgia/models/link_code.py`` for
why the mechanism has this shape rather than being an OAuth flow.

Nothing existing changes, so the downgrade is a clean drop.

Revision ID: 0087a
Revises: 0087
Create Date: 2026-08-14

⚠ **Numbered 0087a, out of the sequence, on purpose.** Production is at 0087;
`0088_talisman_lifecycle_scrying_protocol` is written but uncommitted and has
never been applied to any database. Linking had to ship without dragging that
unfinished work into a live service with it, so this migration parents on 0087
and 0088 was re-pointed to parent on this one — a one-line change to its
`down_revision`, made while it was still unapplied everywhere.

The chain is therefore 0087 → 0087a → 0088, and there is one head.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0087a"
down_revision: Union[str, None] = "0087"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "link_code",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
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
            nullable=False,
        ),
        sa.Column("user_id", sa.UUID(), nullable=False),
        # The code itself is never stored — only the SHA-256 of its
        # normalised form. Unique, so a collision is a constraint violation
        # rather than two users sharing a credential.
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("audience", sa.String(length=64), nullable=False),
        sa.Column("expires_at_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("code_hash", name="uq_link_code_hash"),
    )
    op.create_index("ix_link_code_id", "link_code", ["id"])
    op.create_index("ix_link_code_user_id", "link_code", ["user_id"])
    op.create_index(
        "ix_link_code_user_audience",
        "link_code",
        ["user_id", "audience", "redeemed_at"],
    )
    op.create_index("ix_link_code_expiry", "link_code", ["expires_at_utc"])


def downgrade() -> None:
    op.drop_index("ix_link_code_expiry", table_name="link_code")
    op.drop_index("ix_link_code_user_audience", table_name="link_code")
    op.drop_index("ix_link_code_user_id", table_name="link_code")
    op.drop_index("ix_link_code_id", table_name="link_code")
    op.drop_table("link_code")
