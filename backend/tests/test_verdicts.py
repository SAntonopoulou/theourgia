"""Two-gate covenant tests (Sprint I-B, Domain 2 — rule 69).

* pure covenant logic: fingerprint, seal guard, verdict guards,
  queue membership;
* router schema validation + registration smoke;
* full HTTP round-trips, skip-gated on ``THEOURGIA_TEST_DATABASE_URL``
  (database must be migrated to 0087).
"""

from __future__ import annotations

import asyncio
import hashlib
from datetime import UTC, datetime

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from theourgia.api.routers.v1.verdicts import (
    WORKING_TYPES,
    compute_intent_fingerprint,
    ensure_finalizable,
    ensure_intent_sealable,
    ensure_verdict_editable,
    is_awaiting_judgment,
)
from theourgia.models.entries import Entry, EntryType, GateResult

from tests.sprint_ib_db import DB_URL, signed_in_client


NOW = datetime(2026, 7, 25, 12, 0, 0, tzinfo=UTC)


# ───── fingerprint ──────────────────────────────────────────────


def test_fingerprint_is_sha256_of_text_and_timestamp() -> None:
    fp = compute_intent_fingerprint("Safe passage to Delphi.", NOW)
    expected = hashlib.sha256(
        f"Safe passage to Delphi.\n{NOW.isoformat()}".encode()
    ).hexdigest()
    assert fp == expected
    assert len(fp) == 64


def test_fingerprint_changes_with_text_or_time() -> None:
    a = compute_intent_fingerprint("intent", NOW)
    b = compute_intent_fingerprint("intent.", NOW)
    c = compute_intent_fingerprint("intent", datetime(2026, 7, 25, 12, 0, 1, tzinfo=UTC))
    assert len({a, b, c}) == 3


# ───── seal guard ───────────────────────────────────────────────


def test_working_types_are_working_and_magical_record() -> None:
    assert WORKING_TYPES == {EntryType.WORKING, EntryType.MAGICAL_RECORD}


def test_seal_allowed_on_fresh_working() -> None:
    for t in (EntryType.WORKING, EntryType.MAGICAL_RECORD):
        ensure_intent_sealable(Entry(title="x", type=t))  # no raise


def test_seal_refused_on_non_working_types() -> None:
    for t in (EntryType.NOTE, EntryType.DREAM, EntryType.DIVINATION):
        with pytest.raises(HTTPException) as exc:
            ensure_intent_sealable(Entry(title="x", type=t))
        assert exc.value.status_code == 422


def test_seal_refused_when_already_sealed() -> None:
    entry = Entry(title="x", type=EntryType.WORKING, intent_declared_at=NOW)
    with pytest.raises(HTTPException) as exc:
        ensure_intent_sealable(entry)
    assert exc.value.status_code == 409
    assert "unrewritable" in exc.value.detail


# ───── verdict guards ───────────────────────────────────────────


def _sealed_working(**kwargs) -> Entry:
    return Entry(
        title="x",
        type=EntryType.WORKING,
        intent_declared_at=NOW,
        **kwargs,
    )


def test_verdict_refused_without_covenant() -> None:
    with pytest.raises(HTTPException) as exc:
        ensure_verdict_editable(Entry(title="x", type=EntryType.WORKING))
    assert exc.value.status_code == 409


def test_verdict_editable_while_open() -> None:
    ensure_verdict_editable(_sealed_working())  # no raise


def test_verdict_immutable_after_finalize() -> None:
    entry = _sealed_working(verdict_finalized_at=NOW)
    with pytest.raises(HTTPException) as exc:
        ensure_verdict_editable(entry)
    assert exc.value.status_code == 409
    assert "immutable" in exc.value.detail


def test_finalize_requires_both_gates_discharged() -> None:
    ensure_finalizable(GateResult.PASS, GateResult.FAIL)  # no raise
    ensure_finalizable(GateResult.FAIL, GateResult.FAIL)  # no raise
    for g1, g2 in (
        (GateResult.OPEN, GateResult.OPEN),
        (GateResult.PASS, GateResult.OPEN),
        (GateResult.OPEN, GateResult.FAIL),
    ):
        with pytest.raises(HTTPException) as exc:
            ensure_finalizable(g1, g2)
        assert exc.value.status_code == 422


# ───── queue membership ─────────────────────────────────────────


def test_awaiting_requires_sealed_intent() -> None:
    assert not is_awaiting_judgment(Entry(title="x", type=EntryType.WORKING))


def test_awaiting_while_any_gate_open() -> None:
    assert is_awaiting_judgment(_sealed_working())
    assert is_awaiting_judgment(_sealed_working(gate1_result=GateResult.PASS))
    assert is_awaiting_judgment(_sealed_working(gate2_result=GateResult.FAIL))


def test_not_awaiting_once_both_gates_judged() -> None:
    entry = _sealed_working(
        gate1_result=GateResult.PASS, gate2_result=GateResult.FAIL,
    )
    assert not is_awaiting_judgment(entry)


# ───── schemas ──────────────────────────────────────────────────


def test_intent_declare_requires_text() -> None:
    from theourgia.api.routers.v1.verdicts import IntentDeclare

    with pytest.raises(ValidationError):
        IntentDeclare(text="")
    with pytest.raises(ValidationError):
        IntentDeclare()  # type: ignore[call-arg]


def test_verdict_write_rejects_unknown_result() -> None:
    from theourgia.api.routers.v1.verdicts import VerdictWrite

    with pytest.raises(ValidationError):
        VerdictWrite(
            gate1={"result": "maybe"}, gate2={"result": "open"},  # type: ignore[arg-type]
        )


