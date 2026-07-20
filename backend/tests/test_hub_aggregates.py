"""Cross-vault DP aggregates — v1-033 (Tier 3 #20).

Covers the batch that wired the b108-2hr differential-privacy
substrate to real hub-scoped data:

  · ``compute_hub_aggregate`` refuses a too-small cohort BEFORE any
    member data is queried (zero database reads on refusal).
  · Per-member counts zero-fill so the cohort size equals the opt-in
    count, and the noise scales match the documented sensitivities.
  · The query endpoint: contribute-to-see gating (403 when not opted
    in), ``cohort_too_small`` refusal (409 + DENIED audit row), and
    the honesty contract that every response carries value + epsilon
    + cohort_size + noise_scale.
  · Every query — allowed or refused — writes an audit_event row
    (FEATURES §9: logged and visible to contributors).

DB-less fake-session style per ``test_federation_wiring_v1.py``.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from theourgia.api.routers.v1.hub_aggregates import (
    AggregateQueryPayload,
    run_aggregate_query,
)
from theourgia.core.analytics.differential_privacy import CohortTooSmall
from theourgia.core.analytics.hub_aggregates import (
    ENTRY_CLIP_HIGH,
    HUB_AGGREGATE_METRICS,
    compute_hub_aggregate,
    member_entry_counts,
)
from theourgia.models.audit import AuditEvent, AuditOutcome

# ── Fakes ──────────────────────────────────────────────────────────


class _Result:
    def __init__(self, *, rows: list[Any] | None = None) -> None:
        self._rows = rows if rows is not None else []

    def scalars(self) -> _Result:
        return self

    def first(self) -> Any:
        return self._rows[0] if self._rows else None

    def all(self) -> list[Any]:
        return self._rows


class _FakeSession:
    def __init__(self, results: list[_Result] | None = None) -> None:
        self.results = list(results or [])
        self.added: list[Any] = []
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "path issued an unexpected query"
        return self.results.pop(0)

    def add(self, row: Any) -> None:
        self.added.append(row)

    async def commit(self) -> None:
        self.commits += 1

    async def flush(self) -> None:
        return None


class _NoQuerySession(_FakeSession):
    """A session that fails the test on ANY query."""

    async def execute(self, stmt: Any) -> _Result:
        raise AssertionError(
            "cohort refusal must not touch member data",
        )


# ── compute_hub_aggregate ──────────────────────────────────────────


async def test_small_cohort_refused_before_any_query() -> None:
    db = _NoQuerySession()
    with pytest.raises(CohortTooSmall):
        await compute_hub_aggregate(
            db,
            member_ids=[uuid4(), uuid4()],
            metric="entries_total",
            window_days=30,
            epsilon=1.0,
            min_cohort=5,
        )


async def test_unknown_metric_rejected() -> None:
    db = _NoQuerySession()
    with pytest.raises(ValueError, match="unknown hub aggregate metric"):
        await compute_hub_aggregate(
            db,
            member_ids=[uuid4() for _ in range(5)],
            metric="entries_by_name",
            window_days=30,
            epsilon=1.0,
            min_cohort=5,
        )


async def test_member_entry_counts_zero_fill() -> None:
    members = [uuid4(), uuid4(), uuid4()]
    db = _FakeSession([
        _Result(rows=[(members[0], 4)]),  # only one member journaled
    ])
    counts = await member_entry_counts(
        db,
        members,
        since=datetime(2026, 6, 1, tzinfo=UTC),
        until=datetime(2026, 7, 1, tzinfo=UTC),
    )
    assert counts == [4.0, 0.0, 0.0]


async def test_entries_total_noise_scale_and_cohort() -> None:
    members = [uuid4() for _ in range(5)]
    db = _FakeSession([
        _Result(rows=[(members[0], 3), (members[1], 900)]),
    ])
    aggregate = await compute_hub_aggregate(
        db,
        member_ids=members,
        metric="entries_total",
        window_days=30,
        epsilon=1.0,
        min_cohort=5,
    )
    assert aggregate.cohort_size == 5
    assert aggregate.epsilon == 1.0
    assert aggregate.noise_scale == pytest.approx(ENTRY_CLIP_HIGH / 1.0)
    # The 900-entry outlier was clipped to 50 BEFORE aggregation, so
    # the true sum is 53; Laplace(50) noise stays within +-b*20 with
    # probability 1 - e^-20.
    assert abs(aggregate.value - 53.0) < ENTRY_CLIP_HIGH * 20


async def test_entries_per_member_sensitivity_shrinks_with_cohort() -> None:
    members = [uuid4() for _ in range(10)]
    db = _FakeSession([_Result(rows=[(members[0], 10)])])
    aggregate = await compute_hub_aggregate(
        db,
        member_ids=members,
        metric="entries_per_member",
        window_days=30,
        epsilon=2.0,
        min_cohort=5,
    )
    assert aggregate.cohort_size == 10
    assert aggregate.noise_scale == pytest.approx(
        (ENTRY_CLIP_HIGH / 10) / 2.0,
    )


async def test_active_members_never_negative() -> None:
    members = [uuid4() for _ in range(5)]
    db = _FakeSession([_Result(rows=[])])  # nobody journaled
    aggregate = await compute_hub_aggregate(
        db,
        member_ids=members,
        metric="active_members",
        window_days=30,
        epsilon=1.0,
        min_cohort=5,
    )
    assert aggregate.value >= 0  # post-clip: counts cannot go negative
    assert aggregate.noise_scale == pytest.approx(1.0)


def test_metric_vocabulary() -> None:
    assert HUB_AGGREGATE_METRICS == (
        "entries_total",
        "entries_per_member",
        "active_members",
    )


# ── Payload schema ─────────────────────────────────────────────────


def test_payload_window_bounds() -> None:
    AggregateQueryPayload(metric="entries_total", window_days=365)
    with pytest.raises(ValidationError):
        AggregateQueryPayload(metric="entries_total", window_days=0)
    with pytest.raises(ValidationError):
        AggregateQueryPayload(metric="entries_total", window_days=366)


def test_payload_rejects_unknown_metric() -> None:
    with pytest.raises(ValidationError):
        AggregateQueryPayload(metric="entries_by_name")  # type: ignore[arg-type]


def test_payload_rejects_client_epsilon() -> None:
    """Epsilon is server-fixed — a client-supplied budget is refused
    (extra=forbid), so repeated querying cannot ratchet noise down."""
    with pytest.raises(ValidationError):
        AggregateQueryPayload(  # type: ignore[call-arg]
            metric="entries_total", epsilon=100.0,
        )


# ── Endpoint behavior ──────────────────────────────────────────────


def _hub() -> SimpleNamespace:
    return SimpleNamespace(id=uuid4())


def _user() -> SimpleNamespace:
    return SimpleNamespace(id=uuid4())


async def test_query_requires_opt_in() -> None:
    hub = _hub()
    db = _FakeSession([
        _Result(rows=[hub]),                 # hub
        _Result(rows=[SimpleNamespace()]),   # membership
        _Result(rows=[]),                    # NOT opted in
    ])
    with pytest.raises(HTTPException) as excinfo:
        await run_aggregate_query(
            hub.id,
            AggregateQueryPayload(metric="entries_total"),
            _user(),
            db,
        )
    assert excinfo.value.status_code == 403
    assert "opt in" in excinfo.value.detail


async def test_query_small_cohort_409_and_denied_audit() -> None:
    hub = _hub()
    cohort = [uuid4(), uuid4()]  # below the default minimum of 5
    db = _FakeSession([
        _Result(rows=[hub]),
        _Result(rows=[SimpleNamespace()]),
        _Result(rows=[SimpleNamespace()]),   # opted in
        _Result(rows=cohort),                # cohort ids
        # NO further results queued: member data must not be read.
    ])
    with pytest.raises(HTTPException) as excinfo:
        await run_aggregate_query(
            hub.id,
            AggregateQueryPayload(metric="entries_total"),
            _user(),
            db,
        )
    assert excinfo.value.status_code == 409
    assert excinfo.value.detail.startswith("cohort_too_small")

    events = [r for r in db.added if isinstance(r, AuditEvent)]
    assert len(events) == 1
    assert events[0].action == "hub.aggregate.query"
    assert events[0].outcome is AuditOutcome.DENIED
    assert events[0].hub_id == hub.id
    assert db.commits == 1  # the refusal is persisted to the log


async def test_query_success_surfaces_full_noise_contract() -> None:
    hub = _hub()
    user = _user()
    cohort = [uuid4() for _ in range(5)]
    db = _FakeSession([
        _Result(rows=[hub]),
        _Result(rows=[SimpleNamespace()]),
        _Result(rows=[SimpleNamespace()]),           # opted in
        _Result(rows=cohort),                        # cohort ids
        _Result(rows=[(cohort[0], 2), (cohort[1], 7)]),  # entry counts
    ])
    result = await run_aggregate_query(
        hub.id,
        AggregateQueryPayload(metric="active_members", window_days=30),
        user,
        db,
    )
    # The honesty contract: all four NoisyAggregate fields surface.
    assert result.metric == "active_members"
    assert result.cohort_size == 5
    assert result.epsilon == 1.0
    assert result.noise_scale == pytest.approx(1.0)
    assert result.value >= 0

    events = [r for r in db.added if isinstance(r, AuditEvent)]
    assert len(events) == 1
    assert events[0].outcome is AuditOutcome.SUCCESS
    assert events[0].actor_id == user.id
    assert events[0].detail["metric"] == "active_members"
    assert events[0].detail["cohort_size"] == 5
    assert db.commits == 1
