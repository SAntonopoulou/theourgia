"""Regression: Celery's asyncio.run-per-task pattern versus the DB layer.

The first time the prod worker ever ran (v1-021), every async task
crashed with asyncpg's "attached to a different loop": the process-wide
pooled engine binds to the first event loop, and each task invocation
runs in a fresh loop. ``task_session_scope`` exists to make the Celery
pattern safe — these tests drive it exactly the way the worker does:
sequential ``asyncio.run`` calls in one process.

Real-database tests are skip-gated on THEOURGIA_TEST_DATABASE_URL, same
convention as the daemon/registry suites.
"""

from __future__ import annotations

import asyncio
import os

import pytest
from sqlalchemy import text

DB_URL = os.environ.get("THEOURGIA_TEST_DATABASE_URL", "")

pytestmark = pytest.mark.skipif(
    not DB_URL, reason="THEOURGIA_TEST_DATABASE_URL not set"
)


@pytest.fixture(autouse=True)
def _point_settings_at_test_db(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", DB_URL)
    from theourgia.core import config

    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


def test_task_session_scope_survives_sequential_event_loops():
    """Two asyncio.run invocations — the exact Celery worker shape."""
    from theourgia.core.db import task_session_scope

    async def one_task_run() -> int:
        async with task_session_scope() as session:
            result = await session.execute(text("SELECT 1"))
            return int(result.scalar_one())

    # Each asyncio.run is a fresh loop; before the fix the second call
    # raised RuntimeError("... attached to a different loop").
    assert asyncio.run(one_task_run()) == 1
    assert asyncio.run(one_task_run()) == 1
    assert asyncio.run(one_task_run()) == 1


def test_pooled_session_scope_documents_the_hazard():
    """The pooled scope works on a single loop — the supported shape."""
    from theourgia.core import db as db_mod

    db_mod.get_engine.cache_clear()
    db_mod.get_sessionmaker.cache_clear()

    async def single_loop() -> int:
        async with db_mod.session_scope() as session:
            result = await session.execute(text("SELECT 1"))
            return int(result.scalar_one())

    try:
        assert asyncio.run(single_loop()) == 1
    finally:
        # Dispose the pool inside its own loop so the cached engine
        # never leaks loop-bound connections into other tests.
        async def _dispose() -> None:
            await db_mod.get_engine().dispose()

        asyncio.run(_dispose())
        db_mod.get_engine.cache_clear()
        db_mod.get_sessionmaker.cache_clear()
