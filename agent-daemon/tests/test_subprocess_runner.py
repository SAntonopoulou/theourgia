"""Subprocess runner tests — uses a fake spawner that emits scripted
output. The real asyncio.create_subprocess_exec path is exercised by
integration tests (not run in CI; needs claude binary)."""

from __future__ import annotations

import asyncio
import signal
from decimal import Decimal
from pathlib import Path

import pytest

from theourgia_agent.mcp.capabilities import AgentCapability
from theourgia_agent.mcp.dispatch import DispatchContext
from theourgia_agent.mcp.sessions import MCPSessionRegistry
from theourgia_agent.mcp.vault_client import VaultClient
from theourgia_agent.runs.launcher import LaunchPlan
from theourgia_agent.runs.subprocess_runner import (
    AsyncioSubprocessSpawner,
    RunRegistry,
    RunStatus,
    SpawnedProcess,
    TranscriptStream,
    execute_run,
)


class _ScriptedReader:
    """asyncio.StreamReader stand-in that emits lines from a list."""

    def __init__(self, lines: list[bytes]) -> None:
        self._lines = list(lines)

    async def readline(self) -> bytes:
        if not self._lines:
            return b""
        return self._lines.pop(0)


class _FakeProcess:
    def __init__(
        self,
        *,
        stdout_lines: list[bytes] | None = None,
        stderr_lines: list[bytes] | None = None,
        returncode: int = 0,
        wait_delay: float = 0.0,
    ) -> None:
        self._stdout = (
            _ScriptedReader(stdout_lines or [])
            if stdout_lines is not None
            else None
        )
        self._stderr = (
            _ScriptedReader(stderr_lines or [])
            if stderr_lines is not None
            else None
        )
        self._returncode: int | None = None
        self._final_returncode = returncode
        self._wait_delay = wait_delay
        self._signals: list[int] = []
        self._wait_event = asyncio.Event()

    @property
    def stdout(self):
        return self._stdout

    @property
    def stderr(self):
        return self._stderr

    @property
    def returncode(self):
        return self._returncode

    def send_signal(self, sig: int) -> None:
        self._signals.append(sig)
        if sig in (signal.SIGTERM, signal.SIGKILL):
            self._returncode = -sig
            self._wait_event.set()

    async def wait(self) -> int:
        if self._wait_delay > 0:
            try:
                await asyncio.wait_for(
                    self._wait_event.wait(),
                    timeout=self._wait_delay,
                )
            except asyncio.TimeoutError:
                pass
        if self._returncode is None:
            self._returncode = self._final_returncode
        return self._returncode


class _FakeSpawner:
    def __init__(self, process: _FakeProcess) -> None:
        self._process = process
        self.spawn_calls: list[dict] = []

    async def spawn(
        self,
        *,
        command: list[str],
        env: dict[str, str],
        cwd: str,
    ) -> SpawnedProcess:
        self.spawn_calls.append(
            {"command": command, "env": env, "cwd": cwd},
        )
        return self._process  # type: ignore[return-value]


def _make_plan(mcp_registry: MCPSessionRegistry) -> LaunchPlan:
    ctx = DispatchContext(
        granted=[AgentCapability.READ_ENTRIES],
        vault=VaultClient(session_token="vt-test"),
    )
    session = mcp_registry.register(ctx=ctx, run_id="run-xyz")
    return LaunchPlan(
        session=session,
        reservation_usd=Decimal("0.50"),
        cwd=Path("/tmp/agent-cwd"),
        command=["/usr/bin/true"],
        env={"THEOURGIA_MCP_TOKEN": session.token},
    )


@pytest.mark.asyncio
async def test_execute_run_pumps_stdout_into_transcript() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    process = _FakeProcess(
        stdout_lines=[b"thinking...\n", b"calling read.entries\n"],
        returncode=0,
    )
    plan = _make_plan(mcp)
    handle = await execute_run(
        plan=plan,
        spawner=_FakeSpawner(process),
        mcp_registry=mcp,
        run_registry=runs,
    )
    chunks = [c async for c in handle.transcript.aiter()]
    assert [c.text for c in chunks] == [
        "thinking...",
        "calling read.entries",
    ]
    assert all(c.stream == "stdout" for c in chunks)
    assert handle.returncode == 0
    assert handle.status == RunStatus.COMPLETED


