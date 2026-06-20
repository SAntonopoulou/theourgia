"""add plugin lifecycle tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-20 21:00:00 UTC

Lands the three tables for plugin lifecycle:

- ``plugin_install`` — installed plugins, lifecycle state, manifest snapshot
- ``plugin_capability_grant`` — explicit capability grants (audit trail)
- ``plugin_setting`` — per-plugin key/value configuration

All three enable Row-Level Security: a vault owner / member sees only
plugins installed in their own vault.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_PLUGIN_STATES = [
    "installed",
    "active",
    "inactive",
    "error",
    "uninstalling",
]

# Mirrors the Capability enum values in core/plugins/capabilities.py.
# Updates to that enum require a migration that ALTERs this Postgres type.
_PLUGIN_CAPABILITIES = [
    "read.entries",
    "read.entities",
    "read.divinations",
    "read.library",
    "read.correspondences",
    "read.analytics",
    "read.media",
    "write.entries",
    "write.entities",
    "write.divinations",
    "write.correspondences",
    "write.media",
    "ui.editor.add_block",
    "ui.dashboard.add_widget",
    "ui.settings.add_page",
    "ui.divination.add_surface",
    "db.migrations",
    "network.outbound",
    "fs.read",
    "fs.write",
    "notif.send",
    "federation.outbound",
    "agent.invoke",
]


def upgrade() -> None:
    plugin_state = postgresql.ENUM(*_PLUGIN_STATES, name="plugin_state")
    plugin_state.create(op.get_bind(), checkfirst=True)

    plugin_capability = postgresql.ENUM(*_PLUGIN_CAPABILITIES, name="plugin_capability")
    plugin_capability.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "plugin_install",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vault.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("author", sa.String(255), nullable=False),
        sa.Column("license", sa.String(64), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False, server_default=""),
        sa.Column("homepage", sa.String(500), nullable=True),
        sa.Column("source", sa.String(500), nullable=False),
        sa.Column(
            "state",
            postgresql.ENUM(name="plugin_state", create_type=False),
            nullable=False,
            server_default="installed",
        ),
        sa.Column("last_error", sa.String(2000), nullable=True),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signature", sa.LargeBinary(), nullable=True),
        sa.Column("signature_public_key", sa.LargeBinary(), nullable=True),
        sa.Column(
            "manifest_json",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
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
        sa.UniqueConstraint("vault_id", "name", name="uq_plugin_install_vault_name"),
    )
    op.create_index("ix_plugin_install_vault", "plugin_install", ["vault_id"])
    op.create_index("ix_plugin_install_state", "plugin_install", ["state"])

    op.create_table(
        "plugin_capability_grant",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plugin_install_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plugin_install.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "capability",
            postgresql.ENUM(name="plugin_capability", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "granted_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=False,
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
            "plugin_install_id",
            "capability",
            name="uq_plugin_capability_install_cap",
        ),
    )
    op.create_index(
        "ix_plugin_capability_install", "plugin_capability_grant", ["plugin_install_id"]
    )

    op.create_table(
        "plugin_setting",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "plugin_install_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plugin_install.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key", sa.String(128), nullable=False),
        sa.Column(
            "value",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
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
            "plugin_install_id",
            "key",
            name="uq_plugin_setting_install_key",
        ),
    )
    op.create_index("ix_plugin_setting_install", "plugin_setting", ["plugin_install_id"])

    # Row-Level Security
    for tbl in ("plugin_install", "plugin_capability_grant", "plugin_setting"):
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY plugin_install_vault_access ON plugin_install
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM vault v
                    WHERE v.id = plugin_install.vault_id
                      AND (
                          v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                          OR EXISTS (
                              SELECT 1 FROM membership m
                              WHERE m.vault_id = v.id
                                AND m.user_id = current_setting('theourgia.current_user_id', true)::uuid
                          )
                      )
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM vault v
                    WHERE v.id = plugin_install.vault_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            );
        """
    )
    op.execute(
        """
        CREATE POLICY plugin_capability_owner ON plugin_capability_grant
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM plugin_install pi
                    JOIN vault v ON v.id = pi.vault_id
                    WHERE pi.id = plugin_capability_grant.plugin_install_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM plugin_install pi
                    JOIN vault v ON v.id = pi.vault_id
                    WHERE pi.id = plugin_capability_grant.plugin_install_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            );
        """
    )
    op.execute(
        """
        CREATE POLICY plugin_setting_owner ON plugin_setting
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM plugin_install pi
                    JOIN vault v ON v.id = pi.vault_id
                    WHERE pi.id = plugin_setting.plugin_install_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM plugin_install pi
                    JOIN vault v ON v.id = pi.vault_id
                    WHERE pi.id = plugin_setting.plugin_install_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            );
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS plugin_setting_owner ON plugin_setting")
    op.execute("DROP POLICY IF EXISTS plugin_capability_owner ON plugin_capability_grant")
    op.execute("DROP POLICY IF EXISTS plugin_install_vault_access ON plugin_install")

    op.drop_table("plugin_setting")
    op.drop_table("plugin_capability_grant")
    op.drop_table("plugin_install")

    op.execute("DROP TYPE IF EXISTS plugin_capability")
    op.execute("DROP TYPE IF EXISTS plugin_state")
