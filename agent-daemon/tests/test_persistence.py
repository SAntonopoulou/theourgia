"""Run persistence — window math, round trips, restart survival.

The pure summary math and the in-memory implementation run without a
database; the DbRunPersistence tests use the ``daemon_engine`` fixture
and skip when THEOURGIA_AGENT_TEST_DATABASE_URL is unset.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.api.app import create_app
from theourgia_agent.api.routers.runs import (
    control_token_dependency,
    run_persistence_dependency,
    run_registry_dependency,
)
from theourgia_agent.models.agent_install import (
    AgentInstall,
    AgentInstallState,
)
from theourgia_agent.runs.persistence import (
    DbRunPersistence,
    InMemoryRunPersistence,
    InstallInfo,
    RunCostRow,
    build_summary,
    window_start,
)
from theourgia_agent.runs.repos import DbInstallRepo

NOW = datetime(2026, 7, 15, 14, 30, tzinfo=UTC)  # a Wednesday


# ── window math ───────────────────────────────────────────────────────


def test_window_start_day() -> None:
    assert window_start("day", NOW) == datetime(2026, 7, 15, tzinfo=UTC)


def test_window_start_week_is_monday_midnight() -> None:
    assert window_start("week", NOW) == datetime(2026, 7, 13, tzinfo=UTC)


def test_window_start_month() -> None:
    assert window_start("month", NOW) == datetime(2026, 7, 1, tzinfo=UTC)


def test_window_start_rejects_unknown() -> None:
    with pytest.raises(ValueError):
        window_start("year", NOW)


# ── summary math ──────────────────────────────────────────────────────


def _row(install: str, cost: str, days_ago: int = 0) -> RunCostRow:
    return RunCostRow(
        install_id=install,
        cost_usd=Decimal(cost),
        tokens_in=100,
        tokens_out=50,
        tokens_cache=10,
        tokens_fresh=80,
        tokens_resume=20,
        started_at=NOW - timedelta(days=days_ago),
    )


def test_build_summary_totals_and_per_install_grouping() -> None:
    rows = [_row("i1", "1.00"), _row("i1", "0.50"), _row("i2", "2.00")]
    summary = build_summary(
        vault_id="v1",
        window="month",
        start=window_start("month", NOW),
        rows=rows,
        month_rows=rows,
        installs={
            "i1": InstallInfo("i1", "Tutor", "study-tutor", Decimal("10")),
            "i2": InstallInfo("i2", "Aide", "ritual-aide", Decimal("4")),
        },
    )
    assert summary["totals"]["cost_usd"] == "3.50"
    assert summary["totals"]["run_count"] == 3
    assert summary["totals"]["tokens_in"] == 300
    assert summary["totals"]["tokens_fresh"] == 240
    # Sorted by cost desc: i2 ($2.00) before i1 ($1.50).
    per = summary["per_install"]
    assert [r["install_id"] for r in per] == ["i2", "i1"]
    assert per[0]["cap_used_pct"] == 50  # 2.00 of 4.00
    assert per[1]["cost_usd"] == "1.50"
    assert per[1]["run_count"] == 2
    assert per[1]["cap_used_pct"] == 15  # 1.50 of 10.00


def test_build_summary_cap_pct_uses_month_spend_not_window() -> None:
    """Rule 56: the cap is MONTHLY — a day window must not shrink the
    percentage."""
    today = [_row("i1", "0.10")]
    month = [_row("i1", "0.10"), _row("i1", "4.90", days_ago=10)]
    summary = build_summary(
        vault_id="v1",
        window="day",
        start=window_start("day", NOW),
        rows=today,
        month_rows=month,
        installs={
            "i1": InstallInfo("i1", "Tutor", "study-tutor", Decimal("10")),
        },
    )
    row = summary["per_install"][0]
    assert row["cost_usd"] == "0.10"  # window figure
    assert row["month_cost_usd"] == "5.00"
    assert row["cap_used_pct"] == 50  # month spend against the cap


def test_build_summary_unknown_install_falls_back_honestly() -> None:
    summary = build_summary(
        vault_id="v1",
        window="month",
        start=window_start("month", NOW),
        rows=[_row("mystery", "1.00")],
        month_rows=[_row("mystery", "1.00")],
        installs={},
    )
    row = summary["per_install"][0]
    assert row["display_name"] == "mystery"
    assert row["kind"] == "custom"
    assert row["cap_used_pct"] == 0  # no cap known → no percentage


# ── in-memory round trip ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_in_memory_round_trip() -> None:
    p = InMemoryRunPersistence()
    await p.record_start(
        run_key="run-1",
        install_id="i1",
        vault_id="v1",
        task_text="task",
        scope_id="default",
        reserved_usd=Decimal("0.70"),
        started_at=NOW,
    )
    run = await p.lookup("run-1")
    assert run is not None
    assert run.outcome == "running"
    assert run.reserved_usd == Decimal("0.70")

    await p.record_cost(
        "run-1",
        cost_usd=Decimal("0.30"),
        tokens_in=100,
        tokens_out=40,
        tokens_cache=5,
        tokens_fresh=90,
        tokens_resume=10,
    )
    await p.record_terminal("run-1", outcome="completed", ended_at=NOW)
    run = await p.lookup("run-1")
    assert run is not None
    assert run.outcome == "completed"
    assert run.cost_usd == Decimal("0.30")
    assert run.tokens_fresh == 90
    assert run.ended_at == NOW

    summary = await p.cost_summary(vault_id="v1", window="month", now=NOW)
    assert summary["totals"]["cost_usd"] == "0.30"
    assert summary["per_install"][0]["install_id"] == "i1"


@pytest.mark.asyncio
async def test_in_memory_summary_scopes_by_vault() -> None:
    p = InMemoryRunPersistence()
    for key, vault in (("r1", "v1"), ("r2", "v2")):
        await p.record_start(
            run_key=key,
            install_id=f"i-{vault}",
            vault_id=vault,
            task_text="t",
            scope_id="default",
            reserved_usd=Decimal("1"),
            started_at=NOW,
        )
        await p.record_cost(
            key,
            cost_usd=Decimal("1.00"),
            tokens_in=1,
            tokens_out=1,
            tokens_cache=0,
            tokens_fresh=1,
            tokens_resume=0,
        )
    summary = await p.cost_summary(vault_id="v1", window="month", now=NOW)
    assert summary["totals"]["run_count"] == 1
    assert summary["per_install"][0]["install_id"] == "i-v1"


# ── restart survival through the runs router ─────────────────────────


def _app_with(persistence, run_registry=None):
    app = create_app()
    app.dependency_overrides[control_token_dependency] = lambda: None
    app.dependency_overrides[run_persistence_dependency] = (
        lambda: persistence
    )
    if run_registry is not None:
        app.dependency_overrides[run_registry_dependency] = (
            lambda: run_registry
        )
    return app


@pytest.mark.asyncio
async def test_router_falls_back_to_persisted_run_after_restart() -> None:
    """A fresh router instance (empty in-memory registry — the daemon
    restarted) still serves the persisted run's accounting."""
    persistence = InMemoryRunPersistence()
    await persistence.record_start(
        run_key="run-42",
        install_id="i1",
        vault_id="v1",
        task_text="t",
        scope_id="default",
        reserved_usd=Decimal("0.55"),
        started_at=NOW,
    )
    await persistence.record_cost(
        "run-42",
        cost_usd=Decimal("0.20"),
        tokens_in=10,
        tokens_out=5,
        tokens_cache=0,
        tokens_fresh=10,
        tokens_resume=0,
    )
    client = TestClient(_app_with(persistence))
    snap = client.get("/runs/run-42")
    assert snap.status_code == 200
    body = snap.json()
    assert body["status"] == "running"
    assert body["reservation_usd"] == "0.55"
    assert body["cost"]["cost_usd"] == "0.20"
    assert body["session_token"] == ""  # the MCP session died with the process


