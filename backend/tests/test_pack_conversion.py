"""The phone-pack converter must not drop what the pack was carrying.

⚠ **This file exists because it did.** `tool/pack_to_mbf.py` walked only the
payload keys whose value was a LIST, which is most of them — so all
thirty-five packs converted, every digest verified, and twenty-one keys went
missing across the set without a word.

A digest over a document that is missing the payload's largest key is a
correct digest of the wrong thing. Verifying thirty-five of them proved the
ZIP was intact and nothing whatever about the conversion. These tests check
the conversion.

What was lost, and what each test below pins:

* **`shape`, `instrument`, `castVerb`** on the divination systems. The payload
  IS the system; its lists are its parts. Without `shape` — `{count: 5,
  faces: [1, 3, 4, 6]}` — nothing can say how many knucklebones to cast, so
  the system arrived as seventy-three orphan faces belonging to nothing.
* **`words`**, the actual word data, on five packs. 34.9 MB of it.

⚠ These run against the real packs when practiseapp is checked out beside
this repo, and skip when it is not. The synthetic cases below do not skip —
they are the ones that must hold on any machine.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tool.pack_to_mbf import _BULK_BYTES, _is_bulk, _items_from

PACKS = Path("/home/sophia/Documents/development/practiseapp/assets/packs")


class TestNothingIsDropped:
    """Every top-level payload key reaches an item or an asset."""

    def test_a_scalar_key_becomes_the_subject_item(self) -> None:
        items, assets = _items_from(
            {
                "id": "astralogi.keybearers.tetraktys",
                "name": "The Tetraktys Dice-Oracle",
                "instrument": "knucklebones",
                "shape": {"count": 5, "faces": [1, 3, 4, 6]},
                "faces": [{"value": 1, "name": "Hades"}],
            }
        )
        assert not assets
        # ⚠ FIRST, so a reader taking items[0] gets the thing the pack is
        # about rather than an arbitrary one of its parts.
        subject = items[0]
        assert subject["ref"] == "self:astralogi-keybearers-tetraktys"
        assert subject["name"] == "The Tetraktys Dice-Oracle"
        # ⚠ The one that makes the system castable at all.
        assert subject["shape"] == {"count": 5, "faces": [1, 3, 4, 6]}
        assert subject["instrument"] == "knucklebones"
        # The list still becomes its own item, as it always did.
        assert items[1]["ref"] == "faces:hades"

    def test_shape_is_a_field_and_not_bulk(self) -> None:
        """⚠ The regression that broke the fix's first attempt.

        `shape` contains a list, and a version of `_is_bulk` that called
        anything containing a list "bulk" swept it into an asset and then
        crashed on `count: 5` being an int. What a value is MADE of says
        nothing; how much of it there is says everything.
        """
        assert not _is_bulk({"count": 5, "faces": [1, 3, 4, 6]})

    def test_a_small_words_map_is_a_field_and_not_an_asset(self) -> None:
        """⚠ Two unlike shapes under one key.

        A calendar's `words` is `{"occasion": "rite"}` — the word that pack
        wants used. Writing five characters into an asset file would hide a
        setting nobody would then find.
        """
        assert not _is_bulk({"occasion": "rite"})
        items, assets = _items_from({"name": "A calendar", "words": {"occasion": "rite"}})
        assert not assets
        assert items[0]["words"] == {"occasion": "rite"}

    def test_bulk_word_data_becomes_an_asset_the_item_points_at(self) -> None:
        rows = [[f"word{n}", "", "a meaning", 1, n] for n in range(500)]
        assert _is_bulk({"sepher-sephiroth": rows})
        items, assets = _items_from(
            {
                "wordLists": [{"id": "sepher-sephiroth", "name": "Sepher Sephiroth"}],
                "words": {"sepher-sephiroth": rows},
            }
        )
        path = "assets/words/sepher-sephiroth.json"
        assert path in assets
        assert json.loads(assets[path][0]) == rows
        # ⚠ Pointed at from the item that owns it, matched by `id`. An asset
        # nothing references is an asset nobody can find.
        owner = next(i for i in items if i.get("id") == "sepher-sephiroth")
        assert owner["entries_asset"] == path
        assert owner["entries_count"] == 500

    def test_a_bulk_string_is_written_as_itself(self) -> None:
        """⚠ Not JSON-encoded.

        The big lists ship as one packed string. Wrapping it in quotes would
        make every reader parse ten megabytes of JSON to get back a string it
        then has to parse again.
        """
        blob = "\n".join(f"line {n}" for n in range(2000))
        assert len(blob) > _BULK_BYTES
        _, assets = _items_from({"words": {"arabic-ayaspell": blob}})
        path = "assets/words/arabic-ayaspell.txt"
        assert assets[path][0] == blob.encode()
        assert assets[path][1].startswith("text/plain")

    def test_an_orphan_asset_still_gets_an_item(self) -> None:
        """⚠ Bulk whose `id` matches no item is carried, not dropped.

        The whole failure this file guards against was data going missing
        because nothing had a place for it. A fallback that drops the orphan
        would be the same bug with better manners.
        """
        items, assets = _items_from({"words": {"nobody-owns-me": ["a"] * 3000}})
        assert assets
        orphan = next(i for i in items if i.get("id") == "nobody-owns-me")
        assert orphan["entries_asset"] in assets


@pytest.mark.skipif(not PACKS.is_dir(), reason="practiseapp is not checked out beside this repo")
class TestAgainstTheRealPacks:
    """⚠ The packs themselves, which is where the loss actually happened."""

    @staticmethod
    def _unaccounted(pack: dict) -> list[str]:
        payload = pack.get("payload") or {}
        items, assets = _items_from(payload)
        blob = json.dumps(items, ensure_ascii=False)
        missing = []
        for key, value in payload.items():
            if isinstance(value, list) or key == "packs":
                continue
            in_items = f'"{key}"' in blob
            in_assets = any(f"assets/{key}/" in path for path in assets)
            if not (in_items or in_assets):
                missing.append(key)
        return missing

    def test_no_payload_key_goes_unaccounted_for(self) -> None:
        offenders: dict[str, list[str]] = {}
        for src in sorted(PACKS.glob("*.json")):
            pack = json.loads(src.read_text())
            if pack.get("manifest", {}).get("kind") == "bundle":
                for inner in pack["payload"].get("packs", []):
                    missing = self._unaccounted(inner)
                    if missing:
                        offenders[f"{src.stem}/{inner['manifest'].get('id')}"] = missing
            else:
                missing = self._unaccounted(pack)
                if missing:
                    offenders[src.stem] = missing
        assert not offenders, f"payload keys dropped by the converter: {offenders}"

    def test_the_word_data_is_carried(self) -> None:
        """⚠ 34.9 MB of it, all of which used to vanish."""
        total = 0
        for src in sorted(PACKS.glob("words-*.json")):
            _, assets = _items_from(json.loads(src.read_text())["payload"])
            assert assets, f"{src.stem} carried no word data"
            total += sum(len(blob) for blob, _ in assets.values())
        assert total > 30_000_000, f"only {total:,} bytes of word data — it was 34.9 MB"

    def test_every_divination_system_can_still_be_cast(self) -> None:
        """⚠ `shape` says how many to throw and what is written on them."""
        found = 0
        for src in sorted(PACKS.glob("*.json")):
            pack = json.loads(src.read_text())
            packs = (
                pack["payload"].get("packs", [])
                if pack.get("manifest", {}).get("kind") == "bundle"
                else [pack]
            )
            for one in packs:
                if one.get("manifest", {}).get("kind") != "divination":
                    continue
                items, _ = _items_from(one.get("payload") or {})
                subject = items[0]
                assert subject["ref"].startswith("self:"), src.stem
                assert subject.get("shape", {}).get("count"), f"{src.stem} cannot be cast"
                assert subject["shape"].get("faces"), f"{src.stem} has no faces"
                found += 1
        assert found, "no divination systems found — has the pack kind been renamed?"
