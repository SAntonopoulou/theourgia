"""MBF v1 manifest, payload, and signature schemas — ADR-0011.

Strict pydantic models (``extra="forbid"``) so a malformed bundle
fails loudly at the container boundary rather than deep inside an
importer. The rules baked in here, verbatim from the ADR:

- ``type`` is kebab-case. Values from the FEATURES §11 catalog are
  "known"; unknown-but-well-formed types are still accepted — they
  import as opaque-but-listed, nothing is silently dropped.
- ``license.magickal_tags`` ⊆ the five-tag magickal vocabulary.
- ``provenance`` is append-only: import preserves the chain verbatim
  and no API writes a shortened chain. The schema enforces the shape;
  the append-only discipline lives in the importer (verbatim copy).
- ``version`` is strict SemVer (same pattern the plugin manifest
  uses).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

__all__ = [
    "MAGICKAL_LICENSE_TAGS",
    "MBF_VERSION",
    "TYPE_CATALOG",
    "AssetRef",
    "BundleAuthor",
    "BundleDependency",
    "BundleLicense",
    "BundleManifest",
    "BundleSignature",
    "PayloadDocument",
    "PayloadRef",
    "ProvenanceLink",
    "SourceCitation",
    "build_attribution",
    "is_known_type",
]


MBF_VERSION: int = 1

# FEATURES §11 — the five magickal-specific license tags.
MAGICKAL_LICENSE_TAGS: frozenset[str] = frozenset(
    {
        "for-members-only",
        "for-initiates-only",
        "no-derivatives",
        "share-alike",
        "public-domain",
    }
)

# FEATURES §11 bundle types catalog, kebab-case per ADR-0011. Unknown
# (but well-formed kebab-case) types are accepted by the schema and
# import as opaque-but-listed.
TYPE_CATALOG: frozenset[str] = frozenset(
    {
        "pantheon",
        "tradition",
        "initiation-curriculum",
        "reading-curriculum",
        "ritual-set",
        "pathworking-scripts",
        "ritual-templates",
        "voces-library",
        "servitor-patterns",
        "tarot-deck",
        "oracle-deck",
        "tarot-spreads",
        "sigil-library",
        "talisman-designs",
        "circle-designs",
        "magic-squares",
        "magical-alphabets",
        "correspondences",
        "recipe-book",
        "festival-calendar",
        "calendar-system",
        "cipher-definitions",
        "astro-techniques",
        "library-collection",
        "quote-collection",
        "election-templates",
        "analytics-studies",
        "entry-templates",
        "body-diagram-presets",
        "dream-symbols",
        "plugin",
    }
)


_KebabStr = Annotated[
    str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9-]{0,63}$")
]
"""Kebab-case identifier: lowercase alphanumerics + hyphens, ≤64 chars."""

_SemVerStr = Annotated[
    str, StringConstraints(pattern=r"^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$")
]
"""Strict SemVer 2.0 string — same pattern the plugin manifest uses."""

_Sha256Hex = Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{64}$")]
"""Lowercase hex SHA-256."""


def is_known_type(bundle_type: str) -> bool:
    """Whether ``bundle_type`` is in the FEATURES §11 catalog."""
    return bundle_type in TYPE_CATALOG


class BundleAuthor(BaseModel):
    """Who made the bundle. ``name`` is required so attribution can
    never be empty (FEATURES §11: cannot be stripped)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    did: str | None = Field(default=None, max_length=255)
    public_key: str | None = Field(
        default=None,
        max_length=128,
        description="Base64 Ed25519 raw public key, optional.",
    )


