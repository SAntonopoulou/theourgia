"""Tests for the Restic CLI wrapper.

Uses a fake subprocess runner so the tests do not require the
``restic`` binary on the test machine. The fake records each
invocation (argv + env) and returns canned output, letting us verify
both the commands we emit and the parsing we do on output.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from theourgia.core.backups.policy import RetentionPolicy
from theourgia.core.backups.restic import (
    ResticClient,
    ResticError,
    ResticResult,
)
from theourgia.core.backups.status import BackupOutcome


class _FakeRunner:
    """Records calls and returns pre-programmed results."""

    def __init__(self) -> None:
        self.calls: list[tuple[list[str], dict[str, str]]] = []
        self.next_results: list[ResticResult] = []
        # When next_results is empty, default to a success with empty stdout
        self.default = ResticResult(returncode=0, stdout=b"", stderr=b"")

    def queue(self, *, stdout: bytes = b"", stderr: bytes = b"", returncode: int = 0) -> None:
        self.next_results.append(
            ResticResult(returncode=returncode, stdout=stdout, stderr=stderr)
        )

    async def __call__(self, argv: list[str], env: dict[str, str]) -> ResticResult:
        self.calls.append((argv, env))
        if self.next_results:
            return self.next_results.pop(0)
        return self.default


@pytest.fixture
def runner() -> _FakeRunner:
    return _FakeRunner()


@pytest.fixture
def client(runner: _FakeRunner) -> ResticClient:
    return ResticClient(
        repository="s3:https://r2.example.com/theourgia",
        password="test-password-not-real",
        aws_access_key_id="fake-key",
        aws_secret_access_key="fake-secret",
        subprocess_runner=runner,
    )


def test_client_rejects_empty_repository() -> None:
    with pytest.raises(ValueError, match="repository"):
        ResticClient(repository="", password="p")


def test_client_rejects_empty_password() -> None:
    with pytest.raises(ValueError, match="password"):
        ResticClient(repository="r", password="")


@pytest.mark.asyncio
async def test_env_includes_repository_and_credentials(
    client: ResticClient, runner: _FakeRunner
) -> None:
    await client.init()
    argv, env = runner.calls[0]
    assert argv == ["restic", "init"]
    assert env["RESTIC_REPOSITORY"] == "s3:https://r2.example.com/theourgia"
    assert env["RESTIC_PASSWORD"] == "test-password-not-real"
    assert env["AWS_ACCESS_KEY_ID"] == "fake-key"
    assert env["AWS_SECRET_ACCESS_KEY"] == "fake-secret"
    assert env["AWS_DEFAULT_REGION"] == "auto"


@pytest.mark.asyncio
async def test_check_invokes_restic_check(
    client: ResticClient, runner: _FakeRunner
) -> None:
    await client.check()
    assert runner.calls[0][0] == ["restic", "check"]


@pytest.mark.asyncio
async def test_failing_run_raises_restic_error(
    client: ResticClient, runner: _FakeRunner
) -> None:
    runner.queue(returncode=1, stderr=b"something went wrong")
    with pytest.raises(ResticError, match="exited with code 1"):
        await client.check()


@pytest.mark.asyncio
async def test_backup_emits_expected_argv(
    client: ResticClient, runner: _FakeRunner
) -> None:
    # Queue a successful summary JSON
    summary = json.dumps(
        {
            "message_type": "summary",
            "snapshot_id": "abc12345abc12345",
            "files_new": 12,
            "files_changed": 3,
            "data_added": 9999,
        }
    ).encode("utf-8")
    runner.queue(stdout=summary)

    result = await client.backup(
        paths=[Path("/srv/theourgia/db.dump"), Path("/srv/theourgia/media")],
        host="theourgia.com",
        tags=("daily",),
        exclude_patterns=("*.tmp",),
        triggered_by="scheduled",
    )

    argv, _ = runner.calls[0]
    assert argv[0:4] == ["restic", "backup", "--json", "--host"]
    assert "theourgia.com" in argv
    assert "--tag" in argv
    assert "daily" in argv
    assert "trigger:scheduled" in argv
    assert "--exclude" in argv
    assert "*.tmp" in argv
    assert "/srv/theourgia/db.dump" in argv
    assert "/srv/theourgia/media" in argv

    assert result.outcome == BackupOutcome.SUCCESS
    assert result.snapshot_id == "abc12345abc12345"
    assert result.files_new == 12
    assert result.files_changed == 3
    assert result.bytes_transferred == 9999


@pytest.mark.asyncio
async def test_backup_failure_returns_failure_summary(
    client: ResticClient, runner: _FakeRunner
) -> None:
    runner.queue(returncode=2, stderr=b"backup failed: bucket unreachable")

    result = await client.backup(
        paths=[Path("/srv/theourgia/db.dump")],
        host="theourgia.com",
        triggered_by="scheduled",
    )

    assert result.outcome == BackupOutcome.FAILURE
    assert result.snapshot_id is None
    assert "bucket unreachable" in (result.error_message or "")


@pytest.mark.asyncio
async def test_snapshots_parses_json_output(
    client: ResticClient, runner: _FakeRunner
) -> None:
    payload: list[dict[str, Any]] = [
        {
            "id": "f" * 64,
            "short_id": "fffffff",
            "time": "2026-06-20T15:00:00.123456789+00:00",
            "hostname": "theourgia.com",
            "paths": ["/srv/theourgia"],
            "tags": ["daily", "scheduled"],
        },
        {
            "id": "a" * 64,
            "short_id": "aaaaaaa",
            "time": "2026-06-20T14:00:00Z",
            "hostname": "theourgia.com",
            "paths": ["/srv/theourgia"],
            "tags": [],
        },
    ]
    runner.queue(stdout=json.dumps(payload).encode("utf-8"))

    snaps = await client.snapshots()
    assert len(snaps) == 2
    assert snaps[0].short_id == "fffffff"
    assert snaps[0].hostname == "theourgia.com"
    assert snaps[0].tags == ("daily", "scheduled")
    assert snaps[1].short_id == "aaaaaaa"


@pytest.mark.asyncio
async def test_snapshots_filters_by_tag(
    client: ResticClient, runner: _FakeRunner
) -> None:
    runner.queue(stdout=b"[]")
    await client.snapshots(tags=("daily",))
    argv, _ = runner.calls[0]
    assert "--tag" in argv
    assert "daily" in argv


@pytest.mark.asyncio
async def test_restore_emits_expected_argv(
    client: ResticClient, runner: _FakeRunner
) -> None:
    await client.restore(snapshot_id="latest", target=Path("/tmp/restore"))
    argv, _ = runner.calls[0]
    assert argv[0:2] == ["restic", "restore"]
    assert "latest" in argv
    assert "--target" in argv
    assert "/tmp/restore" in argv


@pytest.mark.asyncio
async def test_restore_rejects_empty_snapshot_id(client: ResticClient) -> None:
    with pytest.raises(ValueError, match="snapshot_id"):
        await client.restore(snapshot_id="", target=Path("/tmp/restore"))


@pytest.mark.asyncio
async def test_prune_uses_policy_args(
    client: ResticClient, runner: _FakeRunner
) -> None:
    policy = RetentionPolicy(keep_last=3, keep_daily=7)
    await client.prune(policy=policy)
    argv, _ = runner.calls[0]
    assert argv[0:3] == ["restic", "forget", "--prune"]
    assert "--keep-last" in argv
    assert "3" in argv
    assert "--keep-daily" in argv
    assert "7" in argv


@pytest.mark.asyncio
async def test_prune_refuses_all_zero_policy(client: ResticClient) -> None:
    nothing = RetentionPolicy(
        keep_last=0,
        keep_hourly=0,
        keep_daily=0,
        keep_weekly=0,
        keep_monthly=0,
        keep_yearly=0,
    )
    with pytest.raises(ValueError, match="keeps nothing"):
        await client.prune(policy=nothing)


@pytest.mark.asyncio
async def test_invalid_json_in_snapshots_raises_restic_error(
    client: ResticClient, runner: _FakeRunner
) -> None:
    runner.queue(stdout=b"not actually json")
    with pytest.raises(ResticError, match="could not parse"):
        await client.snapshots()


@pytest.mark.asyncio
async def test_backup_parses_total_bytes_when_data_added_absent(
    client: ResticClient, runner: _FakeRunner
) -> None:
    summary = json.dumps(
        {
            "message_type": "summary",
            "snapshot_id": "abc",
            "files_new": 1,
            "files_changed": 0,
            "total_bytes_processed": 5000,
            # No data_added field
        }
    ).encode("utf-8")
    runner.queue(stdout=summary)
    result = await client.backup(
        paths=[Path("/x")], host="h", triggered_by="manual_cli"
    )
    assert result.bytes_transferred == 5000


@pytest.mark.asyncio
async def test_backup_ignores_non_summary_messages(
    client: ResticClient, runner: _FakeRunner
) -> None:
    """Restic emits status / verbose messages before the summary. Those are
    skipped."""
    lines = [
        b'{"message_type": "status", "percent_done": 0.42}',
        b'{"message_type": "verbose_status", "action": "modified"}',
        b'{"message_type": "summary", "snapshot_id": "x", "files_new": 0, "files_changed": 0, "data_added": 7}',
    ]
    runner.queue(stdout=b"\n".join(lines))
    result = await client.backup(
        paths=[Path("/x")], host="h", triggered_by="manual_cli"
    )
    assert result.outcome == BackupOutcome.SUCCESS
    assert result.snapshot_id == "x"
    assert result.bytes_transferred == 7
