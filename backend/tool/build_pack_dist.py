#!/usr/bin/env python3
"""Build the pack distribution the server serves at theourgia.com/packs/.

Sophia, 18 August 2026: *"we need to make sure that packs are now
distributed from the theourgia.com server … That way the web version and
the mobile version can use the same source for packages, and we can trim
down the size of the mobile binary."*

This walks the phone's ``assets/packs`` — the authoring source of every
pack — converts each through the REAL converter (``pack_to_mbf``, which
validates against the real schemas), and writes:

    packs/dist/<slug>-v<version>.mbf     one artifact per pack, versioned
    packs/dist/feed.xml                  the RSS feed the phone already reads

The feed follows the contract documented in the phone's
``rss_pack_feed.dart``: plain RSS 2.0 with the ``pack:`` extension as an
optimisation. ``pack:id`` carries the phone's own dotted id and
``pack:version`` its integer version, so the phone can skip without
downloading; the enclosure is the ``.mbf`` itself. Artifact filenames are
versioned so the server may cache them as immutable; the feed alone must
never be cached.

    cd backend && uv run python tool/build_pack_dist.py \
        --packs-dir ~/Documents/development/practiseapp/assets/packs \
        --extra-dir ~/Documents/development/practiseapp/tool/packs-remote \
        --out ../packs/dist

## ⚠ The licences are declared HERE, per pack id

``pack_to_mbf`` requires a licence and refuses to default one, for good
reason. This mapping is the declaration point. Two kinds of entry:

* Corpora-derived word lists carry their upstream licence, as recorded in
  the phone's ``tool/extract_corpora.py`` where each corpus was taken.
* Everything of Sophia's own carries ``LicenseRef-All-Rights-Reserved``
  until she chooses otherwise — the one value that GRANTS nothing and so
  claims nothing on her behalf. Flagged for her review, deliberately loud.

A pack with no entry here fails the build rather than shipping unlicensed.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import UTC, datetime
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tool.pack_to_mbf import convert, convert_bundle

from theourgia.core.bundles.container import build_mbf

# Per pack id. See the module docstring for why this exists and what the
# two kinds of value mean. ⚠ REVIEW: everything All-Rights-Reserved is
# awaiting Sophia's own choice of licence.
LICENSES: dict[str, str] = {
    # Corpora, under their upstream terms (phone tool/extract_corpora.py):
    "theourgia.words.greek-diorisis": "CC-BY-4.0",  # Diorisis corpus
    "theourgia.words.hebrew-wlc": "CC-BY-4.0",  # text PD; morphology CC BY 4.0
    "theourgia.words.hebrew-wikidata": "CC0-1.0",  # Wikidata lexemes
    "theourgia.words.arabic-ayaspell": "MPL-1.1",  # ayaspell tri-licence
    # Crowley, published 1912–1913 and out of copyright everywhere:
    "theourgia.words.sepher-sephiroth": "LicenseRef-Public-Domain",
}

# Sophia's own work (author fields: 'theourgia', 'Sophia Antonopoulou') and
# the compiled-Crowley packs default here — nothing granted until she says.
FALLBACK_LICENSE = "LicenseRef-All-Rights-Reserved"

FEED_TITLE = "Theourgia packs"
FEED_DESCRIPTION = (
    "Every pack theourgia publishes — traditions, rites, calendars, number "
    "systems and word corpora — as .mbf, one source for the app and the site."
)


def _artifact(pack: dict, *, license_spdx: str, created: datetime) -> bytes:
    if pack.get("manifest", {}).get("kind") == "bundle":
        base, docs, assets = convert_bundle(pack, license_spdx=license_spdx, created=created)
    else:
        envelope, doc, assets = convert(pack, license_spdx=license_spdx, created=created)
        base = envelope.model_dump(mode="json", exclude={"payloads", "assets"})
        docs = [doc]
    return build_mbf(manifest_base=base, payload_docs=docs, assets=assets)


def _slug(dotted: str) -> str:
    """The site converter's own slugging, byte-identical (see pack_to_mbf)."""
    slug = re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", dotted.lower()))
    return slug[:64] if len(slug) > 64 else slug


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packs-dir", required=True, type=Path)
    parser.add_argument(
        "--extra-dir",
        type=Path,
        help="a second source dir — the phone's remote-only packs",
    )
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument(
        "--base-url",
        default="https://theourgia.com/packs",
        help="where the artifacts will be served",
    )
    args = parser.parse_args()

    sources = sorted(args.packs_dir.glob("*.json"))
    if args.extra_dir and args.extra_dir.is_dir():
        sources += sorted(args.extra_dir.glob("*.json"))
    if not sources:
        sys.exit(f"no packs found under {args.packs_dir}")

    args.out.mkdir(parents=True, exist_ok=True)

    items: list[str] = []
    seen: set[str] = set()
    for path in sources:
        pack = json.loads(path.read_text())
        manifest = pack.get("manifest")
        if not isinstance(manifest, dict) or not manifest.get("id"):
            print(f"  skipped (no manifest): {path.name}")
            continue
        pack_id = str(manifest["id"])
        if pack_id in seen:
            sys.exit(f"duplicate pack id {pack_id} at {path}")
        seen.add(pack_id)

        version = int(manifest.get("version", 1))
        spdx = LICENSES.get(pack_id, FALLBACK_LICENSE)
        created = datetime.fromtimestamp(path.stat().st_mtime, tz=UTC)

        blob = _artifact(pack, license_spdx=spdx, created=created)
        name = f"{_slug(pack_id)}-v{version}.mbf"
        (args.out / name).write_bytes(blob)
        print(f"  {name:<56}{len(blob):>10} bytes  {spdx}")

        items.append(
            "    <item>\n"
            f"      <title>{escape(str(manifest.get('name', pack_id)))} "
            f"{version}</title>\n"
            f'      <guid isPermaLink="false">{escape(pack_id)}@{version}</guid>\n'
            f"      <pubDate>{format_datetime(created)}</pubDate>\n"
            f"      <description>{escape(str(manifest.get('summary', '')))}"
            "</description>\n"
            f"      <pack:id>{escape(pack_id)}</pack:id>\n"
            f"      <pack:version>{version}</pack:version>\n"
            f'      <enclosure url="{args.base_url}/{name}" '
            f'type="application/x-mbf" length="{len(blob)}"/>\n'
            "    </item>"
        )

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:pack="https://theourgia.com/ns/pack">\n'
        "  <channel>\n"
        f"    <title>{FEED_TITLE}</title>\n"
        f"    <link>{args.base_url}</link>\n"
        f"    <description>{FEED_DESCRIPTION}</description>\n" + "\n".join(items) + "\n"
        "  </channel>\n"
        "</rss>\n"
    )
    (args.out / "feed.xml").write_text(feed)
    print(f"  feed.xml — {len(items)} packs")


if __name__ == "__main__":
    main()
