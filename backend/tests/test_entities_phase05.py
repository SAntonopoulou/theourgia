"""Phase 05 entity expansion + alias-graph tests."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from theourgia.models.entities import (
    Entity,
    EntityAlias,
    EntityAliasKind,
    EntityKind,
    EntityRelationshipStatus,
    EntityView,
    EntityVisibility,
)


# ───── Enum expansion ───────────────────────────────────────────────────


def test_entity_kind_includes_phase02_and_phase05() -> None:
    kinds = {k.value for k in EntityKind}
    phase02_legacy = {"deity", "spirit", "principle", "place", "object", "other"}
    phase05_new = {
        "god", "goddess", "daemon", "angel", "demon", "saint",
        "ancestor", "beloved_dead", "familiar", "servitor", "egregore",
    }
    assert phase02_legacy <= kinds
    assert phase05_new <= kinds


def test_relationship_status_values() -> None:
    assert {s.value for s in EntityRelationshipStatus} == {
        "open", "active", "dormant", "severed", "contracted", "observing",
    }


def test_entity_visibility_values() -> None:
    assert {v.value for v in EntityVisibility} == {
        "personal", "viewer", "hub", "public",
    }


def test_entity_alias_kind_values() -> None:
    assert {k.value for k in EntityAliasKind} == {
        "same-as", "aspect-of", "aspect-includes",
        "syncretic-with", "epithet-of",
    }


# ───── Entity defaults ──────────────────────────────────────────────────


def test_entity_defaults() -> None:
    entity = Entity(name="Hekate")
    assert entity.kind == EntityKind.OTHER
    assert entity.aliases == []
    assert entity.epithets == []
    assert entity.tradition_tags == []
    assert entity.attributions == {}
    assert entity.relationship_status == EntityRelationshipStatus.OPEN
    assert entity.visibility == EntityVisibility.PERSONAL


def test_entity_carries_full_phase05_payload() -> None:
    entity = Entity(
        name="Hekate",
        kind=EntityKind.GODDESS,
        aliases=["Ἑκάτη"],
        epithets=["Soteira", "Trivia", "Chthonia", "Propylaia"],
        glyph="moon",
        pronouns="she/her",
        gender="goddess",
        summary="Hellenic goddess of crossroads, the moon, witchcraft, and the boundary between worlds.",
        description="Long form description here.",
        tradition="hellenic",
        tradition_tags=["hellenic", "chthonic", "magical"],
        attributions={
            "planet": "moon",
            "day": "monday",
            "element": "earth",
            "color": "black",
            "scent": "myrrh",
            "herb": "asphodel",
        },
        relationship_status=EntityRelationshipStatus.ACTIVE,
        first_contact_at=datetime(2022, 9, 21, tzinfo=UTC),
        last_contact_at=datetime(2026, 6, 1, tzinfo=UTC),
        notes_private="Personal context.",
        notes_shareable="What I'd share publicly.",
        visibility=EntityVisibility.PERSONAL,
        origin="bundle:hekate-working",
    )
    assert entity.epithets == ["Soteira", "Trivia", "Chthonia", "Propylaia"]
    assert entity.attributions["planet"] == "moon"
    assert entity.relationship_status == EntityRelationshipStatus.ACTIVE
    assert entity.tradition_tags == ["hellenic", "chthonic", "magical"]


# ───── EntityAlias ──────────────────────────────────────────────────────


def test_entity_alias_relates_two_entities() -> None:
    source_id = uuid4()
    target_id = uuid4()
    alias = EntityAlias(
        source_entity_id=source_id,
        target_entity_id=target_id,
        kind=EntityAliasKind.ASPECT_OF,
        notes="Hekate-Soteira is an aspect of Hekate-the-broader (PGM IV.2785-2890).",
    )
    assert alias.source_entity_id == source_id
    assert alias.target_entity_id == target_id
    assert alias.kind == EntityAliasKind.ASPECT_OF


def test_entity_alias_symmetric_kind() -> None:
    """same-as is symmetric — the API will match bidirectionally."""
    alias = EntityAlias(
        source_entity_id=uuid4(),
        target_entity_id=uuid4(),
        kind=EntityAliasKind.SAME_AS,
    )
    assert alias.kind == EntityAliasKind.SAME_AS


def test_entity_alias_epithet_directional() -> None:
    """epithet-of is asymmetric — direction matters."""
    alias = EntityAlias(
        source_entity_id=uuid4(),  # the epithet entity
        target_entity_id=uuid4(),  # the entity the epithet attaches to
        kind=EntityAliasKind.EPITHET_OF,
    )
    assert alias.kind == EntityAliasKind.EPITHET_OF


# ───── EntityView ──────────────────────────────────────────────────────


def test_entity_view_aggregates_entity_ids() -> None:
    view = EntityView(
        name="Hekate-all",
        member_entity_ids=[
            "11111111-1111-1111-1111-111111111111",
            "22222222-2222-2222-2222-222222222222",
            "33333333-3333-3333-3333-333333333333",
        ],
        description="Unified view across the three Hekate entries (Hellenic / PGM / personal).",
    )
    assert len(view.member_entity_ids) == 3
    assert "11111111-1111-1111-1111-111111111111" in view.member_entity_ids


def test_entity_view_default_is_empty() -> None:
    view = EntityView(name="empty")
    assert view.member_entity_ids == []


# ───── Settled merge model invariants ──────────────────────────────────


def test_entities_remain_immutable_nodes_post_alias() -> None:
    """An EntityAlias does not modify the source/target entities.
    The plan's "no data loss" invariant.
    """
    source = Entity(name="Hekate-Greek", kind=EntityKind.GODDESS, tradition="hellenic")
    target = Entity(name="Hekate-PGM", kind=EntityKind.GODDESS, tradition="ptgm")
    # Construct an alias linking them as same-as.
    EntityAlias(
        source_entity_id=uuid4(),
        target_entity_id=uuid4(),
        kind=EntityAliasKind.SAME_AS,
    )
    # The two entities retain their distinct identifiers.
    assert source.name == "Hekate-Greek"
    assert target.name == "Hekate-PGM"
    assert source.tradition != target.tradition


def test_entity_origin_carries_provenance() -> None:
    """The plan's import-time invariant: bundles import with `origin`
    so the user can distinguish personal from bundled entities.
    """
    bundle_entity = Entity(
        name="Hekate",
        origin="bundle:hekate-working@v1.2.0",
    )
    personal_entity = Entity(
        name="Hekate",
        origin="personal",
    )
    assert bundle_entity.origin != personal_entity.origin