@pytest.mark.asyncio
async def test_router_delete_marks_orphaned_running_run_halted() -> None:
    persistence = InMemoryRunPersistence()
    await persistence.record_start(
        run_key="run-43",
        install_id="i1",
        vault_id="v1",
        task_text="t",
        scope_id="default",
        reserved_usd=Decimal("0.55"),
        started_at=NOW,
    )
    client = TestClient(_app_with(persistence))
    response = client.delete("/runs/run-43")
    assert response.status_code == 200
    assert response.json()["status"] == "halted"
    run = await persistence.lookup("run-43")
    assert run is not None and run.outcome == "halted"


def test_router_unknown_run_still_404s() -> None:
    client = TestClient(_app_with(InMemoryRunPersistence()))
    assert client.get("/runs/never-existed").status_code == 404
    assert client.delete("/runs/never-existed").status_code == 404


# ── Postgres-backed persistence ──────────────────────────────────────


async def _make_install(engine: AsyncEngine, **overrides) -> AgentInstall:
    defaults: dict = dict(
        vault_id="vault-1",
        agent_id="example-agent",
        display_name="Example",
        kind="study-tutor",
        state=AgentInstallState.ACTIVE,
        monthly_cost_cap_usd=Decimal("10.00"),
    )
    defaults.update(overrides)
    return await DbInstallRepo(engine=engine).create(
        AgentInstall(**defaults)
    )


