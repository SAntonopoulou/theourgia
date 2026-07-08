"""Family tree kinship graph tests — b108-2ha.

Covers:
- new EntityAliasKind values (parent-of / sibling-of / spouse-of)
- Entity.ancestor_profile column defaults
- router shape (paths + auth-required)
- pydantic schema validation
"""

from __future__ import annotations

from fastapi.routing import APIRoute

from theourgia.api.routers.v1 import entities as entities_module
from theourgia.api.routers.v1.entities import (
    FamilyTree,
    FamilyTreeEdge,
    FamilyTreeNode,
    KinshipCreate,
    KinshipRead,
)
from theourgia.models.entities import (
    KINSHIP_ALIAS_KINDS,
    Entity,
    EntityAliasKind,
    EntityKind,
)


# ── Enum expansion ─────────────────────────────────────────────────────


def test_kinship_alias_kinds_added() -> None:
    values = {k.value for k in EntityAliasKind}
    assert "parent-of" in values
    assert "sibling-of" in values
    assert "spouse-of" in values


def test_kinship_alias_kinds_frozenset_matches_enum() -> None:
    assert KINSHIP_ALIAS_KINDS == frozenset(
        {
            EntityAliasKind.PARENT_OF,
            EntityAliasKind.SIBLING_OF,
            EntityAliasKind.SPOUSE_OF,
        }
    )


# ── Entity ancestor_profile ────────────────────────────────────────────


def test_entity_ancestor_profile_default_is_empty_dict() -> None:
    entity = Entity(name="great-grandmother", kind=EntityKind.BELOVED_DEAD)
    assert entity.ancestor_profile == {}


def test_entity_ancestor_profile_carries_full_payload() -> None:
    entity = Entity(
        name="ancestor",
        kind=EntityKind.ANCESTOR,
        ancestor_profile={
            "dates_lived_from": "1892",
            "dates_lived_until": "1971",
            "relationship_to_owner": "maternal great-grandmother",
            "cause_of_death_private": "cancer",
            "burial_place": "Athens, First Cemetery",
        },
    )
    assert entity.ancestor_profile["dates_lived_from"] == "1892"
    assert entity.ancestor_profile["cause_of_death_private"] == "cancer"


# ── Pydantic schemas ──────────────────────────────────────────────────


def test_kinship_create_requires_target_and_kind() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        KinshipCreate()  # type: ignore[call-arg]


def test_kinship_create_rejects_non_kinship_kind() -> None:
    """The KinshipAliasKindLiteral bounds the kind to the three."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        KinshipCreate(  # type: ignore[call-arg]
            target_entity_id="00000000-0000-0000-0000-000000000001",
            kind="same-as",
        )


def test_family_tree_node_defaults() -> None:
    node = FamilyTreeNode(
        id="00000000-0000-0000-0000-000000000001",
        name="Probe",
        kind="beloved_dead",
        generation=0,
    )
    assert node.ancestor_profile == {}


def test_family_tree_shape() -> None:
    tree = FamilyTree(
        probe_id="00000000-0000-0000-0000-000000000001",
        nodes=[
            FamilyTreeNode(
                id="00000000-0000-0000-0000-000000000001",
                name="Probe",
                kind="ancestor",
                generation=0,
            ),
            FamilyTreeNode(
                id="00000000-0000-0000-0000-000000000002",
                name="Mother",
                kind="ancestor",
                generation=-1,
            ),
        ],
        edges=[
            FamilyTreeEdge(
                id="00000000-0000-0000-0000-000000000010",
                source_entity_id="00000000-0000-0000-0000-000000000002",
                target_entity_id="00000000-0000-0000-0000-000000000001",
                kind="parent-of",
            ),
        ],
    )
    assert len(tree.nodes) == 2
    assert tree.edges[0].kind == "parent-of"


# ── Router surface ─────────────────────────────────────────────────────


def test_router_has_family_tree_paths() -> None:
    paths_methods = {
        (r.path, m)
        for r in entities_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/entities/{entity_id}/kinship", "POST") in paths_methods
    assert ("/entities/kinship/{alias_id}", "DELETE") in paths_methods
    assert ("/entities/{entity_id}/family-tree", "GET") in paths_methods


def test_every_route_requires_auth() -> None:
    """Post-b108-2gt sweep: every entity route must depend on
    ``get_current_user`` — no ``OptionalCookieUser`` on this router."""
    from theourgia.api.deps import get_current_user

    for route in entities_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        names = [
            d.call.__name__
            for d in deps
            if hasattr(d.call, "__name__")
        ]
        # walk sub-dependencies too — CurrentUser is a Depends alias
        for d in deps:
            for sub in d.dependencies:
                if hasattr(sub.call, "__name__"):
                    names.append(sub.call.__name__)
        # get_current_user should be somewhere in the chain
        assert (
            get_current_user in [d.call for d in deps]
            or "get_current_user" in names
        ), f"{route.path} does not require auth"
