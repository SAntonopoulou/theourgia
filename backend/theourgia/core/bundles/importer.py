"""Per-kind MBF import — ADR-0011 import semantics.

Invariants every importer here upholds:

- **Personal visibility, always.** Imported content never lands with
  any visibility other than personal — there is no parameter to
  change that.
- **Entities are immutable nodes.** Imports never overwrite personal
  entities; each imported entity is a fresh row with
  ``origin="imported_from_bundle:<slug>@<version>"``. Alias prompting
  defaults to ``distinct`` — v1 creates no ``entity_alias`` rows.
- **Tradition tags propagate verbatim.** Items keep their
  ``tradition_tags``, so the existing closed-tradition public-share
  hard-block and AI-agent exclusion filters apply downstream without
  bundle-specific plumbing.
- **Nothing is silently dropped.** Every selected item produces a
  result — ``imported`` or ``skipped`` with a reason. Unknown payload
  kinds are opaque-but-listed: reported as skipped, never discarded
  without a trace.
- **Provenance is append-only.** The installed-bundle record copies
  the manifest chain verbatim; no code path here writes a shortened
  chain.

v1 payload kinds with importers: ``entities``, ``entry-templates``,
``tarot-spreads``, ``voces``, ``recipes``. The per-kind item schemas
are documented in ``docs/developer/mbf.md``.
"""

from __future__ import annotations

import json
from collections.abc import Collection, Sequence
from dataclasses import dataclass, field
from typing import Any, Protocol
from uuid import UUID

from theourgia.core.bundles.container import ParsedBundle
from theourgia.core.bundles.manifest import BundleManifest, build_attribution
from theourgia.models.bundles import InstalledBundle
from theourgia.models.entities import Entity, EntityKind, EntityVisibility
from theourgia.models.entries import EntryType
from theourgia.models.recipe import Recipe, RecipeKind
from theourgia.models.tarot import Spread, SpreadKind
from theourgia.models.templates import EntryTemplate, TemplateScope
from theourgia.models.voces import SourceScript, VoceMagicae

__all__ = [
    "KIND_IMPORTERS",
    "ORIGIN_PREFIX",
    "STATUS_IMPORTED",
    "STATUS_SKIPPED",
    "ItemResult",
    "bundle_origin",
    "import_entities",
    "import_entry_templates",
    "import_parsed_bundle",
    "import_recipes",
    "import_tarot_spreads",
    "import_voces",
    "make_installed_bundle",
]


ORIGIN_PREFIX = "imported_from_bundle"

STATUS_IMPORTED = "imported"
STATUS_SKIPPED = "skipped"


def bundle_origin(slug: str, version: str) -> str:
    """The §3 alias-graph origin string for content from one bundle."""
    return f"{ORIGIN_PREFIX}:{slug}@{version}"


@dataclass(frozen=True, slots=True)
class ItemResult:
    """The outcome for one selected item."""

    ref: str
    kind: str
    status: str  # STATUS_IMPORTED | STATUS_SKIPPED
    detail: str = ""
    created_id: str | None = None


@dataclass(slots=True)
class _ImportContext:
    """State shared by the per-item helpers of one importer run."""

    session: Any
    owner_id: UUID
    origin: str
    results: list[ItemResult] = field(default_factory=list)

    def imported(self, ref: str, kind: str, row: Any, detail: str = "") -> None:
        self.session.add(row)
        self.results.append(
            ItemResult(
                ref=ref,
                kind=kind,
                status=STATUS_IMPORTED,
                detail=detail,
                created_id=str(row.id),
            )
        )

    def skipped(self, ref: str, kind: str, detail: str) -> None:
        self.results.append(
            ItemResult(ref=ref, kind=kind, status=STATUS_SKIPPED, detail=detail)
        )


def _selected(
    items: Sequence[dict[str, Any]],
    selected_refs: Collection[str] | None,
) -> list[dict[str, Any]]:
    """The user-selected subset (piecemeal by design). ``None`` means
    everything."""
    if selected_refs is None:
        return list(items)
    wanted = set(selected_refs)
    return [item for item in items if item.get("ref") in wanted]


