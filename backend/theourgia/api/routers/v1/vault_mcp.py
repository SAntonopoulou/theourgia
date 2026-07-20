"""Vault-side MCP endpoint — Phase 16 close-out (v1-031).

``POST /api/v1/mcp`` speaks JSON-RPC 2.0 and serves EXACTLY the seven
methods the agent daemon's :class:`VaultClient` dials:

  · ``read.entries``            {tag, limit}
  · ``read.entities``           {limit}
  · ``read.divinations``        {limit}
  · ``read.library``            {kind}
  · ``read.correspondences``    {bundle}
  · ``read.synchronicities``    {limit}
  · ``meta.closed_tradition_slugs``  {}

THE VAULT IS THE AUTHORITY (rule 52/53). The daemon runs its own
second-pass filter (`agent-daemon .../mcp/filters.py`) as defence in
depth, but the invariants live here:

  · **Sealed rows never leave the vault.** The entries SELECT excludes
    ``encryption_mode == 'sealed'`` in SQL — sealed rows are not
    fetched, post-filtered, or counted. A serializer-level guard skips
    any sealed row that would somehow reach it (regression belt; the
    SQL predicate is the mechanism).
  · **Closed-tradition rows are excluded server-side** via the
    operator-curated list (`theourgia.core.traditions`), before the
    response is built.
  · **Every record carries ``tradition_tags`` and ``sealed``** so the
    daemon's second-pass filter has the keys it strips on.
  · **Location fields are never included** (same caution as the
    pilgrimage precision substrate).

Auth: a dedicated bearer token minted per agent run
(:mod:`theourgia.core.agents.mcp_tokens`), presented as
``Authorization: Bearer``. It is NOT a browser-session token — it
resolves only here, and this endpoint is READ-ONLY: v1 ships no write
methods (the plan requires explicit per-tool consent for writes, which
is not built; unknown methods get JSON-RPC -32601).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import Select
from sqlmodel import select

from theourgia.api.deps import DBSession
from theourgia.core.agents.mcp_tokens import resolve_mcp_token
from theourgia.core.authz import set_current_user_id
from theourgia.core.traditions import (
    closed_tradition_conflicts,
    get_closed_tradition_slugs,
    normalize_tradition_slug,
)
from theourgia.models.entities import Entity
from theourgia.models.entries import EncryptionMode, Entry
from theourgia.models.geomancy import GeomancyReading
from theourgia.models.iching import IChingReading
from theourgia.models.library import Book, Quote
from theourgia.models.runes import RuneReading
from theourgia.models.synchronicities import Synchronicity
from theourgia.models.tarot import Reading as TarotReading

__all__ = ["MCP_METHODS", "entries_stmt", "router"]

router = APIRouter()

# JSON-RPC error codes (mirrors agent-daemon/theourgia_agent/mcp/protocol.py)
ERROR_PARSE = -32700
ERROR_INVALID_REQUEST = -32600
ERROR_METHOD_NOT_FOUND = -32601
ERROR_INVALID_PARAMS = -32602

MAX_LIMIT = 200

MCP_METHODS = frozenset(
    {
        "read.entries",
        "read.entities",
        "read.divinations",
        "read.library",
        "read.correspondences",
        "read.synchronicities",
        "meta.closed_tradition_slugs",
    }
)

READ_ONLY_DETAIL = (
    "vault MCP is read-only in v1 — write methods require explicit "
    "per-tool consent and are not implemented"
)


# ── auth ─────────────────────────────────────────────────────────────


async def _resolve_mcp_user_id(
    authorization: str | None,
    session: Any,
) -> UUID:
    """Resolve the bearer to the owning user id, 401 otherwise.

    Only dedicated agent-MCP tokens resolve here — a browser-session
    token presented on this endpoint is rejected, and an MCP token
    presented anywhere else resolves nowhere. The RLS GUC is set so
    row-level policies apply as the token's owner.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
        )
    token = authorization.split(" ", 1)[1].strip()
    row = await resolve_mcp_token(session, token)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or expired agent MCP token",
        )
    await set_current_user_id(session, row.user_id)
    return row.user_id


# ── shared shaping helpers ───────────────────────────────────────────


def _enum_value(v: Any) -> Any:
    return getattr(v, "value", v)


