"""Tetraktys ladder / curriculum tests (Sprint I-B, Domain 3).

* pure serpent-walk logic (states, current position, gate guards);
* seed constants vs the 0087 migration;
* router schema validation + registration smoke;
* full HTTP round-trips, skip-gated on ``THEOURGIA_TEST_DATABASE_URL``
  (database must be migrated to 0087).
"""

from __future__ import annotations

import asyncio
import importlib.util
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from theourgia.api.routers.v1.curriculum import (
    current_sphere_number,
    ensure_unlocked,
    incomplete_required_titles,
    walk_states,
)
from theourgia.models.curriculum import (
    SERPENT_WALK,
    SPHERE_NAMES,
    CurriculumItem,
    CurriculumItemKind,
)

from tests.sprint_ib_db import DB_URL, signed_in_client


# ───── the serpent walk ─────────────────────────────────────────


def test_serpent_walk_is_the_fixed_h12_order() -> None:
    assert SERPENT_WALK == (10, 9, 8, 7, 4, 5, 6, 3, 2, 1)


def test_sphere_names_cover_1_to_10() -> None:
    assert set(SPHERE_NAMES) == set(range(1, 11))
    assert SPHERE_NAMES[10] == "Hekate / Decad"
    assert SPHERE_NAMES[1] == "Monad"
    assert SPHERE_NAMES[9] == "Ennead"


def test_walk_states_fresh_ladder() -> None:
    states = walk_states(set())
    assert states[10] == "current"
    for n in (9, 8, 7, 4, 5, 6, 3, 2, 1):
        assert states[n] == "locked"


def test_walk_states_mid_walk() -> None:
    states = walk_states({10, 9, 8})
    assert states[10] == "done"
    assert states[9] == "done"
    assert states[8] == "done"
    assert states[7] == "current"
    # The walk interleaves the figure's rows: after 7 comes 4, not 6.
    assert states[4] == "locked"
    assert states[6] == "locked"
    assert states[1] == "locked"


def test_walk_states_interleaved_row_order() -> None:
    # 10,9,8,7 done and 4 done → current is 5 (walk order), NOT 6.
    states = walk_states({10, 9, 8, 7, 4})
    assert states[5] == "current"
    assert states[6] == "locked"


def test_walk_states_complete() -> None:
    states = walk_states(set(range(1, 11)))
    assert all(s == "done" for s in states.values())
    assert current_sphere_number(set(range(1, 11))) is None


def test_current_sphere_number_walks_in_serpent_order() -> None:
    assert current_sphere_number(set()) == 10
    assert current_sphere_number({10}) == 9
    assert current_sphere_number({10, 9, 8, 7}) == 4
    assert current_sphere_number({10, 9, 8, 7, 4, 5, 6}) == 3


def test_ensure_unlocked_seals_locked_only() -> None:
    ensure_unlocked("current", action="test")  # no raise
    ensure_unlocked("done", action="test")  # no raise
    with pytest.raises(HTTPException) as exc:
        ensure_unlocked("locked", action="complete an item")
    assert exc.value.status_code == 409
    assert "sealed" in exc.value.detail


def test_incomplete_required_titles() -> None:
    sphere_id = uuid4()
    done = CurriculumItem(
        sphere_id=sphere_id,
        kind=CurriculumItemKind.READING,
        title="Iamblichus, De Mysteriis I",
        required_for_gate=True,
        completed_at=datetime.now(tz=UTC),
    )
    pending = CurriculumItem(
        sphere_id=sphere_id,
        kind=CurriculumItemKind.DELIVERABLE,
        title="Deipnon observed thrice",
        required_for_gate=True,
    )
    optional = CurriculumItem(
        sphere_id=sphere_id,
        kind=CurriculumItemKind.PRACTICE,
        title="Optional chanting",
        required_for_gate=False,
    )
    assert incomplete_required_titles([done, pending, optional]) == [
        "Deipnon observed thrice"
    ]


# ───── migration seed parity ────────────────────────────────────


def test_migration_seed_matches_model_constants() -> None:
    """0087's seeded ladder must agree with the canonical constants."""
    mig_path = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "0087_sprint_ib_domains.py"
    )
    spec = importlib.util.spec_from_file_location("mig_0087", mig_path)
    assert spec is not None and spec.loader is not None
    mig = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig)

    seed = mig._SPHERE_SEED
    assert len(seed) == 10
    # walk order + both coordinates stored.
    assert [row[1] for row in seed] == list(SERPENT_WALK)
    assert [row[3] for row in seed] == list(range(1, 11))
    for _, number, name, _ in seed:
        assert name == SPHERE_NAMES[number]
    # Distinct fixed row ids.
    assert len({row[0] for row in seed}) == 10


# ───── schemas + registration ───────────────────────────────────


def test_item_create_validation() -> None:
    from theourgia.api.routers.v1.curriculum import ItemCreate

    with pytest.raises(ValidationError):
        ItemCreate(kind="reading", title="")
    with pytest.raises(ValidationError):
        ItemCreate(kind="homework", title="x")  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        ItemCreate(kind="reading", title="x", sphere_id="nope")  # type: ignore[call-arg]


def test_router_registered_on_v1() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/curriculum/ladder" in paths
    assert "/api/v1/curriculum/spheres/{number}" in paths
    assert "/api/v1/curriculum/spheres/{number}/items" in paths
    assert "/api/v1/curriculum/items/{item_id}/complete" in paths
    assert "/api/v1/curriculum/spheres/{number}/gate" in paths
    assert "/api/v1/curriculum/spheres/{number}/gate/pass" in paths
    assert "/api/v1/curriculum/progress" in paths


