"""Vault-side MCP endpoint tests — v1-031 · Phase 16 close-out.

Covers the deliverable's four invariants:

1. every method the daemon's VaultClient dials answers with the
   ``{records: [...]}`` / ``{slugs: [...]}`` shapes it parses;
2. SEALED EXCLUSION — the entries SELECT excludes sealed rows in SQL
   (compiled-statement assertion) AND the serializer refuses to emit
   a sealed row even if the query regressed (fixture with sealed +
   plain rows → sealed absent from the response);
3. CLOSED-TRADITION EXCLUSION — operator-curated slugs strip records
   server-side, before the daemon's second-pass filter ever runs;
4. auth required (dedicated agent MCP bearer only — the sweep in
   ``test_auth_required_endpoints.py`` registers the endpoint too)
   and READ-ONLY (unknown / write methods → JSON-RPC -32601).

Uses the fake-session pattern from the memorial + wellbeing tests.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from theourgia.api import deps
from theourgia.api.routers.v1.vault_mcp import entries_stmt
from theourgia.core.auth.tokens import hash_token
from theourgia.models.agents import AgentMcpToken
from theourgia.models.entities import Entity, EntityKind
from theourgia.models.entries import (
    EncryptionMode,
    Entry,
    EntryVisibility,
)
from theourgia.models.iching import IChingReading
from theourgia.models.library import Book, Quote
from theourgia.models.synchronicities import (
    Synchronicity,
    SynchronicityCategory,
)
from theourgia.models.tarot import Reading as TarotReading

NOW = datetime(2026, 7, 20, 12, 0, tzinfo=UTC)
USER_ID = uuid4()
TOKEN_PLAINTEXT = "mcp-test-token"


# ── Fakes ────────────────────────────────────────────────────────


class FakeResult:
    def __init__(self, *, scalar=None, rows=None) -> None:
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return self

    def all(self):
        return list(self._rows)


class FakeSession:
    """Serves the vault MCP endpoint's selects from in-memory rows."""

    def __init__(
        self,
        *,
        token_row: AgentMcpToken | None = None,
        entries: list[Entry] | None = None,
        entities: list[Entity] | None = None,
        tarot: list[TarotReading] | None = None,
        iching: list[IChingReading] | None = None,
        books: list[Book] | None = None,
        quotes: list[Quote] | None = None,
        synchronicities: list[Synchronicity] | None = None,
        closed_slugs: str | None = None,
    ) -> None:
        self.token_row = token_row
        self.entries = list(entries or [])
        self.entities = list(entities or [])
        self.tarot = list(tarot or [])
        self.iching = list(iching or [])
        self.books = list(books or [])
        self.quotes = list(quotes or [])
        self.synchronicities = list(synchronicities or [])
        self.closed_slugs = closed_slugs
        self.executed: list[str] = []

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        self.executed.append(sql)
        if "set_config" in sql:
            return FakeResult()
        if "agent_mcp_token" in sql:
            return FakeResult(scalar=self.token_row)
        if "instance_setting" in sql:
            if self.closed_slugs is None:
                return FakeResult(scalar=None)
            return FakeResult(
                scalar=SimpleNamespace(
                    value_json=json.dumps(self.closed_slugs)
                )
            )
        if "FROM tarot_reading" in sql:
            return FakeResult(rows=self.tarot)
        if "FROM iching_reading" in sql:
            return FakeResult(rows=self.iching)
        if "FROM geomancy_reading" in sql:
            return FakeResult(rows=[])
        if "FROM rune_reading" in sql:
            return FakeResult(rows=[])
        if "FROM book" in sql:
            return FakeResult(rows=self.books)
        if "FROM quote" in sql:
            return FakeResult(rows=self.quotes)
        if "FROM synchronicity" in sql:
            return FakeResult(rows=self.synchronicities)
        if "FROM entity" in sql:
            return FakeResult(rows=self.entities)
        if "FROM entry" in sql:
            return FakeResult(rows=self.entries)
        raise AssertionError(f"unexpected statement: {sql}")


