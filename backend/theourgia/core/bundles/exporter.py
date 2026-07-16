"""Per-kind MBF export builders — ADR-0011 export path.

Builds an ``.mbf`` container from vault content for the v1 payload
kinds. What never leaves the vault:

- ``Entity.notes_private`` and the whole ``ancestor_profile`` blob
  (owner-only; the latter can carry third-party PII)
- upload/attachment references (media stays in the Media Library;
  bundles reference by citation, not blob)
- cross-vault row ids (``linked_entity_ids`` etc.)

Closed-tradition declarations survive export: when any exported
item's ``tradition_tags`` intersect this instance's operator-curated
closed set, the manifest is stamped ``closed_tradition: true`` with a
note listing the slugs.
"""

from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.bundles.container import build_mbf
from theourgia.core.bundles.manifest import MBF_VERSION, PayloadDocument
from theourgia.core.traditions import closed_tradition_conflicts
from theourgia.models.entities import Entity
from theourgia.models.recipe import Recipe
from theourgia.models.tarot import Spread
from theourgia.models.templates import EntryTemplate
from theourgia.models.voces import VoceMagicae

__all__ = [
    "EXPORTABLE_TYPES",
    "build_export",
    "export_entities",
    "export_entry_templates",
    "export_recipes",
    "export_tarot_spreads",
    "export_voces",
]


# The exporter never presumes a license for personal vault content;
# the author chooses one when publishing. LicenseRef- is the SPDX
# mechanism for non-listed licenses.
DEFAULT_EXPORT_LICENSE = "LicenseRef-All-Rights-Reserved"


def _make_ref(name: str, used: set[str]) -> str:
    """A stable, human-readable bundle-local ref from a display name."""
    base = re.sub(r"[^a-z0-9]+", "-", name.casefold()).strip("-") or "item"
    ref = base
    counter = 2
    while ref in used:
        ref = f"{base}-{counter}"
        counter += 1
    used.add(ref)
    return ref


def _clean(item: dict[str, Any]) -> dict[str, Any]:
    """Drop ``None`` values so payload documents stay tidy; empty
    lists/dicts are kept (they are meaningful shapes)."""
    return {k: v for k, v in item.items() if v is not None}


async def _owned_rows(
    session: AsyncSession, model: type, owner_id: UUID
) -> list[Any]:
    stmt = (
        select(model)
        .where(
            model.owner_id == owner_id,
            model.deleted_at.is_(None),
        )
        .order_by(model.created_at.asc())
    )
    return list((await session.execute(stmt)).scalars().all())


# ── Per-kind export builders ───────────────────────────────────────


async def export_entities(
    session: AsyncSession, owner_id: UUID
) -> list[dict[str, Any]]:
    rows = await _owned_rows(session, Entity, owner_id)
    used: set[str] = set()
    return [
        _clean(
            {
                "ref": _make_ref(row.name, used),
                "name": row.name,
                "kind": row.kind.value,
                "glyph": row.glyph,
                "aliases": row.aliases,
                "epithets": row.epithets,
                "pronouns": row.pronouns,
                "gender": row.gender,
                "summary": row.summary,
                "description": row.description,
                "tradition": row.tradition,
                "tradition_tags": row.tradition_tags,
                "attributions": row.attributions,
                "notes_shareable": row.notes_shareable,
            }
        )
        for row in rows
    ]


async def export_entry_templates(
    session: AsyncSession, owner_id: UUID
) -> list[dict[str, Any]]:
    rows = await _owned_rows(session, EntryTemplate, owner_id)
    used: set[str] = set()
    return [
        _clean(
            {
                "ref": _make_ref(row.name, used),
                "name": row.name,
                "description": row.description,
                "kind": row.kind.value,
                "body_template": row.body_template,
                "default_title_pattern": row.default_title_pattern,
                "default_glyph": row.default_glyph,
                "tradition": row.tradition,
                "license": row.license,
            }
        )
        for row in rows
    ]


