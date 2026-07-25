"""Astragaloi oracle tests (Sprint I-B, Domain 1).

Three layers, matching the repo pattern:

* pure corpus-loader + validation logic (no DB);
* router schema validation + registration smoke;
* full HTTP round-trips, skip-gated on ``THEOURGIA_TEST_DATABASE_URL``
  (database must be migrated to 0087).
"""

from __future__ import annotations

import asyncio
import copy
import json
import random

import pytest
from pydantic import ValidationError

from theourgia.core.divination.astragaloi import (
    IMPOSSIBLE_SUMS,
    LEGAL_FACES,
    CorpusValidationError,
    cast_for_faces,
    corpus_meta,
    load_corpus,
    simulate_faces,
    validate_faces,
)
from theourgia.core.divination.astragaloi import corpus as corpus_mod

from tests.sprint_ib_db import DB_URL, signed_in_client


# ───── validate_faces ───────────────────────────────────────────


def test_validate_faces_sorts_unordered_throw() -> None:
    assert validate_faces([6, 1, 4, 3, 1]) == (1, 1, 3, 4, 6)


def test_validate_faces_rejects_two_and_five() -> None:
    with pytest.raises(ValueError, match="illegal face"):
        validate_faces([1, 2, 3, 4, 6])
    with pytest.raises(ValueError, match="illegal face"):
        validate_faces([5, 1, 1, 1, 1])


def test_validate_faces_rejects_wrong_count() -> None:
    with pytest.raises(ValueError, match="five bones"):
        validate_faces([1, 3, 4, 6])
    with pytest.raises(ValueError, match="five bones"):
        validate_faces([1, 3, 4, 6, 6, 6])


def test_validate_faces_rejects_bools_and_nonints() -> None:
    with pytest.raises(ValueError):
        validate_faces([True, 1, 1, 1, 1])
    with pytest.raises(ValueError):
        validate_faces([1.0, 1, 1, 1, 1])  # type: ignore[list-item]


# ───── corpus load + invariants ─────────────────────────────────


def test_corpus_loads_all_56() -> None:
    casts = load_corpus()
    assert len(casts) == 56


def test_corpus_face_multisets_unique_and_legal() -> None:
    casts = load_corpus()
    seen = set()
    for c in casts:
        assert c.faces == tuple(sorted(c.faces))
        assert all(f in LEGAL_FACES for f in c.faces)
        assert c.faces not in seen
        seen.add(c.faces)


def test_corpus_sums_cover_5_to_30_minus_impossible() -> None:
    sums = {c.sum for c in load_corpus()}
    assert sums == set(range(5, 31)) - IMPOSSIBLE_SUMS


def test_corpus_every_cast_carries_reading() -> None:
    for c in load_corpus():
        assert c.god_greek and c.god_english
        assert c.verse_english
        assert c.valence in ("favourable", "cautionary", "unfavourable")
        assert 1 <= c.sphere <= 10
        assert c.octave in ("luminous", "embodied", "chthonic")
        assert c.ground_element in ("Fire", "Air", "Water", "Earth")


def test_lookup_is_order_independent_for_all_56() -> None:
    rng = random.Random(7)
    for c in load_corpus():
        shuffled = list(c.faces)
        rng.shuffle(shuffled)
        assert cast_for_faces(shuffled).oracle_number == c.oracle_number


def test_lookup_all_ones() -> None:
    c = cast_for_faces([1, 1, 1, 1, 1])
    assert c.sum == 5
    assert c.oracle_number == "I"
    assert "Zeus" in c.god_english


def test_corpus_meta_carries_gaps_and_adjudications() -> None:
    meta = corpus_meta()
    assert "gaps" in meta
    assert "caveats" in meta  # the pending Nollé adjudications
    assert meta["counts"]["casts"] == 56


# ───── corpus validation failures (corrupted corpora) ───────────


