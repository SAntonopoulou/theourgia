"""MBF import semantics — v1-011.

ADR-0011: entities import as immutable nodes with the bundle origin,
alias prompting defaults to distinct (no alias rows), visibility is
always personal, closed-tradition previews carry the respect-source
notice, selection is piecemeal, and attribution persists un-strippably
on the install record.
"""

from __future__ import annotations

import json
from uuid import uuid4

import pytest
from fastapi import HTTPException

from tests.mbf_fixtures import (
    _FakeSession,
    _FakeUpload,
    _Result,
    _user,
    entity_items,
    make_bundle,
    recipe_items,
)
from theourgia.api.routers.v1.bundles import (
    import_bundle,
    list_installed_bundles,
    preview_bundle,
)
from theourgia.core.bundles.container import read_mbf
from theourgia.core.bundles.importer import (
    STATUS_IMPORTED,
    STATUS_SKIPPED,
    bundle_origin,
    import_entities,
    import_parsed_bundle,
    make_installed_bundle,
)
from theourgia.core.bundles.signing import VERDICT_UNSIGNED
from theourgia.core.traditions import RESPECT_SOURCE_DETAIL
from theourgia.models.bundles import InstalledBundle
from theourgia.models.entities import Entity, EntityAlias, EntityVisibility
from theourgia.models.recipe import Recipe
from theourgia.models.templates import EntryTemplate, TemplateScope
from theourgia.models.voces import VoceMagicae

# ── Entity importer ───────────────────────────────────────────────


async def test_entity_import_sets_bundle_origin() -> None:
    session = _FakeSession()
    owner = uuid4()
    results = await import_entities(
        session,
        entity_items(),
        owner_id=owner,
        origin=bundle_origin("test-pantheon", "1.0.0"),
    )
    assert all(r.status == STATUS_IMPORTED for r in results)
    assert len(session.added) == 2
    for row in session.added:
        assert isinstance(row, Entity)
        assert row.origin == "imported_from_bundle:test-pantheon@1.0.0"
        assert row.owner_id == owner


async def test_entity_import_defaults_distinct_no_alias_rows() -> None:
    session = _FakeSession()
    await import_entities(
        session,
        entity_items(),
        owner_id=uuid4(),
        origin=bundle_origin("test-pantheon", "1.0.0"),
    )
    assert not any(isinstance(row, EntityAlias) for row in session.added)


async def test_entity_import_visibility_always_personal() -> None:
    session = _FakeSession()
    items = entity_items()
    items[0]["visibility"] = "public"  # hostile bundle — must be ignored
    await import_entities(
        session, items, owner_id=uuid4(), origin="imported_from_bundle:x@1.0.0"
    )
    assert all(
        row.visibility == EntityVisibility.PERSONAL for row in session.added
    )


async def test_entity_import_keeps_tradition_tags_verbatim() -> None:
    """Closed-tradition propagation: tags survive so the Phase 15 §14
    public-share hard-block applies to the imported rows."""
    session = _FakeSession()
    items = [
        {"ref": "k", "name": "Kachina", "tradition_tags": ["Hopi"]},
    ]
    await import_entities(
        session, items, owner_id=uuid4(), origin="imported_from_bundle:x@1.0.0"
    )
    assert session.added[0].tradition_tags == ["Hopi"]
    assert session.added[0].tradition == "Hopi"


async def test_entity_import_skips_nameless_item_with_reason() -> None:
    session = _FakeSession()
    results = await import_entities(
        session,
        [{"ref": "ghost"}],
        owner_id=uuid4(),
        origin="imported_from_bundle:x@1.0.0",
    )
    assert results[0].status == STATUS_SKIPPED
    assert "name" in results[0].detail
    assert session.added == []


# ── Selection (piecemeal by design) ───────────────────────────────


async def test_selected_subset_only_imports_selected_refs() -> None:
    session = _FakeSession()
    parsed = read_mbf(make_bundle())
    results = await import_parsed_bundle(
        session, parsed, owner_id=uuid4(), selected_refs=["hermes"]
    )
    assert [r.ref for r in results] == ["hermes"]
    assert len(session.added) == 1
    assert session.added[0].name == "Hermes"


