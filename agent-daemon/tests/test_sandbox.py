"""Filesystem sandbox tests — verify the bwrap argv shape + the soft
fallback when bwrap is unavailable."""

from __future__ import annotations

import shutil
from pathlib import Path
from unittest.mock import patch

import pytest

from theourgia_agent.runs.sandbox import (
    SANDBOX_AGENT_WORKDIR,
    bwrap_available,
    wrap_command_with_sandbox,
)


def test_bwrap_available_reflects_shutil_which() -> None:
    """bwrap_available() returns True iff shutil.which('bwrap') is not None."""
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        assert bwrap_available() is True
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value=None,
    ):
        assert bwrap_available() is False


def test_wrap_falls_back_to_command_when_bwrap_unavailable() -> None:
    """No bwrap → the command passes through unchanged."""
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which", return_value=None,
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude", "--print", "task"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    assert wrapped == ["/usr/bin/claude", "--print", "task"]


def test_wrap_emits_bwrap_argv_when_available() -> None:
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude", "--print", "task"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    assert wrapped[0] == "bwrap"
    # The actual user command lives after the `--` separator.
    assert "--" in wrapped
    sep_idx = wrapped.index("--")
    assert wrapped[sep_idx + 1 :] == [
        "/usr/bin/claude", "--print", "task",
    ]


def test_wrap_binds_memory_dir_to_sandbox_workdir() -> None:
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/did:vault:alice/install-1"),
        )
    # Find --bind <memory_dir> <SANDBOX_AGENT_WORKDIR>
    for i, token in enumerate(wrapped):
        if token == "--bind":
            if wrapped[i + 1].endswith("install-1"):
                assert wrapped[i + 2] == SANDBOX_AGENT_WORKDIR
                break
    else:
        raise AssertionError("memory_dir not bound to sandbox workdir")


def test_wrap_uses_chdir_inside_sandbox() -> None:
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    assert "--chdir" in wrapped
    assert wrapped[wrapped.index("--chdir") + 1] == SANDBOX_AGENT_WORKDIR


def test_wrap_sets_home_inside_sandbox() -> None:
    """HOME must point at the work dir so claude CLI state files
    stay sandboxed (rule 59)."""
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    # --setenv HOME <SANDBOX_AGENT_WORKDIR>
    for i, token in enumerate(wrapped):
        if token == "--setenv" and wrapped[i + 1] == "HOME":
            assert wrapped[i + 2] == SANDBOX_AGENT_WORKDIR
            return
    raise AssertionError("HOME not set to sandbox workdir")


def test_wrap_does_not_unshare_net() -> None:
    """The agent needs outbound for the model-API call; bwrap must NOT
    --unshare-net (network sandboxing is the daemon's HTTP proxy layer,
    not bwrap's)."""
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    assert "--unshare-net" not in wrapped


def test_wrap_unshares_pid_ipc_uts() -> None:
    """Process isolation: the agent's subprocess shouldn't see other
    daemon processes."""
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    assert "--unshare-pid" in wrapped
    assert "--unshare-ipc" in wrapped
    assert "--unshare-uts" in wrapped


def test_wrap_die_with_parent() -> None:
    """A daemon crash must NOT orphan the subprocess (resource leak +
    potential continued model-API spend)."""
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    assert "--die-with-parent" in wrapped


def test_wrap_private_tmpfs() -> None:
    """/tmp inside the sandbox must be tmpfs — no leaking the host's
    /tmp into the agent's view."""
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
        )
    # --tmpfs /tmp
    for i, token in enumerate(wrapped):
        if token == "--tmpfs":
            if wrapped[i + 1] == "/tmp":
                return
    raise AssertionError("private /tmp not declared")


def test_wrap_with_extra_writable_paths() -> None:
    with patch(
        "theourgia_agent.runs.sandbox.shutil.which",
        return_value="/usr/bin/bwrap",
    ):
        wrapped = wrap_command_with_sandbox(
            command=["/usr/bin/claude"],
            memory_dir=Path("/srv/theourgia/agents/v1/a1"),
            extra_writable_paths=[Path("/var/run/theourgia/audit.sock")],
        )
    # --bind /var/run/theourgia/audit.sock /var/run/theourgia/audit.sock
    bind_pairs = [
        (wrapped[i + 1], wrapped[i + 2])
        for i, t in enumerate(wrapped) if t == "--bind"
    ]
    assert (
        "/var/run/theourgia/audit.sock",
        "/var/run/theourgia/audit.sock",
    ) in bind_pairs


@pytest.mark.skipif(
    shutil.which("bwrap") is None,
    reason="bwrap not installed on this host",
)
def test_bwrap_actually_blocks_outside_writes(tmp_path: Path) -> None:
    """If bwrap is available on the test host, verify the sandbox
    actually enforces by attempting to write outside memory_dir.

    Skipped when bwrap isn't on PATH (CI without bwrap, dev shells)."""
    import subprocess

    memory_dir = tmp_path / "memory"
    memory_dir.mkdir()
    forbidden = tmp_path / "outside"
    forbidden.mkdir()

    wrapped = wrap_command_with_sandbox(
        command=[
            "sh", "-c",
            f"touch {SANDBOX_AGENT_WORKDIR}/inside-ok "
            f"&& touch {forbidden}/should-fail; echo exit=$?",
        ],
        memory_dir=memory_dir,
    )
    result = subprocess.run(
        wrapped, capture_output=True, text=True, timeout=10,
    )
    # The agent's inside-write succeeds; the outside-write fails because
    # /tmp/.../outside isn't bind-mounted into the sandbox.
    assert (memory_dir / "inside-ok").exists()
    assert not (forbidden / "should-fail").exists()
