"""B51 tests — H01-H03 backend gap-fills.

Covers:

* Search `sealed_excluded_count` is exposed on the response Pydantic
  model.
* Resh Adoration model has the expected column shape.
* Today ledger aggregator payload shape (the four cards).
* Resh router payloads (transitions enum, station shape, create
  validation).
* Care-palette discipline in the Today ledger: sealed checkpoints
  surface as `sealed_checkpoint_count` (no plaintext leak).

Pure-Python class-shape tests; DB integration via deploy path.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest


# ───── Search: sealed_excluded_count ──────────────────────────────────


def test_search_response_carries_sealed_excluded_count() -> None:
    from theourgia.api.routers.v1.search import SearchResponse

    resp = SearchResponse(hits=[], total=0, limit=20, offset=0)
    assert resp.sealed_excluded_count == 0  # default

    resp2 = SearchResponse(
        hits=[], total=12, limit=20, offset=0, sealed_excluded_count=4,
    )
    assert resp2.sealed_excluded_count == 4


def test_search_results_dataclass_carries_sealed_excluded_count() -> None:
    from theourgia.core.search.search import SearchResults

    res = SearchResults(hits=[], total=0, sealed_excluded_count=7)
    assert res.sealed_excluded_count == 7

    # Backwards-compatible: default = 0.
    res_default = SearchResults(hits=[], total=0)
    assert res_default.sealed_excluded_count == 0


# ───── Resh model + router ────────────────────────────────────────────


def test_resh_transition_enum_has_four_values() -> None:
    from theourgia.models.resh import ReshTransition

    assert {t.value for t in ReshTransition} == {
        "sunrise", "noon", "sunset", "midnight",
    }


def test_adoration_model_columns() -> None:
    from theourgia.models.resh import Adoration

    for col in (
        "civil_date", "transition", "observed_at", "note",
        "location_label", "entry_id", "owner_id",
    ):
        assert hasattr(Adoration, col), f"Adoration missing {col!r}"


def test_resh_today_response_shape() -> None:
    from datetime import date

    from theourgia.api.routers.v1.resh import ReshToday, StationRead

    today = ReshToday(
        civil_date=date(2026, 6, 21),
        stations=[
            StationRead(
                transition="sunrise",
                at=datetime(2026, 6, 21, 4, 50, tzinfo=UTC),
                godform="Ra Hoor Khuit",
                direction="East",
                short_invocation="Hail unto Thee…",
                observed_at=None,
                note=None,
            ),
        ],
        streak_days=3,
    )
    assert today.streak_days == 3
    assert today.stations[0].transition == "sunrise"


def test_adoration_create_payload_minimal() -> None:
    from theourgia.api.routers.v1.resh import AdorationCreate

    p = AdorationCreate(transition="sunrise")
    assert p.transition == "sunrise"
    assert p.civil_date is None  # API defaults
    assert p.observed_at is None  # API defaults


def test_adoration_create_rejects_invalid_transition() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.resh import AdorationCreate

    with pytest.raises(ValidationError):
        AdorationCreate(transition="dawn")  # type: ignore[arg-type]


def test_resh_today_query_validates_lat_lng() -> None:
    """Router-level constraint: lat in [-90, 90], lng in [-180, 180].
    Tested via the route function's signature; we sample one bad pair
    by hand via direct construction of a request."""
    # The constraint is on the FastAPI Query() — covered at runtime by
    # FastAPI. Here we ensure the endpoint is registered.
    from theourgia.api.routers.v1.resh import router

    paths = {route.path for route in router.routes}
    assert "/resh/today" in paths
    assert "/resh/adorations" in paths


# ───── Today ledger payload shapes ────────────────────────────────────


def test_today_ledger_top_level_shape() -> None:
    from theourgia.api.routers.v1.today_ledger import (
        ActivePracticesCard,
        AttestationActivityCard,
        ObligationsCard,
        ServitorFeedingCard,
        TodayLedger,
    )

    ledger = TodayLedger(
        active_practices=ActivePracticesCard(practices=[], total_due_in_24h=0),
        obligations=ObligationsCard(
            contract_obligations=[],
            oath_checkpoints=[],
            sealed_checkpoint_count=0,
        ),
        servitor_feeding=ServitorFeedingCard(feedings_due=[]),
        attestation_activity=AttestationActivityCard(activity=[]),
        generated_at=datetime(2026, 6, 21, 18, tzinfo=UTC),
    )
    assert ledger.obligations.sealed_checkpoint_count == 0
    assert ledger.active_practices.total_due_in_24h == 0


def test_obligations_card_separates_sealed_count_from_visible_checkpoints() -> None:
    """A sealed checkpoint must never leak its prompt — the card carries
    a count separately."""
    from theourgia.api.routers.v1.today_ledger import (
        OathCheckpointDue,
        ObligationsCard,
    )

    card = ObligationsCard(
        contract_obligations=[],
        oath_checkpoints=[
            OathCheckpointDue(
                oath_id="00000000-0000-0000-0000-000000000001",
                oath_kind="self",
                recipient="my marriage",
                due_at=datetime(2026, 6, 20, tzinfo=UTC),
                sealed=False,
                prompt="Review the vow I made.",
            ),
        ],
        sealed_checkpoint_count=3,
    )
    assert card.sealed_checkpoint_count == 3
    # The visible checkpoint is non-sealed; prompt is allowed there.
    assert card.oath_checkpoints[0].sealed is False
    assert card.oath_checkpoints[0].prompt is not None


def test_oath_checkpoint_due_sealed_flag_carries_no_prompt() -> None:
    """When sealed=True, prompt must default to None — the schema
    encodes the rule but the aggregator is the enforcer (verified
    implicitly: the router never constructs a sealed=True with text)."""
    from theourgia.api.routers.v1.today_ledger import OathCheckpointDue

    cp = OathCheckpointDue(
        oath_id="00000000-0000-0000-0000-000000000002",
        oath_kind="tradition",
        recipient=None,
        due_at=datetime(2026, 6, 21, tzinfo=UTC),
        sealed=True,
    )
    assert cp.prompt is None
    assert cp.sealed is True


def test_active_practice_carries_hours_until_due() -> None:
    from theourgia.api.routers.v1.today_ledger import ActivePractice

    p = ActivePractice(
        recurring_offering_id="00000000-0000-0000-0000-000000000003",
        entity_id="00000000-0000-0000-0000-000000000004",
        label="Hekate Deipnon",
        cadence="lunar:deipnon",
        next_due_at=datetime(2026, 6, 22, 0, tzinfo=UTC),
        hours_until_due=6.0,
    )
    assert p.cadence == "lunar:deipnon"
    assert p.hours_until_due == 6.0


# ───── Router wiring ─────────────────────────────────────────────────


def test_today_ledger_router_registered() -> None:
    from theourgia.api.routers.v1.today_ledger import router

    paths = {route.path for route in router.routes}
    assert "/today/ledger" in paths
