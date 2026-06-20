"""FastAPI lifespan — startup and shutdown.

Used as ``FastAPI(lifespan=lifespan)`` so the app supports the async
context manager protocol Uvicorn / Starlette wire to startup/shutdown.

Responsibilities:

- **Startup**: verify required secrets are present (refuses to start
  otherwise in non-test environments). Reserve room for future startup
  work (federation key bootstrap, ephemeris availability check, etc.).
- **Shutdown**: dispose the SQLAlchemy engine cleanly so the connection
  pool returns underlying sockets before process exit.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from theourgia.core.config import get_settings
from theourgia.core.db import dispose_engine
from theourgia.core.observability import get_logger
from theourgia.core.observability.sentry import init_sentry

__all__ = ["lifespan"]

_log = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown context manager."""
    settings = get_settings()

    # Refuse to start with missing required secrets (non-test only).
    settings.require_secrets_or_raise()

    # Optional crash reporting (off by default; opt-in via SENTRY_DSN)
    sentry_active = init_sentry(settings)

    _log.info(
        "theourgia.api.starting",
        env=settings.env,
        instance_id=settings.instance_id,
        base_url=settings.base_url,
        sentry=sentry_active,
        telemetry="none" if not sentry_active else "operator_opt_in",
    )

    try:
        yield
    finally:
        _log.info("theourgia.api.shutdown")
        await dispose_engine()