async def test_unknown_kind_is_opaque_but_listed() -> None:
    session = _FakeSession()
    parsed = read_mbf(
        make_bundle(
            manifest_over={"type": "dream-symbols"},
            payloads=[("dream-symbols", [{"ref": "tooth", "name": "Tooth"}])],
        )
    )
    results = await import_parsed_bundle(session, parsed, owner_id=uuid4())
    assert results[0].status == STATUS_SKIPPED
    assert "no v1 importer" in results[0].detail
    assert session.added == []


# ── Other kinds ───────────────────────────────────────────────────


async def test_multi_kind_bundle_imports_each_kind() -> None:
    session = _FakeSession()
    parsed = read_mbf(
        make_bundle(
            payloads=[
                ("entities", entity_items()),
                ("recipes", recipe_items()),
                (
                    "voces",
                    [
                        {
                            "ref": "askion",
                            "name": "Askion",
                            "source_text": "ΑΣΚΙΟΝ",
                            "source_script": "greek",
                            "source_citation": "Ephesia Grammata, PD",
                        },
                        {
                            "ref": "no-citation",
                            "name": "Uncited",
                            "source_text": "x",
                            "source_script": "latin",
                        },
                    ],
                ),
                (
                    "entry-templates",
                    [
                        {
                            "ref": "banishing",
                            "name": "Banishing",
                            "kind": "ritual",
                            "body_template": {"type": "doc", "content": []},
                        },
                    ],
                ),
            ],
        )
    )
    results = await import_parsed_bundle(session, parsed, owner_id=uuid4())
    by_ref = {r.ref: r for r in results}
    assert by_ref["crossroads-incense"].status == STATUS_IMPORTED
    assert by_ref["askion"].status == STATUS_IMPORTED
    # H05 honesty rule holds on import: no citation, no voce.
    assert by_ref["no-citation"].status == STATUS_SKIPPED
    assert "source_citation" in by_ref["no-citation"].detail
    assert by_ref["banishing"].status == STATUS_IMPORTED

    recipes = [r for r in session.added if isinstance(r, Recipe)]
    assert recipes[0].visibility == "personal"
    voces = [r for r in session.added if isinstance(r, VoceMagicae)]
    assert voces[0].source_citation == "Ephesia Grammata, PD"
    assert voces[0].linked_entity_ids == []
    templates = [r for r in session.added if isinstance(r, EntryTemplate)]
    assert templates[0].scope == TemplateScope.PERSONAL
    assert json.loads(templates[0].body_template) == {
        "type": "doc",
        "content": [],
    }


# ── Provenance + attribution on the install record ────────────────


def test_installed_bundle_preserves_provenance_verbatim() -> None:
    chain = [
        {
            "slug": "parent",
            "version": "0.9.0",
            "author_name": "Original",
            "note": "",
        },
        {
            "slug": "test-pantheon",
            "version": "1.0.0",
            "author_name": "Soror Test",
            "note": "derived",
        },
    ]
    parsed = read_mbf(make_bundle(manifest_over={"provenance": chain}))
    installed = make_installed_bundle(
        parsed.manifest,
        owner_id=uuid4(),
        signature_verdict=VERDICT_UNSIGNED,
        imported_item_count=2,
    )
    assert installed.provenance == chain
    assert installed.attribution  # never empty
    assert "Soror Test" in installed.attribution


# ── Import endpoint ───────────────────────────────────────────────


async def test_import_endpoint_records_install_and_totals() -> None:
    session = _FakeSession()
    user = _user()
    response = await import_bundle(
        user,
        session,  # type: ignore[arg-type]
        _FakeUpload(make_bundle()),  # type: ignore[arg-type]
        selected_refs=None,
    )
    assert response.imported == 2
    assert response.skipped == 0
    assert response.total == 2
    assert response.signature_verdict == VERDICT_UNSIGNED
    installs = [r for r in session.added if isinstance(r, InstalledBundle)]
    assert len(installs) == 1
    assert installs[0].imported_item_count == 2
    assert installs[0].attribution == response.attribution
    assert session.commits == 1


