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
from theourgia.core.db import dispose_engine, session_scope
from theourgia.core.observability import get_logger
from theourgia.core.observability.sentry import init_sentry
from theourgia.core.plugins.startup import load_active_plugins

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

    # Activate installed plugins (v1-032). Failure-isolated twice over:
    # the sweep isolates per-plugin failures internally, and this outer
    # guard ensures even a DB outage at boot never blocks the API from
    # starting — plugins simply stay unloaded (logged) until restart.
    try:
        async with session_scope() as session:
            report = await load_active_plugins(
                session, plugins_dir=settings.plugins_dir,
            )
        if report.loaded or report.failed or report.missing_package:
            _log.info(
                "theourgia.plugins.startup",
                loaded=report.loaded,
                failed=list(report.failed),
                missing_package=report.missing_package,
            )
    except Exception as exc:  # noqa: BLE001 — plugin trouble must never block boot
        _log.error("theourgia.plugins.startup_skipped", error=str(exc))

    try:
        yield
    finally:
        _log.info("theourgia.api.shutdown")
        await dispose_engine()
