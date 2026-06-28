"""Shared fixtures for the daemon test suite.

Tests that need a real Postgres depend on ``daemon_postgres_url`` and
skip when it's None (the env var is unset). Bring up the test DB via:

    docker compose -f docker-compose.test.yml up -d daemon-pg

then run pytest with::

    THEOURGIA_AGENT_TEST_DATABASE_URL=postgresql+asyncpg://theourgia:theourgia@localhost:5532/theourgia_agent_test \
        pytest agent-daemon/tests
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator, Generator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel

from theourgia_agent import models  # noqa: F401 — register ORM models


@pytest.fixture(autouse=True, scope="session")
def _set_test_environment() -> Generator[None, None, None]:
    """Force the daemon into test-shaped settings."""
    prior_env = os.environ.get("THEOURGIA_AGENT_ENV")
    os.environ["THEOURGIA_AGENT_ENV"] = "test"
    try:
        yield
    finally:
        if prior_env is None:
            os.environ.pop("THEOURGIA_AGENT_ENV", None)
        else:
            os.environ["THEOURGIA_AGENT_ENV"] = prior_env


@pytest.fixture(scope="session")
def daemon_postgres_url() -> str | None:
    """The test PG DSN, or None when unset (tests must skip)."""
    return os.environ.get("THEOURGIA_AGENT_TEST_DATABASE_URL")


@pytest_asyncio.fixture
async def daemon_engine(
    daemon_postgres_url: str | None,
) -> AsyncIterator[AsyncEngine]:
    """Async engine bound to the test DB. Function-scoped (each test
    gets a fresh engine on its own event loop, with create_all + drop_all
    bookending). Slower than session-scoped but correct: asyncpg
    connections are pinned to the loop they were created on, so a
    session-scoped engine across function-scoped loops corrupts.

    create_all + drop_all per test is ~100ms — fine for our test
    volume."""
    if daemon_postgres_url is None:
        pytest.skip("THEOURGIA_AGENT_TEST_DATABASE_URL not set")
    engine = create_async_engine(daemon_postgres_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    try:
        yield engine
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.drop_all)
        await engine.dispose()


@pytest_asyncio.fixture
async def daemon_session(
    daemon_engine: AsyncEngine,
) -> AsyncIterator[AsyncSession]:
    """Per-test session."""
    sessionmaker = async_sessionmaker(
        bind=daemon_engine, expire_on_commit=False,
    )
    async with sessionmaker() as session:
        yield session
        await session.rollback()
