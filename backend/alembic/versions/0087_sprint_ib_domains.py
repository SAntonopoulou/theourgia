"""Sprint I-B: astragaloi casts, two-gate covenant, tetraktys ladder.

Three new backend domains for the Keybearer's Record (H12):

1. **Astragaloi** — ``astragaloi_cast`` table: the throw (five faces,
   sorted), the asking, and the resolved reading snapshot denormalised
   at cast time so history survives corpus edits. Rule 67: the
   ``simulated`` flag is set at insert and never cleared.
2. **Two-gate covenant (rule 69)** — ``entry`` gains the sealed intent
   columns (text / declared_at / sha256 fingerprint; written once,
   immutable at the API) and the two-gate verdict columns (pass |
   fail | open per gate, notes, judged_at, finalized stamp).
   ``custom_practice`` gains the install-by-proof status lifecycle
   (candidate → testing → installed | rejected).
3. **Tetraktys ladder** — ``ladder_sphere`` (global catalog, seeded
   below: sphere number AND serpent-walk position, because the walk
   10→9→8→7→4→5→6→3→2→1 interleaves the figure's rows),
   ``curriculum_item`` and ``sphere_gate`` (owner-scoped).

Revision ID: 0087
Revises: 0086
Create Date: 2026-07-25
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0087"
down_revision: Union[str, None] = "0086"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_VALENCES = ["favourable", "cautionary", "unfavourable"]
_OCTAVES = ["luminous", "embodied", "chthonic"]
_GATE_RESULTS = ["pass", "fail", "open"]
_PRACTICE_STATUSES = ["candidate", "testing", "installed", "rejected"]
_ITEM_KINDS = ["reading", "practice", "deliverable"]

# The operator's ladder. (fixed row id, sphere number, name, walk position)
# Serpent walk: 10→9→8→7→4→5→6→3→2→1.
_SPHERE_SEED = [
    ("a11ade50-0000-4000-8000-000000000010", 10, "Hekate / Decad", 1),
    ("a11ade50-0000-4000-8000-000000000009", 9, "Ennead", 2),
    ("a11ade50-0000-4000-8000-000000000008", 8, "Ogdoad", 3),
    ("a11ade50-0000-4000-8000-000000000007", 7, "Hebdomad", 4),
    ("a11ade50-0000-4000-8000-000000000004", 4, "Tetrad", 5),
    ("a11ade50-0000-4000-8000-000000000005", 5, "Pentad", 6),
    ("a11ade50-0000-4000-8000-000000000006", 6, "Hexad", 7),
    ("a11ade50-0000-4000-8000-000000000003", 3, "Triad", 8),
    ("a11ade50-0000-4000-8000-000000000002", 2, "Dyad", 9),
    ("a11ade50-0000-4000-8000-000000000001", 1, "Monad", 10),
]


def upgrade() -> None:
    # ── Enum types ──────────────────────────────────────────────
    op.execute(
        f"CREATE TYPE astragaloi_valence AS ENUM "
        f"({', '.join(repr(v) for v in _VALENCES)})"
    )
    op.execute(
        f"CREATE TYPE astragaloi_octave AS ENUM "
        f"({', '.join(repr(v) for v in _OCTAVES)})"
    )
    op.execute(
        f"CREATE TYPE gate_result AS ENUM "
        f"({', '.join(repr(v) for v in _GATE_RESULTS)})"
    )
    op.execute(
        f"CREATE TYPE practice_status AS ENUM "
        f"({', '.join(repr(v) for v in _PRACTICE_STATUSES)})"
    )
    op.execute(
        f"CREATE TYPE curriculum_item_kind AS ENUM "
        f"({', '.join(repr(v) for v in _ITEM_KINDS)})"
    )

    # ── Domain 1: astragaloi_cast ───────────────────────────────
    op.create_table(
        "astragaloi_cast",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("faces", postgresql.JSONB(), nullable=False),
        sa.Column("cast_sum", sa.Integer(), nullable=False),
        sa.Column(
            "simulated",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("cast_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column(
            "entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("declared_intent", sa.Text(), nullable=True),
        sa.Column("oracle_number", sa.String(8), nullable=False),
        sa.Column("god_greek", sa.String(128), nullable=False),
        sa.Column("god_english", sa.String(128), nullable=False),
        sa.Column("verse_greek", sa.Text(), nullable=True),
        sa.Column("verse_english", sa.Text(), nullable=False),
        sa.Column(
            "valence",
            postgresql.ENUM(name="astragaloi_valence", create_type=False),
            nullable=False,
        ),
        sa.Column("sphere", sa.Integer(), nullable=False),
        sa.Column(
            "octave",
            postgresql.ENUM(name="astragaloi_octave", create_type=False),
            nullable=False,
        ),
        sa.Column("ground_element", sa.String(16), nullable=False),
        sa.Column("interpretation", sa.Text(), nullable=True),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
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
    )
    op.create_index(
        "ix_astragaloi_cast_owner_id", "astragaloi_cast", ["owner_id"],
    )
    op.create_index(
        "ix_astragaloi_cast_cast_at", "astragaloi_cast", ["cast_at"],
    )
    op.create_index(
        "ix_astragaloi_cast_valence", "astragaloi_cast", ["valence"],
    )
    op.create_index(
        "ix_astragaloi_cast_sphere", "astragaloi_cast", ["sphere"],
    )
    op.create_index(
        "ix_astragaloi_cast_simulated", "astragaloi_cast", ["simulated"],
    )

    # ── Domain 2: two-gate covenant on entry ────────────────────
    op.add_column("entry", sa.Column("intent_text", sa.Text(), nullable=True))
    op.add_column(
        "entry",
        sa.Column(
            "intent_declared_at", sa.DateTime(timezone=True), nullable=True,
        ),
    )
    op.add_column(
        "entry", sa.Column("intent_fingerprint", sa.String(64), nullable=True),
    )
    op.add_column(
        "entry",
        sa.Column(
            "gate1_result",
            postgresql.ENUM(name="gate_result", create_type=False),
            nullable=False,
            server_default="open",
        ),
    )
    op.add_column(
        "entry",
        sa.Column(
            "gate2_result",
            postgresql.ENUM(name="gate_result", create_type=False),
            nullable=False,
            server_default="open",
        ),
    )
    op.add_column("entry", sa.Column("gate1_notes", sa.Text(), nullable=True))
    op.add_column("entry", sa.Column("gate2_notes", sa.Text(), nullable=True))
    op.add_column(
        "entry",
        sa.Column("judged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "entry",
        sa.Column(
            "verdict_finalized_at", sa.DateTime(timezone=True), nullable=True,
        ),
    )
    op.create_index(
        "ix_entry_intent_declared_at", "entry", ["intent_declared_at"],
    )

    # ── Domain 2: install-by-proof on custom_practice ───────────
    op.add_column(
        "custom_practice",
        sa.Column(
            "status",
            postgresql.ENUM(name="practice_status", create_type=False),
            nullable=False,
            server_default="candidate",
        ),
    )
    op.add_column(
        "custom_practice",
        sa.Column(
            "status_changed_at", sa.DateTime(timezone=True), nullable=True,
        ),
    )
    op.add_column(
        "custom_practice", sa.Column("status_note", sa.Text(), nullable=True),
    )

    # ── Domain 3: tetraktys ladder ──────────────────────────────
    op.create_table(
        "ladder_sphere",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("walk_position", sa.Integer(), nullable=False),
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
        sa.UniqueConstraint("number", name="uq_ladder_sphere_number"),
        sa.UniqueConstraint(
            "walk_position", name="uq_ladder_sphere_walk_position",
        ),
    )

    op.create_table(
        "curriculum_item",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "sphere_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ladder_sphere.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "kind",
            postgresql.ENUM(name="curriculum_item_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "required_for_gate",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "evidence_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("entry.id", ondelete="SET NULL"),
            nullable=True,
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
    )
    op.create_index(
        "ix_curriculum_item_sphere_id", "curriculum_item", ["sphere_id"],
    )
    op.create_index(
        "ix_curriculum_item_owner_id", "curriculum_item", ["owner_id"],
    )

    op.create_table(
        "sphere_gate",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "sphere_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ladder_sphere.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("passed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("countersign", sa.String(256), nullable=True),
        sa.Column(
            "initiation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("initiation.id", ondelete="SET NULL"),
            nullable=True,
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
            "owner_id", "sphere_id", name="uq_sphere_gate_owner_sphere",
        ),
    )
    op.create_index(
        "ix_sphere_gate_sphere_id", "sphere_gate", ["sphere_id"],
    )
    op.create_index(
        "ix_sphere_gate_owner_id", "sphere_gate", ["owner_id"],
    )

    # ── Seed: the operator's ladder ─────────────────────────────
    ladder = sa.table(
        "ladder_sphere",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("number", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("walk_position", sa.Integer()),
    )
    op.bulk_insert(
        ladder,
        [
            {
                "id": row_id,
                "number": number,
                "name": name,
                "walk_position": walk_position,
            }
            for row_id, number, name, walk_position in _SPHERE_SEED
        ],
    )


def downgrade() -> None:
    # Domain 3
    op.drop_index("ix_sphere_gate_owner_id", table_name="sphere_gate")
    op.drop_index("ix_sphere_gate_sphere_id", table_name="sphere_gate")
    op.drop_table("sphere_gate")
    op.drop_index("ix_curriculum_item_owner_id", table_name="curriculum_item")
    op.drop_index("ix_curriculum_item_sphere_id", table_name="curriculum_item")
    op.drop_table("curriculum_item")
    op.drop_table("ladder_sphere")

    # Domain 2 — custom_practice
    op.drop_column("custom_practice", "status_note")
    op.drop_column("custom_practice", "status_changed_at")
    op.drop_column("custom_practice", "status")

    # Domain 2 — entry
    op.drop_index("ix_entry_intent_declared_at", table_name="entry")
    op.drop_column("entry", "verdict_finalized_at")
    op.drop_column("entry", "judged_at")
    op.drop_column("entry", "gate2_notes")
    op.drop_column("entry", "gate1_notes")
    op.drop_column("entry", "gate2_result")
    op.drop_column("entry", "gate1_result")
    op.drop_column("entry", "intent_fingerprint")
    op.drop_column("entry", "intent_declared_at")
    op.drop_column("entry", "intent_text")

    # Domain 1
    op.drop_index("ix_astragaloi_cast_simulated", table_name="astragaloi_cast")
    op.drop_index("ix_astragaloi_cast_sphere", table_name="astragaloi_cast")
    op.drop_index("ix_astragaloi_cast_valence", table_name="astragaloi_cast")
    op.drop_index("ix_astragaloi_cast_cast_at", table_name="astragaloi_cast")
    op.drop_index("ix_astragaloi_cast_owner_id", table_name="astragaloi_cast")
    op.drop_table("astragaloi_cast")

    # Enum types
    op.execute("DROP TYPE curriculum_item_kind")
    op.execute("DROP TYPE practice_status")
    op.execute("DROP TYPE gate_result")
    op.execute("DROP TYPE astragaloi_octave")
    op.execute("DROP TYPE astragaloi_valence")
