"""initial: enable extensions and create identity + audit tables

Revision ID: 0001
Revises:
Create Date: 2026-06-20 16:00:00 UTC

First migration. Establishes the database baseline:

- Required PostgreSQL extensions (pgcrypto, pgvector, pg_trgm, unaccent,
  citext) — these are required by the project; see ADR-0005.
- Two PostgreSQL enums (membership_role, audit_event_kind, audit_outcome).
- Identity tables (user, session, vault, hub, membership, private_viewer).
- Audit table (audit_event) — append-only by application convention.
- Row-Level Security policies on vault, hub, membership, private_viewer
  scaffolded (default-deny + permissive policies for owner access). Full
  visibility-policy enforcement on content tables lands with those tables
  in subsequent migrations.

The audit_event table receives an UPDATE/DELETE block via a trigger that
raises an exception on any UPDATE or DELETE attempt — application-level
discipline plus database-level enforcement.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─────────────────────────────────────────────────────────────────────
    # Extensions
    # ─────────────────────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    # pgvector ships separately — assume it's available; CREATE will fail
    # cleanly with an actionable error if it isn't installed.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ─────────────────────────────────────────────────────────────────────
    # Enums
    # ─────────────────────────────────────────────────────────────────────
    membership_role = postgresql.ENUM(
        "vault_owner",
        "vault_collaborator",
        "vault_viewer",
        "hub_admin",
        "hub_officer",
        "hub_moderator",
        "hub_member",
        "hub_observer",
        name="membership_role",
    )
    membership_role.create(op.get_bind(), checkfirst=True)

    audit_event_kind = postgresql.ENUM(
        "auth",
        "visibility",
        "sealed_read",
        "federation",
        "plugin",
        "admin",
        "backup",
        "security",
        "system",
        name="audit_event_kind",
    )
    audit_event_kind.create(op.get_bind(), checkfirst=True)

    audit_outcome = postgresql.ENUM(
        "success",
        "failure",
        "denied",
        name="audit_outcome",
    )
    audit_outcome.create(op.get_bind(), checkfirst=True)

    # ─────────────────────────────────────────────────────────────────────
    # Tables
    # ─────────────────────────────────────────────────────────────────────
    op.create_table(
        "user",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("totp_secret", sa.String(64), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
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
    op.create_index("ix_user_email_active", "user", ["email"], unique=True)

    op.create_table(
        "vault",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False, server_default=""),
        sa.Column(
            "public_face_enabled", sa.Boolean(), nullable=False, server_default=sa.false()
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
        sa.UniqueConstraint("slug", name="uq_vault_slug"),
    )
    op.create_index("ix_vault_owner", "vault", ["owner_id"])

    op.create_table(
        "hub",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False, server_default=""),
        sa.Column(
            "tradition_tags", sa.String(500), nullable=False, server_default=""
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
        sa.UniqueConstraint("slug", name="uq_hub_slug"),
    )

    op.create_table(
        "session",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("user_agent", sa.String(512), nullable=False, server_default=""),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
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
    op.create_index("ix_session_user", "session", ["user_id"])
    op.create_index("ix_session_revoked", "session", ["revoked_at"])

    op.create_table(
        "membership",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vault.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "hub_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hub.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "role",
            postgresql.ENUM(name="membership_role", create_type=False),
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
        sa.CheckConstraint(
            "(vault_id IS NOT NULL)::int + (hub_id IS NOT NULL)::int = 1",
            name="ck_membership_one_target",
        ),
        sa.CheckConstraint(
            """
            (vault_id IS NOT NULL AND role::text LIKE 'vault\\_%' ESCAPE '\\')
            OR (hub_id IS NOT NULL AND role::text LIKE 'hub\\_%' ESCAPE '\\')
            """,
            name="ck_membership_role_matches_target",
        ),
        sa.UniqueConstraint("user_id", "vault_id", name="uq_membership_user_vault"),
        sa.UniqueConstraint("user_id", "hub_id", name="uq_membership_user_hub"),
    )
    op.create_index("ix_membership_user", "membership", ["user_id"])
    op.create_index("ix_membership_vault", "membership", ["vault_id"])
    op.create_index("ix_membership_hub", "membership", ["hub_id"])

    op.create_table(
        "private_viewer",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vault.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("display_name", sa.String(255), nullable=False, server_default=""),
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
        sa.UniqueConstraint(
            "vault_id", "user_id", name="uq_private_viewer_vault_user"
        ),
    )
    op.create_index("ix_private_viewer_vault", "private_viewer", ["vault_id"])
    op.create_index("ix_private_viewer_user", "private_viewer", ["user_id"])

    op.create_table(
        "audit_event",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "actor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vault.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "hub_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("hub.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(name="audit_event_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column(
            "outcome",
            postgresql.ENUM(name="audit_outcome", create_type=False),
            nullable=False,
        ),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=False, server_default=""),
        sa.Column(
            "detail",
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
    )
    op.create_index("ix_audit_actor_created", "audit_event", ["actor_id", "created_at"])
    op.create_index("ix_audit_vault_created", "audit_event", ["vault_id", "created_at"])
    op.create_index("ix_audit_hub_created", "audit_event", ["hub_id", "created_at"])
    op.create_index("ix_audit_kind_created", "audit_event", ["kind", "created_at"])

    # ─────────────────────────────────────────────────────────────────────
    # Audit-event immutability trigger
    # Application convention is append-only; this trigger raises on any
    # UPDATE/DELETE attempt so the database refuses to violate it.
    # ─────────────────────────────────────────────────────────────────────
    op.execute(
        """
        CREATE OR REPLACE FUNCTION theourgia_audit_immutable() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'audit_event is append-only (op=%, table=%)', TG_OP, TG_TABLE_NAME;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_audit_event_immutable
            BEFORE UPDATE OR DELETE ON audit_event
            FOR EACH ROW EXECUTE FUNCTION theourgia_audit_immutable();
        """
    )

    # ─────────────────────────────────────────────────────────────────────
    # Row-Level Security scaffolding
    # We enable RLS on identity tables now; specific policies for content
    # tables land in subsequent migrations. The 'theourgia.current_user_id'
    # GUC is set by the application at request time and read by policies.
    # ─────────────────────────────────────────────────────────────────────
    for tbl in ("user", "vault", "hub", "membership", "private_viewer", "audit_event"):
        op.execute(f'ALTER TABLE "{tbl}" ENABLE ROW LEVEL SECURITY')

    # Default-deny is implicit when RLS is enabled and no policy matches.
    # Permissive policies follow. The 'theourgia_app' role uses these;
    # the 'theourgia_migrate' role bypasses RLS (BYPASSRLS).

    # User row: a user may read and update only their own row.
    op.execute(
        """
        CREATE POLICY user_self_access ON "user"
            USING (id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )

    # Vault: owner or any membership holder may read; only owner may modify.
    op.execute(
        """
        CREATE POLICY vault_member_read ON vault
            FOR SELECT
            USING (
                owner_id = current_setting('theourgia.current_user_id', true)::uuid
                OR EXISTS (
                    SELECT 1 FROM membership m
                    WHERE m.vault_id = vault.id
                      AND m.user_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            );
        """
    )
    op.execute(
        """
        CREATE POLICY vault_owner_write ON vault
            FOR ALL
            USING (owner_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (owner_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )

    # Hub: members may read; admin/officers may modify (admin enforcement
    # via application-level scope checks for now; finer RLS lands with
    # the admin permissions panel in plan/12).
    op.execute(
        """
        CREATE POLICY hub_member_read ON hub
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM membership m
                    WHERE m.hub_id = hub.id
                      AND m.user_id = current_setting('theourgia.current_user_id', true)::uuid
                )
            );
        """
    )

    # Membership: a user can see their own membership rows.
    op.execute(
        """
        CREATE POLICY membership_self_read ON membership
            FOR SELECT
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )

    # Private viewer: the vault owner manages; the viewer can see their own row.
    op.execute(
        """
        CREATE POLICY private_viewer_owner ON private_viewer
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM vault v
                    WHERE v.id = private_viewer.vault_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
                OR user_id = current_setting('theourgia.current_user_id', true)::uuid
            );
        """
    )

    # Audit event: read-only via RLS; specific scope (own actions, own
    # vault's events, own hub's events) enforced by app queries. Writes
    # come from the app role; UPDATE/DELETE blocked by the trigger above.
    op.execute(
        """
        CREATE POLICY audit_visible ON audit_event
            FOR SELECT
            USING (
                actor_id = current_setting('theourgia.current_user_id', true)::uuid
                OR EXISTS (
                    SELECT 1 FROM vault v
                    WHERE v.id = audit_event.vault_id
                      AND v.owner_id = current_setting('theourgia.current_user_id', true)::uuid
                )
                OR EXISTS (
                    SELECT 1 FROM membership m
                    WHERE m.hub_id = audit_event.hub_id
                      AND m.user_id = current_setting('theourgia.current_user_id', true)::uuid
                      AND m.role IN ('hub_admin', 'hub_officer')
                )
            );
        """
    )


