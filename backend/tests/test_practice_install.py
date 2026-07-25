"""Install-by-proof lifecycle tests (Sprint I-B, Domain 2).

The transition graph: candidate→testing→installed|rejected; installed
is terminal; rejected→candidate reopens a re-trial. Everything else —
including same-state no-ops — is refused.
"""

from __future__ import annotations

import asyncio

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.practices import validate_status_transition
from theourgia.models.practices import (
    LEGAL_STATUS_TRANSITIONS,
    CustomPractice,
    PracticeStatus,
)

from tests.sprint_ib_db import DB_URL, signed_in_client


# ───── the transition graph, exhaustively ───────────────────────

_EXPECTED_LEGAL = {
    (PracticeStatus.CANDIDATE, PracticeStatus.TESTING),
    (PracticeStatus.TESTING, PracticeStatus.INSTALLED),
    (PracticeStatus.TESTING, PracticeStatus.REJECTED),
    (PracticeStatus.REJECTED, PracticeStatus.CANDIDATE),
}


def test_transition_matrix_is_exactly_the_designed_graph() -> None:
    for current in PracticeStatus:
        for new in PracticeStatus:
            if (current, new) in _EXPECTED_LEGAL:
                validate_status_transition(current, new)  # no raise
            else:
                with pytest.raises(ValueError):
                    validate_status_transition(current, new)


def test_installed_is_terminal() -> None:
    assert LEGAL_STATUS_TRANSITIONS[PracticeStatus.INSTALLED] == frozenset()
    with pytest.raises(ValueError, match="terminal"):
        validate_status_transition(
            PracticeStatus.INSTALLED, PracticeStatus.CANDIDATE,
        )


def test_rejected_reopens_to_candidate_only() -> None:
    validate_status_transition(
        PracticeStatus.REJECTED, PracticeStatus.CANDIDATE,
    )
    with pytest.raises(ValueError, match="Illegal transition"):
        validate_status_transition(
            PracticeStatus.REJECTED, PracticeStatus.TESTING,
        )


def test_no_install_by_enthusiasm() -> None:
    """candidate → installed must walk through testing."""
    with pytest.raises(ValueError, match="Illegal transition"):
        validate_status_transition(
            PracticeStatus.CANDIDATE, PracticeStatus.INSTALLED,
        )


def test_same_state_is_not_a_transition() -> None:
    for s in PracticeStatus:
        with pytest.raises(ValueError, match="already"):
            validate_status_transition(s, s)


def test_new_practice_defaults_to_candidate() -> None:
    p = CustomPractice(name="Evening ablution")
    assert p.status is PracticeStatus.CANDIDATE
    assert p.status_changed_at is None


def test_status_update_schema_rejects_unknown_status() -> None:
    from theourgia.api.routers.v1.practices import PracticeStatusUpdate

    with pytest.raises(ValidationError):
        PracticeStatusUpdate(status="blessed")  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        PracticeStatusUpdate(status="testing", extra_field=1)  # type: ignore[call-arg]


def test_status_route_registered() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/practices/{practice_id}/status" in paths


# ───── HTTP round-trips (live DB) ───────────────────────────────


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_http_install_by_proof_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    async def run() -> None:
        async with signed_in_client(monkeypatch) as client:
            r = await client.post(
                "/api/v1/practices", json={"name": "Noon adoration"},
            )
            assert r.status_code == 201, r.text
            practice = r.json()
            assert practice["status"] == "candidate"

            pid = practice["id"]

            # Straight to installed is refused.
            r = await client.post(
                f"/api/v1/practices/{pid}/status",
                json={"status": "installed"},
            )
            assert r.status_code == 409

            # candidate → testing → installed, with notes.
            r = await client.post(
                f"/api/v1/practices/{pid}/status",
                json={"status": "testing", "note": "30-night trial."},
            )
            assert r.status_code == 200, r.text
            assert r.json()["status"] == "testing"
            assert r.json()["status_changed_at"] is not None
            assert r.json()["status_note"] == "30-night trial."

            r = await client.post(
                f"/api/v1/practices/{pid}/status",
                json={"status": "installed", "note": "Kept 28 of 30."},
            )
            assert r.status_code == 200
            assert r.json()["status"] == "installed"

            # Installed is terminal.
            for target in ("candidate", "testing", "rejected"):
                r = await client.post(
                    f"/api/v1/practices/{pid}/status",
                    json={"status": target},
                )
                assert r.status_code == 409

            # A second practice: rejection and re-trial.
            r = await client.post(
                "/api/v1/practices", json={"name": "Midnight vigil"},
            )
            pid2 = r.json()["id"]
            for step in ("testing", "rejected", "candidate", "testing"):
                r = await client.post(
                    f"/api/v1/practices/{pid2}/status", json={"status": step},
                )
                assert r.status_code == 200, r.text
            assert r.json()["status"] == "testing"

    asyncio.run(run())
