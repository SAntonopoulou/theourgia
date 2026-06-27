"""Schema-level + helper tests for the federation audit router (B140).

Append-only invariants:

  · No DELETE / PATCH handlers — verified via route inspection.
  · Time-range helper maps every valid window to a UTC floor.
  · CSV export hits the same query helper as the JSON listing —
    the forensic artefact uses the exact same filter set.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.routing import APIRoute

from theourgia.api.routers.v1.federation_audit import (
    _MAX_LIMIT,
    _time_floor,
    router,
)


def test_router_has_only_get_handlers() -> None:
    """Append-only invariant — the audit router NEVER mutates."""
    for route in router.routes:
        if isinstance(route, APIRoute):
            assert route.methods == {"GET"}, (
                f"{route.path} has non-GET methods: {route.methods}"
            )


def test_router_exposes_json_and_csv_endpoints() -> None:
    paths = {
        route.path for route in router.routes
        if isinstance(route, APIRoute)
    }
    assert "/hubs/{hub_id}/audit" in paths
    assert "/hubs/{hub_id}/audit.csv" in paths


def test_max_limit_is_operator_friendly() -> None:
    """500 is a reasonable page size; CSV uses an internal 10k
    cap (forensic completeness). Document the JSON page cap."""
    assert _MAX_LIMIT == 500


def test_time_floor_last_7_days() -> None:
    floor = _time_floor("last_7_days")
    assert floor is not None
    diff = datetime.now(tz=UTC) - floor
    assert timedelta(days=6, hours=23) <= diff <= timedelta(days=7, hours=1)


def test_time_floor_last_30_days() -> None:
    floor = _time_floor("last_30_days")
    assert floor is not None
    diff = datetime.now(tz=UTC) - floor
    assert timedelta(days=29, hours=23) <= diff <= timedelta(days=30, hours=1)


def test_time_floor_last_90_days() -> None:
    floor = _time_floor("last_90_days")
    assert floor is not None
    diff = datetime.now(tz=UTC) - floor
    assert timedelta(days=89, hours=23) <= diff <= timedelta(days=90, hours=1)


def test_time_floor_all_time_returns_none() -> None:
    """No floor — query selects every row in the hub's history."""
    assert _time_floor("all_time") is None
