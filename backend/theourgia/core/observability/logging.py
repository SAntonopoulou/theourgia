"""Structured logging configuration.

We wrap stdlib ``logging`` with :mod:`structlog` so every log line is
a JSON object with consistent keys: ``timestamp``, ``level``,
``event``, ``logger``, plus any context that's been bound
(``request_id``, ``user_id``, route-specific extras).

Configuration is idempotent: :func:`configure_logging` may be called
multiple times (e.g., once on API startup, once in each Celery worker)
without doubling up handlers.

Output formats:

- **JSON** in production (machine-parseable for log aggregation).
- **Pretty / colorized** in development (human-readable terminal output).
- Format choice is automatic from :attr:`Settings.env`; can be forced
  via ``THEOURGIA_LOG_FORMAT``.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog

from theourgia.core.observability.context import get_request_id, get_user_id

__all__ = ["configure_logging", "get_logger"]


_configured: bool = False


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger.

    The returned logger is a ``BoundLogger`` over the stdlib root, so
    calls compose with :mod:`logging`-aware integrations (Sentry,
    pytest's caplog, etc.).
    """
    return structlog.stdlib.get_logger(name) if name else structlog.stdlib.get_logger()


def configure_logging(
    *,
    level: str = "INFO",
    json_output: bool = True,
) -> None:
    """Configure structlog and stdlib logging together.

    Args:
        level: stdlib log level name (``"DEBUG"``, ``"INFO"``, ...).
        json_output: when ``True``, render lines as JSON; otherwise the
            colorized ConsoleRenderer is used (development mode).
    """
    global _configured
    level_name = level.upper()
    level_value = logging.getLevelName(level_name)
    if not isinstance(level_value, int):
        level_value = logging.INFO

    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        _add_request_context,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if json_output:
        renderer: Any = structlog.processors.JSONRenderer(sort_keys=True)
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty())

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level_value),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Stdlib root logger — route everything through structlog's formatter
    # so libraries that log via stdlib (SQLAlchemy, uvicorn, etc.) end up
    # in the same JSON pipeline.
    root_logger = logging.getLogger()
    root_logger.setLevel(level_value)

    # Remove any pre-existing handlers so repeat calls don't duplicate.
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)

    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(level_value)
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            processor=renderer,
            foreign_pre_chain=shared_processors,
        )
    )
    root_logger.addHandler(handler)

    # Tame the noisiest third-party loggers in production
    if json_output:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    _configured = True


def _add_request_context(
    _logger: object, _method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Processor that pulls request_id / user_id off the contextvars.

    Acts on every log call regardless of the binding site. Avoids
    requiring every caller to remember to bind these explicitly.
    """
    request_id = get_request_id()
    if request_id:
        event_dict.setdefault("request_id", request_id)
    user_id = get_user_id()
    if user_id:
        event_dict.setdefault("user_id", user_id)
    return event_dict
