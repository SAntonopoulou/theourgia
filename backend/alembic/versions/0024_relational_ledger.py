"""Phase 05 relational ledger — contracts + oaths + initiations + servitors + attestations.

Revision ID: 0024
Revises: 0023
Create Date: 2026-06-21

One migration for the remaining Phase 05 tables. Each is a self-
contained ledger with its own enums; consolidating into one migration
keeps the alembic chain manageable.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _create_enum(name: str, values: list[str]) -> None:
    op.execute(
        f"CREATE TYPE {name} AS ENUM "
        f"({', '.join(repr(v) for v in values)})"
    )


def _drop_enum(name: str) -> None:
    op.execute(f"DROP TYPE IF EXISTS {name}")


def upgrade() -> None:
    # — Enums ————————————————————————————————————————
    _create_enum("contract_status", [
        "draft", "active", "fulfilled", "expired", "dissolved", "breached",
    ])
    _create_enum("contract_binding_kind", [
        "verbal", "written", "blood", "breath",
        "item-bound", "name-bound", "other",
    ])
    _create_enum("oath_kind", [
        "self", "tradition", "order", "deity",
        "partner", "community", "other",
    ])
    _create_enum("oath_status", [
        "active", "fulfilled", "broken", "renounced", "lapsed",
    ])
    _create_enum("initiation_status", [
        "active", "lapsed", "suspended", "resigned",
    ])
    _create_enum("servitor_kind", ["servitor", "egregore"])
    _create_enum("servitor_status", [
        "active", "dormant", "retired", "decommissioned",
    ])
    _create_enum("servitor_task_status", [
        "pending", "in-progress", "completed", "abandoned",
    ])
    _create_enum("attestation_kind", [
        "initiation", "grade-granted", "membership",
        "teacher-student", "ordination", "authorship", "other",
    ])
    _create_enum("attestation_visibility", [
        "private", "viewer", "network", "public",
    ])

    # — contract ————————————————————————————————————
    op.create_table(
        "contract",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("terms", sa.Text(), nullable=True),
        sa.Column("our_obligations", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("their_obligations", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "status",
            postgresql.ENUM(name="contract_status", create_type=False),
            nullable=False, server_default="draft",
        ),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("renewable", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "binding_kind",
            postgresql.ENUM(name="contract_binding_kind", create_type=False),
            nullable=False, server_default="verbal",
        ),
        sa.Column("witness_entity_ids", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "dissolution_ritual_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_contract_owner_id", "contract", ["owner_id"])
    op.create_index("ix_contract_entity_id", "contract", ["entity_id"])
    op.create_index("ix_contract_status", "contract", ["status"])
    op.create_index("ix_contract_expires_at", "contract", ["expires_at"])

    # — oath ————————————————————————————————————————
    op.create_table(
        "oath",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "kind",
            postgresql.ENUM(name="oath_kind", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "recipient_entity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entity.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("recipient_text", sa.String(512), nullable=True),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column(
            "encryption_mode",
            postgresql.ENUM(name="entry_encryption_mode", create_type=False),
            nullable=False,
            server_default="sealed",
        ),
        sa.Column("encrypted_payload", sa.LargeBinary(), nullable=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("renewal_cadence", sa.String(128), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="oath_status", create_type=False),
            nullable=False, server_default="active",
        ),
        sa.Column("accountability_checkpoints", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_oath_owner_id", "oath", ["owner_id"])
    op.create_index("ix_oath_kind", "oath", ["kind"])
    op.create_index("ix_oath_status", "oath", ["status"])

    # — initiation ————————————————————————————————————
    op.create_table(
        "initiation",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tradition", sa.String(128), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="initiation_status", create_type=False),
            nullable=False, server_default="active",
        ),
        sa.Column(
            "encryption_mode",
            postgresql.ENUM(name="entry_encryption_mode", create_type=False),
            nullable=False,
            server_default="sealed",
        ),
        sa.Column("encrypted_payload", sa.LargeBinary(), nullable=True),
        sa.Column("publicly_disclosed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_initiation_owner_id", "initiation", ["owner_id"])
    op.create_index("ix_initiation_status", "initiation", ["status"])

    # — servitor + servitor_task ——————————————————————
    op.create_table(
        "servitor",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(name="servitor_kind", create_type=False),
            nullable=False, server_default="servitor",
        ),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column(
            "sigil_upload_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "creation_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("feeding_cadence", sa.String(64), nullable=True),
        sa.Column("feeding_method", sa.String(128), nullable=True),
        sa.Column("last_fed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lifespan_limit", sa.Date(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="servitor_status", create_type=False),
            nullable=False, server_default="active",
        ),
        sa.Column("members", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_servitor_owner_id", "servitor", ["owner_id"])
    op.create_index("ix_servitor_kind", "servitor", ["kind"])
    op.create_index("ix_servitor_status", "servitor", ["status"])
    op.create_index("ix_servitor_last_fed_at", "servitor", ["last_fed_at"])

    op.create_table(
        "servitor_task",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "servitor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("servitor.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("given_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("target_completion_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="servitor_task_status", create_type=False),
            nullable=False, server_default="pending",
        ),
        sa.Column("outcome_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_servitor_task_servitor_id", "servitor_task", ["servitor_id"])
    op.create_index("ix_servitor_task_status", "servitor_task", ["status"])

    # — attestation + signature ————————————————————————
    op.create_table(
        "attestation",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "subject_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "subject_persona_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persona.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(name="attestation_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tradition", sa.String(128), nullable=True),
        sa.Column("grade_or_degree", sa.String(128), nullable=True),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signed_statement", sa.LargeBinary(), nullable=False),
        sa.Column(
            "visibility",
            postgresql.ENUM(name="attestation_visibility", create_type=False),
            nullable=False, server_default="private",
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_attestation_subject_user_id", "attestation", ["subject_user_id"])
    op.create_index("ix_attestation_subject_persona_id", "attestation", ["subject_persona_id"])
    op.create_index("ix_attestation_visibility", "attestation", ["visibility"])
    op.create_index("ix_attestation_kind", "attestation", ["kind"])

    op.create_table(
        "attestation_signature",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "attestation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attestation.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "signer_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("signer_label", sa.String(256), nullable=False),
        sa.Column("signer_public_key", sa.LargeBinary(), nullable=False),
        sa.Column("signature", sa.LargeBinary(), nullable=False),
        sa.Column("role", sa.String(64), nullable=False, server_default="counter-sign"),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_attestation_signature_attestation_id", "attestation_signature", ["attestation_id"])
    op.create_index("ix_attestation_signature_signer_user_id", "attestation_signature", ["signer_user_id"])


def downgrade() -> None:
    # Drop in reverse FK order.
    op.drop_index("ix_attestation_signature_signer_user_id", table_name="attestation_signature")
    op.drop_index("ix_attestation_signature_attestation_id", table_name="attestation_signature")
    op.drop_table("attestation_signature")

    op.drop_index("ix_attestation_kind", table_name="attestation")
    op.drop_index("ix_attestation_visibility", table_name="attestation")
    op.drop_index("ix_attestation_subject_persona_id", table_name="attestation")
    op.drop_index("ix_attestation_subject_user_id", table_name="attestation")
    op.drop_table("attestation")

    op.drop_index("ix_servitor_task_status", table_name="servitor_task")
    op.drop_index("ix_servitor_task_servitor_id", table_name="servitor_task")
    op.drop_table("servitor_task")

    op.drop_index("ix_servitor_last_fed_at", table_name="servitor")
    op.drop_index("ix_servitor_status", table_name="servitor")
    op.drop_index("ix_servitor_kind", table_name="servitor")
    op.drop_index("ix_servitor_owner_id", table_name="servitor")
    op.drop_table("servitor")

    op.drop_index("ix_initiation_status", table_name="initiation")
    op.drop_index("ix_initiation_owner_id", table_name="initiation")
    op.drop_table("initiation")

    op.drop_index("ix_oath_status", table_name="oath")
    op.drop_index("ix_oath_kind", table_name="oath")
    op.drop_index("ix_oath_owner_id", table_name="oath")
    op.drop_table("oath")

    op.drop_index("ix_contract_expires_at", table_name="contract")
    op.drop_index("ix_contract_status", table_name="contract")
    op.drop_index("ix_contract_entity_id", table_name="contract")
    op.drop_index("ix_contract_owner_id", table_name="contract")
    op.drop_table("contract")

    for name in [
        "attestation_visibility", "attestation_kind",
        "servitor_task_status", "servitor_status", "servitor_kind",
        "initiation_status",
        "oath_status", "oath_kind",
        "contract_binding_kind", "contract_status",
    ]:
        _drop_enum(name)
