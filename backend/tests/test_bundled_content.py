"""The seven bundled content packages — v1-020 (Tier 2 #14).

Covered here:

- every bundled package builds a valid ``.mbf`` that round-trips
  through the production reader with its manifest validated;
- citation regression: every bundle carries at least one source
  citation, every voce carries a PGM reference, and every item of a
  per-item-cited kind carries its own ``source_citation``;
- the PGM voces selection does NOT duplicate the 32-entry corpus in
  :mod:`theourgia.core.workshop.bundled_voces`;
- the bundled import runs the standard path (origin
  ``imported_from_bundle:<slug>@<version>``, personal visibility);
- opaque kinds (``correspondences``, ``dream-symbols``) are
  listed-not-imported with an honest per-item report;
- endpoint shapes: the bundled list, the 404 on an unknown slug, and
  the enriched installed-bundle read model.

The auth-required guard for both endpoints lives in
``test_auth_required_endpoints.py`` per its standing instruction.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from tests.mbf_fixtures import _FakeSession, _Result, _user
from theourgia.api.routers.v1.bundles import (
    import_bundled_package,
    list_bundled_packages,
    list_installed_bundles,
)
from theourgia.core.bundles.bundled_content import (
    BUNDLED_AUTHOR_NAME,
    BUNDLED_CONTENT,
    build_bundled_mbf,
    bundled_by_slug,
)
from theourgia.core.bundles.container import read_mbf
from theourgia.core.bundles.importer import KIND_IMPORTERS
from theourgia.core.bundles.signing import VERDICT_UNSIGNED, verify_container
from theourgia.core.workshop.bundled_voces import BUNDLED_VOCES
from theourgia.models.audit import AuditEvent
from theourgia.models.bundles import InstalledBundle
from theourgia.models.entities import Entity, EntityVisibility
from theourgia.models.templates import EntryTemplate, TemplateScope

EXPECTED_SLUGS = [
    "hellenic-pantheon",
    "thelemic-ritual-set",
    "classic-tarot-spreads",
    "pgm-voces-selection",
    "planetary-correspondences",
    "traditional-incense-recipes",
    "dream-symbols-traditional",
]

# Kinds whose item schema carries a per-item ``source_citation``
# (tarot spread layouts are uncopyrightable systems — those cite at
# the bundle level only).
PER_ITEM_CITED_KINDS = frozenset(
    {
        "entities",
        "entry-templates",
        "voces",
        "recipes",
        "correspondences",
        "dream-symbols",
    }
)


def _bundle(slug: str):
    bundle = bundled_by_slug(slug)
    assert bundle is not None
    return bundle


# ── Container round-trip ──────────────────────────────────────────


def test_exactly_the_seven_promised_bundles_ship() -> None:
    assert [b.slug for b in BUNDLED_CONTENT] == EXPECTED_SLUGS


@pytest.mark.parametrize("slug", EXPECTED_SLUGS)
def test_bundle_builds_valid_mbf_round_trip(slug: str) -> None:
    bundle = _bundle(slug)
    data = build_bundled_mbf(slug)
    parsed = read_mbf(data)  # digest + schema validation happens here
    assert parsed.manifest.slug == slug
    assert parsed.manifest.type == bundle.type
    assert parsed.manifest.version == bundle.version
    assert parsed.manifest.author.name == BUNDLED_AUTHOR_NAME
    assert parsed.total_items == bundle.item_count > 0
    # PD discipline: never a closed tradition, always the PD tag.
    assert parsed.manifest.closed_tradition is False
    assert "public-domain" in parsed.manifest.license.magickal_tags
    # Bundled containers are unsigned — a verdict, never an error.
    assert verify_container(parsed).verdict == VERDICT_UNSIGNED


def test_build_bundled_mbf_unknown_slug_raises() -> None:
    assert bundled_by_slug("no-such-bundle") is None
    with pytest.raises(KeyError):
        build_bundled_mbf("no-such-bundle")


def test_build_is_deterministic_and_cached() -> None:
    assert build_bundled_mbf("hellenic-pantheon") == build_bundled_mbf(
        "hellenic-pantheon"
    )


# ── Citation regression ───────────────────────────────────────────


@pytest.mark.parametrize("slug", EXPECTED_SLUGS)
def test_every_bundle_carries_a_source_citation(slug: str) -> None:
    parsed = read_mbf(build_bundled_mbf(slug))
    citations = parsed.manifest.source_citations
    assert len(citations) >= 1
    assert all(c.citation.strip() for c in citations)


@pytest.mark.parametrize("slug", EXPECTED_SLUGS)
def test_per_item_cited_kinds_cite_every_item(slug: str) -> None:
    parsed = read_mbf(build_bundled_mbf(slug))
    for kind, item in parsed.iter_items():
        if kind not in PER_ITEM_CITED_KINDS:
            continue
        citation = item.get("source_citation")
        detail = f"{slug}: item {item['ref']!r} ({kind}) lacks a citation"
        assert isinstance(citation, str), detail
        assert citation.strip(), detail


def test_every_bundled_voce_carries_a_pgm_reference() -> None:
    parsed = read_mbf(build_bundled_mbf("pgm-voces-selection"))
    items = list(parsed.iter_items())
    assert len(items) == 12
    for kind, item in items:
        assert kind == "voces"
        assert "PGM" in item["source_citation"], (
            f"voce {item['ref']!r} does not cite a PGM line reference"
        )


def test_pgm_voces_do_not_duplicate_the_workshop_corpus() -> None:
    """The selection extends the 32-entry bundled corpus — it must
    not re-ship any of its words."""

    def norm(text: str) -> str:
        return "".join(text.split()).upper()

    corpus_texts = {norm(v.source_text) for v in BUNDLED_VOCES}
    corpus_names = {v.name.casefold() for v in BUNDLED_VOCES}
    parsed = read_mbf(build_bundled_mbf("pgm-voces-selection"))
    for _kind, item in parsed.iter_items():
        assert norm(item["source_text"]) not in corpus_texts, (
            f"voce {item['ref']!r} duplicates a bundled corpus word"
        )
        assert item["name"].casefold() not in corpus_names


# ── Bundled import — standard path ────────────────────────────────


async def test_bundled_import_creates_rows_with_bundle_origin() -> None:
    session = _FakeSession()
    user = _user()
    response = await import_bundled_package(
        user,
        session,  # type: ignore[arg-type]
        "hellenic-pantheon",
    )
    assert response.imported == 13
    assert response.skipped == 0
    assert response.total == 13
    assert response.signature_verdict == VERDICT_UNSIGNED
    entities = [r for r in session.added if isinstance(r, Entity)]
    assert len(entities) == 13
    for row in entities:
        assert row.origin == "imported_from_bundle:hellenic-pantheon@1.0.0"
        assert row.owner_id == user.id
        assert row.visibility == EntityVisibility.PERSONAL
    installs = [r for r in session.added if isinstance(r, InstalledBundle)]
    assert len(installs) == 1
    assert installs[0].imported_item_count == 13
    assert BUNDLED_AUTHOR_NAME in installs[0].attribution
    assert session.commits == 1


async def test_bundled_import_thelemic_templates_land_personal() -> None:
    session = _FakeSession()
    response = await import_bundled_package(
        _user(),
        session,  # type: ignore[arg-type]
        "thelemic-ritual-set",
    )
    assert response.imported == 3
    templates = [r for r in session.added if isinstance(r, EntryTemplate)]
    assert len(templates) == 3
    assert all(t.scope == TemplateScope.PERSONAL for t in templates)


@pytest.mark.parametrize(
    ("slug", "kind", "count"),
    [
        ("planetary-correspondences", "correspondences", 7),
        ("dream-symbols-traditional", "dream-symbols", 40),
    ],
)
async def test_opaque_kinds_report_listed_not_imported(
    slug: str, kind: str, count: int
) -> None:
    """No v1 importer for these kinds — every item is reported as
    skipped with a reason; only the install record is written."""
    assert kind not in KIND_IMPORTERS
    session = _FakeSession()
    response = await import_bundled_package(
        _user(),
        session,  # type: ignore[arg-type]
        slug,
    )
    assert response.imported == 0
    assert response.skipped == count
    assert response.total == count
    assert all(r.status == "skipped" for r in response.results)
    assert all("no v1 importer" in r.detail for r in response.results)
    # Nothing is materialized: the only rows written are the install
    # record and its audit event.
    assert all(
        isinstance(r, InstalledBundle | AuditEvent) for r in session.added
    )
    assert sum(isinstance(r, InstalledBundle) for r in session.added) == 1


async def test_bundled_import_unknown_slug_404() -> None:
    with pytest.raises(HTTPException) as excinfo:
        await import_bundled_package(
            _user(),
            _FakeSession(),  # type: ignore[arg-type]
            "no-such-bundle",
        )
    assert excinfo.value.status_code == 404


# ── Endpoint shapes ───────────────────────────────────────────────


async def test_bundled_list_shape() -> None:
    response = await list_bundled_packages(_user())
    assert [b.slug for b in response.bundles] == EXPECTED_SLUGS
    for listed in response.bundles:
        assert listed.license
        assert listed.description
        assert listed.total_items == sum(listed.item_counts.values()) > 0
    by_slug = {b.slug: b for b in response.bundles}
    assert by_slug["hellenic-pantheon"].item_counts == {"entities": 13}
    assert by_slug["pgm-voces-selection"].item_counts == {"voces": 12}
    assert by_slug["dream-symbols-traditional"].item_counts == {
        "dream-symbols": 40
    }


async def test_installed_read_carries_manifest_derived_fields() -> None:
    """The /bundles surface renders author / license / citation /
    per-kind counts from the installed read — derived server-side
    from the persisted manifest (v1-020)."""
    session = _FakeSession()
    await import_bundled_package(
        _user(),
        session,  # type: ignore[arg-type]
        "hellenic-pantheon",
    )
    row = next(r for r in session.added if isinstance(r, InstalledBundle))
    list_session = _FakeSession([_Result(rows=[row])])
    response = await list_installed_bundles(
        _user(),
        list_session,  # type: ignore[arg-type]
    )
    listed = response.bundles[0]
    assert listed.author_name == BUNDLED_AUTHOR_NAME
    assert listed.license_spdx == "CC0-1.0"
    assert listed.source_citation is not None
    assert listed.source_citation.startswith("Hesiod")
    assert listed.item_counts == {"entities": 13}
    assert listed.description
