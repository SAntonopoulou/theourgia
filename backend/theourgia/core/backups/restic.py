"""Subprocess wrapper around the ``restic`` binary.

Wraps Restic invocations in a typed Python API, with the subprocess
runner injectable for tests. The default runner uses
:mod:`asyncio.subprocess`; tests pass a stand-in that records calls
and returns canned output.

Restic itself does all the heavy lifting:

- Authenticated encryption of every snapshot under
  ``RESTIC_PASSWORD`` (server-side ciphertext is opaque even to the
  storage provider).
- Deduplication and incremental backups.
- Multi-backend support (S3-compatible / Backblaze / local / SFTP /
  rest-server / Hetzner Object Storage).
- ``forget`` with retention rules and ``prune`` to reclaim space.

We don't reimplement any of that — we just call the binary, parse its
``--json`` output, and persist the result.

Why subprocess instead of a Go-Python binding? Restic doesn't ship a
stable Python binding and is a single static binary that's trivial to
ship in our Docker image. Subprocess invocation is the path of least
surprise.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from theourgia.core.backups.policy import RetentionPolicy
from theourgia.core.backups.status import BackupOutcome, BackupSummary

__all__ = [
    "ResticClient",
    "ResticError",
    "ResticResult",
    "Snapshot",
    "SubprocessRunner",
]

_log = logging.getLogger(__name__)


class ResticError(Exception):
    """Raised when a Restic invocation fails."""

    def __init__(self, message: str, *, returncode: int, stderr: str = ""):
        super().__init__(message)
        self.returncode = returncode
        self.stderr = stderr


@dataclass(frozen=True, slots=True)
class ResticResult:
    """Raw result of one ``restic`` invocation."""

    returncode: int
    stdout: bytes
    stderr: bytes


@dataclass(frozen=True, slots=True)
class Snapshot:
    """A Restic snapshot as parsed from ``restic snapshots --json``."""

    id: str
    short_id: str
    time: datetime
    hostname: str
    paths: tuple[str, ...]
    tags: tuple[str, ...] = field(default_factory=tuple)


# A subprocess runner is any async callable that takes the argv plus an
# environment dict and returns a ResticResult. Pluggable so tests can
# inject a fake.
SubprocessRunner = Callable[[list[str], dict[str, str]], Awaitable[ResticResult]]


async def _default_runner(argv: list[str], env: dict[str, str]) -> ResticResult:
    """Default subprocess runner using :mod:`asyncio.subprocess`."""
    proc = await asyncio.create_subprocess_exec(
        *argv,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )
    stdout, stderr = await proc.communicate()
    return ResticResult(returncode=proc.returncode or 0, stdout=stdout, stderr=stderr)


class ResticClient:
    """A typed wrapper around the ``restic`` binary.

    Construction takes the repository URL and password (which are
    forwarded to Restic via environment variables) plus optional AWS
    credentials for S3-compatible backends (R2, Backblaze B2, Hetzner
    Object Storage, etc.).

    The ``subprocess_runner`` argument lets tests inject a stand-in
    that does not require a real ``restic`` binary on the test machine.
    """

    def __init__(
        self,
        *,
        repository: str,
        password: str,
        aws_access_key_id: str | None = None,
        aws_secret_access_key: str | None = None,
        aws_default_region: str = "auto",
        executable: str = "restic",
        subprocess_runner: SubprocessRunner | None = None,
    ) -> None:
        if not repository:
            msg = "restic repository must be set (RESTIC_REPOSITORY)"
            raise ValueError(msg)
        if not password:
            msg = "restic password must be set (RESTIC_PASSWORD)"
            raise ValueError(msg)
        self._repository = repository
        self._password = password
        self._aws_key = aws_access_key_id
        self._aws_secret = aws_secret_access_key
        self._aws_region = aws_default_region
        self._executable = executable
        self._runner: SubprocessRunner = subprocess_runner or _default_runner

    # ── Internal helpers ─────────────────────────────────────────────

    def _env(self) -> dict[str, str]:
        env = dict(os.environ)
        env["RESTIC_REPOSITORY"] = self._repository
        env["RESTIC_PASSWORD"] = self._password
        if self._aws_key:
            env["AWS_ACCESS_KEY_ID"] = self._aws_key
        if self._aws_secret:
            env["AWS_SECRET_ACCESS_KEY"] = self._aws_secret
        if self._aws_region:
            env["AWS_DEFAULT_REGION"] = self._aws_region
        return env

    async def _run(self, *args: str) -> ResticResult:
        """Run ``restic`` with the supplied args and raise on failure."""
        argv = [self._executable, *args]
        env = self._env()
        result = await self._runner(argv, env)
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            msg = (
                f"restic exited with code {result.returncode}: "
                f"{stderr.strip()[:512]}"
            )
            raise ResticError(msg, returncode=result.returncode, stderr=stderr)
        return result

    # ── Lifecycle ────────────────────────────────────────────────────

    async def init(self) -> None:
        """Initialize the repository. Idempotent — subsequent calls return
        a non-zero exit code which we surface as :class:`ResticError`. Callers
        that want best-effort init catch the error and inspect ``stderr``."""
        await self._run("init")

    async def check(self) -> None:
        """Verify the repository's integrity. Raises on any inconsistency."""
        await self._run("check")

    # ── Backup ───────────────────────────────────────────────────────

    async def backup(
        self,
        *,
        paths: Iterable[Path | str],
        host: str,
        tags: Iterable[str] = (),
        exclude_patterns: Iterable[str] = (),
        triggered_by: str = "scheduled",
    ) -> BackupSummary:
        """Create a new snapshot of ``paths``.

        Returns a :class:`BackupSummary` describing the outcome. Even on
        failure, the summary includes timing information; the
        ``outcome`` field distinguishes success / failure / skipped.

        ``triggered_by`` is a free-form label propagated to the snapshot
        as a Restic tag (``trigger:<name>``) and recorded by the runner
        that persists the result.
        """
        started = datetime.now(tz=UTC)
        paths_list = [str(p) for p in paths]
        tags_list = [*tags, f"trigger:{triggered_by}"]

        argv: list[str] = ["backup", "--json", "--host", host]
        for tag in tags_list:
            argv.extend(["--tag", tag])
        for pattern in exclude_patterns:
            argv.extend(["--exclude", pattern])
        argv.extend(paths_list)

        try:
            result = await self._run(*argv)
        except ResticError as exc:
            finished = datetime.now(tz=UTC)
            return BackupSummary(
                outcome=BackupOutcome.FAILURE,
                started_at=started,
                finished_at=finished,
                duration_seconds=(finished - started).total_seconds(),
                error_message=exc.stderr or str(exc),
                tags=tuple(tags_list),
            )

        finished = datetime.now(tz=UTC)
        snapshot_id, files_new, files_changed, bytes_added = _parse_backup_json(
            result.stdout
        )
        return BackupSummary(
            outcome=BackupOutcome.SUCCESS,
            started_at=started,
            finished_at=finished,
            snapshot_id=snapshot_id,
            files_new=files_new,
            files_changed=files_changed,
            bytes_transferred=bytes_added,
            duration_seconds=(finished - started).total_seconds(),
            tags=tuple(tags_list),
        )

    # ── Inventory ────────────────────────────────────────────────────

    async def snapshots(self, *, tags: Iterable[str] = ()) -> list[Snapshot]:
        """List snapshots in the repository, optionally filtered by tag."""
        argv: list[str] = ["snapshots", "--json"]
        for tag in tags:
            argv.extend(["--tag", tag])
        result = await self._run(*argv)
        try:
            data = json.loads(result.stdout or b"[]")
        except json.JSONDecodeError as exc:
            msg = "could not parse `restic snapshots --json` output"
            raise ResticError(msg, returncode=0, stderr=str(exc)) from exc

        snapshots: list[Snapshot] = []
        for item in data:
            snapshots.append(
                Snapshot(
                    id=str(item.get("id", "")),
                    short_id=str(item.get("short_id", "")),
                    time=_parse_iso_datetime(str(item.get("time", ""))),
                    hostname=str(item.get("hostname", "")),
                    paths=tuple(str(p) for p in item.get("paths", [])),
                    tags=tuple(str(t) for t in item.get("tags", [])),
                )
            )
        return snapshots

    # ── Restore ──────────────────────────────────────────────────────

    async def restore(
        self,
        *,
        snapshot_id: str,
        target: Path | str,
        include_patterns: Iterable[str] = (),
    ) -> None:
        """Restore a snapshot to a target directory.

        ``snapshot_id`` may be a full id, a short id, or ``"latest"``.
        Restic creates ``target`` if it doesn't exist.
        """
        if not snapshot_id:
            msg = "snapshot_id must not be empty"
            raise ValueError(msg)
        argv: list[str] = ["restore", snapshot_id, "--target", str(target)]
        for pattern in include_patterns:
            argv.extend(["--include", pattern])
        await self._run(*argv)

    # ── Retention ────────────────────────────────────────────────────

    async def prune(self, *, policy: RetentionPolicy) -> None:
        """Apply the retention policy and reclaim freed space.

        Refuses to run with an all-zeros policy (which would delete
        everything); callers must pass a policy that keeps at least
        something.
        """
        if not policy.keeps_anything:
            msg = (
                "RetentionPolicy keeps nothing; refusing to prune "
                "(would delete every snapshot)"
            )
            raise ValueError(msg)
        argv: list[str] = ["forget", "--prune", *policy.to_restic_args()]
        await self._run(*argv)


