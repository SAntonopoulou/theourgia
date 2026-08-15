#!/usr/bin/env python3
"""Convert a phone pack into an MBF container — the two formats, converged.

Sophia, 15 August 2026: *"if possible they should all use the same packages and
download structure so packages on the mobile can be installed and worked on the
web and things can not drift. Is that possible?"*

Yes, and this is the bridge. **MBF is the target and the phone's format is the
one that moves**, because MBF is a strict superset in every dimension that
matters — digests, licence, provenance, attribution, signatures, binary assets
— and because its type catalogue was deliberately left open, which is exactly
the property needed to accept fifteen kinds it had never heard of.

    python3 tool/pack_to_mbf.py \\
        --pack ~/Documents/development/practiseapp/assets/packs/keybearers-tetraktys.json \\
        --license CC-BY-SA-4.0 \\
        --out /tmp/out.mbf

## ⚠ It validates against the REAL schemas

`BundleManifest` and `PayloadDocument` are imported from
`theourgia.core.bundles.manifest`, not reimplemented. A converter with its own
idea of the format is a second place for the rules to differ, which is the
thing this whole exercise exists to prevent.

## ⚠ What the phone's format does not carry, and is not invented here

**A licence.** MBF requires one and a phone pack has none, so `--license` is
required and has no default. Guessing on an author's behalf is not a small
liberty: the licence is what tells the next person what they may do with
somebody's rites.

**A creation date.** `--created` defaults to the file's own mtime rather than
to now, so converting the same pack twice does not produce two bundles that
disagree about when the work was made.

**Provenance.** Left empty. The chain is append-only and inventing a first link
would be claiming a history the pack does not have.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from theourgia.core.bundles.manifest import (  # noqa: E402
    TYPE_CATALOG,
    BundleAuthor,
    BundleLicense,
    BundleManifest,
    PayloadDocument,
)

# ── The kind map ────────────────────────────────────────────────────────────
#
# ⚠ Most of the phone's kinds already had a home in the catalogue, which is
# the strongest evidence that these two formats were built by people who agree
# about what a pack is.
#
# ⚠ Where a phone kind has NO counterpart it is listed here anyway, mapped to
# a name in the catalogue's own idiom. MBF imports an unknown type as
# "opaque-but-listed" rather than refusing it, so a kind that has not been
# taught to the importer yet still arrives, is recorded, and is visible —
# which is the behaviour that makes converging safe to do incrementally.
KIND_TO_MBF_TYPE: dict[str, str] = {
    # Already in TYPE_CATALOG.
    "spiritual-map": "spiritual-maps",
    "calendar": "festival-calendar",
    "rite": "ritual-set",
    "adoration-set": "ritual-set",
    "working": "ritual-set",
    "card-system": "oracle-deck",
    "number-system": "magical-alphabets",
    "word-list": "voces-library",
    "technique": "astro-techniques",
    "election-rules": "election-templates",
    # Not yet in the catalogue — see `NEW_TYPES`.
    "derivation": "divination-derivations",
    "field-system": "divination-fields",
    "session-system": "session-protocols",
    "sitting": "sitting-forms",
    "divination": "divination-systems",
}

#: The five the catalogue has not met. Adding them is one edit to
#: `TYPE_CATALOG`; until then they import opaque-but-listed, which loses
#: nothing and hides nothing.
NEW_TYPES: frozenset[str] = frozenset(t for t in KIND_TO_MBF_TYPE.values() if t not in TYPE_CATALOG)


# ── Payload adapters ────────────────────────────────────────────────────────
#
# ⚠ THE ONE REAL INCOMPATIBILITY, and it is shallow.
#
# A phone payload is a dict of named lists — `{"maps": [...]}`, `{"rites":
# [...]}`. An MBF payload document is `{"kind", "items": [...]}` where every
# item carries a unique string `ref` so that things inside a bundle can point
# at each other.
#
# So conversion is: find the list, and give every entry a ref. Nothing is
# reshaped beyond that — the phone's own field names travel intact, because a
# converter that renamed things would be a translation layer nobody could read
# back.


def _slugify(value: str, fallback: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:64]
    return slug or fallback


def _items_from(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Every entry in the payload's lists, each carrying a `ref`.

    ⚠ A pack whose payload holds several lists — a rite pack with both rites
    and a preface, say — contributes all of them, and the ref is prefixed with
    the list it came from so two entries named "Opening" in different lists
    cannot collide.
    """
    items: list[dict[str, Any]] = []
    seen: set[str] = set()

    for key, value in payload.items():
        if not isinstance(value, list):
            continue
        for index, entry in enumerate(value):
            if not isinstance(entry, dict):
                # ⚠ A bare string in a list — the phone has these (an ascent
                # is a list of node ids). Carried as an object so the item can
                # hold a ref at all, and named so the shape is obvious.
                entry = {"value": entry}
            base = entry.get("id") or entry.get("name") or f"{key}-{index}"
            ref = f"{key}:{_slugify(str(base), f'{key}-{index}')}"
            suffix = 1
            while ref in seen:
                suffix += 1
                ref = f"{key}:{_slugify(str(base), f'{key}-{index}')}-{suffix}"
            seen.add(ref)
            items.append({"ref": ref, **entry})

    return items