def _str_or_none(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value
    return None


def _str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [v for v in value if isinstance(v, str) and v.strip()]


def _dict_or_empty(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _list_or_empty(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


# ── Per-kind importers ─────────────────────────────────────────────
#
# Common signature: (session, items, *, owner_id, origin,
# selected_refs=None, sandbox_id=None) -> list[ItemResult].
# ``sandbox_id`` is accepted for forward compatibility; v1 kinds have
# no sandbox-namespaced tables (sandbox bundles defer materialization
# until promote), so it is unused here.


async def import_entities(
    session: Any,
    items: Sequence[dict[str, Any]],
    *,
    owner_id: UUID,
    origin: str,
    selected_refs: Collection[str] | None = None,
    sandbox_id: UUID | None = None,
) -> list[ItemResult]:
    """Import pantheon entities as immutable nodes.

    ``tradition_tags`` are kept verbatim (closed-tradition
    propagation); visibility is personal; no alias rows are created
    (import-time alias prompting defaults to ``distinct``).
    """
    _ = sandbox_id
    ctx = _ImportContext(session=session, owner_id=owner_id, origin=origin)
    for item in _selected(items, selected_refs):
        ref = item["ref"]
        name = _str_or_none(item.get("name"))
        if name is None:
            ctx.skipped(ref, "entities", "missing required field 'name'")
            continue
        raw_kind = item.get("kind")
        try:
            kind = EntityKind(raw_kind)
            kind_note = ""
        except ValueError:
            kind = EntityKind.OTHER
            kind_note = f"unknown entity kind {raw_kind!r} — stored as 'other'"
        tradition_tags = _str_list(item.get("tradition_tags"))
        row = Entity(
            name=name,
            kind=kind,
            glyph=_str_or_none(item.get("glyph")) or "entity",
            aliases=_str_list(item.get("aliases")),
            epithets=_str_list(item.get("epithets")),
            pronouns=_str_or_none(item.get("pronouns")),
            gender=_str_or_none(item.get("gender")),
            summary=_str_or_none(item.get("summary")),
            description=_str_or_none(item.get("description")),
            tradition=_str_or_none(item.get("tradition"))
            or (tradition_tags[0] if tradition_tags else ""),
            tradition_tags=tradition_tags,
            attributions=_dict_or_empty(item.get("attributions")),
            notes_shareable=_str_or_none(item.get("notes_shareable")),
            visibility=EntityVisibility.PERSONAL,
            owner_id=owner_id,
            origin=origin,
        )
        ctx.imported(ref, "entities", row, detail=kind_note)
    return ctx.results


async def import_entry_templates(
    session: Any,
    items: Sequence[dict[str, Any]],
    *,
    owner_id: UUID,
    origin: str,
    selected_refs: Collection[str] | None = None,
    sandbox_id: UUID | None = None,
) -> list[ItemResult]:
    """Import entry templates with scope=personal."""
    _ = origin, sandbox_id
    ctx = _ImportContext(session=session, owner_id=owner_id, origin="")
    for item in _selected(items, selected_refs):
        ref = item["ref"]
        name = _str_or_none(item.get("name"))
        if name is None:
            ctx.skipped(ref, "entry-templates", "missing required field 'name'")
            continue
        try:
            kind = EntryType(item.get("kind"))
        except ValueError:
            ctx.skipped(
                ref,
                "entry-templates",
                f"unknown entry type {item.get('kind')!r}",
            )
            continue
        body_template = item.get("body_template")
        if isinstance(body_template, (dict, list)):
            body_template = json.dumps(body_template)
        if not isinstance(body_template, str) or not body_template.strip():
            ctx.skipped(
                ref, "entry-templates", "missing required field 'body_template'"
            )
            continue
        row = EntryTemplate(
            name=name,
            description=_str_or_none(item.get("description")) or "",
            kind=kind,
            scope=TemplateScope.PERSONAL,
            body_template=body_template,
            default_title_pattern=_str_or_none(item.get("default_title_pattern")),
            default_glyph=_str_or_none(item.get("default_glyph")) or "feather",
            tradition=_str_or_none(item.get("tradition")),
            license=_str_or_none(item.get("license")),
            owner_id=owner_id,
        )
        ctx.imported(ref, "entry-templates", row)
    return ctx.results


async def import_tarot_spreads(
    session: Any,
    items: Sequence[dict[str, Any]],
    *,
    owner_id: UUID,
    origin: str,
    selected_refs: Collection[str] | None = None,
    sandbox_id: UUID | None = None,
) -> list[ItemResult]:
    """Import tarot spreads as user-owned custom spreads."""
    _ = origin, sandbox_id
    ctx = _ImportContext(session=session, owner_id=owner_id, origin="")
    for item in _selected(items, selected_refs):
        ref = item["ref"]
        name = _str_or_none(item.get("name"))
        if name is None:
            ctx.skipped(ref, "tarot-spreads", "missing required field 'name'")
            continue
        row = Spread(
            name=name,
            slug=_str_or_none(item.get("slug")) or ref,
            kind=SpreadKind.CUSTOM,
            description=_str_or_none(item.get("description")),
            positions=_list_or_empty(item.get("positions")),
            layout_json=_dict_or_empty(item.get("layout_json")),
            is_builtin=False,
            owner_id=owner_id,
        )
        ctx.imported(ref, "tarot-spreads", row)
    return ctx.results


async def import_voces(
    session: Any,
    items: Sequence[dict[str, Any]],
    *,
    owner_id: UUID,
    origin: str,
    selected_refs: Collection[str] | None = None,
    sandbox_id: UUID | None = None,
) -> list[ItemResult]:
    """Import voces magicae.

    The H05 honesty rule holds on import too: ``source_citation`` is
    required non-empty; items without one are skipped with a reason.
    Cross-vault ``linked_entity_ids`` are never carried over.
    """
    _ = origin, sandbox_id
    ctx = _ImportContext(session=session, owner_id=owner_id, origin="")
    for item in _selected(items, selected_refs):
        ref = item["ref"]
        name = _str_or_none(item.get("name"))
        source_text = _str_or_none(item.get("source_text"))
        if name is None or source_text is None:
            ctx.skipped(
                ref, "voces", "missing required field 'name' or 'source_text'"
            )
            continue
        citation = _str_or_none(item.get("source_citation"))
        if citation is None:
            ctx.skipped(
                ref,
                "voces",
                "missing required field 'source_citation' (per-row "
                "provenance is required for voces)",
            )
            continue
        raw_script = item.get("source_script")
        try:
            script = SourceScript(raw_script)
            script_note = ""
        except ValueError:
            script = SourceScript.CUSTOM
            script_note = (
                f"unknown source script {raw_script!r} — stored as 'custom'"
            )
        row = VoceMagicae(
            name=name,
            source_text=source_text,
            source_script=script,
            transliteration=_str_or_none(item.get("transliteration")),
            ipa=_str_or_none(item.get("ipa")),
            source_citation=citation,
            planetary_associations=_str_list(item.get("planetary_associations")),
            elemental_associations=_str_list(item.get("elemental_associations")),
            linked_entity_ids=[],
            forked_from_bundled_id=_str_or_none(
                item.get("forked_from_bundled_id")
            ),
            owner_id=owner_id,
        )
        ctx.imported(ref, "voces", row, detail=script_note)
    return ctx.results


async def import_recipes(
    session: Any,
    items: Sequence[dict[str, Any]],
    *,
    owner_id: UUID,
    origin: str,
    selected_refs: Collection[str] | None = None,
    sandbox_id: UUID | None = None,
) -> list[ItemResult]:
    """Import recipes with visibility=personal.

    Cross-vault ``library_source_ids`` / ``entity_ids`` are never
    carried over.
    """
    _ = origin, sandbox_id
    ctx = _ImportContext(session=session, owner_id=owner_id, origin="")
    for item in _selected(items, selected_refs):
        ref = item["ref"]
        name = _str_or_none(item.get("name"))
        if name is None:
            ctx.skipped(ref, "recipes", "missing required field 'name'")
            continue
        raw_kind = item.get("kind")
        try:
            kind = RecipeKind(raw_kind)
            kind_note = ""
        except ValueError:
            kind = RecipeKind.OTHER
            kind_note = f"unknown recipe kind {raw_kind!r} — stored as 'other'"
        row = Recipe(
            owner_id=owner_id,
            kind=kind,
            name=name,
            description=_str_or_none(item.get("description")),
            ingredients=_list_or_empty(item.get("ingredients")),
            steps=_list_or_empty(item.get("steps")),
            correspondences=_dict_or_empty(item.get("correspondences")),
            library_source_ids=[],
            entity_ids=[],
            visibility="personal",
        )
        ctx.imported(ref, "recipes", row, detail=kind_note)
    return ctx.results


class _Importer(Protocol):
    async def __call__(
        self,
        session: Any,
        items: Sequence[dict[str, Any]],
        *,
        owner_id: UUID,
        origin: str,
        selected_refs: Collection[str] | None = None,
        sandbox_id: UUID | None = None,
    ) -> list[ItemResult]: ...


KIND_IMPORTERS: dict[str, _Importer] = {
    "entities": import_entities,
    "entry-templates": import_entry_templates,
    "tarot-spreads": import_tarot_spreads,
    "voces": import_voces,
    "recipes": import_recipes,
}


# ── Whole-bundle import ────────────────────────────────────────────


async def import_parsed_bundle(
    session: Any,
    parsed: ParsedBundle,
    *,
    owner_id: UUID,
    selected_refs: Collection[str] | None = None,
    sandbox_id: UUID | None = None,
) -> list[ItemResult]:
    """Run the per-kind importers over one parsed container.

    ``selected_refs=None`` imports everything (the promote path);
    otherwise only the selected subset is touched. Unknown kinds are
    opaque-but-listed — every selected item of an unknown kind is
    reported as skipped with a reason.
    """
    origin = bundle_origin(parsed.manifest.slug, parsed.manifest.version)
    results: list[ItemResult] = []
    for doc in parsed.payloads.values():
        importer = KIND_IMPORTERS.get(doc.kind)
        if importer is None:
            results.extend(
                ItemResult(
                    ref=item["ref"],
                    kind=doc.kind,
                    status=STATUS_SKIPPED,
                    detail=(
                        f"kind {doc.kind!r} has no v1 importer — "
                        "listed but not materialized"
                    ),
                )
                for item in _selected(doc.items, selected_refs)
            )
            continue
        results.extend(
            await importer(
                session,
                doc.items,
                owner_id=owner_id,
                origin=origin,
                selected_refs=selected_refs,
                sandbox_id=sandbox_id,
            )
        )
    return results


def make_installed_bundle(
    manifest: BundleManifest,
    *,
    owner_id: UUID,
    signature_verdict: str,
    imported_item_count: int,
    source_file_key: str | None = None,
) -> InstalledBundle:
    """Build the permanent install record for one bundle.

    ``attribution`` is derived from required manifest fields so it is
    always non-empty, and ``provenance`` copies the manifest chain
    verbatim (append-only — no shortening path exists).
    """
    return InstalledBundle(
        owner_id=owner_id,
        slug=manifest.slug,
        version=manifest.version,
        name=manifest.name,
        type=manifest.type,
        manifest=manifest.model_dump(mode="json"),
        signature_verdict=signature_verdict,
        imported_item_count=imported_item_count,
        provenance=[link.model_dump() for link in manifest.provenance],
        closed_tradition=manifest.closed_tradition,
        attribution=build_attribution(manifest),
        source_file_key=source_file_key,
    )