def downgrade() -> None:
    # Drop policies, trigger, tables, enums, extensions (in reverse order).
    # Extensions are NOT dropped — they may be used by other things.

    op.execute("DROP POLICY IF EXISTS audit_visible ON audit_event")
    op.execute("DROP POLICY IF EXISTS private_viewer_owner ON private_viewer")
    op.execute("DROP POLICY IF EXISTS membership_self_read ON membership")
    op.execute("DROP POLICY IF EXISTS hub_member_read ON hub")
    op.execute("DROP POLICY IF EXISTS vault_owner_write ON vault")
    op.execute("DROP POLICY IF EXISTS vault_member_read ON vault")
    op.execute('DROP POLICY IF EXISTS user_self_access ON "user"')

    op.execute("DROP TRIGGER IF EXISTS trg_audit_event_immutable ON audit_event")
    op.execute("DROP FUNCTION IF EXISTS theourgia_audit_immutable()")

    op.drop_table("audit_event")
    op.drop_table("private_viewer")
    op.drop_table("membership")
    op.drop_table("session")
    op.drop_table("hub")
    op.drop_table("vault")
    op.drop_table("user")

    op.execute("DROP TYPE IF EXISTS audit_outcome")
    op.execute("DROP TYPE IF EXISTS audit_event_kind")
    op.execute("DROP TYPE IF EXISTS membership_role")