def _reload_with(doc: dict) -> None:
    """Point the loader at a mutated corpus document and reload."""
    corpus_mod._load.cache_clear()
    corpus_mod._corpus_path_text = lambda: json.dumps(doc)  # type: ignore[assignment]
    try:
        load_corpus()
    finally:
        # Restore the real reader + cache for subsequent tests.
        corpus_mod._corpus_path_text = corpus_mod.__dict__["_real_reader"]
        corpus_mod._load.cache_clear()


@pytest.fixture(autouse=True)
def _preserve_real_reader():
    corpus_mod.__dict__.setdefault("_real_reader", corpus_mod._corpus_path_text)
    yield
    corpus_mod._corpus_path_text = corpus_mod.__dict__["_real_reader"]
    corpus_mod._load.cache_clear()


def _real_doc() -> dict:
    return json.loads(corpus_mod.__dict__["_real_reader"]())


def test_corpus_rejects_wrong_count() -> None:
    doc = _real_doc()
    doc["casts"] = doc["casts"][:55]
    with pytest.raises(CorpusValidationError, match="exactly 56"):
        _reload_with(doc)


def test_corpus_rejects_duplicate_multiset() -> None:
    doc = _real_doc()
    doc["casts"][1] = copy.deepcopy(doc["casts"][0])
    with pytest.raises(CorpusValidationError, match="duplicate"):
        _reload_with(doc)


def test_corpus_rejects_sum_mismatch() -> None:
    doc = _real_doc()
    doc["casts"][0]["sum"] = doc["casts"][0]["sum"] + 1
    with pytest.raises(CorpusValidationError, match="sum"):
        _reload_with(doc)


def test_corpus_rejects_illegal_face() -> None:
    doc = _real_doc()
    doc["casts"][0]["faces"] = [2, 1, 1, 1, 1]
    with pytest.raises(CorpusValidationError, match="illegal face"):
        _reload_with(doc)


def test_corpus_rejects_unknown_valence() -> None:
    doc = _real_doc()
    doc["casts"][0]["valence"] = "mixed"
    with pytest.raises(CorpusValidationError, match="valence"):
        _reload_with(doc)


def test_corpus_rejects_broken_tetraktys_overlay() -> None:
    doc = _real_doc()
    doc["casts"][0]["tetraktys"]["sphere"] = 1  # sum 5 ⇒ sphere 5
    with pytest.raises(CorpusValidationError, match="sphere"):
        _reload_with(doc)


# ───── simulate ─────────────────────────────────────────────────


def test_simulate_faces_always_legal() -> None:
    rng = random.Random(42)
    for _ in range(200):
        faces = simulate_faces(rng)
        assert len(faces) == 5
        assert all(f in LEGAL_FACES for f in faces)
        # Every simulated throw must resolve against the corpus.
        assert cast_for_faces(faces) is not None


# ───── router schemas ───────────────────────────────────────────


def test_cast_create_rejects_face_two() -> None:
    from theourgia.api.routers.v1.astragaloi import CastCreate

    with pytest.raises(ValidationError):
        CastCreate(faces=[2, 1, 1, 1, 1])  # type: ignore[list-item]


def test_cast_create_rejects_wrong_length() -> None:
    from theourgia.api.routers.v1.astragaloi import CastCreate

    with pytest.raises(ValidationError):
        CastCreate(faces=[1, 3, 4, 6])
    with pytest.raises(ValidationError):
        CastCreate(faces=[1, 1, 3, 4, 6, 6])


def test_cast_create_accepts_simulate_without_faces() -> None:
    from theourgia.api.routers.v1.astragaloi import CastCreate

    payload = CastCreate(simulate=True)
    assert payload.faces is None
    assert payload.simulate is True


def test_cast_update_forbids_touching_the_throw() -> None:
    from theourgia.api.routers.v1.astragaloi import CastUpdate

    with pytest.raises(ValidationError):
        CastUpdate(simulated=False)  # type: ignore[call-arg]
    with pytest.raises(ValidationError):
        CastUpdate(faces=[1, 1, 1, 1, 1])  # type: ignore[call-arg]


