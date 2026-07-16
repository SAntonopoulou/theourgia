"""MBF export builders + export→import round-trips — v1-011.

ADR-0011 export path: vault content → .mbf → re-import lands the
same knowledge (entities + recipes exercised end-to-end), private
fields never travel, and closed-tradition declarations survive
export.
"""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from tests.mbf_fixtures import _FakeSession, _Result, _user
from theourgia.api.routers.v1 import bundles as bundles_module
from theourgia.api.routers.v1.bundles import export_bundle
from theourgia.core.bundles.container import read_mbf
from theourgia.core.bundles.exporter import (
    EXPORTABLE_TYPES,
    build_export,
)
from theourgia.core.bundles.importer import (
    STATUS_IMPORTED,
    import_parsed_bundle,
)
from theourgia.core.bundles.signing import (
    VERDICT_VERIFIED,
    verify_container,
)
from theourgia.core.federation.keys import generate_keypair
from theourgia.models.entities import Entity, EntityKind
from theourgia.models.recipe import Recipe, RecipeKind


def _entity_rows(owner_id) -> list[Entity]:
    return [
        Entity(
            name="Hekate",
            kind=EntityKind.GODDESS,
            epithets=["Soteira"],
            tradition="hellenic",
            tradition_tags=["hellenic"],
            summary="Goddess of crossroads and keys.",
            notes_private="NEVER-EXPORT-THIS",
            notes_shareable="Works well at the dark moon.",
            owner_id=owner_id,
        ),
        Entity(
            name="Hermes",
            kind=EntityKind.GOD,
            tradition_tags=["hellenic"],
            owner_id=owner_id,
        ),
    ]


def _recipe_rows(owner_id) -> list[Recipe]:
    return [
        Recipe(
            owner_id=owner_id,
            kind=RecipeKind.INCENSE,
            name="Crossroads Incense",
            ingredients=[{"name": "storax", "amount": "1 part"}],
            steps=[{"text": "Blend under a dark moon."}],
            correspondences={"planetary": "moon"},
        ),
    ]


async def test_export_entities_round_trips_through_import() -> None:
    owner = uuid4()
    export_session = _FakeSession([_Result(rows=_entity_rows(owner))])
    data = await build_export(
        export_session,  # type: ignore[arg-type]
        owner_id=owner,
        bundle_type="pantheon",
        author_name="Soror Test",
    )

    parsed = read_mbf(data)
    assert parsed.manifest.type == "pantheon"
    assert parsed.manifest.author.name == "Soror Test"

    new_owner = uuid4()
    import_session = _FakeSession()
    results = await import_parsed_bundle(
        import_session, parsed, owner_id=new_owner
    )
    assert all(r.status == STATUS_IMPORTED for r in results)
    names = sorted(row.name for row in import_session.added)
    assert names == ["Hekate", "Hermes"]
    hekate = next(r for r in import_session.added if r.name == "Hekate")
    assert hekate.epithets == ["Soteira"]
    assert hekate.tradition_tags == ["hellenic"]
    assert hekate.notes_shareable == "Works well at the dark moon."
    assert hekate.origin == "imported_from_bundle:pantheon-export@1.0.0"


async def test_export_never_carries_private_fields() -> None:
    owner = uuid4()
    session = _FakeSession([_Result(rows=_entity_rows(owner))])
    data = await build_export(
        session,  # type: ignore[arg-type]
        owner_id=owner,
        bundle_type="pantheon",
        author_name="Soror Test",
    )
    assert b"NEVER-EXPORT-THIS" not in data
    parsed = read_mbf(data)
    for _kind, item in parsed.iter_items():
        assert "notes_private" not in item
        assert "ancestor_profile" not in item


