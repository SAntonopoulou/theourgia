"""Integration tests for DbInstallRepo + DbRunRepo against a real PG."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.models.agent_install import (
    AgentInstall,
    AgentInstallState,
)
from theourgia_agent.models.run import AgentRun, RunOutcome
from theourgia_agent.runs.repos import DbInstallRepo, DbRunRepo


def _install(**overrides) -> AgentInstall:
    defaults: dict = dict(
        vault_id="vault-1",
        agent_id="example-agent",
        display_name="Example",
        kind="reviewer",
        state=AgentInstallState.INACTIVE,
        monthly_cost_cap_usd=Decimal("10.00"),
    )
    defaults.update(overrides)
    return AgentInstall(**defaults)


def _run(install_id, **overrides) -> AgentRun:
    defaults: dict = dict(
        install_id=install_id,
        task_text="task",
        scope_id="default",
        reserved_usd=Decimal("0.50"),
        cost_usd=Decimal("0.40"),
        outcome=RunOutcome.COMPLETED,
        started_at=datetime.now(tz=UTC),
    )
    defaults.update(overrides)
    return AgentRun(**defaults)


# ── DbInstallRepo ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_install_repo_create_get_round_trip(
    daemon_engine: AsyncEngine,
) -> None:
    repo = DbInstallRepo(engine=daemon_engine)
    created = await repo.create(_install())
    fetched = await repo.get(created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.kind == "reviewer"


@pytest.mark.asyncio
async def test_install_repo_get_by_vault_agent(
    daemon_engine: AsyncEngine,
) -> None:
    repo = DbInstallRepo(engine=daemon_engine)
    await repo.create(
        _install(vault_id="vault-1", agent_id="a"),
    )
    await repo.create(
        _install(vault_id="vault-1", agent_id="b"),
    )
    found = await repo.get_by_vault_agent(vault_id="vault-1", agent_id="b")
    assert found is not None
    assert found.agent_id == "b"


@pytest.mark.asyncio
async def test_install_repo_unique_vault_agent_constraint(
    daemon_engine: AsyncEngine,
) -> None:
    repo = DbInstallRepo(engine=daemon_engine)
    await repo.create(_install(vault_id="v", agent_id="dup"))
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError):
        await repo.create(_install(vault_id="v", agent_id="dup"))


@pytest.mark.asyncio
async def test_install_repo_list_by_vault(
    daemon_engine: AsyncEngine,
) -> None:
    repo = DbInstallRepo(engine=daemon_engine)
    await repo.create(_install(vault_id="v1", agent_id="a"))
    await repo.create(_install(vault_id="v1", agent_id="b"))
    await repo.create(_install(vault_id="v2", agent_id="a"))
    rows = await repo.list_by_vault("v1")
    assert len(rows) == 2


@pytest.mark.asyncio
async def test_install_repo_update_state(
    daemon_engine: AsyncEngine,
) -> None:
    repo = DbInstallRepo(engine=daemon_engine)
    install = await repo.create(_install())
    updated = await repo.update_state(
        install_id=install.id, state=AgentInstallState.ACTIVE,
    )
    assert updated is not None
    assert updated.state == AgentInstallState.ACTIVE


@pytest.mark.asyncio
async def test_install_repo_delete(daemon_engine: AsyncEngine) -> None:
    repo = DbInstallRepo(engine=daemon_engine)
    install = await repo.create(_install())
    assert await repo.delete(install.id) is True
    assert await repo.get(install.id) is None


# ── DbRunRepo ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_repo_create_and_get(daemon_engine: AsyncEngine) -> None:
    install_repo = DbInstallRepo(engine=daemon_engine)
    run_repo = DbRunRepo(engine=daemon_engine)
    install = await install_repo.create(_install())
    run = await run_repo.create(_run(install.id))
    fetched = await run_repo.get(run.id)
    assert fetched is not None


@pytest.mark.asyncio
async def test_run_repo_recent_costs_for_cap(
    daemon_engine: AsyncEngine,
) -> None:
    install_repo = DbInstallRepo(engine=daemon_engine)
    run_repo = DbRunRepo(engine=daemon_engine)
    install = await install_repo.create(_install())
    for cost in (Decimal("0.10"), Decimal("0.20"), Decimal("0.30")):
        await run_repo.create(
            _run(install.id, cost_usd=cost),
        )
    costs = await run_repo.recent_costs_for_cap(install.id, n=10)
    assert sorted(costs) == [Decimal("0.10"), Decimal("0.20"), Decimal("0.30")]


@pytest.mark.asyncio
async def test_run_repo_recent_costs_excludes_running(
    daemon_engine: AsyncEngine,
) -> None:
    install_repo = DbInstallRepo(engine=daemon_engine)
    run_repo = DbRunRepo(engine=daemon_engine)
    install = await install_repo.create(_install())
    await run_repo.create(
        _run(install.id, outcome=RunOutcome.COMPLETED, cost_usd=Decimal("1")),
    )
    await run_repo.create(
        _run(install.id, outcome=RunOutcome.RUNNING, cost_usd=Decimal("0")),
    )
    costs = await run_repo.recent_costs_for_cap(install.id)
    assert costs == [Decimal("1")]


@pytest.mark.asyncio
async def test_run_repo_month_spent_sums_current_month(
    daemon_engine: AsyncEngine,
) -> None:
    install_repo = DbInstallRepo(engine=daemon_engine)
    run_repo = DbRunRepo(engine=daemon_engine)
    install = await install_repo.create(_install())
    now = datetime(2026, 6, 15, 12, tzinfo=UTC)
    last_month = datetime(2026, 5, 20, 12, tzinfo=UTC)
    await run_repo.create(
        _run(install.id, cost_usd=Decimal("1.50"), started_at=now),
    )
    await run_repo.create(
        _run(install.id, cost_usd=Decimal("0.75"), started_at=last_month),
    )
    spent = await run_repo.month_spent(install.id, now=now)
    assert spent == Decimal("1.50")


@pytest.mark.asyncio
async def test_run_repo_month_spent_excludes_running(
    daemon_engine: AsyncEngine,
) -> None:
    install_repo = DbInstallRepo(engine=daemon_engine)
    run_repo = DbRunRepo(engine=daemon_engine)
    install = await install_repo.create(_install())
    now = datetime(2026, 6, 15, 12, tzinfo=UTC)
    await run_repo.create(
        _run(install.id, cost_usd=Decimal("2.00"), started_at=now),
    )
    await run_repo.create(
        _run(
            install.id,
            cost_usd=Decimal("99.99"),
            started_at=now,
            outcome=RunOutcome.RUNNING,
        ),
    )
    spent = await run_repo.month_spent(install.id, now=now)
    assert spent == Decimal("2.00")


@pytest.mark.asyncio
async def test_run_repo_list_by_install_newest_first(
    daemon_engine: AsyncEngine,
) -> None:
    install_repo = DbInstallRepo(engine=daemon_engine)
    run_repo = DbRunRepo(engine=daemon_engine)
    install = await install_repo.create(_install())
    await run_repo.create(
        _run(install.id, task_text="older",
             started_at=datetime(2026, 6, 1, tzinfo=UTC)),
    )
    await run_repo.create(
        _run(install.id, task_text="newer",
             started_at=datetime(2026, 6, 28, tzinfo=UTC)),
    )
    runs = await run_repo.list_by_install(install.id)
    assert runs[0].task_text == "newer"
    assert runs[1].task_text == "older"


@pytest.mark.asyncio
async def test_run_repo_mark_completed(daemon_engine: AsyncEngine) -> None:
    install_repo = DbInstallRepo(engine=daemon_engine)
    run_repo = DbRunRepo(engine=daemon_engine)
    install = await install_repo.create(_install())
    run = await run_repo.create(
        _run(install.id, outcome=RunOutcome.RUNNING, cost_usd=Decimal("0")),
    )
    completed = await run_repo.mark_completed(
        run_id=run.id,
        outcome=RunOutcome.COMPLETED,
        cost_usd=Decimal("1.50"),
        tokens_in=100,
        tokens_out=50,
        tokens_fresh=80,
        tokens_resume=20,
        summary="done",
    )
    assert completed is not None
    assert completed.outcome == RunOutcome.COMPLETED
    assert completed.cost_usd == Decimal("1.50")
    assert completed.tokens_in == 100
    assert completed.ended_at is not None