@pytest.mark.asyncio
async def test_execute_run_dispatches_status_errored_on_nonzero_exit() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    process = _FakeProcess(stdout_lines=[], returncode=1)
    plan = _make_plan(mcp)
    handle = await execute_run(
        plan=plan,
        spawner=_FakeSpawner(process),
        mcp_registry=mcp,
        run_registry=runs,
    )
    _ = [c async for c in handle.transcript.aiter()]
    assert handle.returncode == 1
    assert handle.status == RunStatus.ERRORED


@pytest.mark.asyncio
async def test_execute_run_drops_session_from_mcp_registry_on_exit() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    plan = _make_plan(mcp)
    assert mcp.lookup(plan.session.token) is not None
    process = _FakeProcess(stdout_lines=[], returncode=0)
    handle = await execute_run(
        plan=plan,
        spawner=_FakeSpawner(process),
        mcp_registry=mcp,
        run_registry=runs,
    )
    _ = [c async for c in handle.transcript.aiter()]
    assert mcp.lookup(plan.session.token) is None


@pytest.mark.asyncio
async def test_execute_run_registers_in_run_registry() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    plan = _make_plan(mcp)
    process = _FakeProcess(stdout_lines=[], returncode=0)
    handle = await execute_run(
        plan=plan,
        spawner=_FakeSpawner(process),
        mcp_registry=mcp,
        run_registry=runs,
    )
    assert runs.lookup("run-xyz") is handle
    _ = [c async for c in handle.transcript.aiter()]


@pytest.mark.asyncio
async def test_execute_run_passes_command_and_env_to_spawner() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    plan = _make_plan(mcp)
    process = _FakeProcess(stdout_lines=[], returncode=0)
    spawner = _FakeSpawner(process)
    await execute_run(
        plan=plan,
        spawner=spawner,
        mcp_registry=mcp,
        run_registry=runs,
    )
    assert spawner.spawn_calls[0]["command"] == ["/usr/bin/true"]
    assert "THEOURGIA_MCP_TOKEN" in spawner.spawn_calls[0]["env"]
    assert spawner.spawn_calls[0]["cwd"] == "/tmp/agent-cwd"


@pytest.mark.asyncio
async def test_terminate_sends_sigterm() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    plan = _make_plan(mcp)
    # wait_delay > grace will trigger SIGKILL after SIGTERM. With
    # wait_delay of 0.5s and grace=0.1s the SIGKILL path runs.
    process = _FakeProcess(
        stdout_lines=[],
        returncode=0,
        wait_delay=0.5,
    )
    handle = await execute_run(
        plan=plan,
        spawner=_FakeSpawner(process),
        mcp_registry=mcp,
        run_registry=runs,
    )
    await handle.terminate(grace_seconds=0.1)
    _ = [c async for c in handle.transcript.aiter()]
    assert signal.SIGTERM in process._signals


@pytest.mark.asyncio
async def test_terminate_on_completed_process_is_noop() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    plan = _make_plan(mcp)
    process = _FakeProcess(stdout_lines=[], returncode=0)
    handle = await execute_run(
        plan=plan,
        spawner=_FakeSpawner(process),
        mcp_registry=mcp,
        run_registry=runs,
    )
    _ = [c async for c in handle.transcript.aiter()]
    await handle.terminate()  # Process already exited — no signals.
    # After completion, the process has no signals from terminate().
    assert process._signals == []


@pytest.mark.asyncio
async def test_transcript_stream_close_terminates_iter() -> None:
    stream = TranscriptStream()
    await stream.close()
    chunks = [c async for c in stream.aiter()]
    assert chunks == []


@pytest.mark.asyncio
async def test_transcript_separates_stdout_and_stderr() -> None:
    mcp = MCPSessionRegistry()
    runs = RunRegistry()
    plan = _make_plan(mcp)
    process = _FakeProcess(
        stdout_lines=[b"out-1\n"],
        stderr_lines=[b"err-1\n"],
        returncode=0,
    )
    handle = await execute_run(
        plan=plan,
        spawner=_FakeSpawner(process),
        mcp_registry=mcp,
        run_registry=runs,
    )
    chunks = [c async for c in handle.transcript.aiter()]
    by_stream = {c.stream for c in chunks}
    assert by_stream == {"stdout", "stderr"}


def test_asyncio_spawner_class_constructible() -> None:
    """The production spawner is a thin wrapper — just verify it
    instantiates without args."""
    spawner = AsyncioSubprocessSpawner()
    assert hasattr(spawner, "spawn")
