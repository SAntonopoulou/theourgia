"""B137 Phase 12 hubs: extend ``hub`` table + create
``hub_role_capability`` join.

Per ``plan/12-batches-backend.md`` § B137 (revised).

The existing ``hub`` table from Phase 01 (0001) is extended with
the H08-required columns. The ``hub_role_capability`` join table
is created fresh.

Revision ID: 0056
Revises: 0055
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0056"
down_revision: Union[str, None] = "0055"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────
    membership_policy = postgresql.ENUM(
        "public",
        "open_with_approval",
        "private",
        name="hub_membership_policy",
        create_type=False,
    )
    membership_policy.create(op.get_bind(), checkfirst=True)

    hub_capability = postgresql.ENUM(
        "edit_hub_content",
        "moderate_submissions",
        "manage_members",
        "send_newsletters",
        "run_analytics_queries",
        "accept_federation_peers",
        "edit_role_definitions",
        "manage_permission_matrix",
        "view_audit_log",
        "schedule_group_rituals",
        "approve_curation_submissions",
        name="hub_capability",
        create_type=False,
    )
    hub_capability.create(op.get_bind(), checkfirst=True)

    # ── ALTER TABLE hub ──────────────────────────────────────────
    op.add_column(
        "hub",
        sa.Column("tagline", sa.String(length=420), nullable=True),
    )
    op.add_column(
        "hub",
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "hub",
        sa.Column(
            "membership_policy",
            membership_policy,
            nullable=False,
            server_default="private",
        ),
    )
    op.add_column(
        "hub",
        sa.Column(
            "accepts_sso",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "hub",
        sa.Column(
            "auto_curates",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "hub",
        sa.Column(
            "public_banner_url", sa.String(length=2048), nullable=True,
        ),
    )
    op.add_column(
        "hub",
        sa.Column(
            "public_tradition_tags",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "hub",
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index("ix_hub_owner", "hub", ["owner_id"])
    op.create_index("ix_hub_deleted_at", "hub", ["deleted_at"])

    # ── CREATE TABLE hub_role_capability ────────────────────────
    op.create_table(
        "hub_role_capability",
        sa.Column(
            "hub_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hub.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role",
            postgresql.ENUM(
                # Reuse Phase 01 enum — create_type=False; no DDL
                "vault_owner",
                "vault_collaborator",
                "vault_viewer",
                "hub_admin",
                "hub_officer",
                "hub_moderator",
                "hub_member",
                "hub_observer",
                name="membership_role",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("capability", hub_capability, nullable=False),
        sa.PrimaryKeyConstraint(
            "hub_id", "role", "capability",
            name="pk_hub_role_capability",
        ),
        sa.CheckConstraint(
            "role IN ('hub_admin', 'hub_officer', 'hub_moderator', "
            "'hub_member', 'hub_observer')",
            name="ck_hub_role_capability_hub_role_only",
        ),
    )
    op.create_index(
        "ix_hub_role_capability_hub", "hub_role_capability", ["hub_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_hub_role_capability_hub", table_name="hub_role_capability",
    )
    op.drop_table("hub_role_capability")
    sa.Enum(name="hub_capability").drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_hub_deleted_at", table_name="hub")
    op.drop_index("ix_hub_owner", table_name="hub")
    op.drop_column("hub", "deleted_at")
    op.drop_column("hub", "public_tradition_tags")
    op.drop_column("hub", "public_banner_url")
    op.drop_column("hub", "auto_curates")
    op.drop_column("hub", "accepts_sso")
    op.drop_column("hub", "membership_policy")
    op.drop_column("hub", "owner_id")
    op.drop_column("hub", "tagline")
    sa.Enum(name="hub_membership_policy").drop(
        op.get_bind(), checkfirst=True,
    )