def test_router_registered_on_v1() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/astragaloi/casts" in paths
    assert "/api/v1/astragaloi/casts/{cast_id}" in paths
    assert "/api/v1/astragaloi/corpus/meta" in paths


# ───── HTTP round-trips (live DB) ───────────────────────────────


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_http_cast_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    async def run() -> None:
        async with signed_in_client(monkeypatch) as client:
            # Transcribed cast — server computes sum + reading.
            r = await client.post(
                "/api/v1/astragaloi/casts",
                json={"faces": [6, 6, 4, 4, 4], "question": "Shall I travel?"},
            )
            assert r.status_code == 201, r.text
            cast = r.json()
            assert cast["sum"] == 24
            assert cast["faces"] == [4, 4, 4, 6, 6]
            assert cast["simulated"] is False
            assert cast["oracle"]["god_english"]
            assert cast["oracle"]["valence"] in (
                "favourable", "cautionary", "unfavourable",
            )
            assert cast["ladder"]["sphere"] == 4  # 24 mod 10
            assert cast["ladder"]["octave"] == "chthonic"

            # Simulated cast — marked forever.
            r = await client.post(
                "/api/v1/astragaloi/casts", json={"simulate": True},
            )
            assert r.status_code == 201, r.text
            sim = r.json()
            assert sim["simulated"] is True
            assert all(f in (1, 3, 4, 6) for f in sim["faces"])

            # faces + simulate is refused.
            r = await client.post(
                "/api/v1/astragaloi/casts",
                json={"faces": [1, 1, 1, 1, 1], "simulate": True},
            )
            assert r.status_code == 422

            # Illegal face is refused at the schema layer.
            r = await client.post(
                "/api/v1/astragaloi/casts", json={"faces": [2, 1, 1, 1, 1]},
            )
            assert r.status_code == 422

            # PATCH: interpretation only; the flag stays.
            r = await client.patch(
                f"/api/v1/astragaloi/casts/{sim['id']}",
                json={"interpretation": "A study throw."},
            )
            assert r.status_code == 200
            assert r.json()["interpretation"] == "A study throw."
            assert r.json()["simulated"] is True

            # List filters.
            r = await client.get(
                "/api/v1/astragaloi/casts", params={"simulated": "true"},
            )
            assert r.status_code == 200
            assert [c["id"] for c in r.json()] == [sim["id"]]

            r = await client.get(
                "/api/v1/astragaloi/casts",
                params={"valence": cast["oracle"]["valence"]},
            )
            assert cast["id"] in [c["id"] for c in r.json()]

            r = await client.get(
                "/api/v1/astragaloi/casts", params={"sphere": 4},
            )
            assert cast["id"] in [c["id"] for c in r.json()]

            # GET one + corpus meta.
            r = await client.get(f"/api/v1/astragaloi/casts/{cast['id']}")
            assert r.status_code == 200
            r = await client.get("/api/v1/astragaloi/corpus/meta")
            assert r.status_code == 200
            assert "gaps" in r.json()

    asyncio.run(run())


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_http_casts_are_owner_scoped(monkeypatch: pytest.MonkeyPatch) -> None:
    async def run() -> None:
        async with signed_in_client(monkeypatch) as first:
            r = await first.post(
                "/api/v1/astragaloi/casts", json={"faces": [1, 1, 1, 1, 1]},
            )
            cast_id = r.json()["id"]
        async with signed_in_client(monkeypatch) as second:
            r = await second.get(f"/api/v1/astragaloi/casts/{cast_id}")
            assert r.status_code == 404
            r = await second.get("/api/v1/astragaloi/casts")
            assert cast_id not in [c["id"] for c in r.json()]

    asyncio.run(run())
