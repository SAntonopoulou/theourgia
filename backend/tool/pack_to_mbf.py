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
    # ⚠ NOT `magical-alphabets`, and NOT `voces-library`. Both were mapped
    # that way here on 15 August and both were WRONG — caught before any
    # importer was written against them, which is the only cheap moment.
    #
    # `voces-library` is this site's own name for a library of VOCES MAGICAE:
    # `models/voces.py`, with source_text, IPA and a required per-row
    # citation. The phone's `word-list` is a GEMATRIA word list — Sepher
    # Sephiroth, the Arabic Ayaspell — carrying `method`, `conventions`,
    # `rightToLeft` and a count in the thousands. Nothing in common but the
    # word "words". Importing one as the other would have put 2453 Hebrew
    # index entries into the voces table, every one of them failing the H05
    # citation rule for a reason that was never about honesty.
    #
    # `magical-alphabets` means a SCRIPT — Theban, Malachim, the Celestial
    # alphabet. The phone's `number-system` is a numeration: several methods
    # (isopsephy, pythmenes, ordinal) over one script, plus the normalising
    # rules that say whether ᾳ folds to α. The site's nearest existing thing
    # is `models/ciphers.py`, and a Cipher is ONE letter-value table — it
    # cannot hold four methods and a fold map, so `cipher-definitions` is not
    # the home either.
    #
    # This is the same failure the `correspondences` note in manifest.py
    # describes: one type name over two shapes is how a format rots.
    "number-system": "gematria-systems",
    "word-list": "gematria-word-lists",
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


#: Above this, a payload dict is data rather than a field. ⚠ Measured, not
#: inferred from types — an earlier version here called anything containing a
#: list "bulk", which swept up `shape` (`{"count": 5, "faces": [1, 3, 4, 6]}`)
#: and broke on it. What a value IS made of says nothing; how much of it there
#: is says everything.
#:
#: The packs leave no borderline case to adjudicate. Largest non-bulk: `shape`
#: at about forty bytes, and `{"occasion": "rite"}` at twenty. Smallest bulk:
#: Sepher Sephiroth's 2453 rows at 121 KB. Three orders of magnitude of clear
#: air.
_BULK_BYTES = 4096


def _is_bulk(value: dict[str, Any]) -> bool:
    """Whether a dict is the payload's DATA rather than a small map of fields.

    ⚠ Two unlike shapes hide under the same key. A word pack's `words` is
    `{"sepher-sephiroth": [2453 rows]}`, or for the big ones
    `{"arabic-ayaspell": "<10 MB string>"}`. A calendar's `words` is
    `{"occasion": "rite"}` — the word that pack wants used for an occasion.

    The first belongs in an asset. The second is a field of the subject, and
    putting it in an asset would hide a five-character setting inside a file.
    """
    if not value:
        return False
    try:
        return len(json.dumps(value, ensure_ascii=False)) > _BULK_BYTES
    except (TypeError, ValueError):
        # ⚠ Unserialisable is not bulk — it is a bug, and it should surface
        # where the payload is written rather than be hidden in an asset.
        return False


