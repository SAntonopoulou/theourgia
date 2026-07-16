"""MBF manifest + payload + signature schema validation — v1-011.

Strict-schema guarantees from ADR-0011: malformed types, unknown
magickal license tags, non-list provenance, bad versions, and
ref-less items all fail loudly; well-formed-but-unknown types are
accepted (they import as opaque-but-listed).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from tests.mbf_fixtures import manifest_base
from theourgia.core.bundles.manifest import (
    MAGICKAL_LICENSE_TAGS,
    TYPE_CATALOG,
    BundleManifest,
    BundleSignature,
    PayloadDocument,
    build_attribution,
    is_known_type,
)

_PAYLOAD_ENTRY = {
    "path": "payloads/entities.json",
    "kind": "entities",
    "count": 1,
    "sha256": "0" * 64,
}


def _manifest_doc(**over: object) -> dict:
    doc = manifest_base()
    doc["payloads"] = [dict(_PAYLOAD_ENTRY)]
    doc.update(over)
    return doc


def test_minimal_manifest_validates() -> None:
    manifest = BundleManifest.model_validate(_manifest_doc())
    assert manifest.slug == "test-pantheon"
    assert manifest.closed_tradition is False
    assert manifest.provenance == []


def test_extra_keys_forbidden() -> None:
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(sneaky=True))


# ── type ──────────────────────────────────────────────────────────


@pytest.mark.parametrize("bad", ["Not Kebab", "UPPER", "spaced out", ""])
def test_malformed_type_rejected(bad: str) -> None:
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(type=bad))


def test_unknown_kebab_type_accepted_as_opaque() -> None:
    """ADR-0011: unknown types import as opaque-but-listed."""
    manifest = BundleManifest.model_validate(
        _manifest_doc(type="future-bundle-kind")
    )
    assert manifest.type_known is False


def test_catalog_types_are_known() -> None:
    assert "pantheon" in TYPE_CATALOG
    assert is_known_type("recipe-book")
    assert not is_known_type("future-bundle-kind")


# ── license.magickal_tags ─────────────────────────────────────────


def test_bad_magickal_tag_rejected() -> None:
    with pytest.raises(ValidationError, match="magickal license tag"):
        BundleManifest.model_validate(
            _manifest_doc(
                license={"spdx": "MIT", "magickal_tags": ["all-mine"]},
            )
        )


def test_every_vocabulary_tag_accepted() -> None:
    manifest = BundleManifest.model_validate(
        _manifest_doc(
            license={
                "spdx": "CC0-1.0",
                "magickal_tags": sorted(MAGICKAL_LICENSE_TAGS),
            },
        )
    )
    assert set(manifest.license.magickal_tags) == MAGICKAL_LICENSE_TAGS


# ── version / provenance / payloads ───────────────────────────────


@pytest.mark.parametrize("bad", ["1.0", "v1.0.0", "1.0.0.0", "latest"])
def test_non_semver_version_rejected(bad: str) -> None:
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(version=bad))


def test_provenance_not_a_list_rejected() -> None:
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(
            _manifest_doc(provenance={"slug": "x"}),
        )
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(provenance="derived"))


def test_provenance_chain_round_trips() -> None:
    chain = [
        {
            "slug": "parent-bundle",
            "version": "1.0.0",
            "author_name": "Original Author",
            "note": "the root",
        },
        {
            "slug": "test-pantheon",
            "version": "1.0.0",
            "author_name": "Soror Test",
            "note": "derived",
        },
    ]
    manifest = BundleManifest.model_validate(_manifest_doc(provenance=chain))
    assert [link.model_dump() for link in manifest.provenance] == chain


def test_manifest_requires_at_least_one_payload() -> None:
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(payloads=[]))


def test_payload_path_must_live_under_payloads() -> None:
    entry = dict(_PAYLOAD_ENTRY, path="entities.json")
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(payloads=[entry]))


def test_bad_sha256_rejected() -> None:
    entry = dict(_PAYLOAD_ENTRY, sha256="xyz")
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(payloads=[entry]))


def test_author_name_required_non_empty() -> None:
    with pytest.raises(ValidationError):
        BundleManifest.model_validate(_manifest_doc(author={"name": ""}))


# ── PayloadDocument ───────────────────────────────────────────────


def test_payload_items_require_refs() -> None:
    with pytest.raises(ValidationError, match="ref"):
        PayloadDocument(kind="entities", items=[{"name": "Hekate"}])


def test_payload_items_refuse_duplicate_refs() -> None:
    with pytest.raises(ValidationError, match="duplicate"):
        PayloadDocument(
            kind="entities",
            items=[{"ref": "hekate"}, {"ref": "hekate"}],
        )


# ── BundleSignature ───────────────────────────────────────────────


def test_signature_block_validates() -> None:
    block = BundleSignature.model_validate(
        {
            "algorithm": "ed25519",
            "public_key": "AA",
            "signed_digest": "BB",
            "digest_manifest": {"manifest.json": "0" * 64},
        }
    )
    assert block.algorithm == "ed25519"


def test_signature_algorithm_pinned() -> None:
    with pytest.raises(ValidationError):
        BundleSignature.model_validate(
            {
                "algorithm": "rsa",
                "public_key": "AA",
                "signed_digest": "BB",
                "digest_manifest": {"manifest.json": "0" * 64},
            }
        )


# ── Attribution ───────────────────────────────────────────────────


def test_attribution_carries_name_author_license() -> None:
    manifest = BundleManifest.model_validate(_manifest_doc())
    attribution = build_attribution(manifest)
    assert "Test Pantheon" in attribution
    assert "Soror Test" in attribution
    assert "CC-BY-SA-4.0" in attribution
    assert "share-alike" in attribution


def test_attribution_includes_source_citations() -> None:
    manifest = BundleManifest.model_validate(
        _manifest_doc(
            source_citations=[{"citation": "PGM IV.2785-2890"}],
        )
    )
    assert "PGM IV.2785-2890" in build_attribution(manifest)
