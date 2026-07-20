"""Run persistence — restart-surviving run accounting (v1-031).

Replaces the runs router's in-memory reservation map. Every run write
(start, cost totals, terminal outcome) goes through a
:class:`RunPersistence`; the DB implementation writes agent_run rows
via the existing repos so a daemon restart loses at most the cost
samples since the last report, never the run itself.

Two implementations:

  · :class:`DbRunPersistence` — production. Composes
    :class:`~theourgia_agent.runs.repos.DbRunRepo` +
    :class:`~theourgia_agent.runs.repos.DbInstallRepo`; rows keyed by
    the control-plane ``run_key`` (alembic 0003).
  · :class:`InMemoryRunPersistence` — tests + keyless dev. Same
    protocol, dict-backed, gone at process exit.

The cost-summary math (`window_start` + `build_summary`) is pure so
the day/week/month arithmetic is unit-testable without a database.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any, Protocol
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncEngine

from theourgia_agent.models.run import AgentRun, RunOutcome
from theourgia_agent.runs.repos import DbInstallRepo, DbRunRepo


__all__ = [
    "PersistedRun",
    "RunCostRow",
    "InstallInfo",
    "RunPersistence",
    "InMemoryRunPersistence",
    "DbRunPersistence",
    "window_start",
    "build_summary",
    "SUMMARY_WINDOWS",
]


SUMMARY_WINDOWS = ("day", "week", "month")


# ── shapes ────────────────────────────────────────────────────────────


@dataclass(slots=True, frozen=True)
class PersistedRun:
    """What GET /runs/{id} can reconstruct after a daemon restart."""

    run_key: str
    install_id: str
    outcome: str
    reserved_usd: Decimal
    cost_usd: Decimal
    tokens_in: int
    tokens_out: int
    tokens_cache: int
    tokens_fresh: int
    tokens_resume: int
    started_at: datetime
    ended_at: datetime | None


@dataclass(slots=True, frozen=True)
class RunCostRow:
    """Aggregation input for the cost summary — storage-agnostic."""

    install_id: str
    cost_usd: Decimal
    tokens_in: int
    tokens_out: int
    tokens_cache: int
    tokens_fresh: int
    tokens_resume: int
    started_at: datetime


@dataclass(slots=True, frozen=True)
class InstallInfo:
    """Display metadata joined onto per-install summary rows."""

    install_id: str
    display_name: str
    kind: str
    monthly_cap_usd: Decimal


class RunPersistence(Protocol):
    """The runs router's write-through + restart-recovery surface."""

    async def record_start(
        self,
        *,
        run_key: str,
        install_id: str,
        vault_id: str,
        task_text: str,
        scope_id: str,
        reserved_usd: Decimal,
        started_at: datetime,
    ) -> None: ...

    async def lookup(self, run_key: str) -> PersistedRun | None: ...

    async def record_cost(
        self,
        run_key: str,
        *,
        cost_usd: Decimal,
        tokens_in: int,
        tokens_out: int,
        tokens_cache: int,
        tokens_fresh: int,
        tokens_resume: int,
    ) -> None: ...

    async def record_terminal(
        self,
        run_key: str,
        *,
        outcome: str,
        ended_at: datetime | None = None,
    ) -> None: ...

    async def cost_summary(
        self,
        *,
        vault_id: str,
        window: str,
        now: datetime | None = None,
    ) -> dict[str, Any]: ...


# ── pure summary math ────────────────────────────────────────────────


def window_start(window: str, now: datetime) -> datetime:
    """UTC start of the requested window.

    day → today's midnight · week → Monday's midnight (ISO week) ·
    month → first of the month, midnight.
    """
    if window not in SUMMARY_WINDOWS:
        msg = f"unknown window {window!r} (expected one of {SUMMARY_WINDOWS})"
        raise ValueError(msg)
    midnight = now.astimezone(UTC).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    if window == "day":
        return midnight
    if window == "week":
        return midnight - timedelta(days=midnight.weekday())
    return midnight.replace(day=1)


def _zero_bucket() -> dict[str, Any]:
    return {
        "cost_usd": Decimal("0"),
        "tokens_in": 0,
        "tokens_out": 0,
        "tokens_cache": 0,
        "tokens_fresh": 0,
        "tokens_resume": 0,
        "run_count": 0,
    }


def _accumulate(bucket: dict[str, Any], row: RunCostRow) -> None:
    bucket["cost_usd"] += row.cost_usd
    bucket["tokens_in"] += row.tokens_in
    bucket["tokens_out"] += row.tokens_out
    bucket["tokens_cache"] += row.tokens_cache
    bucket["tokens_fresh"] += row.tokens_fresh
    bucket["tokens_resume"] += row.tokens_resume
    bucket["run_count"] += 1


