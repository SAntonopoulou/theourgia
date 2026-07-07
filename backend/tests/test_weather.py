"""Weather substrate + endpoint tests — H11 (task #234).

Covers:

* :class:`OpenMeteoWeatherProvider` shape / unit-conversion / failure handling
  via :class:`httpx.MockTransport` round-trips.
* WMO weather-code → human-readable label mapping.
* ``GET /api/v1/weather/current`` endpoint returns 200 with a null snapshot
  on provider failure, and 401 without an auth cookie.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from theourgia.api.deps import get_current_user
from theourgia.api.routers.v1.weather import get_weather_provider
from theourgia.core.weather.open_meteo import (
    OPEN_METEO_ENDPOINT,
    OpenMeteoWeatherProvider,
    wmo_code_label,
)


# ── Fixtures ─────────────────────────────────────────────────────────


def _current_payload(**overrides: Any) -> dict[str, Any]:
    """Return a complete open-meteo ``current`` block; tests may override any field."""
    base = {
        "time": "2026-07-07T14:00",
        "interval": 900,
        "temperature_2m": 21.4,
        "relative_humidity_2m": 62,
        "apparent_temperature": 22.1,
        "is_day": 1,
        "precipitation": 0.0,
        "rain": 0.0,
        "showers": 0.0,
        "snowfall": 0.0,
        "weather_code": 1,
        "cloud_cover": 25,
        "pressure_msl": 1015.2,
        "surface_pressure": 1012.9,
        "wind_speed_10m": 18.0,  # km/h — provider converts to m/s
        "wind_direction_10m": 220,
        "wind_gusts_10m": 32.0,
    }
    base.update(overrides)
    return base


def _mock_provider(handler: Any) -> OpenMeteoWeatherProvider:
    """Build an OpenMeteoWeatherProvider bound to an httpx.MockTransport."""
    client = httpx.Client(transport=httpx.MockTransport(handler))
    return OpenMeteoWeatherProvider(http_client=client)


# ── wmo_code_label mapping ───────────────────────────────────────────


def test_wmo_code_label_clear() -> None:
    assert wmo_code_label(0) == "Clear"


def test_wmo_code_label_slight_rain() -> None:
    assert wmo_code_label(61) == "Slight rain"


def test_wmo_code_label_thunderstorm() -> None:
    assert wmo_code_label(95) == "Thunderstorm"


def test_wmo_code_label_unknown_returns_placeholder() -> None:
    assert wmo_code_label(999) == "Unknown"


# ── OpenMeteoWeatherProvider — happy path ────────────────────────────


def test_snapshot_at_returns_normalised_dict() -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(200, json={"current": _current_payload()})

    provider = _mock_provider(handler)
    snap = provider.snapshot_at(
        datetime.now(tz=UTC), latitude=37.9838, longitude=23.7275
    )

    assert snap is not None
    # URL carries all the required query params.
    assert captured["url"].startswith(OPEN_METEO_ENDPOINT)
    assert "latitude=37.9838" in captured["url"]
    assert "longitude=23.7275" in captured["url"]
    assert "timezone=auto" in captured["url"]
    assert "current=" in captured["url"]
    assert "temperature_2m" in captured["url"]

    # Shape and normalisation.
    assert snap["source"] == "open-meteo"
    assert snap["observed_at"] == "2026-07-07T14:00"
    assert snap["temperature_c"] == pytest.approx(21.4)
    assert snap["apparent_c"] == pytest.approx(22.1)
    assert snap["humidity_pct"] == 62
    assert snap["precipitation_mm"] == pytest.approx(0.0)
    # 18 km/h → 5 m/s (rounded to 3dp).
    assert snap["wind_speed_ms"] == pytest.approx(5.0, rel=1e-3)
    assert snap["wind_direction_deg"] == 220
    assert snap["cloud_cover_pct"] == 25
    assert snap["weather_code"] == 1
    assert snap["weather_label"] == "Mainly clear"
    assert snap["is_day"] is True
    assert snap["pressure_msl_hpa"] == pytest.approx(1015.2)


def test_snapshot_at_maps_weather_code_to_label() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"current": _current_payload(weather_code=95)}
        )

    snap = _mock_provider(handler).snapshot_at(
        datetime.now(tz=UTC), latitude=0.0, longitude=0.0
    )
    assert snap is not None
    assert snap["weather_code"] == 95
    assert snap["weather_label"] == "Thunderstorm"


def test_snapshot_at_is_day_false_when_zero() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"current": _current_payload(is_day=0)}
        )

    snap = _mock_provider(handler).snapshot_at(
        datetime.now(tz=UTC), latitude=0.0, longitude=0.0
    )
    assert snap is not None
    assert snap["is_day"] is False


# ── OpenMeteoWeatherProvider — failure paths ─────────────────────────


def test_snapshot_at_returns_none_on_http_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("no route")

    snap = _mock_provider(handler).snapshot_at(
        datetime.now(tz=UTC), latitude=51.5, longitude=0.0
    )
    assert snap is None


def test_snapshot_at_returns_none_on_404() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, text="not found")

    snap = _mock_provider(handler).snapshot_at(
        datetime.now(tz=UTC), latitude=51.5, longitude=0.0
    )
    assert snap is None


def test_snapshot_at_returns_none_on_missing_current() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"latitude": 0, "longitude": 0})

    snap = _mock_provider(handler).snapshot_at(
        datetime.now(tz=UTC), latitude=0.0, longitude=0.0
    )
    assert snap is None


def test_snapshot_at_returns_none_on_malformed_current_field() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "current": _current_payload(temperature_2m="not-a-number"),
            },
        )

    snap = _mock_provider(handler).snapshot_at(
        datetime.now(tz=UTC), latitude=0.0, longitude=0.0
    )
    assert snap is None


def test_snapshot_at_returns_none_on_non_json_body() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="<html>oops</html>")

    snap = _mock_provider(handler).snapshot_at(
        datetime.now(tz=UTC), latitude=0.0, longitude=0.0
    )
    assert snap is None


# ── /api/v1/weather/current endpoint ─────────────────────────────────


class _FakeUser:
    """Minimal user-shaped object for endpoint auth tests.

    The endpoint only cares that ``current_user`` is not None; it never
    reads any field. Using a bare object keeps the fixture DB-free.
    """


def _null_provider() -> OpenMeteoWeatherProvider:
    """A provider whose upstream always returns None."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="upstream boom")

    return OpenMeteoWeatherProvider(
        http_client=httpx.Client(transport=httpx.MockTransport(handler))
    )


