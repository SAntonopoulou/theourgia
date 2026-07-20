"""GET /costs/summary — endpoint shape, windows, auth."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.runs import (
    control_token_dependency,
    run_persistence_dependency,
)
from theourgia_agent.runs.persistence import InMemoryRunPersistence


def _app(persistence, *, token=None):
    app = create_app()
    app.dependency_overrides[control_token_dependency] = lambda: token
    app.dependency_overrides[run_persistence_dependency] = (
        lambda: persistence
    )
    return app


async def _seed_run(
    persistence: InMemoryRunPersistence,
    *,
    run_key: str,
    install_id: str,
    vault_id: str = "vault-1",
    cost: str = "1.00",
    started_at: datetime | None = None,
) -> None:
    await persistence.record_start(
        run_key=run_key,
        install_id=install_id,
        vault_id=vault_id,
        task_text="t",
        scope_id="default",
        reserved_usd=Decimal("2.00"),
        started_at=started_at or datetime.now(tz=UTC),
    )
    await persistence.record_cost(
        run_key,
        cost_usd=Decimal(cost),
        tokens_in=100,
        tokens_out=50,
        tokens_cache=10,
        tokens_fresh=80,
        tokens_resume=20,
    )


@pytest.mark.asyncio
async def test_summary_returns_totals_and_per_install() -> None:
    persistence = InMemoryRunPersistence()
    await _seed_run(
        persistence, run_key="r1", install_id="i1", cost="1.25",
    )
    await _seed_run(
        persistence, run_key="r2", install_id="i2", cost="0.75",
    )
    client = TestClient(_app(persistence))
    response = client.get(
        "/costs/summary", params={"vault_id": "vault-1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["vault_id"] == "vault-1"
    assert body["window"] == "month"
    assert body["totals"]["cost_usd"] == "2.00"
    assert body["totals"]["run_count"] == 2
    assert body["totals"]["tokens_fresh"] == 160
    assert body["totals"]["tokens_resume"] == 40
    assert len(body["per_install"]) == 2
    # Sorted by cost desc.
    assert body["per_install"][0]["install_id"] == "i1"


@pytest.mark.asyncio
async def test_summary_day_window_excludes_older_runs() -> None:
    persistence = InMemoryRunPersistence()
    await _seed_run(
        persistence, run_key="today", install_id="i1", cost="0.50",
    )
    await _seed_run(
        persistence,
        run_key="last-week",
        install_id="i1",
        cost="3.00",
        started_at=datetime.now(tz=UTC) - timedelta(days=8),
    )
    client = TestClient(_app(persistence))
    body = client.get(
        "/costs/summary",
        params={"vault_id": "vault-1", "window": "day"},
    ).json()
    assert body["totals"]["cost_usd"] == "0.50"
    assert body["totals"]["run_count"] == 1


def test_summary_rejects_unknown_window() -> None:
    client = TestClient(_app(InMemoryRunPersistence()))
    response = client.get(
        "/costs/summary",
        params={"vault_id": "vault-1", "window": "fortnight"},
    )
    assert response.status_code == 422


def test_summary_requires_vault_id() -> None:
    client = TestClient(_app(InMemoryRunPersistence()))
    assert client.get("/costs/summary").status_code == 422


def test_summary_enforces_control_token() -> None:
    client = TestClient(
        _app(InMemoryRunPersistence(), token="secret-token"),
    )
    unauth = client.get(
        "/costs/summary", params={"vault_id": "vault-1"},
    )
    assert unauth.status_code == 401
    ok = client.get(
        "/costs/summary",
        params={"vault_id": "vault-1"},
        headers={"X-Daemon-Auth": "secret-token"},
    )
    assert ok.status_code == 200