def _items_from(
    payload: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, tuple[bytes, str]]]:
    """Every entry in the payload, each carrying a `ref`, plus any assets.

    ⚠ **This dropped data until 15 August, and it dropped it silently.**

    The first version walked only the payload keys whose value was a LIST.
    That is most of them, and the digests all verified, and thirty-five of
    thirty-five packs converted — so it reported success while discarding
    twenty-one keys across the set. What went missing:

    * **`shape`, `instrument`, `castVerb`, `id`, `name`, `summary`** on the
      two divination systems. The payload *is* the system; its lists are its
      parts. Without `shape` — `{count: 5, faces: [1, 3, 4, 6]}` — an importer
      cannot say how many knucklebones to cast or what is written on them, so
      the system arrived as seventy-three orphan faces and entries belonging
      to nothing.
    * **`words`**, a dict of word-list id to its rows, on nine packs. Sepher
      Sephiroth is 2453 rows; the Arabic Ayaspell is 294,131. All of it.

    A digest over a document that is missing the payload's largest key is a
    correct digest of the wrong thing. Verifying thirty-five of them proved
    the ZIP was intact and nothing whatever about the conversion.

    So there are three kinds of top-level key, not one:

    **Lists** become items, as before, refs prefixed with the list they came
    from so two entries named "Opening" cannot collide.

    **Everything else scalar** — and any dict that is not bulk data, such as
    `shape` — describes the payload's SUBJECT and becomes one item, ref
    `self:<slug>`. For a pack that is one system this is the system.

    **A dict whose values are lists** is bulk data and becomes an ASSET, which
    is what MBF's `assets/**` is for. Forty megabytes of Greek and Arabic
    vocabulary has no business inside a payload document that something has to
    parse whole in order to read a name off it. The metadata item that owns it
    gets an `entries_asset` path pointing at the file, matched by `id`.
    """
    items: list[dict[str, Any]] = []
    assets: dict[str, tuple[bytes, str]] = {}
    seen: set[str] = set()

    subject: dict[str, Any] = {}
    bulk: dict[str, dict[str, Any]] = {}

    for key, value in payload.items():
        if isinstance(value, list):
            continue
        if isinstance(value, dict) and _is_bulk(value):
            # ⚠ A dict of id → rows. Bulk, and it goes to assets.
            bulk[key] = value
            continue
        subject[key] = value

    if subject:
        base = subject.get("id") or subject.get("name") or "self"
        ref = f"self:{_slugify(str(base), 'self')}"
        seen.add(ref)
        # ⚠ First, so that a reader taking items[0] gets the thing the pack is
        # about rather than an arbitrary one of its parts.
        items.append({"ref": ref, **subject})

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

    for key, mapping in bulk.items():
        for owner_id, rows in mapping.items():
            # ⚠ A string is written AS ITSELF, not JSON-encoded. The big word
            # lists ship as one packed string and wrapping it in quotes would
            # make every reader parse ten megabytes of JSON to get a string
            # back out that it then has to parse again.
            if isinstance(rows, str):
                path = f"assets/{_slugify(key, 'data')}/{_slugify(str(owner_id), 'rows')}.txt"
                assets[path] = (rows.encode(), "text/plain; charset=utf-8")
                count = rows.count("\n") + 1 if rows else 0
            else:
                path = f"assets/{_slugify(key, 'data')}/{_slugify(str(owner_id), 'rows')}.json"
                assets[path] = (
                    json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode(),
                    "application/json",
                )
                count = len(rows)
            # ⚠ Pointed at from the item that owns it, matched by `id`. An
            # asset nothing references is an asset nobody can find.
            owner = next((i for i in items if str(i.get("id")) == str(owner_id)), None)
            if owner is not None:
                owner["entries_asset"] = path
                owner["entries_count"] = count
            else:
                ref = f"{key}:{_slugify(str(owner_id), 'rows')}"
                while ref in seen:
                    ref += "-2"
                seen.add(ref)
                items.append(
                    {
                        "ref": ref,
                        "id": owner_id,
                        "entries_asset": path,
                        "entries_count": count,
                    }
                )

    return items, assets


def convert(
    pack: dict[str, Any], *, license_spdx: str, created: datetime
) -> tuple[BundleManifest, PayloadDocument, dict[str, tuple[bytes, str]]]:
    """A phone pack as an MBF manifest, one payload document and its assets."""
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
    items, assets = _items_from(payload)
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
    return envelope, doc, assets


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
) -> tuple[dict[str, Any], list[PayloadDocument], dict[str, tuple[bytes, str]]]:
    """A phone bundle as a manifest base, payload documents and assets."""
    manifest = pack["manifest"]
    inner = pack.get("payload", {}).get("packs")
    if not isinstance(inner, list) or not inner:
        msg = "bundle carries no packs"
        raise ValueError(msg)

    docs: list[PayloadDocument] = []
    assets: dict[str, tuple[bytes, str]] = {}
    seen_kinds: set[str] = set()
    for entry in inner:
        if not isinstance(entry, dict) or "manifest" not in entry:
            continue
        kind = str(entry["manifest"].get("kind", ""))
        mbf_type = KIND_TO_MBF_TYPE.get(kind)
        if mbf_type is None:
            msg = f"bundle holds an unmapped kind {kind!r}"
            raise ValueError(msg)
        items, pack_assets = _items_from(entry.get("payload", {}))
        # ⚠ Two packs in one bundle may name an asset the same way — the path
        # is built from the list key and the owner id, and two calendars both
        # carrying `words` for `default` would collide. Prefixed with the
        # inner pack's slug so they cannot.
        inner_slug = _slugify(str(entry["manifest"].get("id", "")), "pack")
        for path, blob in pack_assets.items():
            scoped = path.replace("assets/", f"assets/{inner_slug}/", 1)
            assets[scoped] = blob
            for item in items:
                if item.get("entries_asset") == path:
                    item["entries_asset"] = scoped
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
    return base, docs, assets


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
        base, docs, assets = convert_bundle(pack, license_spdx=args.license, created=created)
        print(f"  bundle           → {base['type']} carrying {len(docs)} payloads")
        for doc in docs:
            marker = "  ⚠" if doc.kind in NEW_TYPES else "   "
            print(f"{marker}   {doc.kind:<24}{len(doc.items):>4} items")
    else:
        envelope, doc, assets = convert(pack, license_spdx=args.license, created=created)
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

    args.out.write_bytes(build_mbf(manifest_base=base, payload_docs=docs, assets=assets))
    print(f"  wrote    {args.out} ({args.out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