def _iso(v: datetime | None) -> str | None:
    return v.isoformat() if v is not None else None


def _clamp_limit(raw: Any) -> int:
    limit = int(raw)
    return max(1, min(limit, MAX_LIMIT))


def _strip_closed(
    records: list[dict], closed: frozenset[str]
) -> list[dict]:
    """Server-side closed-tradition exclusion (rule 52 — the vault is
    the authority; the daemon's second pass is defence in depth)."""
    if not closed:
        return records
    return [
        r
        for r in records
        if not closed_tradition_conflicts(r.get("tradition_tags") or [], closed)
    ]


# ── read.entries ─────────────────────────────────────────────────────


def entries_stmt(
    user_id: UUID, *, tag: str | None, limit: int
) -> Select:
    """The entries SELECT. Sealed exclusion lives HERE, in SQL — the
    regression test compiles this statement and asserts the
    ``encryption_mode`` predicate is present."""
    stmt = (
        select(Entry)
        .where(
            Entry.owner_id == user_id,
            Entry.deleted_at.is_(None),  # type: ignore[union-attr]
            Entry.encryption_mode != EncryptionMode.SEALED,
        )
        .order_by(Entry.created_at.desc())  # type: ignore[attr-defined]
        .limit(limit)
    )
    if tag:
        stmt = stmt.where(Entry.tags.contains([tag]))  # type: ignore[attr-defined]
    return stmt


def _entry_record(row: Entry) -> dict[str, Any] | None:
    # Belt for the SQL suspenders: a sealed row must never serialize,
    # even if a future query change regressed the SQL predicate.
    if _enum_value(row.encryption_mode) == EncryptionMode.SEALED.value:
        return None
    return {
        "id": str(row.id),
        "record_type": "entry",
        "title": row.title,
        "type": _enum_value(row.type),
        "excerpt": row.excerpt,
        "body_text": row.body_text,
        "tags": list(row.tags or []),
        "tradition_tags": list(row.tradition_tags or []),
        "visibility": _enum_value(row.visibility),
        "occurred_at": _iso(row.occurred_at),
        "created_at": _iso(row.created_at),
        "sealed": False,
    }


async def _read_entries(
    session: Any, user_id: UUID, params: dict[str, Any]
) -> dict[str, Any]:
    limit = _clamp_limit(params.get("limit", 50))
    tag = params.get("tag")
    result = await session.execute(
        entries_stmt(user_id, tag=tag, limit=limit)
    )
    records = [
        r
        for r in (_entry_record(row) for row in result.scalars().all())
        if r is not None
    ]
    closed = await get_closed_tradition_slugs(session)
    return {"records": _strip_closed(records, closed)}


# ── read.entities ────────────────────────────────────────────────────


def _entity_record(row: Entity) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "record_type": "entity",
        "name": row.name,
        "kind": _enum_value(row.kind),
        "aliases": list(row.aliases or []),
        "epithets": list(row.epithets or []),
        "summary": row.summary,
        "description": row.description,
        "tradition": row.tradition,
        "tradition_tags": list(row.tradition_tags or []),
        "attributions": dict(row.attributions or {}),
        "sealed": False,
    }


async def _read_entities(
    session: Any, user_id: UUID, params: dict[str, Any]
) -> dict[str, Any]:
    limit = _clamp_limit(params.get("limit", 50))
    stmt = (
        select(Entity)
        .where(
            Entity.owner_id == user_id,
            Entity.deleted_at.is_(None),  # type: ignore[union-attr]
        )
        .order_by(Entity.name)
        .limit(limit)
    )
    result = await session.execute(stmt)
    records = [_entity_record(row) for row in result.scalars().all()]
    closed = await get_closed_tradition_slugs(session)
    return {"records": _strip_closed(records, closed)}


# ── read.divinations ─────────────────────────────────────────────────

# v1 serves the four casting systems that share the question +
# retrospective-notes shape. Pendulum / bibliomancy / horary / scrying /
# tea-leaf logs are a documented v1.1 extension (docs/dev/ai-agents.md).
_DIVINATION_TABLES: tuple[tuple[str, type], ...] = (
    ("tarot", TarotReading),
    ("iching", IChingReading),
    ("geomancy", GeomancyReading),
    ("runes", RuneReading),
)


