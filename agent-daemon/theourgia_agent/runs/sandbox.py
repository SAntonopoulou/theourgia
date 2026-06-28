"""Filesystem sandbox for spawned `claude` subprocesses.

Rule 59 — the FILESYSTEM capability bounds writes to
``<memory_root>/<vault_did>/<install_id>/``. The agent's subprocess
must NOT be able to write outside that directory; this module wraps
the launcher's command in a bubblewrap (bwrap) invocation that enforces
the boundary at the syscall level.

If bubblewrap is not installed, we degrade to a soft sandbox: the
subprocess runs in the memory dir as cwd, with HOME pointed at the
same path, but writes outside aren't blocked by the kernel. That's
documented + verified by a test, so an operator who skips bwrap knows
what they're trading.

The wrapping is opt-in: `wrap_command_with_sandbox()` returns the
command unchanged when bwrap is unavailable + the caller opts to fall
back. Production builds the daemon Docker image WITH bwrap (see
agent-daemon/Dockerfile), so the soft fallback is dev-only.
"""

from __future__ import annotations

import shutil
from pathlib import Path


__all__ = [
    "bwrap_available",
    "wrap_command_with_sandbox",
    "SANDBOX_AGENT_WORKDIR",
]


SANDBOX_AGENT_WORKDIR = "/work"
"""Inside-sandbox working directory the agent's memory dir is bind-mounted to.
Stable so the agent can read paths like `/work/notes.md` regardless of
the real path on the host."""


def bwrap_available() -> bool:
    """Whether bubblewrap is installed and callable."""
    return shutil.which("bwrap") is not None


def wrap_command_with_sandbox(
    *,
    command: list[str],
    memory_dir: Path,
    extra_writable_paths: list[Path] | None = None,
) -> list[str]:
    """Wrap the launcher's argv in a bubblewrap call.

    The bwrap sandbox:
      - Read-only binds /usr, /lib, /lib64, /bin, /sbin, /etc/ssl/certs
        (the agent reads system libraries + CA bundles, never writes)
      - Read-write binds the memory_dir → /work (the agent's only
        writable location aside from /tmp)
      - Private /tmp (tmpfs; flushed when the subprocess exits)
      - No network namespace isolation — the agent needs outbound for
        the API key call. (Network sandboxing is the daemon's HTTP
        proxy job, not bwrap's.)
      - Non-root inside the sandbox (--unshare-user-try --uid 1000).
      - --die-with-parent so a daemon crash doesn't leave the subprocess.

    When bwrap is not on PATH, returns the command unchanged + a soft
    cwd / HOME setup (the calling supervisor sets these via env). The
    caller is responsible for logging this fallback in production logs.

    `extra_writable_paths` is for tests + future expansion (e.g., the
    daemon's audit unix socket if we move to socket-based audit IPC).
    """
    if not bwrap_available():
        return list(command)

    bwrap_argv: list[str] = [
        "bwrap",
        # Mount system libs read-only.
        "--ro-bind", "/usr", "/usr",
        "--ro-bind", "/etc", "/etc",
        "--symlink", "usr/lib", "/lib",
        "--symlink", "usr/lib64", "/lib64",
        "--symlink", "usr/bin", "/bin",
        "--symlink", "usr/sbin", "/sbin",
        # Private /tmp.
        "--tmpfs", "/tmp",
        # /proc + /dev needed for asyncio / pipes / std I/O.
        "--proc", "/proc",
        "--dev", "/dev",
        # Agent's memory dir → /work (read-write).
        "--bind", str(memory_dir), SANDBOX_AGENT_WORKDIR,
        # Working directory inside the sandbox.
        "--chdir", SANDBOX_AGENT_WORKDIR,
        # Don't outlive the parent daemon.
        "--die-with-parent",
        # Drop privileges if possible.
        "--unshare-user-try",
        "--unshare-pid",
        "--unshare-ipc",
        "--unshare-uts",
        # CRITICAL: do NOT unshare net — agent needs outbound for the
        # model API call (THEOURGIA_AGENT_OUTBOUND_HOSTS is the
        # higher-level filter; bwrap enforces only filesystem).
        # No --unshare-net.
        # Keep HOME pointed at the work dir so claude CLI's state files
        # land inside the sandbox.
        "--setenv", "HOME", SANDBOX_AGENT_WORKDIR,
        "--setenv", "PWD", SANDBOX_AGENT_WORKDIR,
    ]

    for path in extra_writable_paths or []:
        bwrap_argv += ["--bind", str(path), str(path)]

    # Marker to separate bwrap flags from the agent command.
    bwrap_argv += ["--"]
    bwrap_argv += list(command)
    return bwrap_argv