@pytest.mark.asyncio
async def test_db_persistence_round_trip_and_restart_survival(
    daemon_engine: AsyncEngine,
) -> None:
    install = await _make_install(daemon_engine)
    p1 = DbRunPersistence(engine=daemon_engine)
    await p1.record_start(
        run_key=str(install.id),
        install_id=str(install.id),
        vault_id="vault-1",
        task_text="review my synchronicities",
        scope_id="default",
        reserved_usd=Decimal("0.70"),
        started_at=datetime.now(tz=UTC),
    )
    await p1.record_cost(
        str(install.id),
        cost_usd=Decimal("0.25"),
        tokens_in=120,
        tokens_out=60,
        tokens_cache=0,
        tokens_fresh=100,
        tokens_resume=20,
    )

    # "Restart": a brand-new persistence instance (as a restarted
    # daemon's router would construct) sees the same accounting.
    p2 = DbRunPersistence(engine=daemon_engine)
    run = await p2.lookup(str(install.id))
    assert run is not None
    assert run.outcome == "running"
    assert run.reserved_usd == Decimal("0.7000")
    assert run.cost_usd == Decimal("0.2500")
    assert run.tokens_resume == 20

    await p2.record_terminal(str(install.id), outcome="completed")
    run = await p2.lookup(str(install.id))
    assert run is not None
    assert run.outcome == "completed"
    assert run.ended_at is not None


@pytest.mark.asyncio
async def test_db_persistence_rejects_unknown_install(
    daemon_engine: AsyncEngine,
) -> None:
    p = DbRunPersistence(engine=daemon_engine)
    with pytest.raises(ValueError):
        await p.record_start(
            run_key="not-a-uuid",
            install_id="not-a-uuid",
            vault_id="vault-1",
            task_text="t",
            scope_id="default",
            reserved_usd=Decimal("0.10"),
            started_at=datetime.now(tz=UTC),
        )
    with pytest.raises(ValueError):
        await p.record_start(
            run_key="00000000-0000-0000-0000-000000000001",
            install_id="00000000-0000-0000-0000-000000000001",
            vault_id="vault-1",
            task_text="t",
            scope_id="default",
            reserved_usd=Decimal("0.10"),
            started_at=datetime.now(tz=UTC),
        )


@pytest.mark.asyncio
async def test_db_persistence_router_fallback_after_restart(
    daemon_engine: AsyncEngine,
) -> None:
    """End-to-end restart survival: run recorded via the repo-backed
    persistence, then a NEW router instance (fresh app + empty run
    registry) serves its snapshot."""
    install = await _make_install(daemon_engine, agent_id="agent-b")
    p = DbRunPersistence(engine=daemon_engine)
    await p.record_start(
        run_key=str(install.id),
        install_id=str(install.id),
        vault_id="vault-1",
        task_text="t",
        scope_id="default",
        reserved_usd=Decimal("0.40"),
        started_at=datetime.now(tz=UTC),
    )
    app = _app_with(DbRunPersistence(engine=daemon_engine))
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://t",
    ) as client:
        snap = await client.get(f"/runs/{install.id}")
    assert snap.status_code == 200
    assert snap.json()["status"] == "running"
    assert snap.json()["reservation_usd"] == "0.4000"


@pytest.mark.asyncio
async def test_db_cost_summary_joins_install_metadata(
    daemon_engine: AsyncEngine,
) -> None:
    install = await _make_install(
        daemon_engine,
        agent_id="agent-c",
        display_name="Study tutor",
        kind="study-tutor",
        monthly_cost_cap_usd=Decimal("5.00"),
    )
    p = DbRunPersistence(engine=daemon_engine)
    await p.record_start(
        run_key=str(install.id),
        install_id=str(install.id),
        vault_id="vault-1",
        task_text="t",
        scope_id="default",
        reserved_usd=Decimal("1.00"),
        started_at=datetime.now(tz=UTC),
    )
    await p.record_cost(
        str(install.id),
        cost_usd=Decimal("2.50"),
        tokens_in=1000,
        tokens_out=400,
        tokens_cache=100,
        tokens_fresh=800,
        tokens_resume=600,
    )
    summary = await p.cost_summary(vault_id="vault-1", window="month")
    rows = [
        r
        for r in summary["per_install"]
        if r["install_id"] == str(install.id)
    ]
    assert len(rows) == 1
    row = rows[0]
    assert row["display_name"] == "Study tutor"
    assert row["kind"] == "study-tutor"
    assert Decimal(row["cost_usd"]) == Decimal("2.50")
    assert row["cap_used_pct"] == 50
    assert row["tokens_fresh"] == 800
    assert row["tokens_resume"] == 600