def _token_row(**overrides) -> AgentMcpToken:
    defaults: dict = dict(
        user_id=USER_ID,
        install_id="install-1",
        token_hash=hash_token(TOKEN_PLAINTEXT),
        # Real clock, not NOW — resolve_mcp_token compares against
        # datetime.now().
        expires_at=datetime.now(tz=UTC) + timedelta(hours=1),
    )
    defaults.update(overrides)
    return AgentMcpToken(**defaults)


def _wire_app(app: Any, fake: FakeSession) -> None:
    async def override():
        yield fake

    app.dependency_overrides[deps.get_db_session] = override


AUTH = {"Authorization": f"Bearer {TOKEN_PLAINTEXT}"}


def _rpc(method: str, params: dict | None = None, id_: int = 1) -> dict:
    return {
        "jsonrpc": "2.0",
        "method": method,
        "params": params or {},
        "id": id_,
    }


async def _call(
    app: Any, body: dict, *, headers: dict | None = None
) -> Any:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        return await ac.post(
            "/api/v1/mcp",
            json=body,
            headers=AUTH if headers is None else headers,
        )


# ── fixtures ─────────────────────────────────────────────────────


def _plain_entry(**overrides) -> Entry:
    defaults: dict = dict(
        title="Plain entry",
        excerpt="ex",
        body_text="the plaintext body",
        tags=["dream"],
        tradition_tags=[],
        owner_id=USER_ID,
        visibility=EntryVisibility.PERSONAL,
        encryption_mode=EncryptionMode.NONE,
        created_at=NOW,
    )
    defaults.update(overrides)
    return Entry(**defaults)


def _sealed_entry() -> Entry:
    return _plain_entry(
        title="SEALED — must never appear",
        body_text=None,
        encryption_mode=EncryptionMode.SEALED,
        encrypted_payload=b"\x00ciphertext",
    )


def _entity(**overrides) -> Entity:
    defaults: dict = dict(
        name="Hekate",
        kind=EntityKind.OTHER,
        aliases=[],
        epithets=["Soteira"],
        tradition="hellenic",
        tradition_tags=["hellenic"],
        attributions={"planet": "Moon"},
        owner_id=USER_ID,
    )
    defaults.update(overrides)
    return Entity(**defaults)


# ── auth ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_missing_bearer_is_401(app: Any) -> None:
    _wire_app(app, FakeSession(token_row=_token_row()))
    response = await _call(app, _rpc("read.entries"), headers={})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_unknown_token_is_401(app: Any) -> None:
    _wire_app(app, FakeSession(token_row=None))
    response = await _call(app, _rpc("read.entries"))
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_is_401(app: Any) -> None:
    expired = _token_row(expires_at=datetime.now(tz=UTC) - timedelta(minutes=1))
    _wire_app(app, FakeSession(token_row=expired))
    response = await _call(app, _rpc("read.entries"))
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_revoked_token_is_401(app: Any) -> None:
    revoked = _token_row(revoked_at=NOW)
    _wire_app(app, FakeSession(token_row=revoked))
    response = await _call(app, _rpc("read.entries"))
    assert response.status_code == 401


# ── read-only guarantee ──────────────────────────────────────────


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "method",
    ["write.notes", "write.tags", "write.entry_drafts", "read.everything"],
)
async def test_unknown_and_write_methods_get_method_not_found(
    app: Any, method: str
) -> None:
    _wire_app(app, FakeSession(token_row=_token_row()))
    response = await _call(app, _rpc(method))
    assert response.status_code == 200  # JSON-RPC error, not HTTP error
    body = response.json()
    assert body["error"]["code"] == -32601
    assert "read-only" in body["error"]["message"]
    assert "result" not in body


@pytest.mark.asyncio
async def test_wrong_jsonrpc_version_rejected(app: Any) -> None:
    _wire_app(app, FakeSession(token_row=_token_row()))
    response = await _call(
        app, {"jsonrpc": "1.0", "method": "read.entries", "id": 7},
    )
    assert response.json()["error"]["code"] == -32600


@pytest.mark.asyncio
async def test_invalid_json_body_is_parse_error(app: Any) -> None:
    _wire_app(app, FakeSession(token_row=_token_row()))
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        response = await ac.post(
            "/api/v1/mcp",
            content=b"not json{",
            headers={**AUTH, "Content-Type": "application/json"},
        )
    assert response.json()["error"]["code"] == -32700


# ── read.entries + sealed exclusion ──────────────────────────────


