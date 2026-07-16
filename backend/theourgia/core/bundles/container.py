"""MBF ZIP container — build and read with digest verification.

ADR-0011 container layout::

    bundle.mbf (ZIP)
    ├── manifest.json          # REQUIRED — the envelope
    ├── payloads/              # one or more typed JSON documents
    ├── assets/                # optional binary files
    └── signature.json         # optional detached signature block

Hard limits (clear errors, never truncation):

- container ≤ 50 MB (compressed), decompressed ≤ 4x that
- ≤ 10,000 items across all payloads

Reading verifies every payload/asset digest against the manifest;
signature *verification* is :mod:`theourgia.core.bundles.signing`'s
job (a missing or bad signature is a verdict, not an exception —
digest mismatches against the manifest itself are corruption and do
raise).
"""

from __future__ import annotations

import io
import json
import zipfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from theourgia.core.bundles.canonical import canonical_json_bytes, sha256_hex
from theourgia.core.bundles.manifest import (
    BundleManifest,
    BundleSignature,
    PayloadDocument,
)

__all__ = [
    "MANIFEST_PATH",
    "MAX_CONTAINER_BYTES",
    "MAX_DECOMPRESSED_BYTES",
    "MAX_TOTAL_ITEMS",
    "SIGNATURE_PATH",
    "BundleError",
    "BundleFormatError",
    "BundleTooLargeError",
    "DigestMismatchError",
    "ParsedBundle",
    "TooManyItemsError",
    "build_mbf",
    "read_mbf",
]


MANIFEST_PATH = "manifest.json"
SIGNATURE_PATH = "signature.json"

MAX_CONTAINER_BYTES: int = 50 * 1024 * 1024
"""Bundles are knowledge artifacts, not media libraries (ADR-0011)."""

MAX_DECOMPRESSED_BYTES: int = 4 * MAX_CONTAINER_BYTES
"""Zip-bomb guard: refuse containers whose declared decompressed size
exceeds four times the container limit."""

MAX_TOTAL_ITEMS: int = 10_000


class BundleError(ValueError):
    """Base class for every MBF container error."""


class BundleTooLargeError(BundleError):
    """Container (or its decompressed content) exceeds the hard limit."""


class BundleFormatError(BundleError):
    """The container is structurally invalid (not a ZIP, missing or
    malformed manifest, undeclared files, schema violations)."""


class DigestMismatchError(BundleError):
    """A payload or asset's bytes do not match the manifest digest."""


class TooManyItemsError(BundleError):
    """The bundle declares or carries more than MAX_TOTAL_ITEMS items."""


@dataclass(frozen=True, slots=True)
class ParsedBundle:
    """A fully read + digest-verified container.

    ``file_digests`` maps every stored file *except* signature.json to
    its sha256 — the coverage set signature verification checks
    against.
    """

    manifest: BundleManifest
    payloads: dict[str, PayloadDocument]  # path -> document, manifest order
    assets: dict[str, bytes]  # path -> raw bytes
    signature: BundleSignature | None
    file_digests: dict[str, str]

    @property
    def total_items(self) -> int:
        return sum(len(doc.items) for doc in self.payloads.values())

    def iter_items(self):
        """Yield ``(kind, item)`` across every payload, manifest order."""
        for doc in self.payloads.values():
            for item in doc.items:
                yield doc.kind, item


# ── Build ──────────────────────────────────────────────────────────


def build_mbf(
    *,
    manifest_base: dict[str, Any],
    payload_docs: Sequence[PayloadDocument],
    assets: Mapping[str, tuple[bytes, str]] | None = None,
) -> bytes:
    """Assemble an unsigned ``.mbf`` container in memory.

    ``manifest_base`` is the manifest WITHOUT ``payloads``/``assets``
    entries — this function serializes each payload document to
    canonical JSON, computes digests + counts, fills those manifest
    sections, validates the whole envelope, and zips everything.

    ``assets`` maps ``assets/...`` paths to ``(bytes, media_type)``.

    Raises :class:`BundleFormatError` on schema violations,
    :class:`TooManyItemsError` / :class:`BundleTooLargeError` on limit
    breaches. Signing is a separate step
    (:func:`theourgia.core.bundles.signing.sign_container`).
    """
    assets = assets or {}

    payload_files: list[tuple[str, bytes]] = []
    payload_entries: list[dict[str, Any]] = []
    seen_kinds: set[str] = set()
    total_items = 0
    for doc in payload_docs:
        if doc.kind in seen_kinds:
            msg = f"duplicate payload kind {doc.kind!r}"
            raise BundleFormatError(msg)
        seen_kinds.add(doc.kind)
        path = f"payloads/{doc.kind}.json"
        raw = canonical_json_bytes(doc.model_dump(mode="json"))
        total_items += len(doc.items)
        payload_files.append((path, raw))
        payload_entries.append(
            {
                "path": path,
                "kind": doc.kind,
                "count": len(doc.items),
                "sha256": sha256_hex(raw),
            }
        )
    if total_items > MAX_TOTAL_ITEMS:
        msg = (
            f"bundle carries {total_items} items; "
            f"the limit is {MAX_TOTAL_ITEMS}"
        )
        raise TooManyItemsError(msg)

    asset_entries = [
        {"path": path, "sha256": sha256_hex(raw), "media_type": media_type}
        for path, (raw, media_type) in assets.items()
    ]

    manifest_doc = dict(manifest_base)
    manifest_doc["payloads"] = payload_entries
    manifest_doc["assets"] = asset_entries
    try:
        manifest = BundleManifest.model_validate(manifest_doc)
    except ValidationError as exc:
        msg = f"invalid manifest: {exc}"
        raise BundleFormatError(msg) from exc

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            MANIFEST_PATH,
            canonical_json_bytes(manifest.model_dump(mode="json")),
        )
        for path, raw in payload_files:
            archive.writestr(path, raw)
        for path, (raw, _media_type) in assets.items():
            archive.writestr(path, raw)

    data = buffer.getvalue()
    if len(data) > MAX_CONTAINER_BYTES:
        msg = (
            f"container is {len(data)} bytes; "
            f"the limit is {MAX_CONTAINER_BYTES}"
        )
        raise BundleTooLargeError(msg)
    return data