async def export_tarot_spreads(
    session: AsyncSession, owner_id: UUID
) -> list[dict[str, Any]]:
    rows = await _owned_rows(session, Spread, owner_id)
    used: set[str] = set()
    return [
        _clean(
            {
                "ref": _make_ref(row.name, used),
                "name": row.name,
                "slug": row.slug,
                "description": row.description,
                "positions": row.positions,
                "layout_json": row.layout_json,
            }
        )
        for row in rows
    ]


async def export_voces(
    session: AsyncSession, owner_id: UUID
) -> list[dict[str, Any]]:
    rows = await _owned_rows(session, VoceMagicae, owner_id)
    used: set[str] = set()
    return [
        _clean(
            {
                "ref": _make_ref(row.name, used),
                "name": row.name,
                "source_text": row.source_text,
                "source_script": row.source_script.value,
                "transliteration": row.transliteration,
                "ipa": row.ipa,
                "source_citation": row.source_citation,
                "planetary_associations": row.planetary_associations,
                "elemental_associations": row.elemental_associations,
                "forked_from_bundled_id": row.forked_from_bundled_id,
            }
        )
        for row in rows
    ]


async def export_recipes(
    session: AsyncSession, owner_id: UUID
) -> list[dict[str, Any]]:
    rows = await _owned_rows(session, Recipe, owner_id)
    used: set[str] = set()
    return [
        _clean(
            {
                "ref": _make_ref(row.name, used),
                "kind": row.kind.value,
                "name": row.name,
                "description": row.description,
                "ingredients": row.ingredients,
                "steps": row.steps,
                "correspondences": row.correspondences,
            }
        )
        for row in rows
    ]


_ExportFn = Callable[[AsyncSession, UUID], Awaitable[list[dict[str, Any]]]]

# bundle type (FEATURES §11 catalog) -> (payload kind, builder)
EXPORTABLE_TYPES: dict[str, tuple[str, _ExportFn]] = {
    "pantheon": ("entities", export_entities),
    "entry-templates": ("entry-templates", export_entry_templates),
    "tarot-spreads": ("tarot-spreads", export_tarot_spreads),
    "voces-library": ("voces", export_voces),
    "recipe-book": ("recipes", export_recipes),
}


async def build_export(
    session: AsyncSession,
    *,
    owner_id: UUID,
    bundle_type: str,
    author_name: str,
    author_did: str | None = None,
    closed_slugs: frozenset[str] = frozenset(),
) -> bytes:
    """Build an unsigned ``.mbf`` from vault content of one type.

    ``bundle_type`` must be a key of :data:`EXPORTABLE_TYPES` — the
    caller validates first and turns a miss into an HTTP error.
    Signing is the caller's opt-in step.
    """
    kind, builder = EXPORTABLE_TYPES[bundle_type]
    items = await builder(session, owner_id)

    conflict_slugs = sorted(
        {
            slug
            for item in items
            for slug in closed_tradition_conflicts(
                item.get("tradition_tags", []), closed_slugs
            )
        }
    )
    closed_note = (
        "Contains material tagged with closed traditions: "
        f"{', '.join(conflict_slugs)}. Not for public redistribution."
        if conflict_slugs
        else ""
    )

    manifest_base = {
        "mbf_version": MBF_VERSION,
        "type": bundle_type,
        "name": f"{bundle_type.replace('-', ' ').title()} Export",
        "slug": f"{bundle_type}-export",
        "version": "1.0.0",
        "description": "Exported from a Theourgia vault.",
        "author": {"name": author_name, "did": author_did},
        "license": {"spdx": DEFAULT_EXPORT_LICENSE, "magickal_tags": []},
        "closed_tradition": bool(conflict_slugs),
        "closed_tradition_note": closed_note,
        "created_at": datetime.now(tz=UTC).isoformat(),
    }
    payload = PayloadDocument(kind=kind, items=items)
    return build_mbf(manifest_base=manifest_base, payload_docs=[payload])