def test_entries_sql_excludes_sealed_rows() -> None:
    """REGRESSION: the sealed filter lives in the SQL statement — the
    vault never fetches sealed rows for the MCP surface."""
    sql = str(entries_stmt(USER_ID, tag=None, limit=10))
    assert "encryption_mode !=" in sql
    assert "owner_id" in sql
    assert "deleted_at IS NULL" in sql


def test_entries_sql_applies_tag_filter() -> None:
    sql = str(entries_stmt(USER_ID, tag="dream", limit=10))
    assert "tags" in sql


@pytest.mark.asyncio
async def test_read_entries_shape_and_sealed_absent(app: Any) -> None:
    """REGRESSION (rule 53): even when sealed rows reach the session
    layer (simulating a regressed query), they never serialize."""
    fake = FakeSession(
        token_row=_token_row(),
        entries=[_plain_entry(), _sealed_entry()],
    )
    _wire_app(app, fake)
    response = await _call(app, _rpc("read.entries", {"limit": 10}))
    assert response.status_code == 200
    body = response.json()
    assert body["jsonrpc"] == "2.0" and body["id"] == 1
    records = body["result"]["records"]
    assert len(records) == 1
    record = records[0]
    assert record["title"] == "Plain entry"
    assert record["sealed"] is False
    assert record["tradition_tags"] == []
    assert record["body_text"] == "the plaintext body"
    # The ciphertext never leaves the vault, under any key name.
    assert "encrypted_payload" not in json.dumps(body)
    assert "SEALED" not in json.dumps(body)


@pytest.mark.asyncio
async def test_read_entries_excludes_closed_tradition(app: Any) -> None:
    fake = FakeSession(
        token_row=_token_row(),
        entries=[
            _plain_entry(title="Open", tradition_tags=["hellenic"]),
            _plain_entry(title="Closed", tradition_tags=["Hopi"]),
        ],
        closed_slugs="hopi",
    )
    _wire_app(app, fake)
    body = (await _call(app, _rpc("read.entries"))).json()
    titles = [r["title"] for r in body["result"]["records"]]
    assert titles == ["Open"]


# ── read.entities ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_read_entities_shape_and_closed_exclusion(app: Any) -> None:
    fake = FakeSession(
        token_row=_token_row(),
        entities=[
            _entity(),
            _entity(name="Closed being", tradition_tags=["hopi"]),
        ],
        closed_slugs="hopi",
    )
    _wire_app(app, fake)
    body = (await _call(app, _rpc("read.entities", {"limit": 5}))).json()
    records = body["result"]["records"]
    assert len(records) == 1
    record = records[0]
    assert record["name"] == "Hekate"
    assert record["epithets"] == ["Soteira"]
    assert record["tradition_tags"] == ["hellenic"]
    assert record["attributions"] == {"planet": "Moon"}
    assert record["sealed"] is False


# ── read.divinations ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_read_divinations_merges_kinds_sorted_and_limited(
    app: Any,
) -> None:
    fake = FakeSession(
        token_row=_token_row(),
        tarot=[
            TarotReading(
                question="oldest",
                owner_id=USER_ID,
                created_at=NOW - timedelta(days=2),
            ),
            TarotReading(
                question="newest", owner_id=USER_ID, created_at=NOW,
            ),
        ],
        iching=[
            IChingReading(
                question="middle",
                owner_id=USER_ID,
                created_at=NOW - timedelta(days=1),
            ),
        ],
    )
    _wire_app(app, fake)
    body = (await _call(app, _rpc("read.divinations", {"limit": 2}))).json()
    records = body["result"]["records"]
    assert [r["question"] for r in records] == ["newest", "middle"]
    assert records[0]["divination_kind"] == "tarot"
    assert records[1]["divination_kind"] == "iching"
    assert all(r["sealed"] is False for r in records)
    assert all(r["tradition_tags"] == [] for r in records)


