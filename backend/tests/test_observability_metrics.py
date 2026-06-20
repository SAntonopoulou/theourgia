"""Tests for the Prometheus metrics surface."""

from __future__ import annotations

from theourgia.core.observability.metrics import (
    METRICS_CONTENT_TYPE,
    REGISTRY,
    backup_bytes_transferred_total,
    backup_run_duration_seconds,
    backup_runs_total,
    http_request_duration_seconds,
    http_requests_total,
    plugin_active,
    render_metrics,
)


def test_render_metrics_returns_text_body() -> None:
    body, content_type = render_metrics()
    assert isinstance(body, bytes)
    assert content_type == METRICS_CONTENT_TYPE
    assert "text/plain" in content_type


def test_all_expected_metrics_are_registered() -> None:
    body, _ = render_metrics()
    text = body.decode("utf-8")
    # Every metric we exposed should appear in the help / type lines
    for needle in (
        "theourgia_http_requests_total",
        "theourgia_http_request_duration_seconds",
        "theourgia_backup_runs_total",
        "theourgia_backup_run_duration_seconds",
        "theourgia_backup_bytes_transferred_total",
        "theourgia_plugin_active",
    ):
        assert needle in text, f"missing metric: {needle}"


def test_counter_increment_visible_in_output() -> None:
    http_requests_total.labels(method="GET", path_template="/api/v1/meta", status="200").inc()
    body, _ = render_metrics()
    text = body.decode("utf-8")
    assert 'theourgia_http_requests_total{method="GET"' in text
    assert 'path_template="/api/v1/meta"' in text
    assert 'status="200"' in text


def test_histogram_observation_visible_in_output() -> None:
    http_request_duration_seconds.labels(
        method="GET", path_template="/healthz"
    ).observe(0.012)
    body, _ = render_metrics()
    text = body.decode("utf-8")
    assert "theourgia_http_request_duration_seconds_bucket" in text
    assert "theourgia_http_request_duration_seconds_count" in text
    assert "theourgia_http_request_duration_seconds_sum" in text


def test_backup_runs_total_label_options() -> None:
    backup_runs_total.labels(outcome="success").inc()
    backup_runs_total.labels(outcome="failure").inc()
    backup_runs_total.labels(outcome="skipped").inc()
    body, _ = render_metrics()
    text = body.decode("utf-8")
    assert 'outcome="success"' in text
    assert 'outcome="failure"' in text
    assert 'outcome="skipped"' in text


def test_backup_bytes_counter_increments() -> None:
    starting = _read_counter_value(
        b"theourgia_backup_bytes_transferred_total"
    )
    backup_bytes_transferred_total.inc(12345)
    after = _read_counter_value(b"theourgia_backup_bytes_transferred_total")
    assert after - starting == 12345


def test_backup_duration_histogram_observes() -> None:
    backup_run_duration_seconds.observe(42.0)
    body, _ = render_metrics()
    text = body.decode("utf-8")
    assert "theourgia_backup_run_duration_seconds_bucket" in text


def test_plugin_active_gauge_can_be_set() -> None:
    plugin_active.set(3)
    body, _ = render_metrics()
    text = body.decode("utf-8")
    assert "theourgia_plugin_active 3" in text


def test_registry_is_isolated_not_default() -> None:
    """Our REGISTRY must not be the default prometheus_client registry —
    otherwise tests that touch our metrics would bleed into anything
    else that uses the default."""
    from prometheus_client import REGISTRY as DEFAULT_REGISTRY

    assert REGISTRY is not DEFAULT_REGISTRY


# ── helpers ──────────────────────────────────────────────────────────


def _read_counter_value(metric_name: bytes) -> float:
    """Parse the value of a Counter from /metrics output. Returns 0.0 if
    the counter hasn't been incremented (Prometheus text format starts
    them at 0).

    Matches the metric line (``<name> <value>``) exactly — not
    ``<name>_created`` and not labelled lines."""
    body, _ = render_metrics()
    for line in body.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0] == metric_name:
            try:
                return float(parts[1])
            except ValueError:
                continue
    return 0.0