def _sunny_provider() -> OpenMeteoWeatherProvider:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"current": _current_payload()})

    return OpenMeteoWeatherProvider(
        http_client=httpx.Client(transport=httpx.MockTransport(handler))
    )


@pytest.mark.asyncio
async def test_endpoint_returns_401_without_auth(app: Any) -> None:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        response = await ac.get(
            "/api/v1/weather/current",
            params={"lat": 51.5, "lng": 0.0},
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_endpoint_returns_snapshot_when_provider_succeeds(
    app: Any,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: _FakeUser()
    app.dependency_overrides[get_weather_provider] = _sunny_provider
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://testserver"
        ) as ac:
            response = await ac.get(
                "/api/v1/weather/current",
                params={"lat": 37.9838, "lng": 23.7275},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_weather_provider, None)

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "open-meteo"
    assert body["requested_lat"] == pytest.approx(37.9838)
    assert body["requested_lng"] == pytest.approx(23.7275)
    assert body["snapshot"] is not None
    assert body["snapshot"]["weather_label"] == "Mainly clear"
    assert body["snapshot"]["source"] == "open-meteo"


@pytest.mark.asyncio
async def test_endpoint_returns_200_with_null_snapshot_on_provider_failure(
    app: Any,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: _FakeUser()
    app.dependency_overrides[get_weather_provider] = _null_provider
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://testserver"
        ) as ac:
            response = await ac.get(
                "/api/v1/weather/current",
                params={"lat": 51.5, "lng": 0.0},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_weather_provider, None)

    # Provider failure must NEVER become 5xx — the banner should render
    # "weather unavailable" gracefully.
    assert response.status_code == 200
    body = response.json()
    assert body["snapshot"] is None
    assert body["provider"] == "open-meteo"
    assert body["requested_lat"] == pytest.approx(51.5)
    assert body["requested_lng"] == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_endpoint_rejects_out_of_range_coordinates(app: Any) -> None:
    app.dependency_overrides[get_current_user] = lambda: _FakeUser()
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://testserver"
        ) as ac:
            response = await ac.get(
                "/api/v1/weather/current",
                params={"lat": 100.0, "lng": 0.0},
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 422


def test_endpoint_registered_in_openapi() -> None:
    """Router import + registration wiring smoke test."""
    from theourgia.api.app import create_app

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/api/v1/weather/current" in paths
