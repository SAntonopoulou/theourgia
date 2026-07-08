"""Entities — the magickal-beings ledger.

A magician's catalogue of beings, places, principles, planets,
ancestors, servitors. Used across the corpus (entries reference
entities; rituals invoke them; offerings target them).

**Phase 05 expansion**: extends the Phase 02 minimal Entity with
the full set of practitioner-relevant columns documented in
`plan/05-magical-beings.md` §1, and adds the alias-graph (§11):
typed relationships between entities + user-defined unified views.

The alias-graph model is the project's settled answer to the
"is this the same entity?" question (see
``plan/customization-decision-2026-06-21.md`` + the entity-merge
decision memory). Briefly:

* Entities are immutable nodes with stable ids and origins.
* Imports never overwrite personal entities.
* Typed alias relationships (`same-as` / `aspect-of` / `syncretic-with`
  / `epithet-of`) declare how the user relates two entities without
  destroying either.
* Workings, offerings, contracts always attach to one specific entity_id;
  cross-entity aggregation happens at read time via :class:`EntityView`.
"""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.models.base import IDMixin, SoftDeleteMixin, TimestampMixin

__all__ = [
    "Entity",
    "EntityAlias",
    "EntityAliasKind",
    "EntityKind",
    "EntityRelationshipStatus",
    "EntityView",
    "EntityVisibility",
]


class EntityKind(str, enum.Enum):
    """The taxonomy a Theourgia entity belongs to.

    The first six (DEITY..OTHER) are the Phase 02 set, kept for
    backwards compatibility. The rest are Phase 05 expansions per
    `plan/05-magical-beings.md` §1.
    """

    # Phase 02 legacy
    DEITY = "deity"
    SPIRIT = "spirit"
    PRINCIPLE = "principle"
    PLACE = "place"
    OBJECT = "object"
    OTHER = "other"

    # Phase 05 expansions
    GOD = "god"
    GODDESS = "goddess"
    DAEMON = "daemon"
    ANGEL = "angel"
    DEMON = "demon"
    SAINT = "saint"
    ANCESTOR = "ancestor"
    BELOVED_DEAD = "beloved_dead"
    FAMILIAR = "familiar"
    SERVITOR = "servitor"
    EGREGORE = "egregore"


class EntityRelationshipStatus(str, enum.Enum):
    """How the practitioner stands with this entity right now.

    Surfaces in the entity profile header so a glance tells the user
    whether they have a live working relationship, a dormant one, or
    a severed one (e.g. after a banishing or a contract breach).
    """

    OPEN = "open"  # Have not yet contacted; in the ledger for study.
    ACTIVE = "active"  # Currently in working relationship.
    DORMANT = "dormant"  # Not actively engaged but not closed.
    SEVERED = "severed"  # Contact closed (banishing, severance ritual).
    CONTRACTED = "contracted"  # A pact / contract is in force.
    OBSERVING = "observing"  # Watching without engaging.


class EntityVisibility(str, enum.Enum):
    """Who can read this entity record.

    Parallel to ``EntryVisibility`` but a separate enum because
    entities and entries may diverge on visibility semantics over
    time (e.g. when hub-visibility for entities folds in the entity
    cult mechanics).
    """

    PERSONAL = "personal"
    VIEWER = "viewer"
    HUB = "hub"
    PUBLIC = "public"


