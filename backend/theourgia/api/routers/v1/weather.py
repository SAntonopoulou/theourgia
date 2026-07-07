"""Current-weather endpoint — H11 auto-context banner.

Routes
------
``GET /api/v1/weather/current?lat=<>&lng=<>`` → normalised open-meteo
snapshot or ``{ snapshot: null }`` on fetch failure (200 either way).

Auth: cookie-authenticated user required. Anonymous callers get 401 so
the frontend can key the request to a real practitioner (and so we don't
proxy public weather lookups for free — open-meteo is generous but the
endpoint is not the vault's public perimeter).

Rate-limit: skipped for v0.x. Open-meteo's own limits (10k/day for the
free tier) plus this being a one-per-journal-page-load call keep us well
within budget without a per-user throttle.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from theourgia.api.deps import CurrentUser
from theourgia.core.weather import (
    OpenMeteoWeatherProvider,
    get_default_provider,
)


__all__ = ["router", "get_weather_provider"]

router = APIRouter()


class WeatherSnapshot(BaseModel):
    """Normalised current-weather snapshot returned by open-meteo."""

    model_config = ConfigDict(extra="forbid")

    source: str
    observed_at: str
    temperature_c: float
    apparent_c: float
    humidity_pct: int
    precipitation_mm: float
    wind_speed_ms: float
    wind_direction_deg: int
    cloud_cover_pct: int
    weather_code: int
    weather_label: str
    is_day: bool
    pressure_msl_hpa: float


class WeatherCurrentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    snapshot: WeatherSnapshot | None
    provider: str
    requested_lat: float
    requested_lng: float


def get_weather_provider() -> OpenMeteoWeatherProvider:
    """FastAPI dependency: resolve the process-wide default provider.

    Tests override this via ``app.dependency_overrides`` to inject an
    ``httpx.MockTransport``-backed provider.
    """
    return get_default_provider()


@router.get(
    "/weather/current",
    summary="Current weather at (lat, lng)",
    description=(
        "Fetches a normalised open-meteo snapshot for the given "
        "coordinates. Returns 200 with ``snapshot: null`` when the "
        "upstream fetch fails or the coordinates are out of coverage "
        "— never surfaces a 5xx to the frontend."
    ),
    response_model=WeatherCurrentResponse,
)
async def get_current_weather(
    current_user: CurrentUser,
    provider: Annotated[
        OpenMeteoWeatherProvider, Depends(get_weather_provider)
    ],
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
) -> WeatherCurrentResponse:
    snapshot_dict = provider.snapshot_at(
        datetime.now(tz=UTC),
        latitude=lat,
        longitude=lng,
    )
    snapshot = (
        WeatherSnapshot(**snapshot_dict) if snapshot_dict is not None else None
    )
    return WeatherCurrentResponse(
        snapshot=snapshot,
        provider="open-meteo",
        requested_lat=lat,
        requested_lng=lng,
    )