# ── Read ───────────────────────────────────────────────────────────


def read_mbf(data: bytes) -> ParsedBundle:
    """Parse + digest-verify a ``.mbf`` container.

    Every payload and asset digest is checked against the manifest;
    every stored file must be declared (nothing hides in the ZIP).
    The signature block is parsed but NOT verified here — see
    :func:`theourgia.core.bundles.signing.verify_container`.
    """
    if len(data) > MAX_CONTAINER_BYTES:
        msg = (
            f"container is {len(data)} bytes; "
            f"the limit is {MAX_CONTAINER_BYTES}"
        )
        raise BundleTooLargeError(msg)

    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        msg = "not a ZIP container — an .mbf bundle is a ZIP archive"
        raise BundleFormatError(msg) from exc

    with archive:
        declared_size = sum(info.file_size for info in archive.infolist())
        if declared_size > MAX_DECOMPRESSED_BYTES:
            msg = (
                f"decompressed content is {declared_size} bytes; "
                f"the limit is {MAX_DECOMPRESSED_BYTES}"
            )
            raise BundleTooLargeError(msg)

        names = [n for n in archive.namelist() if not n.endswith("/")]
        if MANIFEST_PATH not in names:
            msg = "manifest.json missing from container"
            raise BundleFormatError(msg)

        manifest = _parse_json_member(
            archive, MANIFEST_PATH, BundleManifest
        )
        if manifest.total_item_count > MAX_TOTAL_ITEMS:
            msg = (
                f"bundle declares {manifest.total_item_count} items; "
                f"the limit is {MAX_TOTAL_ITEMS}"
            )
            raise TooManyItemsError(msg)

        declared_paths = (
            {MANIFEST_PATH}
            | {p.path for p in manifest.payloads}
            | {a.path for a in manifest.assets}
        )
        undeclared = sorted(
            set(names) - declared_paths - {SIGNATURE_PATH}
        )
        if undeclared:
            msg = f"files not declared in manifest: {', '.join(undeclared)}"
            raise BundleFormatError(msg)

        file_digests: dict[str, str] = {}
        for name in names:
            if name == SIGNATURE_PATH:
                continue
            file_digests[name] = sha256_hex(archive.read(name))

        payloads: dict[str, PayloadDocument] = {}
        total_items = 0
        for entry in manifest.payloads:
            if entry.path not in file_digests:
                msg = f"payload file missing: {entry.path}"
                raise BundleFormatError(msg)
            if file_digests[entry.path] != entry.sha256:
                msg = f"digest mismatch for {entry.path}"
                raise DigestMismatchError(msg)
            doc = _parse_json_member(archive, entry.path, PayloadDocument)
            if doc.kind != entry.kind:
                msg = (
                    f"{entry.path} declares kind {doc.kind!r} but the "
                    f"manifest says {entry.kind!r}"
                )
                raise BundleFormatError(msg)
            if len(doc.items) != entry.count:
                msg = (
                    f"{entry.path} carries {len(doc.items)} items but the "
                    f"manifest says {entry.count}"
                )
                raise BundleFormatError(msg)
            total_items += len(doc.items)
            payloads[entry.path] = doc
        if total_items > MAX_TOTAL_ITEMS:
            msg = (
                f"bundle carries {total_items} items; "
                f"the limit is {MAX_TOTAL_ITEMS}"
            )
            raise TooManyItemsError(msg)

        bundle_assets: dict[str, bytes] = {}
        for asset in manifest.assets:
            if asset.path not in file_digests:
                msg = f"asset file missing: {asset.path}"
                raise BundleFormatError(msg)
            if file_digests[asset.path] != asset.sha256:
                msg = f"digest mismatch for {asset.path}"
                raise DigestMismatchError(msg)
            bundle_assets[asset.path] = archive.read(asset.path)

        signature: BundleSignature | None = None
        if SIGNATURE_PATH in names:
            signature = _parse_json_member(
                archive, SIGNATURE_PATH, BundleSignature
            )

    return ParsedBundle(
        manifest=manifest,
        payloads=payloads,
        assets=bundle_assets,
        signature=signature,
        file_digests=file_digests,
    )


def _parse_json_member(archive: zipfile.ZipFile, name: str, model: type):
    """Read + JSON-parse + schema-validate one archive member."""
    try:
        doc = json.loads(archive.read(name))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        msg = f"{name} is not valid JSON"
        raise BundleFormatError(msg) from exc
    try:
        return model.model_validate(doc)
    except ValidationError as exc:
        msg = f"invalid {name}: {exc}"
        raise BundleFormatError(msg) from exc
