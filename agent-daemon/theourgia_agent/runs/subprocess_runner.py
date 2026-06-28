"""Spawn + supervise the claude subprocess for an agent run.

The launcher (`runs/launcher.py`) produces a LaunchPlan; this module
consumes it and runs the process. Transcript chunks flow into an
asyncio.Queue that the SSE control-plane stream reads.

Subprocess spawn is hidden behind :class:`SubprocessSpawner` so tests
can inject a fake that emits scripted output without actually fork()ing.

Termination semantics:

  * `terminate()` sends SIGTERM, waits up to `terminate_grace_s`, then
    SIGKILL.
  * Subprocess exit (any reason) closes the transcript queue with a
    sentinel `None`, which signals end-of-stream to readers.
  * The MCP session is dropped from the registry on exit, regardless
    of outcome.
"""

from __future__ import annotations

import asyncio
import enum
import signal
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from typing import Protocol

from theourgia_agent.mcp.sessions import MCPSessionRegistry
from theourgia_agent.models.audit import AuditEventType
from theourgia_agent.runs.audit import (
    AuditRecord,
    AuditSink,
    NullAuditSink,
    now as audit_now,
)
from theourgia_agent.runs.cost import CostAccumulator
from theourgia_agent.runs.launcher import LaunchPlan


__all__ = [
    "RunStatus",
    "TranscriptChunk",
    "TranscriptStream",
    "SubprocessSpawner",
    "AsyncioSubprocessSpawner",
    "SpawnedProcess",
    "RunHandle",
    "RunRegistry",
    "execute_run",
]


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    HALTED = "halted"
    ERRORED = "errored"


@dataclass(slots=True, frozen=True)
class TranscriptChunk:
    """One stdout/stderr line + its timestamp, as the SSE stream sees it."""

    timestamp: datetime
    stream: str
    """Either 'stdout' or 'stderr'."""
    text: str


class SpawnedProcess(Protocol):
    """The subset of asyncio.subprocess.Process the runner uses.

    Tests provide a fake that produces scripted stdout/stderr and exits
    with the desired returncode. Production uses asyncio's real handle.
    """

    @property
    def stdout(self) -> asyncio.StreamReader | None: ...
    @property
    def stderr(self) -> asyncio.StreamReader | None: ...
    @property
    def returncode(self) -> int | None: ...
    def send_signal(self, sig: int) -> None: ...
    async def wait(self) -> int: ...


class SubprocessSpawner(Protocol):
    """Pluggable subprocess factory. Hides asyncio.create_subprocess_exec
    so the runner can be unit-tested without fork()."""

    async def spawn(
        self,
        *,
        command: list[str],
        env: dict[str, str],
        cwd: str,
    ) -> SpawnedProcess: ...


@dataclass(slots=True)
class AsyncioSubprocessSpawner:
    """Production spawner backed by asyncio.subprocess."""

    async def spawn(
        self,
        *,
        command: list[str],
        env: dict[str, str],
        cwd: str,
    ) -> SpawnedProcess:
        proc = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
            cwd=cwd,
        )
        return proc  # type: ignore[return-value]


@dataclass(slots=True)
class TranscriptStream:
    """Bounded queue of transcript chunks + an end sentinel.

    Readers iterate via `aiter()`; writers (`write`) push chunks. The
    `close()` method enqueues None, which terminates the iterator.

    Bounded so a stuck reader can't OOM the daemon. Buffer is large
    enough for typical run output without forcing the runner to block
    on every line.
    """

    maxsize: int = 1024
    _q: asyncio.Queue = field(default=None, init=False)  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self._q = asyncio.Queue(maxsize=self.maxsize)

    async def write(self, chunk: TranscriptChunk) -> None:
        await self._q.put(chunk)

    async def close(self) -> None:
        await self._q.put(None)

    async def aiter(self) -> AsyncIterator[TranscriptChunk]:
        while True:
            item = await self._q.get()
            if item is None:
                return
            yield item


@dataclass(slots=True)
class RunHandle:
    """The control plane's grip on a running agent."""

    run_id: str
    session_token: str
    status: RunStatus
    transcript: TranscriptStream
    started_at: datetime
    cost: CostAccumulator = field(
        default_factory=lambda: CostAccumulator(
            reservation_usd=Decimal("0"),
        ),
    )
    ended_at: datetime | None = None
    returncode: int | None = None
    _task: asyncio.Task | None = None
    _process: SpawnedProcess | None = None

    async def terminate(self, *, grace_seconds: float = 5.0) -> None:
        """SIGTERM, wait, then SIGKILL if needed."""
        if self._process is None or self._process.returncode is not None:
            return
        try:
            self._process.send_signal(signal.SIGTERM)
        except ProcessLookupError:
            return
        try:
            await asyncio.wait_for(
                self._process.wait(), timeout=grace_seconds,
            )
        except asyncio.TimeoutError:
            try:
                self._process.send_signal(signal.SIGKILL)
            except ProcessLookupError:
                pass


