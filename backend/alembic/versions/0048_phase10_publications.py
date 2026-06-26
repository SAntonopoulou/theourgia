"""B126 Phase 10 Publishing: publication + publication_chapter tables.

Per ``plan/10-batches-backend.md`` § B126.

Revision ID: 0048
Revises: 0047
Create Date: 2026-06-26
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0048"
down_revision: Union[str, None] = "0047"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


KINDS = ("book", "essay", "post", "page")
STATES = ("draft", "scheduled", "live", "withdrawn")
LICENSES = (
    "all_rights_reserved",
    "cc_by",
    "cc_by_sa",
    "cc_by_nc",
    "cc_by_nc_sa",
    "cc_by_nc_nd",
    "cc_by_nd",
    "cc0",
    "public_domain",
)


def upgrade() -> None:
    kind_enum = postgresql.ENUM(
        *KINDS, name="publication_kind", create_type=False,
    )
    kind_enum.create(op.get_bind(), checkfirst=True)

    state_enum = postgresql.ENUM(
        *STATES, name="publication_state", create_type=False,
    )
    state_enum.create(op.get_bind(), checkfirst=True)

    license_enum = postgresql.ENUM(
        *LICENSES, name="publication_license", create_type=False,
    )
    license_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "publication",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(
                *KINDS, name="publication_kind", create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "state",
            postgresql.ENUM(
                *STATES, name="publication_state", create_type=False,
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("slug", sa.String(240), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "body",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("cover_url", sa.String(480), nullable=True),
        sa.Column(
            "language", sa.String(16), nullable=False, server_default="en",
        ),
        sa.Column(
            "license",
            postgresql.ENUM(
                *LICENSES, name="publication_license", create_type=False,
            ),
            nullable=False,
            server_default="all_rights_reserved",
        ),
        sa.Column(
            "published_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column(
            "scheduled_publish_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "withdrawn_at", sa.DateTime(timezone=True), nullable=True,
        ),
        sa.Column(
            "pricing_model",
            sa.String(16),
            nullable=False,
            server_default="free",
        ),
        sa.Column(
            "one_time_amount_cents", sa.Integer(), nullable=True,
        ),
        sa.Column(
            "currency", sa.String(8), nullable=False, server_default="usd",
        ),
        sa.Column(
            "watermark_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "cited",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "pricing_model IN ('free', 'one_time', 'subscribe')",
            name="ck_publication_pricing_model",
        ),
        sa.CheckConstraint(
            "one_time_amount_cents IS NULL OR one_time_amount_cents >= 0",
            name="ck_publication_amount_nonneg",
        ),
        sa.UniqueConstraint(
            "owner_id", "slug", name="uq_publication_owner_slug",
        ),
    )
    op.create_index("ix_publication_owner", "publication", ["owner_id"])
    op.create_index(
        "ix_publication_owner_state",
        "publication",
        ["owner_id", "state"],
    )
    op.create_index(
        "ix_publication_published_at",
        "publication",
        ["published_at"],
    )

    op.create_table(
        "publication_chapter",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "publication_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("publication.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "order_index",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column(
            "body",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
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
        sa.UniqueConstraint(
            "publication_id", "order_index", name="uq_chapter_order",
        ),
    )
    op.create_index(
        "ix_chapter_publication",
        "publication_chapter",
        ["publication_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_chapter_publication", table_name="publication_chapter")
    op.drop_table("publication_chapter")
    op.drop_index(
        "ix_publication_published_at", table_name="publication",
    )
    op.drop_index("ix_publication_owner_state", table_name="publication")
    op.drop_index("ix_publication_owner", table_name="publication")
    op.drop_table("publication")
    postgresql.ENUM(name="publication_license").drop(
        op.get_bind(), checkfirst=True,
    )
    postgresql.ENUM(name="publication_state").drop(
        op.get_bind(), checkfirst=True,
    )
    postgresql.ENUM(name="publication_kind").drop(
        op.get_bind(), checkfirst=True,
    )
