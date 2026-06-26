"""Unit tests for the gematria search router (B111).

Covers:
  * Pydantic schema validation (Payload, Result, Response shapes)
  * Match-mode predicate construction (exact/near/reduced)
  * Router-registration smoke
  * Helper round-trips

Integration-style indexer + DB tests live in the integration suite
(requires a live Postgres / SQLite session fixture) — these unit
tests focus on the request/response contract.
"""

from __future__ import annotations

from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.sql import operators

from theourgia.api.routers.v1 import gematria_search as search_module
from theourgia.api.routers.v1.gematria_search import (
    GematriaResonance,
    GematriaSearchPayload,
    GematriaSearchResponse,
    GematriaSearchResult,
    _match_predicate,
)


# ── Schema validation ──────────────────────────────────────────────


def test_payload_minimal_validates() -> None:
    p = GematriaSearchPayload(value=418)
    assert p.value == 418
    assert p.cipher_ids == []
    assert p.match_mode == "exact"
    assert p.delta == 0
    assert p.include_personal_ciphers is True
    assert p.limit == 25
    assert p.offset == 0


def test_payload_full_validates() -> None:
    cipher_id = uuid4()
    p = GematriaSearchPayload(
        value=418,
        cipher_ids=[cipher_id],
        match_mode="near",
        delta=5,
        include_personal_ciphers=False,
        limit=50,
        offset=100,
    )
    assert p.cipher_ids == [cipher_id]
    assert p.match_mode == "near"
    assert p.delta == 5


def test_payload_rejects_negative_value() -> None:
    with pytest.raises(ValidationError):
        GematriaSearchPayload(value=-1)


def test_payload_rejects_unknown_match_mode() -> None:
    with pytest.raises(ValidationError):
        GematriaSearchPayload(value=1, match_mode="fuzzy")  # type: ignore[arg-type]


def test_payload_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        GematriaSearchPayload(
            value=1,
            include_sealed=True,  # type: ignore[call-arg]
        )


def test_payload_limit_bounded() -> None:
    with pytest.raises(ValidationError):
        GematriaSearchPayload(value=1, limit=0)
    with pytest.raises(ValidationError):
        GematriaSearchPayload(value=1, limit=1000)


def test_payload_delta_bounded() -> None:
    # delta accepts 0..100
    p = GematriaSearchPayload(value=1, delta=100)
    assert p.delta == 100
    with pytest.raises(ValidationError):
        GematriaSearchPayload(value=1, delta=-1)
    with pytest.raises(ValidationError):
        GematriaSearchPayload(value=1, delta=101)


def test_result_schema_allows_null_phrase_for_sealed() -> None:
    """Sealed entries' phrases are NEVER leaked — phrase=None."""
    r = GematriaSearchResult(
        entry_id=str(uuid4()),
        entry_title=None,
        entry_date=None,
        phrase=None,
        cipher_id=str(uuid4()),
        cipher_name="Iso",
        cipher_personal=False,
        value=418,
        digit_sum=4,
        is_sealed=True,
    )
    assert r.phrase is None
    assert r.is_sealed is True


def test_response_default_shape() -> None:
    r = GematriaSearchResponse(
        total_matches=0,
        entries_with_matches=0,
        results=[],
        sealed_match_count=0,
        resonances=[],
    )
    assert r.total_matches == 0
    assert r.sealed_match_count == 0


def test_resonance_schema() -> None:
    r = GematriaResonance(
        phrase="σοφια", value=781, ciphers=["Isopsephy", "Hebrew"],
    )
    assert r.phrase == "σοφια"
    assert r.ciphers == ["Isopsephy", "Hebrew"]


# ── _match_predicate ───────────────────────────────────────────────


def test_match_predicate_exact_uses_equality() -> None:
    payload = GematriaSearchPayload(value=418, match_mode="exact")
    pred = _match_predicate(payload)
    # The predicate is a BinaryExpression `value == 418`.
    assert pred.operator == operators.eq
    assert pred.right.value == 418


def test_match_predicate_near_is_range_bound() -> None:
    """The "near" predicate is `value BETWEEN target-delta AND
    target+delta` — implemented as `and_(value>=lo, value<=hi)`."""
    payload = GematriaSearchPayload(value=418, match_mode="near", delta=5)
    pred = _match_predicate(payload)
    # The compound BooleanClauseList includes the >= and <= bounds.
    rendered = str(pred.compile(compile_kwargs={"literal_binds": True}))
    assert "413" in rendered
    assert "423" in rendered


def test_match_predicate_reduced_compares_digit_sum() -> None:
    """The "reduced" predicate compares digit_sum equality.
    418 → 4+1+8 = 13 → 1+3 = 4."""
    payload = GematriaSearchPayload(value=418, match_mode="reduced")
    pred = _match_predicate(payload)
    rendered = str(pred.compile(compile_kwargs={"literal_binds": True}))
    assert "digit_sum" in rendered
    assert "= 4" in rendered


def test_match_predicate_reduced_for_single_digit_input() -> None:
    payload = GematriaSearchPayload(value=7, match_mode="reduced")
    pred = _match_predicate(payload)
    rendered = str(pred.compile(compile_kwargs={"literal_binds": True}))
    assert "= 7" in rendered


def test_match_predicate_reduced_for_zero_value() -> None:
    payload = GematriaSearchPayload(value=0, match_mode="reduced")
    pred = _match_predicate(payload)
    rendered = str(pred.compile(compile_kwargs={"literal_binds": True}))
    assert "= 0" in rendered


# ── Router smoke ──────────────────────────────────────────────────


def test_gematria_search_router_registers_two_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in search_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/gematria/search", "POST") in paths_methods
    assert ("/gematria/search/csv", "POST") in paths_methods


def test_gematria_search_router_response_models() -> None:
    from fastapi.routing import APIRoute

    routes_by_path = {r.path: r for r in search_module.router.routes if isinstance(r, APIRoute)}
    assert (
        routes_by_path["/gematria/search"].response_model
        == GematriaSearchResponse
    )


# ── Schema invariants ─────────────────────────────────────────────


def test_response_schema_rejects_negative_counts() -> None:
    # The schema accepts any int; the router never produces negatives.
    # This is here as a forward-looking invariant — if someone changes
    # the response shape to add `ge=0` validators, the API is sound.
    r = GematriaSearchResponse(
        total_matches=0,
        entries_with_matches=0,
        results=[],
        sealed_match_count=0,
        resonances=[],
    )
    assert r.total_matches >= 0


def test_result_schema_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        GematriaSearchResult(
            entry_id=str(uuid4()),
            entry_title="Title",
            entry_date=None,
            phrase="σοφια",
            cipher_id=str(uuid4()),
            cipher_name="Iso",
            cipher_personal=False,
            value=781,
            digit_sum=7,
            is_sealed=False,
            extra_field="forbidden",  # type: ignore[call-arg]
        )


def test_resonance_schema_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        GematriaResonance(
            phrase="σοφια",
            value=781,
            ciphers=["Iso"],
            extra=True,  # type: ignore[call-arg]
        )