def convert(
    pack: dict[str, Any], *, license_spdx: str, created: datetime
) -> tuple[BundleManifest, PayloadDocument]:
    """A phone pack as an MBF manifest and one payload document."""
    manifest = pack.get("manifest")
    if not isinstance(manifest, dict):
        msg = "not a phone pack: no manifest (a bundle needs --split first)"
        raise ValueError(msg)

    kind = str(manifest.get("kind", ""))
    mbf_type = KIND_TO_MBF_TYPE.get(kind)
    if mbf_type is None:
        msg = f"unmapped phone kind {kind!r} — add it to KIND_TO_MBF_TYPE"
        raise ValueError(msg)

    payload = pack.get("payload")
    if not isinstance(payload, dict):
        msg = "pack has no payload object"
        raise ValueError(msg)
    items = _items_from(payload)
    if not items:
        msg = "payload contained no list entries to carry as items"
        raise ValueError(msg)

    # ⚠ `theourgia.keybearers.rites` → `theourgia-keybearers-rites`. The dotted
    # id is the phone's; the kebab slug is MBF's, and the mapping is
    # mechanical so a pack can be recognised across the two.
    slug = _slugify(str(manifest.get("id", "")), "pack")

    # ⚠ 3 → "3.0.0". One-way and safe: every integer has exactly one SemVer
    # reading, and nothing on the phone ever meant "3.1".
    raw_version = manifest.get("version", 1)
    version = f"{int(raw_version)}.0.0" if isinstance(raw_version, int) else str(raw_version)

    doc = PayloadDocument(kind=mbf_type, items=items)

    envelope = BundleManifest(
        mbf_version=1,
        type=mbf_type,
        name=str(manifest.get("name") or slug),
        slug=slug,
        version=version,
        description=str(manifest.get("summary", ""))[:4096],
        author=BundleAuthor(name=str(manifest.get("author") or "Unattributed")),
        license=BundleLicense(spdx=license_spdx),
        created_at=created,
        # ⚠ A placeholder, replaced by `build_mbf`, which computes the digest
        # over the bytes it actually writes. A digest filled in here would be
        # this tool's opinion of the file rather than the file — and a digest
        # that is anyone's opinion is not a digest.
        payloads=[
            {
                "path": f"payloads/{mbf_type}.json",
                "kind": mbf_type,
                "count": len(items),
                "sha256": "0" * 64,
            }
        ],
    )
    return envelope, doc


# ── Bundles ─────────────────────────────────────────────────────────────────
#
# ⚠ A phone bundle is a PACK whose kind is "bundle" and whose payload is other
# packs. MBF has no such kind and does not need one: **the container is the
# bundle**. So five of the phone's thirty-five packs do not convert to a
# payload at all — they convert to a container holding several.
#
# That is the convergence paying for itself rather than costing: one concept
# where there were two, and the "a bundle may not contain a bundle" rule the
# phone had to state becomes structurally impossible.


