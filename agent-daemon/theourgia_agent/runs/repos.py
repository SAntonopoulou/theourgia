"""Postgres repositories for AgentInstall + AgentRun.

The runtime hot path (subprocess + MCP) stays in-memory; these
repositories handle the persistence layer that survives daemon restart
+ feeds the cost-cap evaluator's monthly rollup.

Shapes:
  · DbInstallRepo  — CRUD on agent_install rows
  · DbRunRepo      — CRUD on agent_run rows + cost-cap query helpers
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)

from theourgia_agent.models.agent_install import (
    AgentInstall,
    AgentInstallState,
)
from theourgia_agent.models.run import AgentRun, RunOutcome


__all__ = ["DbInstallRepo", "DbRunRepo"]


@dataclass(slots=True)
class DbInstallRepo:
    """CRUD on agent_install. Constructed once with the daemon's engine."""

    engine: AsyncEngine

    @property
    def _sessionmaker(self) -> async_sessionmaker[AsyncSession]:
        return async_sessionmaker(bind=self.engine, expire_on_commit=False)

    async def create(self, install: AgentInstall) -> AgentInstall:
        async with self._sessionmaker() as session:
            session.add(install)
            await session.commit()
            await session.refresh(install)
            return install

    async def get(self, install_id: UUID) -> AgentInstall | None:
        async with self._sessionmaker() as session:
            return await session.get(AgentInstall, install_id)

    async def get_by_vault_agent(
        self, *, vault_id: str, agent_id: str,
    ) -> AgentInstall | None:
        stmt = select(AgentInstall).where(
            AgentInstall.vault_id == vault_id,
            AgentInstall.agent_id == agent_id,
        )
        async with self._sessionmaker() as session:
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def list_by_vault(self, vault_id: str) -> list[AgentInstall]:
        stmt = (
            select(AgentInstall)
            .where(AgentInstall.vault_id == vault_id)
            .order_by(AgentInstall.created_at)
        )
        async with self._sessionmaker() as session:
            result = await session.execute(stmt)
            return list(result.scalars().all())

    async def update_state(
        self, *, install_id: UUID, state: AgentInstallState,
    ) -> AgentInstall | None:
        async with self._sessionmaker() as session:
            install = await session.get(AgentInstall, install_id)
            if install is None:
                return None
            install.state = state
            await session.commit()
            await session.refresh(install)
            return install

    async def delete(self, install_id: UUID) -> bool:
        """Hard delete. Use with care — agent_run rows cascade per FK."""
        async with self._sessionmaker() as session:
            install = await session.get(AgentInstall, install_id)
            if install is None:
                return False
            await session.delete(install)
            await session.commit()
            return True


@dataclass(slots=True)
class DbRunRepo:
    """CRUD on agent_run + cost-cap query helpers."""

    engine: AsyncEngine

    @property
    def _sessionmaker(self) -> async_sessionmaker[AsyncSession]:
        return async_sessionmaker(bind=self.engine, expire_on_commit=False)

    async def create(self, run: AgentRun) -> AgentRun:
        async with self._sessionmaker() as session:
            session.add(run)
            await session.commit()
            await session.refresh(run)
            return run

    async def get(self, run_id: UUID) -> AgentRun | None:
        async with self._sessionmaker() as session:
            return await session.get(AgentRun, run_id)

    async def list_by_install(
        self, install_id: UUID, *, limit: int = 50,
    ) -> list[AgentRun]:
        stmt = (
            select(AgentRun)
            .where(AgentRun.install_id == install_id)
            .order_by(desc(AgentRun.started_at))
            .limit(limit)
        )
        async with self._sessionmaker() as session:
            result = await session.execute(stmt)
            return list(result.scalars().all())

    async def recent_costs_for_cap(
        self, install_id: UUID, *, n: int = 10,
    ) -> list[Decimal]:
        """The last-N completed-or-errored runs' actual cost — feeds
        the cost-cap estimator. Excludes RUNNING runs (no actual yet)."""
        stmt = (
            select(AgentRun.cost_usd)
            .where(
                AgentRun.install_id == install_id,
                AgentRun.outcome != RunOutcome.RUNNING,
            )
            .order_by(desc(AgentRun.started_at))
            .limit(n)
        )
        async with self._sessionmaker() as session:
            result = await session.execute(stmt)
            return list(result.scalars().all())

    async def month_spent(
        self, install_id: UUID, *, now: datetime | None = None,
    ) -> Decimal:
        """Total spend this calendar month for the install.

        The cost cap is "monthly" — first-of-month to now. Excludes
        RUNNING runs (reservation, not actual)."""
        anchor = now or datetime.now(tz=UTC)
        month_start = anchor.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0,
        )
        stmt = select(func.coalesce(func.sum(AgentRun.cost_usd), 0)).where(
            AgentRun.install_id == install_id,
            AgentRun.outcome != RunOutcome.RUNNING,
            AgentRun.started_at >= month_start,
        )
        async with self._sessionmaker() as session:
            result = await session.execute(stmt)
            total = result.scalar_one()
            return Decimal(str(total))

    async def mark_completed(
        self,
        *,
        run_id: UUID,
        outcome: RunOutcome,
        cost_usd: Decimal,
        tokens_in: int = 0,
        tokens_out: int = 0,
        tokens_cache: int = 0,
        tokens_fresh: int = 0,
        tokens_resume: int = 0,
        summary: str | None = None,
    ) -> AgentRun | None:
        async with self._sessionmaker() as session:
            run = await session.get(AgentRun, run_id)
            if run is None:
                return None
            run.outcome = outcome
            run.cost_usd = cost_usd
            run.tokens_in = tokens_in
            run.tokens_out = tokens_out
            run.tokens_cache = tokens_cache
            run.tokens_fresh = tokens_fresh
            run.tokens_resume = tokens_resume
            run.summary = summary
            run.ended_at = datetime.now(tz=UTC)
            await session.commit()
            await session.refresh(run)
            return run