class EntityAliasKind(str, enum.Enum):
    """How two entities relate. The full set documented in plan/05 §11.

    The relationship is **directed**: ``source`` → ``target``. For
    symmetric kinds (`same-as`, `syncretic-with`, `sibling-of`,
    `spouse-of`) the application treats them as bidirectional at
    query time; for asymmetric kinds (`aspect-of`, `epithet-of`,
    `parent-of`) the direction is meaningful.

    The `parent-of` / `sibling-of` / `spouse-of` kinds are the
    kinship graph for the ancestor / beloved-dead registry
    (FEATURES §3). No genealogy-service integration — this is
    entirely local.
    """

    SAME_AS = "same-as"  # User considers the two entities identical.
    ASPECT_OF = "aspect-of"  # source is an aspect of target.
    ASPECT_INCLUDES = "aspect-includes"  # source includes target as aspect.
    SYNCRETIC_WITH = "syncretic-with"  # Related but distinct; spoken to as one in some rites.
    EPITHET_OF = "epithet-of"  # source is an epithet attached to target.
    # Kinship (family-tree) kinds. Adopted / step / chosen-family all
    # collapse into these three with a ``notes`` string.
    PARENT_OF = "parent-of"  # source is a parent of target.
    SIBLING_OF = "sibling-of"  # symmetric.
    SPOUSE_OF = "spouse-of"  # symmetric; covers partners of any form.


KINSHIP_ALIAS_KINDS: frozenset[EntityAliasKind] = frozenset(
    {
        EntityAliasKind.PARENT_OF,
        EntityAliasKind.SIBLING_OF,
        EntityAliasKind.SPOUSE_OF,
    }
)