def convert_bundle(
    pack: dict[str, Any], *, license_spdx: str, created: datetime
) -> tuple[dict[str, Any], list[PayloadDocument]]:
    """A phone bundle as one manifest base and several payload documents."""
    manifest = pack["manifest"]
    inner = pack.get("payload", {}).get("packs")
    if not isinstance(inner, list) or not inner:
        msg = "bundle carries no packs"
        raise ValueError(msg)

    docs: list[PayloadDocument] = []
    seen_kinds: set[str] = set()
    for entry in inner:
        if not isinstance(entry, dict) or "manifest" not in entry:
            continue
        kind = str(entry["manifest"].get("kind", ""))
        mbf_type = KIND_TO_MBF_TYPE.get(kind)
        if mbf_type is None:
            msg = f"bundle holds an unmapped kind {kind!r}"
            raise ValueError(msg)
        items = _items_from(entry.get("payload", {}))
        if not items:
            continue
        # ⚠ Two packs of one kind in a bundle merge into one payload document,
        # because MBF allows one document per kind. The refs already carry
        # their list name, so nothing collides — and `_items_from` numbers a
        # clash rather than dropping it.
        if mbf_type in seen_kinds:
            for doc in docs:
                if doc.kind == mbf_type:
                    refs = {i["ref"] for i in doc.items}
                    for item in items:
                        ref = item["ref"]
                        suffix = 1
                        while ref in refs:
                            suffix += 1
                            ref = f"{item['ref']}-{suffix}"
                        refs.add(ref)
                        doc.items.append({**item, "ref": ref})
            continue
        seen_kinds.add(mbf_type)
        docs.append(PayloadDocument(kind=mbf_type, items=items))

    if not docs:
        msg = "bundle held nothing convertible"
        raise ValueError(msg)

    slug = _slugify(str(manifest.get("id", "")), "bundle")
    raw_version = manifest.get("version", 1)
    version = f"{int(raw_version)}.0.0" if isinstance(raw_version, int) else str(raw_version)
    base = {
        "mbf_version": 1,
        # ⚠ `tradition` is the catalogue's word for "the whole of a practice,
        # published together", which is exactly what a phone bundle is for.
        "type": "tradition",
        "name": str(manifest.get("name") or slug),
        "slug": slug,
        "version": version,
        "description": str(manifest.get("summary", ""))[:4096],
        "author": {"name": str(manifest.get("author") or "Unattributed")},
        "license": {"spdx": license_spdx},
        "created_at": created,
    }
    return base, docs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pack", required=True, type=Path)
    parser.add_argument(
        "--license",
        required=True,
        help="SPDX identifier. ⚠ REQUIRED and undefaulted — a phone pack "
        "carries no licence and guessing one on an author's behalf is not a "
        "small liberty.",
    )
    parser.add_argument("--out", type=Path, help="write the .mbf here")
    parser.add_argument(
        "--check",
        action="store_true",
        help="validate the mapping and print a summary, writing nothing",
    )
    args = parser.parse_args()

    pack = json.loads(args.pack.read_text())
    created = datetime.fromtimestamp(args.pack.stat().st_mtime, tz=UTC)
    kind = pack.get("manifest", {}).get("kind")

    print(f"{args.pack.name}")
    if kind == "bundle":
        base, docs = convert_bundle(pack, license_spdx=args.license, created=created)
        print(f"  bundle           → {base['type']} carrying {len(docs)} payloads")
        for doc in docs:
            marker = "  ⚠" if doc.kind in NEW_TYPES else "   "
            print(f"{marker}   {doc.kind:<24}{len(doc.items):>4} items")
    else:
        envelope, doc = convert(pack, license_spdx=args.license, created=created)
        base = envelope.model_dump(mode="json", exclude={"payloads", "assets"})
        docs = [doc]
        print(f"  {kind:<16} → {envelope.type}")
        print(f"  slug     {envelope.slug}")
        print(f"  version  {pack['manifest'].get('version')} → {envelope.version}")
        print(f"  items    {len(doc.items)}")
        if envelope.type in NEW_TYPES:
            print(f"  ⚠ {envelope.type} is not in TYPE_CATALOG — opaque-but-listed")

    if args.check or not args.out:
        return

    from theourgia.core.bundles.container import build_mbf

    args.out.write_bytes(build_mbf(manifest_base=base, payload_docs=docs))
    print(f"  wrote    {args.out} ({args.out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
