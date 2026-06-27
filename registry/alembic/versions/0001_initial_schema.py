"""Registry initial schema · author + maintainer + plugin + advisory.

Revision ID: 0001
Revises:
Create Date: 2026-06-27
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums first — shared by multiple tables.
    maintainer_role = postgresql.ENUM(
        "lead", "reviewer", name="maintainer_role", create_type=False,
    )
    maintainer_role.create(op.get_bind(), checkfirst=True)

    plugin_tier = postgresql.ENUM(
        "official", "community", "unverified",
        name="plugin_tier", create_type=False,
    )
    plugin_tier.create(op.get_bind(), checkfirst=True)

    version_status = postgresql.ENUM(
        "pending_review",
        "under_review",
        "changes_requested",
        "accepted_community",
        "accepted_official",
        "rejected",
        "withdrawn",
        name="version_status",
        create_type=False,
    )
    version_status.create(op.get_bind(), checkfirst=True)

    advisory_severity = postgresql.ENUM(
        "low", "medium", "high",
        name="advisory_severity", create_type=False,
    )
    advisory_severity.create(op.get_bind(), checkfirst=True)

    # ── author ────────────────────────────────────────────────────────
    op.create_table(
        "author",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("did", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("homepage", sa.String(500), nullable=True),
        sa.Column("contact_email", sa.String(320), nullable=True),
        sa.Column("public_key_pem", sa.String(2048), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("did", name="uq_author_did"),
    )

    # ── maintainer ────────────────────────────────────────────────────
    op.create_table(
        "maintainer",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("author.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", maintainer_role, nullable=False),
        sa.Column("appointed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "appointed_by_author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("author.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("author_id", name="uq_maintainer_author"),
    )

    # ── plugin ────────────────────────────────────────────────────────
    op.create_table(
        "plugin",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("author.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False, server_default=""),
        sa.Column("homepage", sa.String(500), nullable=True),
        sa.Column("tier", plugin_tier, nullable=False),
        sa.Column("tombstoned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tombstone_reason", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("author_id", "name", name="uq_plugin_author_name"),
    )

    # ── plugin_version ────────────────────────────────────────────────
    op.create_table(
        "plugin_version",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "plugin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plugin.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("license_spdx", sa.String(64), nullable=False),
        sa.Column("source_url", sa.String(500), nullable=False),
        sa.Column("signature_base64", sa.String(255), nullable=False),
        sa.Column("manifest_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("capabilities", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("status", version_status, nullable=False),
        sa.Column(
            "submitted_by_author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("author.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "decided_by_maintainer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("maintainer.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("plugin_id", "version", name="uq_plugin_version_plugin_version"),
    )

    # ── review_note ───────────────────────────────────────────────────
    op.create_table(
        "review_note",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "plugin_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plugin_version.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "maintainer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("maintainer.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("body", sa.String(8000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── tier_promotion ────────────────────────────────────────────────
    op.create_table(
        "tier_promotion",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "plugin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plugin.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "promoted_by_maintainer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("maintainer.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("from_tier", plugin_tier, nullable=False),
        sa.Column("to_tier", plugin_tier, nullable=False),
        sa.Column("justification", sa.String(4000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # ── vulnerability_advisory ────────────────────────────────────────
    op.create_table(
        "vulnerability_advisory",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "plugin_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("plugin.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "filed_by_author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("author.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("severity", advisory_severity, nullable=False),
        sa.Column("affected_version_range", sa.String(255), nullable=False),
        sa.Column("body", sa.String(8000), nullable=False),
        sa.Column("remediation_version", sa.String(64), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_table("vulnerability_advisory")
    op.drop_table("tier_promotion")
    op.drop_table("review_note")
    op.drop_table("plugin_version")
    op.drop_table("plugin")
    op.drop_table("maintainer")
    op.drop_table("author")
    for enum_name in (
        "advisory_severity",
        "version_status",
        "plugin_tier",
        "maintainer_role",
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