def _divination_record(kind: str, row: Any) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "record_type": "divination",
        "divination_kind": kind,
        "question": row.question,
        "retrospective_notes": row.retrospective_notes,
        "created_at": _iso(row.created_at),
        "tradition_tags": [],
        "sealed": False,
    }


async def _read_divinations(
    session: Any, user_id: UUID, params: dict[str, Any]
) -> dict[str, Any]:
    limit = _clamp_limit(params.get("limit", 50))
    records: list[dict[str, Any]] = []
    for kind, model in _DIVINATION_TABLES:
        stmt = (
            select(model)
            .where(
                model.owner_id == user_id,  # type: ignore[attr-defined]
                model.deleted_at.is_(None),  # type: ignore[attr-defined]
            )
            .order_by(model.created_at.desc())  # type: ignore[attr-defined]
            .limit(limit)
        )
        result = await session.execute(stmt)
        records.extend(
            _divination_record(kind, row) for row in result.scalars().all()
        )
    records.sort(key=lambda r: r["created_at"] or "", reverse=True)
    return {"records": records[:limit]}


# ── read.library ─────────────────────────────────────────────────────


def _book_record(row: Book) -> dict[str, Any]:
    tradition = (row.tradition or "").strip()
    return {
        "id": str(row.id),
        "record_type": "book",
        "title": row.title,
        "author": row.author,
        "year": row.year,
        "tradition": tradition,
        "status": _enum_value(row.status),
        "tradition_tags": (
            [normalize_tradition_slug(tradition)] if tradition else []
        ),
        "sealed": False,
    }


def _quote_record(row: Quote) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "record_type": "quote",
        "book_id": str(row.book_id),
        "text": row.text,
        "page_reference": row.page_reference,
        "language": row.language,
        "tradition_tags": [],
        "sealed": False,
    }


async def _read_library(
    session: Any, user_id: UUID, params: dict[str, Any]
) -> dict[str, Any]:
    kind = params.get("kind")
    if kind is not None and kind not in ("book", "quote"):
        msg = f"unknown library kind {kind!r} (expected 'book' or 'quote')"
        raise ValueError(msg)
    records: list[dict[str, Any]] = []
    if kind in (None, "book"):
        stmt = (
            select(Book)
            .where(
                Book.owner_id == user_id,  # type: ignore[attr-defined]
                Book.deleted_at.is_(None),  # type: ignore[union-attr]
            )
            .order_by(Book.title)
        )
        result = await session.execute(stmt)
        records.extend(_book_record(row) for row in result.scalars().all())
    if kind in (None, "quote"):
        stmt = (
            select(Quote)
            .where(
                Quote.owner_id == user_id,
                Quote.deleted_at.is_(None),  # type: ignore[union-attr]
            )
            .order_by(Quote.created_at.desc())  # type: ignore[attr-defined]
        )
        result = await session.execute(stmt)
        records.extend(_quote_record(row) for row in result.scalars().all())
    closed = await get_closed_tradition_slugs(session)
    return {"records": _strip_closed(records, closed)}


# ── read.correspondences ─────────────────────────────────────────────


def _correspondence_record(row: Entity) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "record_type": "correspondence",
        "entity": row.name,
        "entity_kind": _enum_value(row.kind),
        "attributions": dict(row.attributions or {}),
        "tradition_tags": list(row.tradition_tags or []),
        "sealed": False,
    }


async def _read_correspondences(
    session: Any, user_id: UUID, params: dict[str, Any]
) -> dict[str, Any]:
    """The magician's OWN correspondence tables — entity attribution
    rows ("surface the user's own knowledge"). ``bundle`` filters by
    normalized tradition slug. Bundled PD reference tables (Liber 777,
    decans) stay on /api/v1/reference; they are not vault content.
    """
    bundle = params.get("bundle")
    stmt = (
        select(Entity)
        .where(
            Entity.owner_id == user_id,
            Entity.deleted_at.is_(None),  # type: ignore[union-attr]
        )
        .order_by(Entity.name)
    )
    result = await session.execute(stmt)
    records = [
        _correspondence_record(row)
        for row in result.scalars().all()
        if row.attributions
    ]
    if bundle:
        wanted = normalize_tradition_slug(str(bundle))
        records = [
            r
            for r in records
            if wanted
            in (normalize_tradition_slug(t) for t in r["tradition_tags"])
        ]
    closed = await get_closed_tradition_slugs(session)
    return {"records": _strip_closed(records, closed)}