async def test_export_recipes_round_trips_through_import() -> None:
    owner = uuid4()
    export_session = _FakeSession([_Result(rows=_recipe_rows(owner))])
    data = await build_export(
        export_session,  # type: ignore[arg-type]
        owner_id=owner,
        bundle_type="recipe-book",
        author_name="Soror Test",
    )
    parsed = read_mbf(data)

    import_session = _FakeSession()
    results = await import_parsed_bundle(
        import_session, parsed, owner_id=uuid4()
    )
    assert [r.status for r in results] == [STATUS_IMPORTED]
    row = import_session.added[0]
    assert isinstance(row, Recipe)
    assert row.kind == RecipeKind.INCENSE
    assert row.ingredients == [{"name": "storax", "amount": "1 part"}]
    assert row.visibility == "personal"


async def test_export_stamps_closed_tradition_from_operator_list() -> None:
    """Closed-tradition declarations survive export → import."""
    owner = uuid4()
    rows = [
        Entity(
            name="Kachina",
            tradition_tags=["Hopi"],
            owner_id=owner,
        ),
    ]
    session = _FakeSession([_Result(rows=rows)])
    data = await build_export(
        session,  # type: ignore[arg-type]
        owner_id=owner,
        bundle_type="pantheon",
        author_name="Soror Test",
        closed_slugs=frozenset({"hopi"}),
    )
    manifest = read_mbf(data).manifest
    assert manifest.closed_tradition is True
    assert "hopi" in manifest.closed_tradition_note


async def test_export_without_closed_conflicts_is_open() -> None:
    owner = uuid4()
    session = _FakeSession([_Result(rows=_entity_rows(owner))])
    data = await build_export(
        session,  # type: ignore[arg-type]
        owner_id=owner,
        bundle_type="pantheon",
        author_name="Soror Test",
        closed_slugs=frozenset({"hopi"}),
    )
    assert read_mbf(data).manifest.closed_tradition is False


def test_exportable_types_all_implemented() -> None:
    assert set(EXPORTABLE_TYPES) == {
        "pantheon",
        "entry-templates",
        "tarot-spreads",
        "voces-library",
        "recipe-book",
    }


# ── Export endpoint ───────────────────────────────────────────────


def _vault() -> object:
    return SimpleNamespace(id=uuid4(), display_name="Soror Test")


async def test_export_endpoint_streams_mbf() -> None:
    owner = _user()
    session = _FakeSession(
        [
            _Result(rows=[_vault()]),  # vault (author name)
            _Result(scalar=None),  # closed-tradition setting
            _Result(rows=_entity_rows(owner.id)),  # entities
        ]
    )
    response = await export_bundle(
        owner,
        session,  # type: ignore[arg-type]
        bundle_type="pantheon",
        sign=False,
    )
    assert response.media_type == "application/zip"
    assert 'filename="pantheon-export.mbf"' in (
        response.headers["Content-Disposition"]
    )
    parsed = read_mbf(response.body)
    assert parsed.manifest.author.name == "Soror Test"
    assert parsed.signature is None


async def test_export_endpoint_signs_on_opt_in(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    keypair = generate_keypair()
    monkeypatch.setattr(
        bundles_module,
        "load_or_create_keypair",
        lambda *, private_path, public_path: keypair,
    )
    owner = _user()
    session = _FakeSession(
        [
            _Result(rows=[_vault()]),
            _Result(scalar=None),
            _Result(rows=_entity_rows(owner.id)),
        ]
    )
    response = await export_bundle(
        owner,
        session,  # type: ignore[arg-type]
        bundle_type="pantheon",
        sign=True,
    )
    parsed = read_mbf(response.body)
    assert parsed.signature is not None
    assert verify_container(parsed).verdict == VERDICT_VERIFIED


async def test_export_endpoint_rejects_unknown_type() -> None:
    with pytest.raises(HTTPException) as excinfo:
        await export_bundle(
            _user(),
            _FakeSession(),  # type: ignore[arg-type]
            bundle_type="tarot-deck",
            sign=False,
        )
    assert excinfo.value.status_code == 422
    assert "pantheon" in excinfo.value.detail
