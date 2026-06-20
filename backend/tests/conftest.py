"""Shared pytest fixtures for the Theourgia backend test suite.

Fixtures here are stack-wide. Domain-specific fixtures live in nested
conftest files alongside the tests that use them.

The session-scoped ``_set_test_environment`` autouse fixture pins
``THEOURGIA_ENV=test`` so secret-enforcement and other production-only
behaviors are relaxed across the whole run.

The integration-style fixtures (``app``, ``async_client``, ``stock_env``)
let tests exercise the full FastAPI surface in-process without binding a
port. Tests that need a real Postgres should depend on ``postgres_url``
and skip when it's not set.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator, Generator, Iterator

import pytest
import pytest_asyncio


@pytest.fixture(autouse=True, scope="session")
def _set_test_environment() -> Generator[None, None, None]:
    """Force ``THEOURGIA_ENV=test`` for the duration of the test session.

    Many code paths check this to skip "required secret" enforcement and
    to relax other production-only behaviors.
    """
    prior = os.environ.get("THEOURGIA_ENV")
    os.environ["THEOURGIA_ENV"] = "test"
    try:
        yield
    finally:
        if prior is None:
            os.environ.pop("THEOURGIA_ENV", None)
        else:
            os.environ["THEOURGIA_ENV"] = prior


# ── Async backend selection ──────────────────────────────────────────


@pytest.fixture
def anyio_backend() -> str:
    """Pin anyio's backend to asyncio so tests run on a predictable loop."""
    return "asyncio"


# ── Settings + environment management ────────────────────────────────


@pytest.fixture
def reset_settings() -> Iterator[None]:
    """Clear the cached :class:`Settings` instance before and after the test.

    Use when a test mutates environment variables — without this, the
    cached instance from a prior test would be returned, masking the
    change.
    """
    from theourgia.core.config import reset_settings_cache

    reset_settings_cache()
    yield
    reset_settings_cache()


@pytest.fixture
def stock_env(
    monkeypatch: pytest.MonkeyPatch, reset_settings: None
) -> Iterator[None]:
    """A clean ``test`` config with no operator-supplied opt-ins.

    Removes any Sentry DSN, Restic config, or AWS credentials from the
    environment so tests assert true default-state behavior. Useful for
    the zero-telemetry verifier and for "this should work out of the
    box" sanity checks.
    """
    _ = reset_settings  # ensure cache is cleared before we set values
    monkeypatch.setenv("THEOURGIA_ENV", "test")
    for var in (
        "THEOURGIA_SENTRY_DSN",
        "RESTIC_REPOSITORY",
        "RESTIC_PASSWORD",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
    ):
        monkeypatch.delenv(var, raising=False)
    yield


# ── Application + HTTP client ────────────────────────────────────────


@pytest.fixture
def app(stock_env: None) -> object:
    """Construct a fresh FastAPI app for the test.

    Depends on ``stock_env`` so each app instance sees a clean
    environment with no operator opt-ins."""
    _ = stock_env
    from theourgia.api.app import create_app

    return create_app()


@pytest_asyncio.fixture
async def async_client(app: object) -> AsyncIterator[object]:
    """An :class:`httpx.AsyncClient` wired to the test app in-process.

    Uses :class:`httpx.ASGITransport` to dispatch requests through the
    FastAPI app's ASGI interface without binding a socket — fast,
    deterministic, and works in CI sandboxes."""
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        yield client


# ── Database ─────────────────────────────────────────────────────────


@pytest.fixture
def postgres_url() -> str | None:
    """Return the test Postgres URL if configured, else ``None``.

    Tests that need a live database should::

        def test_thing(postgres_url):
            if postgres_url is None:
                pytest.skip("set THEOURGIA_TEST_DATABASE_URL to enable")
            ...

    The docker-compose-based dev environment populates this; CI may
    set it explicitly. Tests that can run without a DB stay unaffected."""
    return os.environ.get("THEOURGIA_TEST_DATABASE_URL")