def build_summary(
    *,
    vault_id: str,
    window: str,
    start: datetime,
    rows: Iterable[RunCostRow],
    month_rows: Iterable[RunCostRow],
    installs: Mapping[str, InstallInfo],
) -> dict[str, Any]:
    """Assemble the GET /costs/summary wire payload.

    ``rows`` are the runs inside the requested window; ``month_rows``
    are this calendar month's runs regardless of window — the cap chip
    is always month-spend against the MONTHLY cap (rule 56), so a
    day/week window must not shrink the percentage.
    """
    totals = _zero_bucket()
    per_install: dict[str, dict[str, Any]] = {}
    for row in rows:
        _accumulate(totals, row)
        bucket = per_install.setdefault(row.install_id, _zero_bucket())
        _accumulate(bucket, row)

    month_cost: dict[str, Decimal] = {}
    for row in month_rows:
        month_cost[row.install_id] = (
            month_cost.get(row.install_id, Decimal("0")) + row.cost_usd
        )

    def install_row(install_id: str, bucket: dict[str, Any]) -> dict[str, Any]:
        info = installs.get(install_id) or InstallInfo(
            install_id=install_id,
            display_name=install_id,
            kind="custom",
            monthly_cap_usd=Decimal("0"),
        )
        spent = month_cost.get(install_id, Decimal("0"))
        cap = info.monthly_cap_usd
        pct = int(round(spent / cap * 100)) if cap > 0 else 0
        return {
            "install_id": install_id,
            "display_name": info.display_name,
            "kind": info.kind,
            "cost_usd": str(bucket["cost_usd"]),
            "tokens_in": bucket["tokens_in"],
            "tokens_out": bucket["tokens_out"],
            "tokens_cache": bucket["tokens_cache"],
            "tokens_fresh": bucket["tokens_fresh"],
            "tokens_resume": bucket["tokens_resume"],
            "run_count": bucket["run_count"],
            "monthly_cap_usd": str(cap),
            "month_cost_usd": str(spent),
            "cap_used_pct": pct,
        }

    rows_out = [
        install_row(install_id, bucket)
        for install_id, bucket in per_install.items()
    ]
    rows_out.sort(
        key=lambda r: (-Decimal(r["cost_usd"]), r["display_name"]),
    )

    return {
        "vault_id": vault_id,
        "window": window,
        "window_start": start.isoformat(),
        "totals": {
            "cost_usd": str(totals["cost_usd"]),
            "tokens_in": totals["tokens_in"],
            "tokens_out": totals["tokens_out"],
            "tokens_cache": totals["tokens_cache"],
            "tokens_fresh": totals["tokens_fresh"],
            "tokens_resume": totals["tokens_resume"],
            "run_count": totals["run_count"],
        },
        "per_install": rows_out,
    }


# ── in-memory implementation (tests + keyless dev) ───────────────────


@dataclass(slots=True)
class _MemRun:
    persisted: PersistedRun
    vault_id: str