def _parse_backup_json(stdout: bytes) -> tuple[str | None, int, int, int]:
    """Parse ``restic backup --json`` line-delimited output.

    Returns ``(snapshot_id, files_new, files_changed, bytes_added)``.
    Restic emits multiple JSON messages; the ``summary`` is the last
    one that contains the final stats.
    """
    snapshot_id: str | None = None
    files_new = 0
    files_changed = 0
    bytes_added = 0

    for raw_line in stdout.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            obj: dict[str, Any] = json.loads(line)
        except json.JSONDecodeError:
            continue
        if obj.get("message_type") == "summary":
            snapshot_id = obj.get("snapshot_id") or snapshot_id
            files_new = int(obj.get("files_new", 0))
            files_changed = int(obj.get("files_changed", 0))
            # Restic reports data_added (after dedup + compression); use it
            # when available, else fall back to total_bytes_processed.
            bytes_added = int(obj.get("data_added") or obj.get("total_bytes_processed") or 0)
    return snapshot_id, files_new, files_changed, bytes_added


def _parse_iso_datetime(s: str) -> datetime:
    """Parse Restic's ISO 8601 timestamp into a timezone-aware datetime.

    Restic emits RFC 3339 / ISO 8601 strings like
    ``2026-06-20T15:00:00.123456789+00:00`` — Python's ``fromisoformat``
    accepts these on 3.11+ (which we require) modulo nanosecond trimming.
    """
    if not s:
        return datetime.now(tz=UTC)
    # Trim sub-microsecond precision if present (Python's parser handles
    # up to 6 decimal places).
    if "." in s:
        head, dot, rest = s.partition(".")
        # Find the timezone suffix, separate it from the fractional part
        tz_part = ""
        frac = rest
        for sep in ("+", "-", "Z"):
            if sep in rest:
                idx = rest.find(sep)
                frac = rest[:idx]
                tz_part = rest[idx:]
                break
        # Limit fractional to 6 digits
        frac = frac[:6]
        s = f"{head}.{frac}{tz_part}"
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return datetime.now(tz=UTC)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)
