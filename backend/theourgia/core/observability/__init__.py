"""Observability — structured logging, metrics, optional crash reporting.

This package is the single source of truth for how Theourgia reports
its own behavior to operators. Three pillars:

- :mod:`logging` — structlog-based JSON logging with request-ID
  correlation. The same configuration applies in API processes,
  Celery workers, CLI tools, and tests.
- :mod:`metrics` — Prometheus collectors exposed at ``/metrics``
  (admin-scoped). HTTP request stats, backup runs, plugin activity.
- :mod:`sentry` — opt-in crash reporting. **Off by default.** Operators
  who want it set ``SENTRY_DSN`` in their environment; Theourgia's
  zero-telemetry promise holds.

Contextvars in :mod:`context` propagate per-request identifiers through
the async call stack so log lines and metrics carry the right
correlation IDs without explicit threading.
"""

from __future__ import annotations

from theourgia.core.observability.context import (
    bind_request_id,
    bind_user_id,
    clear_observability_context,
    get_request_id,
    get_user_id,
)
from theourgia.core.observability.logging import (
    configure_logging,
    get_logger,
)
from theourgia.core.observability.metrics import (
    backup_bytes_transferred_total,
    backup_run_duration_seconds,
    backup_runs_total,
    http_request_duration_seconds,
    http_requests_total,
    plugin_active,
    render_metrics,
)
from theourgia.core.observability.sentry import init_sentry

__all__ = [
    "bind_request_id",
    "bind_user_id",
    "clear_observability_context",
    "configure_logging",
    "get_logger",
    "get_request_id",
    "get_user_id",
    "init_sentry",
    "backup_bytes_transferred_total",
    "backup_run_duration_seconds",
    "backup_runs_total",
    "http_request_duration_seconds",
    "http_requests_total",
    "plugin_active",
    "render_metrics",
]
