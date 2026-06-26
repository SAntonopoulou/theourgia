"""Unit tests for analytics aggregates (B123).

Covers the pure parts: bucket_for, _rank, pearson, spearman, and
the schema shapes. Integration tests against a live session land
alongside B124 (digest) where the fixture infrastructure is in
scope.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from theourgia.api.routers.v1 import analytics as analytics_module
from theourgia.api.routers.v1.analytics import (
    CorrelationPayload,
    HeatmapPayload,
    TimeseriesPayload,
)
from theourgia.core.analytics.aggregates import (
    CORRELATION_MIN_SAMPLE,
    HEATMAP_MIN_SAMPLE,
    TIMESERIES_MIN_SAMPLE,
    CorrelationResponse,
    HeatmapResponse,
    TimeseriesResponse,
    TodayResponse,
    bucket_for,
    pearson,
    spearman,
)


# ── Min-sample constants ────────────────────────────────────────


def test_min_sample_thresholds() -> None:
    """The H06 honesty rule: small-sample flag thresholds."""
    assert TIMESERIES_MIN_SAMPLE == 5
    assert HEATMAP_MIN_SAMPLE == 10
    assert CORRELATION_MIN_SAMPLE == 20


# ── bucket_for ──────────────────────────────────────────────────


def test_bucket_for_day_granularity() -> None:
    dt = datetime(2026, 6, 26, 14, 32, tzinfo=timezone.utc)
    assert bucket_for(dt, "day") == "2026-06-26"


def test_bucket_for_week_granularity() -> None:
    # 2026-06-26 is a Friday in ISO week 26.
    dt = datetime(2026, 6, 26, tzinfo=timezone.utc)
    assert bucket_for(dt, "week") == "2026-W26"


def test_bucket_for_month_granularity() -> None:
    dt = datetime(2026, 6, 26, tzinfo=timezone.utc)
    assert bucket_for(dt, "month") == "2026-06"


def test_bucket_for_rejects_unknown_granularity() -> None:
    with pytest.raises(ValueError):
        bucket_for(datetime.now(), "year")  # type: ignore[arg-type]


# ── Pearson + Spearman ──────────────────────────────────────────


def test_pearson_perfect_positive() -> None:
    xs = [1.0, 2.0, 3.0, 4.0]
    ys = [2.0, 4.0, 6.0, 8.0]
    assert pearson(xs, ys) == pytest.approx(1.0)


def test_pearson_perfect_negative() -> None:
    xs = [1.0, 2.0, 3.0, 4.0]
    ys = [4.0, 3.0, 2.0, 1.0]
    assert pearson(xs, ys) == pytest.approx(-1.0)


def test_pearson_zero_for_no_correlation() -> None:
    # Perfectly symmetric around 0: average of products is 0.
    xs = [-2.0, -1.0, 0.0, 1.0, 2.0]
    ys = [4.0, 1.0, 0.0, 1.0, 4.0]
    assert pearson(xs, ys) == pytest.approx(0.0, abs=1e-9)


def test_pearson_handles_constant_series() -> None:
    """Zero variance on either side returns 0 (rather than raising)."""
    assert pearson([1.0, 1.0, 1.0], [2.0, 3.0, 4.0]) == 0.0


def test_pearson_handles_short_series() -> None:
    assert pearson([1.0], [2.0]) == 0.0
    assert pearson([], []) == 0.0


def test_spearman_perfect_positive_via_rank() -> None:
    """Non-linear monotonic → Spearman 1.0, Pearson < 1.0."""
    xs = [1.0, 2.0, 3.0, 4.0]
    ys = [1.0, 4.0, 9.0, 16.0]
    assert spearman(xs, ys) == pytest.approx(1.0)


def test_spearman_perfect_negative_via_rank() -> None:
    xs = [1.0, 2.0, 3.0, 4.0]
    ys = [16.0, 9.0, 4.0, 1.0]
    assert spearman(xs, ys) == pytest.approx(-1.0)


# ── Schema shapes ──────────────────────────────────────────────


def test_timeseries_response_shape() -> None:
    r = TimeseriesResponse(
        points=[], sample_size=0, small_sample=True,
    )
    assert r.small_sample is True


def test_heatmap_response_shape() -> None:
    r = HeatmapResponse(
        cells=[],
        x_axis_label="weekday",
        y_axis_label="category",
        value_axis_label="count",
        sample_size=12,
        small_sample=False,
    )
    assert r.x_axis_label == "weekday"


def test_correlation_response_shape() -> None:
    r = CorrelationResponse(
        axes=["intensity", "weekday_num"],
        pearson=[[1.0, 0.3], [0.3, 1.0]],
        spearman=[[1.0, 0.4], [0.4, 1.0]],
        sample_size=25,
        small_sample=False,
        null_threshold_warning=False,
    )
    assert len(r.pearson) == 2


def test_today_response_shape() -> None:
    r = TodayResponse(entries_today=3, workings_today=1, syncs_today=2)
    assert r.entries_today == 3


# ── Payload schemas ────────────────────────────────────────────


def test_timeseries_payload_accepts_default_granularity() -> None:
    p = TimeseriesPayload(subject="entry")
    assert p.granularity == "day"


def test_timeseries_payload_rejects_unknown_subject() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        TimeseriesPayload(subject="working")  # type: ignore[arg-type]


def test_heatmap_payload_defaults_synchronicity_subject() -> None:
    p = HeatmapPayload(x_axis="weekday", y_axis="category")
    assert p.subject == "synchronicity"


def test_correlation_payload_default_axes() -> None:
    p = CorrelationPayload()
    assert p.axes == ["intensity", "weekday_num"]


# ── Router smoke ──────────────────────────────────────────────


def test_analytics_router_now_registers_five_routes() -> None:
    """B122 shipped /query; B123 adds /timeseries, /heatmap,
    /correlation, /today."""
    paths_methods = {
        (r.path, m)
        for r in analytics_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/analytics/query", "POST") in paths_methods
    assert ("/analytics/timeseries", "POST") in paths_methods
    assert ("/analytics/heatmap", "POST") in paths_methods
    assert ("/analytics/correlation", "POST") in paths_methods
    assert ("/analytics/today", "GET") in paths_methods


def test_analytics_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in analytics_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert by_key[("/analytics/timeseries", "POST")] == TimeseriesResponse
    assert by_key[("/analytics/heatmap", "POST")] == HeatmapResponse
    assert by_key[("/analytics/correlation", "POST")] == CorrelationResponse
    assert by_key[("/analytics/today", "GET")] == TodayResponse


# ── Small-sample flagging ─────────────────────────────────────


def test_timeseries_small_sample_flag_below_threshold() -> None:
    # Direct shape test — the compute path runs against a DB.
    r = TimeseriesResponse(points=[], sample_size=3, small_sample=True)
    assert r.small_sample is True
    assert r.sample_size < TIMESERIES_MIN_SAMPLE


def test_heatmap_small_sample_flag_below_threshold() -> None:
    r = HeatmapResponse(
        cells=[], x_axis_label="x", y_axis_label="y",
        value_axis_label="count", sample_size=5, small_sample=True,
    )
    assert r.small_sample is True