# ── read.library ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_read_library_serves_books_and_quotes(app: Any) -> None:
    book = Book(
        title="The Greek Magical Papyri",
        author="Betz (ed.)",
        tradition="Hellenic",
        owner_id=USER_ID,
    )
    quote = Quote(
        book_id=book.id, text="A quotation.", owner_id=USER_ID,
    )
    fake = FakeSession(
        token_row=_token_row(), books=[book], quotes=[quote],
    )
    _wire_app(app, fake)
    body = (await _call(app, _rpc("read.library"))).json()
    records = body["result"]["records"]
    kinds = {r["record_type"] for r in records}
    assert kinds == {"book", "quote"}
    book_record = next(r for r in records if r["record_type"] == "book")
    assert book_record["tradition_tags"] == ["hellenic"]  # normalized


@pytest.mark.asyncio
async def test_read_library_kind_filter_and_invalid_kind(app: Any) -> None:
    book = Book(title="B", author="", tradition="", owner_id=USER_ID)
    fake = FakeSession(token_row=_token_row(), books=[book], quotes=[])
    _wire_app(app, fake)
    body = (await _call(app, _rpc("read.library", {"kind": "book"}))).json()
    assert [r["record_type"] for r in body["result"]["records"]] == ["book"]

    bad = (await _call(app, _rpc("read.library", {"kind": "grimoire"}))).json()
    assert bad["error"]["code"] == -32602


# ── read.correspondences ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_read_correspondences_serves_attribution_tables(
    app: Any,
) -> None:
    fake = FakeSession(
        token_row=_token_row(),
        entities=[
            _entity(),
            _entity(name="No table", attributions={}),
            _entity(
                name="Closed",
                tradition_tags=["hopi"],
                attributions={"x": "y"},
            ),
        ],
        closed_slugs="hopi",
    )
    _wire_app(app, fake)
    body = (await _call(app, _rpc("read.correspondences"))).json()
    records = body["result"]["records"]
    assert [r["entity"] for r in records] == ["Hekate"]
    assert records[0]["record_type"] == "correspondence"
    assert records[0]["attributions"] == {"planet": "Moon"}


@pytest.mark.asyncio
async def test_read_correspondences_bundle_filters_by_tradition(
    app: Any,
) -> None:
    fake = FakeSession(
        token_row=_token_row(),
        entities=[
            _entity(),
            _entity(
                name="Thoth",
                tradition_tags=["egyptian"],
                attributions={"planet": "Mercury"},
            ),
        ],
    )
    _wire_app(app, fake)
    body = (
        await _call(
            app, _rpc("read.correspondences", {"bundle": "Egyptian"}),
        )
    ).json()
    assert [r["entity"] for r in body["result"]["records"]] == ["Thoth"]


# ── read.synchronicities ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_read_synchronicities_shape_and_no_location(app: Any) -> None:
    sync = Synchronicity(
        owner_id=USER_ID,
        occurred_at=NOW,
        description="Three ravens at the crossroads",
        category=SynchronicityCategory.ANIMAL_OMEN,
        intensity=7,
        structured_data={"species": "raven", "count": 3},
        location_lat=52.5,
        location_lng=13.4,
        location_precision="exact",
        linked_entry_ids=[],
        linked_entity_ids=[],
        linked_working_ids=[],
    )
    fake = FakeSession(token_row=_token_row(), synchronicities=[sync])
    _wire_app(app, fake)
    body = (await _call(app, _rpc("read.synchronicities"))).json()
    records = body["result"]["records"]
    assert len(records) == 1
    record = records[0]
    assert record["category"] == "animal_omen"
    assert record["intensity"] == 7
    assert record["sealed"] is False
    # Location never reaches the agent surface.
    payload = json.dumps(record)
    assert "location" not in payload
    assert "52.5" not in payload


# ── meta.closed_tradition_slugs ──────────────────────────────────


@pytest.mark.asyncio
async def test_meta_closed_tradition_slugs(app: Any) -> None:
    fake = FakeSession(
        token_row=_token_row(), closed_slugs="hopi, dine",
    )
    _wire_app(app, fake)
    body = (await _call(app, _rpc("meta.closed_tradition_slugs"))).json()
    assert body["result"]["slugs"] == ["dine", "hopi"]


@pytest.mark.asyncio
async def test_meta_closed_tradition_slugs_empty_default(app: Any) -> None:
    fake = FakeSession(token_row=_token_row(), closed_slugs=None)
    _wire_app(app, fake)
    body = (await _call(app, _rpc("meta.closed_tradition_slugs"))).json()
    assert body["result"]["slugs"] == []