class BundleLicense(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spdx: str = Field(min_length=1, max_length=64)
    magickal_tags: list[str] = Field(default_factory=list)

    @field_validator("magickal_tags")
    @classmethod
    def _tags_in_vocabulary(cls, v: list[str]) -> list[str]:
        for tag in v:
            if tag not in MAGICKAL_LICENSE_TAGS:
                allowed = ", ".join(sorted(MAGICKAL_LICENSE_TAGS))
                msg = f"unknown magickal license tag {tag!r} (allowed: {allowed})"
                raise ValueError(msg)
        return v


class SourceCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    citation: str = Field(min_length=1, max_length=1024)
    url: str | None = Field(default=None, max_length=1024)


class BundleDependency(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: _KebabStr
    version_range: str = Field(min_length=1, max_length=128)


class ProvenanceLink(BaseModel):
    """One link in the append-only provenance chain. Kept loose on
    purpose — chains written by other instances must round-trip
    verbatim."""

    model_config = ConfigDict(extra="forbid")

    slug: str = Field(min_length=1, max_length=128)
    version: str = Field(min_length=1, max_length=64)
    author_name: str = Field(min_length=1, max_length=255)
    note: str = Field(default="", max_length=1024)


class PayloadRef(BaseModel):
    """A manifest entry describing one payload document."""

    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1, max_length=255)
    kind: _KebabStr
    count: int = Field(ge=0)
    sha256: _Sha256Hex

    @field_validator("path")
    @classmethod
    def _path_under_payloads(cls, v: str) -> str:
        if not v.startswith("payloads/") or not v.endswith(".json"):
            msg = f"payload path must be payloads/<name>.json, got {v!r}"
            raise ValueError(msg)
        return v


class AssetRef(BaseModel):
    """A manifest entry describing one binary asset."""

    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1, max_length=255)
    sha256: _Sha256Hex
    media_type: str = Field(min_length=1, max_length=128)

    @field_validator("path")
    @classmethod
    def _path_under_assets(cls, v: str) -> str:
        if not v.startswith("assets/") or ".." in v:
            msg = f"asset path must live under assets/, got {v!r}"
            raise ValueError(msg)
        return v


class BundleManifest(BaseModel):
    """``manifest.json`` — schema ``mbf/1`` per ADR-0011."""

    model_config = ConfigDict(extra="forbid")

    mbf_version: Literal[1]
    type: _KebabStr
    name: str = Field(min_length=1, max_length=256)
    slug: _KebabStr
    version: _SemVerStr
    description: str = Field(default="", max_length=4096)
    author: BundleAuthor
    license: BundleLicense
    source_citations: list[SourceCitation] = Field(default_factory=list)
    dependencies: list[BundleDependency] = Field(default_factory=list)
    provenance: list[ProvenanceLink] = Field(default_factory=list)
    closed_tradition: bool = False
    closed_tradition_note: str = Field(default="", max_length=2048)
    created_at: datetime
    payloads: list[PayloadRef] = Field(min_length=1)
    assets: list[AssetRef] = Field(default_factory=list)

    @model_validator(mode="after")
    def _paths_unique(self) -> BundleManifest:
        paths = [p.path for p in self.payloads] + [a.path for a in self.assets]
        if len(paths) != len(set(paths)):
            msg = "payload/asset paths must be unique within the container"
            raise ValueError(msg)
        return self

    @property
    def total_item_count(self) -> int:
        return sum(p.count for p in self.payloads)

    @property
    def type_known(self) -> bool:
        return is_known_type(self.type)


class PayloadDocument(BaseModel):
    """One ``payloads/<kind>.json`` document: ``{"kind", "items"}``.

    Every item is a self-contained JSON object carrying a
    bundle-local ``ref`` (stable string id for cross-references
    within the bundle). Refs must be unique within a payload."""

    model_config = ConfigDict(extra="forbid")

    kind: _KebabStr
    items: list[dict[str, Any]]

    @field_validator("items")
    @classmethod
    def _items_carry_unique_refs(
        cls, v: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        seen: set[str] = set()
        for index, item in enumerate(v):
            ref = item.get("ref")
            if not isinstance(ref, str) or not ref:
                msg = f"items[{index}] must carry a non-empty string 'ref'"
                raise ValueError(msg)
            if ref in seen:
                msg = f"duplicate item ref {ref!r} within payload"
                raise ValueError(msg)
            seen.add(ref)
        return v


class BundleSignature(BaseModel):
    """``signature.json`` — the detached signature block."""

    model_config = ConfigDict(extra="forbid")

    algorithm: Literal["ed25519"]
    public_key: str = Field(min_length=1, max_length=128)
    signed_digest: str = Field(min_length=1, max_length=256)
    digest_manifest: dict[str, _Sha256Hex] = Field(min_length=1)


def build_attribution(manifest: BundleManifest) -> str:
    """Render the human-readable attribution block for a bundle.

    Surfaced prominently in the import preview and persisted on the
    ``installed_bundle`` row; there is no strip path (FEATURES §11).
    Always non-empty because ``name``, ``author.name`` and
    ``license.spdx`` are required, non-empty manifest fields.
    """
    text = (
        f"{manifest.name} v{manifest.version} "
        f"by {manifest.author.name} — {manifest.license.spdx}"
    )
    if manifest.license.magickal_tags:
        text += f" ({', '.join(manifest.license.magickal_tags)})"
    if manifest.source_citations:
        citations = "; ".join(c.citation for c in manifest.source_citations)
        text += f". Sources: {citations}"
    return text
