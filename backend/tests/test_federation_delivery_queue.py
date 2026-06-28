"""Delivery queue tests — backoff schedule + enum stability."""

from __future__ import annotations

from datetime import timedelta

from theourgia.core.federation.delivery_queue import (
    BACKOFF_SCHEDULE_SECONDS,
    next_attempt_after,
)
from theourgia.models.federation_delivery import (
    FederationDeliveryStatus,
)


def test_backoff_schedule_is_monotonically_increasing() -> None:
    """The schedule should be ascending so retries don't accidentally
    fire faster than the previous attempt."""
    for prev, nxt in zip(
        BACKOFF_SCHEDULE_SECONDS, BACKOFF_SCHEDULE_SECONDS[1:],
    ):
        assert nxt > prev


def test_backoff_schedule_matches_documentation() -> None:
    """60s · 5m · 30m · 2h · 12h · 24h — pinned to keep operator
    expectations stable."""
    assert BACKOFF_SCHEDULE_SECONDS == (60, 300, 1800, 7200, 43200, 86400)


def test_next_attempt_after_returns_first_step_for_zero_attempts() -> None:
    """attempt_count=0 → no prior attempts → use the FIRST bucket
    (which is the delay BEFORE the second attempt; the very first
    enqueue uses now() for the initial attempt)."""
    assert next_attempt_after(0) == timedelta(seconds=60)


def test_next_attempt_after_indexes_into_schedule() -> None:
    assert next_attempt_after(1) == timedelta(seconds=300)
    assert next_attempt_after(2) == timedelta(seconds=1800)


def test_next_attempt_after_clamps_at_last_bucket() -> None:
    """attempt_count past the schedule length stays at the final
    bucket (24h between attempts) — never gets faster, never returns
    a negative timedelta."""
    assert next_attempt_after(99) == timedelta(seconds=86400)


def test_federation_delivery_status_enum_wire_keys() -> None:
    """The three status strings are persisted to DB and read by
    operator dashboards — pinning prevents accidental rename."""
    assert {s.value for s in FederationDeliveryStatus} == {
        "pending", "delivered", "dead",
    }


def test_delivery_task_module_imports() -> None:
    """Smoke: the Celery task module loads cleanly (catches
    decorator + import-time errors)."""
    import theourgia.core.tasks.federation_delivery as mod  # noqa: F401

    assert hasattr(mod, "run_drain_federation_delivery")
    assert hasattr(mod, "drain_federation_delivery")


def test_beat_schedule_registers_drain_task() -> None:
    """The beat schedule has the drain entry so the worker actually
    runs in production."""
    from theourgia.core.tasks.app import celery_app

    schedule = celery_app.conf.beat_schedule
    assert "theourgia.federation.drain_delivery" in schedule
    entry = schedule["theourgia.federation.drain_delivery"]
    assert entry["task"].endswith("run_drain_federation_delivery")
