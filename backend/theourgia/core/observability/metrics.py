"""Prometheus metrics.

A small, deliberate set of collectors covering the most operationally
useful signals. Every metric is registered against a *dedicated*
:class:`CollectorRegistry` instead of the global default; this keeps
test isolation simple (the registry can be replaced for tests if
needed) and prevents bleed-through with libraries that also register
defaults.

Metric naming follows the Prometheus convention
``theourgia_<unit>_<aspect>_<measurement>`` so all our metrics group
together in dashboards.

Adding a metric — checklist:

1. Define here, register with :data:`REGISTRY`.
2. Wire the call site (middleware, task, runner) to increment / observe.
3. Add an assertion in the metrics test that the metric appears in
   ``render_metrics()`` output.

The ``/metrics`` endpoint itself lives in
:mod:`theourgia.api.routers.metrics` and renders this registry.
"""

from __future__ import annotations

from typing import Final

from prometheus_client import (
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from prometheus_client.exposition import CONTENT_TYPE_LATEST

__all__ = [
    "REGISTRY",
    "METRICS_CONTENT_TYPE",
    "backup_bytes_transferred_total",
    "backup_run_duration_seconds",
    "backup_runs_total",
    "http_request_duration_seconds",
    "http_requests_total",
    "plugin_active",
    "render_metrics",
]


REGISTRY: Final[CollectorRegistry] = CollectorRegistry()
"""Theourgia's dedicated metrics registry.

Decoupled from the prometheus_client default registry so multiple
processes (API + Celery worker) can each maintain their own set
without colliding."""


METRICS_CONTENT_TYPE: Final[str] = CONTENT_TYPE_LATEST


# ── HTTP layer ───────────────────────────────────────────────────────

http_requests_total = Counter(
    "theourgia_http_requests_total",
    "Total HTTP requests processed",
    labelnames=("method", "path_template", "status"),
    registry=REGISTRY,
)

http_request_duration_seconds = Histogram(
    "theourgia_http_request_duration_seconds",
    "HTTP request latency in seconds",
    labelnames=("method", "path_template"),
    # Buckets tuned for an API: most calls under 100ms, occasional
    # heavier reads up to ~5s.
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=REGISTRY,
)


# ── Backup ───────────────────────────────────────────────────────────

backup_runs_total = Counter(
    "theourgia_backup_runs_total",
    "Backup run attempts by outcome",
    labelnames=("outcome",),
    registry=REGISTRY,
)

backup_run_duration_seconds = Histogram(
    "theourgia_backup_run_duration_seconds",
    "Wall-clock duration of a backup run in seconds",
    buckets=(1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600),
    registry=REGISTRY,
)

backup_bytes_transferred_total = Counter(
    "theourgia_backup_bytes_transferred_total",
    "Bytes transferred to backup storage across all runs",
    registry=REGISTRY,
)


# ── Plugins ──────────────────────────────────────────────────────────

plugin_active = Gauge(
    "theourgia_plugin_active",
    "Currently active plugins",
    registry=REGISTRY,
)


# ── Rendering ────────────────────────────────────────────────────────


def render_metrics() -> tuple[bytes, str]:
    """Render the registry to the Prometheus text exposition format.

    Returns ``(body_bytes, content_type)`` ready to be served from the
    ``/metrics`` endpoint.
    """
    return generate_latest(REGISTRY), METRICS_CONTENT_TYPE