class Entity(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """One catalogued entity in the magician's ledger."""

    __tablename__ = "entity"
    __table_args__ = (
        Index("ix_entity_owner", "owner_id"),
        Index("ix_entity_name", "name"),
        Index("ix_entity_kind", "kind"),
        Index("ix_entity_relationship_status", "relationship_status"),
        Index("ix_entity_visibility", "visibility"),
    )

    # — Identity ——————————————————————————————————————————
    name: str = Field(
        sa_column=Column(String(256), nullable=False),
        description="Primary identifier — typically the most commonly used name.",
    )

    kind: EntityKind = Field(
        default=EntityKind.OTHER,
        sa_column=Column(
            SQLEnum(
                EntityKind,
                name="entity_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="other",
        ),
    )

    aliases: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Alternative names this entity is known by. Free-form list. "
            "The TYPED alias relationships (same-as / aspect-of / etc.) "
            "live in the entity_alias table (Phase 05)."
        ),
    )

    epithets: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Titles + epithets distinct from the primary name "
            '("Soteira", "Trivia", "Chthonia"). Distinguished from '
            "aliases so the UI can surface them differently."
        ),
    )

    glyph: str = Field(
        default="entity",
        sa_column=Column(String(64), nullable=False, server_default="entity"),
    )

    pronouns: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description='Entity-determined pronouns ("she/her", "they/them", "he/him", or any custom).',
    )

    gender: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description='Where applicable — entity-determined, not user-imposed.',
    )

    summary: Optional[str] = Field(
        default=None,
        sa_column=Column(String(1024), nullable=True),
        description="One-line summary for cards / hover-previews.",
    )

    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Rich text description — correspondences, attributes, lineage.",
    )

    # — Tradition + attribution ————————————————————————————
    tradition: str = Field(
        sa_column=Column(String(64), nullable=False, server_default=""),
        description="Primary tradition tag (back-compat with Phase 02).",
    )

    tradition_tags: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "Full list of tradition tags this entity belongs to "
            "(Hellenic, Thelemic, Hermetic, Goetic, Vedic, …). The "
            "primary `tradition` column is the first / preferred tag."
        ),
    )

    attributions: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "Free-form correspondence table: planetary / elemental / "
            "sphere / decan / day / hour / color / scent / herb / stone / "
            "sound / number. Plugin extension point — tradition-specific "
            "keys allowed."
        ),
    )

    # — Attached media (FKs to upload table) ——————————————
    seal_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional seal / sigil image.",
    )

    portrait_upload_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("upload.id", ondelete="SET NULL"),
            nullable=True,
        ),
        description="Optional portrait image.",
    )

    # — Relationship state —————————————————————————————
    relationship_status: EntityRelationshipStatus = Field(
        default=EntityRelationshipStatus.OPEN,
        sa_column=Column(
            SQLEnum(
                EntityRelationshipStatus,
                name="entity_relationship_status",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="open",
        ),
    )

    first_contact_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True},
    )

    last_contact_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"nullable": True, "index": True},
    )

    # — Ancestor / beloved-dead profile ————————————————————
    # Populated when kind IN (ancestor, beloved_dead). The whole
    # blob is owner-only; ``cause_of_death_private`` is doubly
    # protected — never surfaced through any GET even to the owner
    # when the request path is public, and never rendered in any
    # tree viz. Keys are the ones on FEATURES.md §3:
    #   dates_lived_from, dates_lived_until (ISO strings or free)
    #   relationship_to_owner (string)
    #   cause_of_death_private (string; owner-only)
    #   burial_place (string)
    #   photo_upload_id (uuid string)
    ancestor_profile: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description=(
            "Per-ancestor profile fields for kind=ancestor/beloved_dead. "
            "Empty on non-ancestor entities. Field cause_of_death_private "
            "is stripped from any non-owner read path."
        ),
    )

    # — Notes ————————————————————————————————————————
    notes_private: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Private notes only the owner sees, regardless of visibility.",
    )

    notes_shareable: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description="Notes that travel with the entity if it's shared / federated.",
    )

    # — Access ——————————————————————————————————————
    visibility: EntityVisibility = Field(
        default=EntityVisibility.PERSONAL,
        sa_column=Column(
            SQLEnum(
                EntityVisibility,
                name="entity_visibility",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
            server_default="personal",
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )

    # Provenance: bundles import entities with an ``origin`` so the
    # user can tell "this is the Hekate from the Hekate Bundle" vs
    # "this is the Hekate I added myself."
    origin: Optional[str] = Field(
        default=None,
        sa_column=Column(String(256), nullable=True),
        description=(
            'Origin string — "personal", "bundle:hekate-working", '
            '"import:my-old-vault@2024-08-12", etc.'
        ),
    )


class EntityAlias(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A typed relationship between two entities (alias-graph).

    Per plan/05 §11. Directed edge from ``source_entity_id`` to
    ``target_entity_id`` with one of the :class:`EntityAliasKind`
    values. Symmetric kinds (`same-as`, `syncretic-with`) are stored
    as a single row but matched bidirectionally at query time.
    """

    __tablename__ = "entity_alias"
    __table_args__ = (
        Index("ix_entity_alias_source_id", "source_entity_id"),
        Index("ix_entity_alias_target_id", "target_entity_id"),
        Index("ix_entity_alias_kind", "kind"),
    )

    source_entity_id: UUID = Field(
        sa_column=Column(
            ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    target_entity_id: UUID = Field(
        sa_column=Column(
            ForeignKey("entity.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    kind: EntityAliasKind = Field(
        sa_column=Column(
            SQLEnum(
                EntityAliasKind,
                name="entity_alias_kind",
                values_callable=lambda obj: [m.value for m in obj],
            ),
            nullable=False,
        ),
    )

    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
        description=(
            "Optional explanation — 'Hekate-Soteira appears in the "
            "PGM as an aspect of Hekate-the-broader; cross-reference "
            "Greek Magical Papyri IV.2785-2890'."
        ),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


class EntityView(IDMixin, TimestampMixin, SoftDeleteMixin, table=True):
    """A user-defined unified view across multiple entities.

    Per plan/05 §11. The user names a view ("Hekate-all") and the
    query layer aggregates offerings / contracts / workings across
    every member entity at read time. Write paths still attach to a
    specific entity_id — the view is purely a display affordance.
    """

    __tablename__ = "entity_view"
    __table_args__ = (
        Index("ix_entity_view_owner_id", "owner_id"),
        Index("ix_entity_view_name", "name"),
    )

    name: str = Field(
        sa_column=Column(String(256), nullable=False),
        description='Display name for the unified view — "Hekate-all", "Lunar deities".',
    )

    member_entity_ids: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="[]"),
        description=(
            "JSON array of entity_ids included in this view. Aggregation "
            "is performed at query time by the API layer."
        ),
    )

    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    owner_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
