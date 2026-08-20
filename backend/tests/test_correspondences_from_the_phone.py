"""A phone pack becomes a correspondence chart here — end to end.

Sophia, 15 August 2026: *"if possible they should all use the same packages and
download structure so packages on the mobile can be installed and worked on the
web and things can not drift."*

This is that claim, tested rather than asserted: a **real pack from the phone**
is converted to MBF, read back through the container reader that verifies every
digest, and imported — and the assertions are about what survived.

⚠ The fixture is built from the phone's own file when it is present, and from a
faithful miniature when it is not, so the test means something on a machine
that only has this repository checked out. The miniature is small ON PURPOSE:
its job is to carry one of each carrier, not to be a real map.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest

from theourgia.core.bundles.container import build_mbf, read_mbf
from theourgia.core.bundles.importer import KIND_IMPORTERS, import_spiritual_maps
from theourgia.core.bundles.manifest import TYPE_CATALOG

PHONE_PACK = (
    Path.home() / "Documents/development/practiseapp/assets/packs/keybearers-tetraktys.json"
)

#: A map with one of every carrier, so the "a correspondence attaches to
#: whatever carries it" rule is exercised rather than described.
MINIATURE: dict[str, Any] = {
    "manifest": {
        "id": "test.miniature.map",
        "name": "A miniature",
        "version": 1,
        "kind": "spiritual-map",
        "author": "A test",
        "summary": "One of each carrier.",
    },
    "payload": {
        "maps": [
            {
                "name": "A miniature",
                "tradition": "None",
                "summary": "One of each carrier.",
                "nodes": [
                    {
                        "id": "n1",
                        "name": "One",
                        "correspondences": [
                            {
                                "kind": "element",
                                "value": "Fire",
                                "provenance": "attested",
                                "standing": "locked",
                            }
                        ],
                    },
                    {"id": "n2", "name": "Two"},
                ],
                "edges": [
                    {
                        "id": "e1",
                        "from": "n1",
                        "to": "n2",
                        "correspondences": [{"kind": "letter", "value": "Alpha"}],
                    }
                ],
                "lines": [{"id": "l1", "name": "The spine"}],
                "shapes": [
                    {
                        "id": "s1",
                        "nodes": ["n1", "n2"],
                        "correspondences": [{"kind": "element", "value": "Air"}],
                    }
                ],
                "groups": [
                    {
                        "id": "g1",
                        "kind": "row",
                        "nodes": ["n1"],
                        "correspondences": [{"kind": "world", "value": "Atziluth"}],
                    }
                ],
                "ascent": ["n2", "n1"],
                "words": {"node": "sphere", "nodes": "spheres"},
            }
        ]
    },
}


def _pack() -> dict[str, Any]:
    if PHONE_PACK.exists():
        return json.loads(PHONE_PACK.read_text())
    return MINIATURE


class _NoRow:
    """An empty query result — nothing already installed."""

    def scalar_one_or_none(self) -> None:
        return None


class _Session:
    """Just enough session to catch what an importer adds."""

    def __init__(self) -> None:
        self.added: list[Any] = []

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def execute(self, *_args: Any, **_kwargs: Any) -> _NoRow:
        # The spiritual-map importer now checks for an existing (owner, slug)
        # before inserting, so it does not 500 on re-import. In this fixture the
        # vault is empty, so every lookup finds nothing and the import proceeds.
        return _NoRow()


def _container(pack: dict[str, Any]) -> bytes:
    """The pack, as an MBF container — through the real converter."""
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from tool.pack_to_mbf import convert

    # ⚠ `convert` grew a third return on 15 August — the assets. It had been
    # dropping every non-list payload key, including 34.9 MB of word data and
    # the `shape` that says how many knucklebones to cast. See
    # `tests/test_pack_conversion.py`.
    envelope, doc, assets = convert(pack, license_spdx="CC-BY-SA-4.0", created=datetime.now(tz=UTC))
    base = envelope.model_dump(mode="json", exclude={"payloads", "assets"})
    return build_mbf(manifest_base=base, payload_docs=[doc], assets=assets)


class TestTheFormatsConverged:
    def test_the_phones_maps_get_their_OWN_type(self) -> None:
        assert "spiritual-maps" in TYPE_CATALOG
        assert "spiritual-maps" in KIND_IMPORTERS

    def test_and_correspondences_keeps_meaning_what_it_meant(self) -> None:
        # ⚠ This side already used `correspondences` for a FLAT TABLE of rows
        # — `planetary-correspondences` ships one — and it has no importer by
        # choice. A map is nodes, edges, lines, shapes and groups, each
        # carrying correspondences: a different shape, so a different type.
        #
        # One type name over two shapes is how a format rots, and registering
        # a map importer against this one would have quietly started importing
        # somebody else's content in a shape it does not have.
        assert "correspondences" in TYPE_CATALOG
        assert "correspondences" not in KIND_IMPORTERS

    def test_the_five_new_types_are_named_now(self) -> None:
        # They imported opaque-but-listed before being named, which is what
        # made converging safe to do a kind at a time.
        for kind in (
            "divination-derivations",
            "divination-fields",
            "divination-systems",
            "session-protocols",
            "sitting-forms",
        ):
            assert kind in TYPE_CATALOG, kind

    def test_a_phone_pack_becomes_a_container_that_verifies(self) -> None:
        parsed = read_mbf(_container(_pack()))
        # ⚠ read_mbf checks every payload digest. Getting here at all means
        # the bytes the converter wrote are the bytes the manifest promised.
        assert parsed.manifest.type == "spiritual-maps"
        assert parsed.manifest.type_known
        assert parsed.manifest.license.spdx == "CC-BY-SA-4.0"
        assert parsed.manifest.author.name


class TestWhatSurvivesTheCrossing:
    @pytest.mark.anyio
    async def test_the_map_arrives_whole(self) -> None:
        parsed = read_mbf(_container(_pack()))
        doc = parsed.payloads["payloads/spiritual-maps.json"]
        session = _Session()

        results = await import_spiritual_maps(
            session,
            doc.items,
            owner_id=uuid4(),
            origin="theourgia-keybearers-tetraktys",
        )

        assert [r.status for r in results] == ["imported"]
        row = session.added[0]

        # ⚠ THE ONE THAT MATTERS. A correspondence attaches to whatever
        # CARRIES it, so every carrier has to survive — a crossing that kept
        # the nodes and dropped the shapes could not say that a triangle is
        # Fire, which is the thing the phone's model exists to express.
        for carrier in ("nodes", "edges", "lines", "shapes", "groups"):
            assert carrier in row.document, carrier
        assert row.node_count == len(row.document["nodes"])
        assert row.correspondence_count > 0

    @pytest.mark.anyio
    async def test_a_correspondence_keeps_its_standing(self) -> None:
        parsed = read_mbf(_container(_pack()))
        session = _Session()
        await import_spiritual_maps(
            session,
            parsed.payloads["payloads/spiritual-maps.json"].items,
            owner_id=uuid4(),
            origin="",
        )
        row = session.added[0]

        every = [
            c
            for key in ("nodes", "edges", "lines", "shapes", "groups")
            for carrier in row.document.get(key, [])
            if isinstance(carrier, dict)
            for c in carrier.get("correspondences", [])
        ]
        assert every, "the map carried no correspondences at all"

        # ⚠ `provenance` says attested or inferred; `standing` says locked or
        # open. A chart that showed an attested Fire and somebody's extension
        # identically would make a claim the sources do not support.
        assert any("provenance" in c for c in every)
        assert all("kind" in c and "value" in c for c in every)

    @pytest.mark.anyio
    async def test_unknown_carriers_are_KEPT_not_dropped(self) -> None:
        pack = json.loads(json.dumps(MINIATURE))
        pack["payload"]["maps"][0]["chambers"] = [{"id": "c1", "name": "invented"}]
        parsed = read_mbf(_container(pack))
        session = _Session()
        await import_spiritual_maps(
            session,
            parsed.payloads["payloads/spiritual-maps.json"].items,
            owner_id=uuid4(),
            origin="",
        )

        # ⚠ The phone may ship a carrier this build has never heard of.
        # Dropping it here would silently lose somebody's work, and they would
        # find out by noticing it was missing.
        assert "chambers" in session.added[0].document

    @pytest.mark.anyio
    async def test_a_map_with_no_nodes_is_refused(self) -> None:
        session = _Session()
        results = await import_spiritual_maps(
            session,
            [{"ref": "maps:empty", "name": "Nothing"}],
            owner_id=uuid4(),
            origin="",
        )
        # ⚠ An empty chart is not a small chart. Importing one puts a name in
        # somebody's list that opens onto nothing.
        assert results[0].status == "skipped"
        assert "nothing behind it" in results[0].detail
        assert session.added == []

    @pytest.mark.anyio
    async def test_the_slug_loses_the_list_prefix(self) -> None:
        session = _Session()
        await import_spiritual_maps(
            session,
            [{"ref": "maps:the-hekate-tetraktys", "name": "T", "nodes": [{"id": "n"}]}],
            owner_id=uuid4(),
            origin="",
        )
        # ⚠ The prefix keeps two same-named entries apart inside one pack. It
        # has done its job by the time the map is a row, and carrying it on
        # would put a colon in a URL.
        assert session.added[0].slug == "the-hekate-tetraktys"