@dataclass(slots=True)
class InMemoryRunPersistence:
    """Dict-backed :class:`RunPersistence`. Survives router re-creation
    (the process-wide dependency holds one instance) but not process
    restart — production uses :class:`DbRunPersistence`."""

    _by_key: dict[str, _MemRun] = field(default_factory=dict)

    async def record_start(
        self,
        *,
        run_key: str,
        install_id: str,
        vault_id: str,
        task_text: str,  # noqa: ARG002 — parity with the DB row shape
        scope_id: str,  # noqa: ARG002
        reserved_usd: Decimal,
        started_at: datetime,
    ) -> None:
        self._by_key[run_key] = _MemRun(
            persisted=PersistedRun(
                run_key=run_key,
                install_id=install_id,
                outcome=RunOutcome.RUNNING.value,
                reserved_usd=reserved_usd,
                cost_usd=Decimal("0"),
                tokens_in=0,
                tokens_out=0,
                tokens_cache=0,
                tokens_fresh=0,
                tokens_resume=0,
                started_at=started_at,
                ended_at=None,
            ),
            vault_id=vault_id,
        )

    async def lookup(self, run_key: str) -> PersistedRun | None:
        mem = self._by_key.get(run_key)
        return mem.persisted if mem is not None else None

    async def record_cost(
        self,
        run_key: str,
        *,
        cost_usd: Decimal,
        tokens_in: int,
        tokens_out: int,
        tokens_cache: int,
        tokens_fresh: int,
        tokens_resume: int,
    ) -> None:
        mem = self._by_key.get(run_key)
        if mem is None:
            return
        mem.persisted = replace(
            mem.persisted,
            cost_usd=cost_usd,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            tokens_cache=tokens_cache,
            tokens_fresh=tokens_fresh,
            tokens_resume=tokens_resume,
        )

    async def record_terminal(
        self,
        run_key: str,
        *,
        outcome: str,
        ended_at: datetime | None = None,
    ) -> None:
        mem = self._by_key.get(run_key)
        if mem is None:
            return
        mem.persisted = replace(
            mem.persisted,
            outcome=outcome,
            ended_at=ended_at or datetime.now(tz=UTC),
        )

    async def cost_summary(
        self,
        *,
        vault_id: str,
        window: str,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        anchor = now or datetime.now(tz=UTC)
        start = window_start(window, anchor)
        month = window_start("month", anchor)

        def to_row(p: PersistedRun) -> RunCostRow:
            return RunCostRow(
                install_id=p.install_id,
                cost_usd=p.cost_usd,
                tokens_in=p.tokens_in,
                tokens_out=p.tokens_out,
                tokens_cache=p.tokens_cache,
                tokens_fresh=p.tokens_fresh,
                tokens_resume=p.tokens_resume,
                started_at=p.started_at,
            )

        vault_runs = [
            m.persisted
            for m in self._by_key.values()
            if m.vault_id == vault_id
        ]
        return build_summary(
            vault_id=vault_id,
            window=window,
            start=start,
            rows=[to_row(p) for p in vault_runs if p.started_at >= start],
            month_rows=[
                to_row(p) for p in vault_runs if p.started_at >= month
            ],
            # No install metadata in-memory; build_summary falls back
            # to install-id display rows.
            installs={},
        )


# ── database implementation (production) ─────────────────────────────


def _persisted_from_row(row: AgentRun) -> PersistedRun:
    return PersistedRun(
        run_key=row.run_key or str(row.id),
        install_id=str(row.install_id),
        outcome=row.outcome.value,
        reserved_usd=row.reserved_usd,
        cost_usd=row.cost_usd,
        tokens_in=row.tokens_in,
        tokens_out=row.tokens_out,
        tokens_cache=row.tokens_cache,
        tokens_fresh=row.tokens_fresh,
        tokens_resume=row.tokens_resume,
        started_at=row.started_at,
        ended_at=row.ended_at,
    )


@dataclass(slots=True)
class DbRunPersistence:
    """Production :class:`RunPersistence`, composed from the repos."""

    engine: AsyncEngine

    def _run_repo(self) -> DbRunRepo:
        return DbRunRepo(engine=self.engine)

    def _install_repo(self) -> DbInstallRepo:
        return DbInstallRepo(engine=self.engine)

    async def record_start(
        self,
        *,
        run_key: str,
        install_id: str,
        vault_id: str,  # noqa: ARG002 — the install join is authoritative
        task_text: str,
        scope_id: str,
        reserved_usd: Decimal,
        started_at: datetime,
    ) -> None:
        try:
            install_uuid = UUID(install_id)
        except ValueError as exc:
            msg = (
                f"install_id {install_id!r} is not a daemon install id "
                "(runs persist against agent_install rows)"
            )
            raise ValueError(msg) from exc
        install = await self._install_repo().get(install_uuid)
        if install is None:
            msg = f"unknown install {install_id!r} — create the install first"
            raise ValueError(msg)
        await self._run_repo().create(
            AgentRun(
                install_id=install_uuid,
                run_key=run_key,
                task_text=task_text,
                scope_id=scope_id,
                reserved_usd=reserved_usd,
                outcome=RunOutcome.RUNNING,
                started_at=started_at,
            ),
        )

    async def lookup(self, run_key: str) -> PersistedRun | None:
        row = await self._run_repo().get_by_run_key(run_key)
        return _persisted_from_row(row) if row is not None else None

    async def record_cost(
        self,
        run_key: str,
        *,
        cost_usd: Decimal,
        tokens_in: int,
        tokens_out: int,
        tokens_cache: int,
        tokens_fresh: int,
        tokens_resume: int,
    ) -> None:
        await self._run_repo().update_totals_by_run_key(
            run_key,
            cost_usd=cost_usd,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            tokens_cache=tokens_cache,
            tokens_fresh=tokens_fresh,
            tokens_resume=tokens_resume,
        )

    async def record_terminal(
        self,
        run_key: str,
        *,
        outcome: str,
        ended_at: datetime | None = None,
    ) -> None:
        await self._run_repo().mark_terminal_by_run_key(
            run_key,
            outcome=RunOutcome(outcome),
            ended_at=ended_at,
        )

    async def cost_summary(
        self,
        *,
        vault_id: str,
        window: str,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        anchor = now or datetime.now(tz=UTC)
        start = window_start(window, anchor)
        month = window_start("month", anchor)
        # One fetch at month scope covers both aggregations: every
        # summary window starts at or after the month boundary.
        pairs = await self._run_repo().summarise_window(
            vault_id=vault_id, window_start=month,
        )

        def to_row(run: AgentRun) -> RunCostRow:
            return RunCostRow(
                install_id=str(run.install_id),
                cost_usd=run.cost_usd,
                tokens_in=run.tokens_in,
                tokens_out=run.tokens_out,
                tokens_cache=run.tokens_cache,
                tokens_fresh=run.tokens_fresh,
                tokens_resume=run.tokens_resume,
                started_at=run.started_at,
            )

        installs: dict[str, InstallInfo] = {}
        month_rows: list[RunCostRow] = []
        for run, install in pairs:
            installs[str(install.id)] = InstallInfo(
                install_id=str(install.id),
                display_name=install.display_name,
                kind=install.kind,
                monthly_cap_usd=install.monthly_cost_cap_usd,
            )
            month_rows.append(to_row(run))
        window_rows = [
            r
            for r in month_rows
            if _as_utc(r.started_at) >= start
        ]
        return build_summary(
            vault_id=vault_id,
            window=window,
            start=start,
            rows=window_rows,
            month_rows=month_rows,
            installs=installs,
        )


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