# ── read.synchronicities ─────────────────────────────────────────────


def _synchronicity_record(row: Synchronicity) -> dict[str, Any]:
    # Location deliberately omitted — the precision substrate governs
    # location disclosure and agents get none of it in v1.
    return {
        "id": str(row.id),
        "record_type": "synchronicity",
        "occurred_at": _iso(row.occurred_at),
        "description": row.description,
        "category": _enum_value(row.category),
        "intensity": row.intensity,
        "structured_data": dict(row.structured_data or {}),
        "linked_entry_ids": [str(i) for i in (row.linked_entry_ids or [])],
        "linked_entity_ids": [str(i) for i in (row.linked_entity_ids or [])],
        "tradition_tags": [],
        "sealed": False,
    }


async def _read_synchronicities(
    session: Any, user_id: UUID, params: dict[str, Any]
) -> dict[str, Any]:
    limit = _clamp_limit(params.get("limit", 50))
    stmt = (
        select(Synchronicity)
        .where(
            Synchronicity.owner_id == user_id,
            Synchronicity.deleted_at.is_(None),  # type: ignore[union-attr]
        )
        .order_by(Synchronicity.occurred_at.desc())  # type: ignore[attr-defined]
        .limit(limit)
    )
    result = await session.execute(stmt)
    return {
        "records": [
            _synchronicity_record(row) for row in result.scalars().all()
        ]
    }


# ── meta.closed_tradition_slugs ──────────────────────────────────────


async def _meta_closed_tradition_slugs(
    session: Any, user_id: UUID, params: dict[str, Any]  # noqa: ARG001
) -> dict[str, Any]:
    closed = await get_closed_tradition_slugs(session)
    return {"slugs": sorted(closed)}


_HANDLERS = {
    "read.entries": _read_entries,
    "read.entities": _read_entities,
    "read.divinations": _read_divinations,
    "read.library": _read_library,
    "read.correspondences": _read_correspondences,
    "read.synchronicities": _read_synchronicities,
    "meta.closed_tradition_slugs": _meta_closed_tradition_slugs,
}


# ── transport ────────────────────────────────────────────────────────


def _rpc_error(
    id_: Any, code: int, message: str
) -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={
            "jsonrpc": "2.0",
            "id": id_,
            "error": {"code": code, "message": message},
        },
    )


@router.post("/mcp")
async def vault_mcp(
    request: Request,
    session: DBSession,
    authorization: str | None = Header(default=None),
) -> JSONResponse:
    """JSON-RPC 2.0 endpoint the agent daemon dials. Read-only."""
    user_id = await _resolve_mcp_user_id(authorization, session)

    try:
        payload: Any = await request.json()
    except (ValueError, json.JSONDecodeError):
        return _rpc_error(None, ERROR_PARSE, "invalid JSON body")

    if not isinstance(payload, dict):
        return _rpc_error(
            None, ERROR_INVALID_REQUEST, "request must be a JSON object"
        )
    id_ = payload.get("id")
    if payload.get("jsonrpc") != "2.0":
        return _rpc_error(id_, ERROR_INVALID_REQUEST, "jsonrpc must be '2.0'")
    method = payload.get("method")
    if not isinstance(method, str) or not method:
        return _rpc_error(
            id_, ERROR_INVALID_REQUEST, "method must be a non-empty string"
        )
    params = payload.get("params") or {}
    if not isinstance(params, dict):
        return _rpc_error(
            id_, ERROR_INVALID_PARAMS, "params must be a JSON object"
        )

    handler = _HANDLERS.get(method)
    if handler is None:
        return _rpc_error(
            id_,
            ERROR_METHOD_NOT_FOUND,
            f"method {method!r} not found ({READ_ONLY_DETAIL})",
        )

    try:
        result = await handler(session, user_id, params)
    except (TypeError, ValueError) as exc:
        return _rpc_error(id_, ERROR_INVALID_PARAMS, str(exc))

    return JSONResponse(
        status_code=200,
        content={"jsonrpc": "2.0", "id": id_, "result": result},
    )
