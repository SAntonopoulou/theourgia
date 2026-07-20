"""v1-023 — the backup pipeline bugs the first live worker run exposed.

Three latent defects became observable the moment celery actually
executed on prod (it never had — v1-021):

1. ``tasks/__init__`` did not import ``federation_delivery`` /
   ``phase05``, so beat scheduled tasks no worker had registered.
2. ``BackupRun``'s enum columns lacked ``values_callable`` — persisting
   the very first run's row failed with
   ``invalid input value for enum backup_run_status: "FAILURE"``.
3. The include paths never contained the database (PGDATA lives in a
   Docker volume): a pg_dump pre-step now makes snapshots
   self-sufficient, and a pg_dump failure fails the backup loudly.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import pytest

DB_URL = os.environ.get("THEOURGIA_TEST_DATABASE_URL", "")


def test_every_beat_scheduled_task_is_registered():
    """Regression for the missing task-module imports."""
    import theourgia.core.tasks  # noqa: F401 — side-effect registration
    from theourgia.core.tasks.app import celery_app

    registered = set(celery_app.tasks.keys())
    for entry in celery_app.conf.beat_schedule.values():
        assert entry["task"] in registered, (
            f"beat schedules {entry['task']!r} but no worker registers it"
        )


def test_backup_enum_columns_send_values_not_names():
    from sqlalchemy import Enum as SAEnum

    from theourgia.models.backups import BackupRun

    for col_name in ("status", "trigger"):
        col_type = BackupRun.__table__.c[col_name].type
        assert isinstance(col_type, SAEnum)
        assert set(col_type.enums) == {
            v.lower() for v in col_type.enums
        }, f"{col_name} enum must carry lowercase DB values, got {col_type.enums}"


@pytest.mark.skipif(not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set")
def test_failure_row_persists_against_real_postgres(monkeypatch):
    """The exact insert that failed live on 2026-07-20."""
    from datetime import UTC, datetime

    monkeypatch.setenv("DATABASE_URL", DB_URL)
    from theourgia.core import config

    config.get_settings.cache_clear()
    from theourgia.core.db import task_session_scope
    from theourgia.models.backups import BackupRun, BackupRunStatus, BackupTrigger

    async def insert_and_delete() -> None:
        async with task_session_scope() as session:
            now = datetime.now(tz=UTC)
            row = BackupRun(
                started_at=now,
                finished_at=now,
                status=BackupRunStatus.FAILURE,
                trigger=BackupTrigger.SCHEDULED,
                duration_seconds=0,
                error_message="v1-023 regression probe",
                tags_csv="daily",
            )
            session.add(row)
            await session.commit()
            await session.delete(row)
            await session.commit()

    asyncio.run(insert_and_delete())
    config.get_settings.cache_clear()


def _fake_runner(code: int, stderr: str = ""):
    calls: list[tuple[list[str], dict]] = []

    async def runner(argv, env):
        calls.append((argv, env))
        if code == -1:
            raise FileNotFoundError("pg_dump")
        # Simulate pg_dump creating its target file on success.
        if code == 0:
            target = Path(argv[argv.index("-f") + 1])
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(b"PGDMP-fake")
        return code, stderr

    return runner, calls


def test_dump_database_success_writes_spool_file(tmp_path, monkeypatch):
    from theourgia.core.tasks import backup as backup_mod

    runner, calls = _fake_runner(0)
    monkeypatch.setattr(backup_mod, "_run_pg_dump_subprocess", runner)
    result = asyncio.run(backup_mod._dump_database(tmp_path / "spool"))
    assert result.name == "theourgia-db.dump"
    assert result.read_bytes() == b"PGDMP-fake"
    argv = calls[0][0]
    assert argv[0] == "pg_dump" and "-Fc" in argv
    # Credentials travel via PGPASSWORD, never argv.
    assert not any("password" in a.lower() for a in argv)


def test_dump_database_nonzero_exit_raises(tmp_path, monkeypatch):
    from theourgia.core.tasks import backup as backup_mod

    runner, _ = _fake_runner(2, "connection refused")
    monkeypatch.setattr(backup_mod, "_run_pg_dump_subprocess", runner)
    with pytest.raises(backup_mod.PgDumpError, match="connection refused"):
        asyncio.run(backup_mod._dump_database(tmp_path / "spool"))


def test_dump_database_missing_binary_names_the_package(tmp_path, monkeypatch):
    from theourgia.core.tasks import backup as backup_mod

    runner, _ = _fake_runner(-1)
    monkeypatch.setattr(backup_mod, "_run_pg_dump_subprocess", runner)
    with pytest.raises(backup_mod.PgDumpError, match="postgresql-client"):
        asyncio.run(backup_mod._dump_database(tmp_path / "spool"))