# ───── HTTP round-trips (live DB) ───────────────────────────────


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_http_ladder_walk_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    async def run() -> None:
        async with signed_in_client(monkeypatch) as client:
            # Fresh ladder: walk order, Hekate current, the rest sealed.
            r = await client.get("/api/v1/curriculum/ladder")
            assert r.status_code == 200, r.text
            ladder = r.json()
            assert [s["number"] for s in ladder["spheres"]] == list(SERPENT_WALK)
            assert ladder["current_sphere"] == 10
            hekate = ladder["spheres"][0]
            assert hekate["state"] == "current"
            assert hekate["sealed"] is False
            assert hekate["items"] == []
            ennead = ladder["spheres"][1]
            assert ennead["state"] == "locked"
            assert ennead["sealed"] is True
            assert ennead["items"] is None
            assert ennead["gate"] is None

            # Author items: one gate-blocking on the current sphere,
            # one on a locked sphere (authoring is allowed; doing isn't).
            r = await client.post(
                "/api/v1/curriculum/spheres/10/items",
                json={
                    "kind": "deliverable",
                    "title": "Keep the deipnon at the dark moon",
                    "required_for_gate": True,
                },
            )
            assert r.status_code == 201, r.text
            required_item = r.json()

            r = await client.post(
                "/api/v1/curriculum/spheres/9/items",
                json={"kind": "reading", "title": "Ennead reading"},
            )
            assert r.status_code == 201
            sealed_item = r.json()

            # The locked sphere shows counts only.
            r = await client.get("/api/v1/curriculum/spheres/9")
            body = r.json()
            assert body["sealed"] is True
            assert body["item_counts"]["total"] == 1
            assert body["items"] is None

            # Sealed lockout: completing work on a locked sphere.
            r = await client.post(
                f"/api/v1/curriculum/items/{sealed_item['id']}/complete",
                json={},
            )
            assert r.status_code == 409
            assert "sealed" in r.json()["detail"]

            # The gate refuses while required work is incomplete.
            r = await client.post(
                "/api/v1/curriculum/spheres/10/gate/pass", json={},
            )
            assert r.status_code == 422
            assert "deipnon" in r.json()["detail"].lower()

            # Requirements prose is editable while unpassed.
            r = await client.put(
                "/api/v1/curriculum/spheres/10/gate",
                json={"requirements": "Three dark moons kept; journal evidence."},
            )
            assert r.status_code == 200

            # Complete the required item with journal evidence.
            r = await client.post(
                "/api/v1/entries",
                json={"title": "Deipnon kept", "type": "ritual_log"},
            )
            evidence = r.json()["id"]
            r = await client.post(
                f"/api/v1/curriculum/items/{required_item['id']}/complete",
                json={"evidence_entry_id": evidence},
            )
            assert r.status_code == 200, r.text
            assert r.json()["completed_at"] is not None
            assert r.json()["evidence_entry_id"] == evidence

            # Completing twice is refused.
            r = await client.post(
                f"/api/v1/curriculum/items/{required_item['id']}/complete",
                json={},
            )
            assert r.status_code == 409

            # Pass the gate; the walk advances 10 → 9.
            r = await client.post(
                "/api/v1/curriculum/spheres/10/gate/pass",
                json={"countersign": "Soror Ε."},
            )
            assert r.status_code == 200, r.text
            assert r.json()["passed_at"] is not None
            assert r.json()["countersign"] == "Soror Ε."

            r = await client.get("/api/v1/curriculum/ladder")
            ladder = r.json()
            assert ladder["current_sphere"] == 9
            assert ladder["spheres"][0]["state"] == "done"
            assert ladder["spheres"][1]["state"] == "current"
            assert ladder["spheres"][1]["sealed"] is False

            # Re-passing is refused; jumping ahead is refused.
            r = await client.post(
                "/api/v1/curriculum/spheres/10/gate/pass", json={},
            )
            assert r.status_code == 409
            r = await client.post(
                "/api/v1/curriculum/spheres/8/gate/pass", json={},
            )
            assert r.status_code == 409

            # A passed gate's requirements are sealed.
            r = await client.put(
                "/api/v1/curriculum/spheres/10/gate",
                json={"requirements": "rewrite history"},
            )
            assert r.status_code == 409

            # Progress is a phrase, never a percentage.
            r = await client.get("/api/v1/curriculum/progress")
            body = r.json()
            assert body["current_sphere"] == 9
            assert body["phrase"] == "Sphere 9 · Ennead"
            assert "%" not in body["phrase"]

            # Unknown sphere number.
            r = await client.get("/api/v1/curriculum/spheres/11")
            assert r.status_code == 404

    asyncio.run(run())


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_http_ladder_owner_scoped(monkeypatch: pytest.MonkeyPatch) -> None:
    async def run() -> None:
        async with signed_in_client(monkeypatch) as first:
            r = await first.post(
                "/api/v1/curriculum/spheres/10/items",
                json={"kind": "practice", "title": "Private practice"},
            )
            item_id = r.json()["id"]
        async with signed_in_client(monkeypatch) as second:
            # A different operator sees their own empty ladder…
            r = await second.get("/api/v1/curriculum/spheres/10")
            assert r.json()["item_counts"]["total"] == 0
            # …and cannot touch the first operator's items.
            r = await second.post(
                f"/api/v1/curriculum/items/{item_id}/complete", json={},
            )
            assert r.status_code == 404

    asyncio.run(run())
