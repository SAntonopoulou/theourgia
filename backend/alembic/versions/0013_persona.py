"""add persona table + persona context columns

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-21 16:00:00 UTC

Introduces the Persona layer per the 2026-06-21 architectural
decision (``plan/persona-decision-2026-06-21.md``).

- Creates ``persona`` table.
- Adds ``active_persona_id`` to ``session`` (nullable FK to persona).
- Adds ``actor_persona_id`` to ``audit_event`` (nullable FK to persona).
- Creates ``persona_kind`` enum.
- Owner-RW RLS policy on persona (user can read/write only their own).

Existing content tables (``vault``, ``upload``, ``membership``,
``private_viewer``) intentionally remain User-referencing for now —
they predate this migration and any rewire happens alongside the
features that build on them. New content tables in Phase 02 onward
will use ``owner_persona_id`` referencing this table directly.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_PERSONA_KINDS = ["default", "secondary"]


def upgrade() -> None:
    # ── Enum ─────────────────────────────────────────────────────────
    op.execute(
        f"CREATE TYPE persona_kind AS ENUM "
        f"({', '.join(repr(k) for k in _PERSONA_KINDS)})"
    )

    # ── persona table ────────────────────────────────────────────────
    op.create_table(
        "persona",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(name="persona_kind", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "handle",
            sa.Text(),  # backed by CITEXT in production; SQLAlchemy
                        # autoreflects it to text for migration purposes.
            nullable=False,
        ),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("bio", sa.String(2000), nullable=False, server_default=""),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column(
            "avatar_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "public_face_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
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
        sa.UniqueConstraint("handle", name="uq_persona_handle"),
    )

    # Storage uses CITEXT for handle to make case-insensitive lookup
    # natural; we alter post-create so the SQLAlchemy column type
    # remained portable above.
    op.execute("ALTER TABLE persona ALTER COLUMN handle TYPE CITEXT")

    op.create_index("ix_persona_user_id", "persona", ["user_id"])
    op.create_index("ix_persona_user_kind", "persona", ["user_id", "kind"])

    # Exactly one default persona per user.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_persona_one_default_per_user
            ON persona(user_id)
            WHERE kind = 'default';
        """
    )

    # Owner-RW RLS: only the persona's user can read/write their own
    # personas.
    op.execute("ALTER TABLE persona ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY persona_owner_rw ON persona
            FOR ALL
            USING (user_id = current_setting('theourgia.current_user_id', true)::uuid)
            WITH CHECK (user_id = current_setting('theourgia.current_user_id', true)::uuid);
        """
    )

    # ── session.active_persona_id ────────────────────────────────────
    op.add_column(
        "session",
        sa.Column(
            "active_persona_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persona.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_session_active_persona_id", "session", ["active_persona_id"]
    )

    # ── audit_event.actor_persona_id ─────────────────────────────────
    op.add_column(
        "audit_event",
        sa.Column(
            "actor_persona_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persona.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_audit_actor_persona_created",
        "audit_event",
        ["actor_persona_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_audit_actor_persona_created", table_name="audit_event"
    )
    op.drop_column("audit_event", "actor_persona_id")

    op.drop_index("ix_session_active_persona_id", table_name="session")
    op.drop_column("session", "active_persona_id")

    op.execute("DROP POLICY IF EXISTS persona_owner_rw ON persona")
    op.execute("DROP INDEX IF EXISTS uq_persona_one_default_per_user")
    op.drop_index("ix_persona_user_kind", table_name="persona")
    op.drop_index("ix_persona_user_id", table_name="persona")
    op.drop_table("persona")
    op.execute("DROP TYPE IF EXISTS persona_kind")