def test_verdict_write_rejects_extras() -> None:
    from theourgia.api.routers.v1.verdicts import VerdictWrite

    with pytest.raises(ValidationError):
        VerdictWrite(
            gate1={"result": "open"},
            gate2={"result": "open"},
            intent_text="rewrite the covenant",  # type: ignore[call-arg]
        )


def test_no_intent_update_route_exists() -> None:
    """Rule 69: declaration is POST-once; no PATCH/PUT/DELETE exists
    for the intent — by design, verified against the OpenAPI schema."""
    from theourgia.api.app import create_app

    schema = create_app().openapi()
    intent_path = "/api/v1/workings/{entry_id}/intent"
    assert intent_path in schema["paths"]
    methods = set(schema["paths"][intent_path].keys())
    assert methods == {"post"}


def test_router_registered_on_v1() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/workings/{entry_id}/verdict" in paths
    assert "/api/v1/verdicts/awaiting" in paths
    assert "/api/v1/workings/awaiting-judgment" in paths


# ───── HTTP round-trips (live DB) ───────────────────────────────


async def _make_entry(client, title: str, type_: str = "working") -> str:
    r = await client.post(
        "/api/v1/entries", json={"title": title, "type": type_},
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_http_covenant_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    async def run() -> None:
        async with signed_in_client(monkeypatch) as client:
            working = await _make_entry(client, "Lamp working")

            # Declare intent — sealed with fingerprint.
            r = await client.post(
                f"/api/v1/workings/{working}/intent",
                json={"text": "The lamp stays lit through the night."},
            )
            assert r.status_code == 201, r.text
            intent = r.json()
            assert intent["immutable"] is True
            assert len(intent["fingerprint"]) == 64
            declared_at = datetime.fromisoformat(intent["declared_at"])
            assert intent["fingerprint"] == compute_intent_fingerprint(
                intent["text"], declared_at,
            )

            # Second declaration is refused — no admin bypass exists.
            r = await client.post(
                f"/api/v1/workings/{working}/intent",
                json={"text": "Actually, something easier."},
            )
            assert r.status_code == 409

            # Intent on a non-working type is refused.
            note = await _make_entry(client, "A note", "note")
            r = await client.post(
                f"/api/v1/workings/{note}/intent", json={"text": "no"},
            )
            assert r.status_code == 422

            # The queue sees the sealed, unjudged working (both routes).
            for path in (
                "/api/v1/verdicts/awaiting",
                "/api/v1/workings/awaiting-judgment",
            ):
                r = await client.get(path)
                assert r.status_code == 200
                queue = r.json()
                assert [q["entry_id"] for q in queue] == [working]
                assert queue[0]["gate1"] == "open"
                assert queue[0]["age_days"] == 0

            # Judge gate 1 only — still awaiting.
            r = await client.put(
                f"/api/v1/workings/{working}/verdict",
                json={
                    "gate1": {"result": "pass", "notes": "Repeated twice."},
                    "gate2": {"result": "open"},
                },
            )
            assert r.status_code == 200, r.text
            assert r.json()["judged_at"] is not None
            r = await client.get("/api/v1/verdicts/awaiting")
            assert len(r.json()) == 1

            # Finalize with a gate open is refused.
            r = await client.put(
                f"/api/v1/workings/{working}/verdict",
                json={
                    "gate1": {"result": "pass"},
                    "gate2": {"result": "open"},
                    "finalize": True,
                },
            )
            assert r.status_code == 422

            # Judge both + finalize.
            r = await client.put(
                f"/api/v1/workings/{working}/verdict",
                json={
                    "gate1": {"result": "pass", "notes": "Repeatable."},
                    "gate2": {"result": "fail", "notes": "Not coherent."},
                    "finalize": True,
                },
            )
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["finalized_at"] is not None
            assert body["gate1"]["result"] == "pass"
            assert body["gate2"]["result"] == "fail"

            # Queue is discharged.
            r = await client.get("/api/v1/verdicts/awaiting")
            assert r.json() == []

            # The verdict is now immutable too.
            r = await client.put(
                f"/api/v1/workings/{working}/verdict",
                json={
                    "gate1": {"result": "fail"},
                    "gate2": {"result": "fail"},
                },
            )
            assert r.status_code == 409

            # The sealed intent survives, verbatim.
            r = await client.get(f"/api/v1/workings/{working}/verdict")
            assert (
                r.json()["intent"]["text"]
                == "The lamp stays lit through the night."
            )

            # Judging before any covenant is refused.
            fresh = await _make_entry(client, "Unsealed working")
            r = await client.put(
                f"/api/v1/workings/{fresh}/verdict",
                json={"gate1": {"result": "pass"}, "gate2": {"result": "pass"}},
            )
            assert r.status_code == 409

    asyncio.run(run())


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_http_verdicts_owner_scoped(monkeypatch: pytest.MonkeyPatch) -> None:
    async def run() -> None:
        async with signed_in_client(monkeypatch) as first:
            working = await _make_entry(first, "Private working")
            r = await first.post(
                f"/api/v1/workings/{working}/intent", json={"text": "Mine."},
            )
            assert r.status_code == 201
        async with signed_in_client(monkeypatch) as second:
            r = await second.get(f"/api/v1/workings/{working}/verdict")
            assert r.status_code == 404
            r = await second.get("/api/v1/verdicts/awaiting")
            assert working not in [q["entry_id"] for q in r.json()]

    asyncio.run(run())
