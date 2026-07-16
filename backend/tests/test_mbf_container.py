"""MBF container round-trip + limits + canonical JSON — v1-011.

ADR-0011 container layout: build→read round-trip on real zipfile
bytes, digest-mismatch detection, oversize refusal, item-count caps,
and canonical-JSON stability (key order + unicode).
"""

from __future__ import annotations

import io
import json
import zipfile

import pytest

from tests.mbf_fixtures import entity_items, make_bundle, manifest_base
from theourgia.core.bundles.canonical import canonical_json_bytes, sha256_hex
from theourgia.core.bundles.container import (
    MANIFEST_PATH,
    MAX_CONTAINER_BYTES,
    MAX_TOTAL_ITEMS,
    BundleFormatError,
    BundleTooLargeError,
    DigestMismatchError,
    TooManyItemsError,
    build_mbf,
    read_mbf,
)
from theourgia.core.bundles.manifest import PayloadDocument
from theourgia.core.federation.signing import canonical_attestation_bytes

# ── Canonical JSON ────────────────────────────────────────────────


def test_canonical_json_sorts_keys() -> None:
    assert canonical_json_bytes({"b": 1, "a": 2}) == b'{"a":2,"b":1}'


def test_canonical_json_no_whitespace() -> None:
    raw = canonical_json_bytes({"a": [1, 2], "b": {"c": 3}})
    assert b" " not in raw
    assert raw == b'{"a":[1,2],"b":{"c":3}}'


def test_canonical_json_unicode_passthrough() -> None:
    author = "Soror Ευ. Α."  # noqa: RUF001 — deliberate Greek text
    raw = canonical_json_bytes({"name": "Ἑκάτη", "author": author})
    assert "Ἑκάτη".encode() in raw
    # Stable regardless of construction order.
    reordered = canonical_json_bytes({"author": author, "name": "Ἑκάτη"})
    assert raw == reordered


def test_canonical_json_matches_federation_canonicalizer() -> None:
    doc = {"z": "Ω", "a": [3, 2, 1], "m": {"k": None}}
    assert canonical_json_bytes(doc) == canonical_attestation_bytes(doc)


def test_sha256_hex_shape() -> None:
    digest = sha256_hex(b"abc")
    assert len(digest) == 64
    assert digest == digest.lower()


# ── Round-trip ────────────────────────────────────────────────────


def test_build_read_round_trip() -> None:
    data = make_bundle()
    parsed = read_mbf(data)
    assert parsed.manifest.slug == "test-pantheon"
    assert parsed.manifest.type == "pantheon"
    assert list(parsed.payloads) == ["payloads/entities.json"]
    doc = parsed.payloads["payloads/entities.json"]
    assert doc.kind == "entities"
    assert [item["ref"] for item in doc.items] == ["hekate", "hermes"]
    assert parsed.signature is None
    assert parsed.total_items == 2


def test_round_trip_preserves_assets() -> None:
    seal = b"<svg>hekate</svg>"
    data = make_bundle(
        assets={"assets/seals/hekate.svg": (seal, "image/svg+xml")},
    )
    parsed = read_mbf(data)
    assert parsed.assets == {"assets/seals/hekate.svg": seal}
    assert parsed.manifest.assets[0].media_type == "image/svg+xml"


def test_container_is_stock_tool_inspectable() -> None:
    """ADR-0011 honesty-by-construction: plain ZIP + plain JSON."""
    data = make_bundle()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        manifest = json.loads(archive.read("manifest.json"))
    assert manifest["mbf_version"] == 1


# ── Corruption + format errors ────────────────────────────────────


def _rezip_with(data: bytes, replacements: dict[str, bytes]) -> bytes:
    source = zipfile.ZipFile(io.BytesIO(data))
    buffer = io.BytesIO()
    with source, zipfile.ZipFile(buffer, "w") as out:
        for name in source.namelist():
            out.writestr(name, replacements.get(name, source.read(name)))
    return buffer.getvalue()


def test_digest_mismatch_detected() -> None:
    data = make_bundle()
    tampered = _rezip_with(
        data, {"payloads/entities.json": b'{"kind":"entities","items":[]}'}
    )
    with pytest.raises(DigestMismatchError):
        read_mbf(tampered)


def test_not_a_zip_refused() -> None:
    with pytest.raises(BundleFormatError, match="ZIP"):
        read_mbf(b"this is not a zip")


def test_missing_manifest_refused() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("payloads/entities.json", b"{}")
    with pytest.raises(BundleFormatError, match="manifest"):
        read_mbf(buffer.getvalue())


def test_undeclared_file_refused() -> None:
    """Nothing hides in the ZIP — every stored file must be declared."""
    data = make_bundle()
    source = zipfile.ZipFile(io.BytesIO(data))
    buffer = io.BytesIO()
    with source, zipfile.ZipFile(buffer, "w") as out:
        for name in source.namelist():
            out.writestr(name, source.read(name))
        out.writestr("assets/sneaky.bin", b"hidden")
    with pytest.raises(BundleFormatError, match="sneaky"):
        read_mbf(buffer.getvalue())


def test_payload_count_mismatch_refused() -> None:
    data = make_bundle()
    source = zipfile.ZipFile(io.BytesIO(data))
    with source:
        manifest = json.loads(source.read(MANIFEST_PATH))
    manifest["payloads"][0]["count"] = 99
    tampered = _rezip_with(
        data,
        {MANIFEST_PATH: canonical_json_bytes(manifest)},
    )
    with pytest.raises(BundleFormatError, match="99"):
        read_mbf(tampered)


# ── Limits ────────────────────────────────────────────────────────


def test_oversize_container_refused() -> None:
    oversized = b"\0" * (MAX_CONTAINER_BYTES + 1)
    with pytest.raises(BundleTooLargeError, match="limit"):
        read_mbf(oversized)


def test_build_refuses_too_many_items() -> None:
    items = [{"ref": f"item-{i}"} for i in range(MAX_TOTAL_ITEMS + 1)]
    with pytest.raises(TooManyItemsError):
        build_mbf(
            manifest_base=manifest_base(),
            payload_docs=[PayloadDocument(kind="entities", items=items)],
        )


def test_read_refuses_declared_too_many_items() -> None:
    data = make_bundle()
    source = zipfile.ZipFile(io.BytesIO(data))
    with source:
        manifest = json.loads(source.read(MANIFEST_PATH))
    manifest["payloads"][0]["count"] = MAX_TOTAL_ITEMS + 1
    tampered = _rezip_with(
        data, {MANIFEST_PATH: canonical_json_bytes(manifest)}
    )
    with pytest.raises(TooManyItemsError):
        read_mbf(tampered)


def test_build_refuses_duplicate_payload_kind() -> None:
    with pytest.raises(BundleFormatError, match="duplicate"):
        build_mbf(
            manifest_base=manifest_base(),
            payload_docs=[
                PayloadDocument(kind="entities", items=entity_items()),
                PayloadDocument(kind="entities", items=[{"ref": "x"}]),
            ],
        )