async def test_import_endpoint_selected_refs_json() -> None:
    session = _FakeSession()
    response = await import_bundle(
        _user(),
        session,  # type: ignore[arg-type]
        _FakeUpload(make_bundle()),  # type: ignore[arg-type]
        selected_refs=json.dumps(["hekate"]),
    )
    assert response.total == 1
    assert response.results[0].ref == "hekate"


async def test_import_endpoint_rejects_malformed_selected_refs() -> None:
    for bad in ("not json", "{}", "[]", "[1,2]"):
        with pytest.raises(HTTPException) as excinfo:
            await import_bundle(
                _user(),
                _FakeSession(),  # type: ignore[arg-type]
                _FakeUpload(make_bundle()),  # type: ignore[arg-type]
                selected_refs=bad,
            )
        assert excinfo.value.status_code == 422


async def test_import_endpoint_rejects_garbage_upload() -> None:
    with pytest.raises(HTTPException) as excinfo:
        await import_bundle(
            _user(),
            _FakeSession(),  # type: ignore[arg-type]
            _FakeUpload(b"not a zip"),  # type: ignore[arg-type]
            selected_refs=None,
        )
    assert excinfo.value.status_code == 400


# ── Preview: closed tradition + conflicts ─────────────────────────


async def test_closed_tradition_preview_carries_respect_source() -> None:
    data = make_bundle(
        manifest_over={
            "closed_tradition": True,
            "closed_tradition_note": "Shared with permission for members.",
        },
        payloads=[
            (
                "entities",
                [{"ref": "k", "name": "Kachina", "tradition_tags": ["Hopi"]}],
            ),
        ],
    )
    session = _FakeSession(
        [
            _Result(scalar=None),  # closed-tradition setting (unset)
            _Result(rows=[]),  # entity conflicts
            _Result(rows=[]),  # installed bundle by slug
        ]
    )
    response = await preview_bundle(
        _user(),
        session,  # type: ignore[arg-type]
        _FakeUpload(data),  # type: ignore[arg-type]
    )
    assert response.closed_tradition is True
    assert response.respect_source_notice == RESPECT_SOURCE_DETAIL.format(
        slugs="hopi"
    )
    assert response.closed_tradition_note == (
        "Shared with permission for members."
    )


async def test_preview_reports_conflicts() -> None:
    session = _FakeSession(
        [
            _Result(scalar=None),
            _Result(rows=[("Hekate",)]),  # existing same-name entity
            _Result(rows=[object()]),  # existing installed bundle
        ]
    )
    response = await preview_bundle(
        _user(),
        session,  # type: ignore[arg-type]
        _FakeUpload(make_bundle()),  # type: ignore[arg-type]
    )
    assert response.conflicts.entity_names == ["Hekate"]
    assert response.conflicts.installed_bundle_slug is True
    assert response.respect_source_notice is None


# ── Installed list ────────────────────────────────────────────────


async def test_installed_list_always_carries_attribution() -> None:
    """Regression: attribution cannot be empty when the manifest has
    an author — and the manifest cannot NOT have an author."""
    parsed = read_mbf(make_bundle())
    row = make_installed_bundle(
        parsed.manifest,
        owner_id=uuid4(),
        signature_verdict=VERDICT_UNSIGNED,
        imported_item_count=2,
    )
    session = _FakeSession([_Result(rows=[row])])
    response = await list_installed_bundles(
        _user(),
        session,  # type: ignore[arg-type]
    )
    assert len(response.bundles) == 1
    listed = response.bundles[0]
    assert listed.attribution
    assert "Soror Test" in listed.attribution
    assert listed.slug == "test-pantheon"
    assert listed.signature_verdict == VERDICT_UNSIGNED
