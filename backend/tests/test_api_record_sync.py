"""The record sync verbs — push up whole, pull down complete.

The store's reasoning is in ``theourgia/models/record_entry.py``; what
these prove is the protocol's three invariants: idempotent pushes (a
replayed batch is stale, never an error), the server as shelf (the
winning row is stored exactly as sent), and cursor-complete pulls.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

from httpx import ASGITransport, AsyncClient

USER_ID = uuid4()
T0 = datetime(2026, 8, 17, 12, 0, tzinfo=UTC)


class _Result:
    def __init__(self, rows: list[Any]):
        self._rows = rows

    def scalars(self) -> "_Result":
        return self

    def all(self) -> list[Any]:
        return list(self._rows)

    def first(self) -> Any:
        return self._rows[0] if self._rows else None

    def scalar_one_or_none(self) -> Any:
        return self._rows[0] if self._rows else None

    def scalar_one(self) -> Any:
        assert self._rows, "scalar_one on empty result"
        return self._rows[0]


class _FakeSession:
    def __init__(self, results: list[_Result] | None = None):
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1


def _make_app(db, *, signed_in: bool = True):
    from theourgia.api.app import create_app
    from theourgia.api.deps import get_current_user, get_db_session

    app = create_app()
    app.dependency_overrides[get_db_session] = lambda: db
    if signed_in:
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
            id=USER_ID,
        )
    return app


def _client(app) -> AsyncClient:
    return AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver",
    )


def _wire(entry_id, *, at=T0, deleted=None, note="Χαῖρε Σελήνη"):
    return {
        "id": str(entry_id),
        "kind": "observance",
        "doc": {"subjectKey": "station:moonrise", "note": note},
        "updated_at_utc": at.isoformat(),
        "deleted_at_utc": deleted.isoformat() if deleted else None,
    }


def _stored_row(entry_id, *, at=T0, seq=41):
    return SimpleNamespace(
        owner_id=USER_ID,
        id=entry_id,
        kind="observance",
        doc={"subjectKey": "station:moonrise", "note": "as it was"},
        updated_at_utc=at,
        deleted_at_utc=None,
        synced_seq=seq,
    )


# ── Push ────────────────────────────────────────────────────────────


async def test_new_rows_land_whole() -> None:
    db = _FakeSession([_Result([]), _Result([]), _Result([2])])

    async with _client(_make_app(db)) as ac:
        response = await ac.put(
            "/api/v1/record/entries",
            json={"entries": [_wire(uuid4()), _wire(uuid4())]},
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["accepted"] == 2
    assert body["stale"] == 0
    assert body["latest_seq"] == 2

    rows = [r for r in db.added if hasattr(r, "doc")]
    assert len(rows) == 2
    # ⚠ The shelf rule: the document is stored exactly as sent — the Greek
    # included, which is also the UTF-8 canary.
    assert rows[0].doc == {"subjectKey": "station:moonrise", "note": "Χαῖρε Σελήνη"}
    assert all(r.owner_id == USER_ID for r in rows)
    assert db.commits == 1


async def test_a_replay_is_stale_not_an_error() -> None:
    # ⚠ Idempotence is what lets a device that crashed mid-sync simply push
    # again. An EQUAL timestamp is a replay; nothing changes, nothing fails.
    entry_id = uuid4()
    stored = _stored_row(entry_id, at=T0)
    db = _FakeSession([_Result([stored]), _Result([41])])

    async with _client(_make_app(db)) as ac:
        response = await ac.put(
            "/api/v1/record/entries", json={"entries": [_wire(entry_id, at=T0)]}
        )

    body = response.json()
    assert body["accepted"] == 0
    assert body["stale"] == 1
    assert stored.doc == {"subjectKey": "station:moonrise", "note": "as it was"}


async def test_an_older_device_cannot_overwrite_a_newer_edit() -> None:
    entry_id = uuid4()
    stored = _stored_row(entry_id, at=T0)
    db = _FakeSession([_Result([stored]), _Result([41])])

    async with _client(_make_app(db)) as ac:
        response = await ac.put(
            "/api/v1/record/entries",
            json={"entries": [_wire(entry_id, at=T0 - timedelta(hours=3))]},
        )

    assert response.json()["stale"] == 1
    assert stored.doc["note"] == "as it was"


async def test_a_newer_edit_wins_and_the_sequence_moves() -> None:
    # ⚠ The sequence default only fires on INSERT; an edited row must bump
    # by hand or pulls would never see it. The nextval query is the proof.
    entry_id = uuid4()
    stored = _stored_row(entry_id, at=T0, seq=41)
    db = _FakeSession([_Result([stored]), _Result([99]), _Result([99])])

    async with _client(_make_app(db)) as ac:
        response = await ac.put(
            "/api/v1/record/entries",
            json={"entries": [_wire(entry_id, at=T0 + timedelta(minutes=5))]},
        )

    assert response.json()["accepted"] == 1
    assert stored.doc["note"] == "Χαῖρε Σελήνη"
    assert stored.updated_at_utc == T0 + timedelta(minutes=5)
    assert stored.synced_seq == 99


async def test_a_tombstone_travels_like_any_fact() -> None:
    db = _FakeSession([_Result([]), _Result([1])])

    async with _client(_make_app(db)) as ac:
        await ac.put(
            "/api/v1/record/entries",
            json={"entries": [_wire(uuid4(), deleted=T0)]},
        )

    row = next(r for r in db.added if hasattr(r, "doc"))
    assert row.deleted_at_utc is not None


async def test_the_batch_has_a_ceiling() -> None:
    db = _FakeSession([])
    async with _client(_make_app(db)) as ac:
        response = await ac.put(
            "/api/v1/record/entries",
            json={"entries": [_wire(uuid4()) for _ in range(501)]},
        )
    assert response.status_code == 422


# ── Pull ────────────────────────────────────────────────────────────


async def test_pull_pages_in_arrival_order() -> None:
    rows = [_stored_row(uuid4(), seq=n) for n in (5, 6, 7)]
    db = _FakeSession([_Result(rows)])

    async with _client(_make_app(db)) as ac:
        response = await ac.get("/api/v1/record/entries?since=4&limit=2")

    body = response.json()
    assert [e["seq"] for e in body["entries"]] == [5, 6]
    assert body["next_since"] == 6
    assert body["more"] is True


async def test_pull_with_nothing_new_stands_still() -> None:
    db = _FakeSession([_Result([])])

    async with _client(_make_app(db)) as ac:
        response = await ac.get("/api/v1/record/entries?since=41")

    body = response.json()
    assert body["entries"] == []
    assert body["next_since"] == 41
    assert body["more"] is False


# ── The door ────────────────────────────────────────────────────────


async def test_the_record_answers_nobody_unauthenticated() -> None:
    db = _FakeSession([])
    async with _client(_make_app(db, signed_in=False)) as ac:
        pushed = await ac.put("/api/v1/record/entries", json={"entries": []})
        pulled = await ac.get("/api/v1/record/entries")

    assert pushed.status_code == 401
    assert pulled.status_code == 401