@dataclass(slots=True)
class RunRegistry:
    """run_id → RunHandle, for the control plane's GET/DELETE routes."""

    _by_id: dict[str, RunHandle] = field(default_factory=dict)

    def register(self, handle: RunHandle) -> None:
        self._by_id[handle.run_id] = handle

    def lookup(self, run_id: str) -> RunHandle | None:
        return self._by_id.get(run_id)

    def drop(self, run_id: str) -> None:
        self._by_id.pop(run_id, None)

    def __len__(self) -> int:
        return len(self._by_id)


async def _pump(
    reader: asyncio.StreamReader,
    *,
    stream_name: str,
    transcript: TranscriptStream,
) -> None:
    """Forward one of (stdout, stderr) line-by-line into the transcript."""
    while True:
        line = await reader.readline()
        if not line:
            return
        await transcript.write(
            TranscriptChunk(
                timestamp=datetime.now(tz=UTC),
                stream=stream_name,
                text=line.decode("utf-8", errors="replace").rstrip("\n"),
            ),
        )


async def execute_run(
    *,
    plan: LaunchPlan,
    spawner: SubprocessSpawner,
    mcp_registry: MCPSessionRegistry,
    run_registry: RunRegistry,
    audit_sink: AuditSink | None = None,
    vault_did: str = "",
) -> RunHandle:
    """Spawn the subprocess, start pump tasks, register the run.

    Returns immediately with a handle; the run continues in the
    background. The handle's `transcript.aiter()` is what the SSE
    /runs/{id}/stream endpoint subscribes to.
    """
    sink: AuditSink = audit_sink or NullAuditSink()
    transcript = TranscriptStream()
    process = await spawner.spawn(
        command=plan.command,
        env=plan.env,
        cwd=str(plan.cwd),
    )

    handle = RunHandle(
        run_id=plan.session.run_id,
        session_token=plan.session.token,
        status=RunStatus.RUNNING,
        transcript=transcript,
        started_at=datetime.now(tz=UTC),
        cost=CostAccumulator(reservation_usd=plan.reservation_usd),
        _process=process,
    )
    run_registry.register(handle)

    await sink.emit(
        AuditRecord(
            vault_did=vault_did,
            event_type=AuditEventType.RUN_STARTED,
            happened_at=audit_now(),
            run_id=handle.run_id,
            detail=f"reservation_usd={plan.reservation_usd}",
        ),
    )

    async def supervise() -> None:
        pumps: list[asyncio.Task] = []
        if process.stdout is not None:
            pumps.append(
                asyncio.create_task(
                    _pump(
                        process.stdout,
                        stream_name="stdout",
                        transcript=transcript,
                    ),
                ),
            )
        if process.stderr is not None:
            pumps.append(
                asyncio.create_task(
                    _pump(
                        process.stderr,
                        stream_name="stderr",
                        transcript=transcript,
                    ),
                ),
            )

        try:
            returncode = await process.wait()
            for p in pumps:
                await p
            handle.returncode = returncode
            handle.status = (
                RunStatus.COMPLETED if returncode == 0 else RunStatus.ERRORED
            )
        except asyncio.CancelledError:
            handle.status = RunStatus.HALTED
            raise
        finally:
            handle.ended_at = datetime.now(tz=UTC)
            mcp_registry.drop(plan.session.token)
            await transcript.close()
            terminal_event = {
                RunStatus.COMPLETED: AuditEventType.RUN_COMPLETED,
                RunStatus.HALTED: AuditEventType.RUN_HALTED,
                RunStatus.ERRORED: AuditEventType.RUN_ERRORED,
            }.get(handle.status)
            if terminal_event is not None:
                await sink.emit(
                    AuditRecord(
                        vault_did=vault_did,
                        event_type=terminal_event,
                        happened_at=audit_now(),
                        run_id=handle.run_id,
                        detail=(
                            f"returncode={handle.returncode}"
                            if handle.returncode is not None
                            else None
                        ),
                    ),
                )

    handle._task = asyncio.create_task(supervise())
    return handle
