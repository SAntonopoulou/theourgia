"""Open-Meteo weather provider — H11 (task #234).

Concrete implementation of the :class:`WeatherProvider` Protocol declared in
:mod:`theourgia.core.analytics.autotag`. Feeds the journal auto-context
banner with a small normalised snapshot of current conditions at the
user's stored lat/lng.

Endpoint used
-------------
``https://api.open-meteo.com/v1/forecast`` — no API key required, generous
free-tier limits, WMO weather-interpretation codes returned as integers.

Sync vs async
-------------
The :class:`WeatherProvider` protocol is intentionally synchronous — the
autotagger runs in a sync context after all the astro/calendar
computations. So the concrete implementation uses :class:`httpx.Client`
(sync) not ``AsyncClient``. Tests inject an ``httpx.MockTransport``-backed
sync client via the ``http_client`` field.

Return contract
---------------
:meth:`OpenMeteoWeatherProvider.snapshot_at` returns ``None`` on any of:

* network / HTTP error
* non-200 status
* malformed / missing ``current`` object in the response
* coordinates rejected by open-meteo (out of coverage)

On success returns a dict with the fields documented in the module
docstring of :mod:`theourgia.core.analytics.autotag`. Units are
normalised (m/s wind, integer humidity percent, ISO timestamp).

Honesty rules
-------------
* Wind speed is converted km/h → m/s once at ingest — downstream code
  never has to remember the source unit.
* ``weather_label`` is derived from the WMO ``weather_code`` via the
  official WMO 4677 interpretation table (see :data:`_WMO_CODE_LABELS`).
  Unknown codes map to ``"Unknown"`` rather than raising — the code
  itself is preserved so downstream can still render a fallback.
* Timeouts are aggressive (5s) — the banner must never block a page
  load. Failure returns ``None`` so the caller can gracefully render
  "weather unavailable".
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Final

import httpx


__all__ = [
    "OPEN_METEO_ENDPOINT",
    "OpenMeteoWeatherProvider",
    "wmo_code_label",
]


_log = logging.getLogger(__name__)


OPEN_METEO_ENDPOINT: Final[str] = "https://api.open-meteo.com/v1/forecast"

# Comma-separated `current=` fields we request every call. Kept as a
# module constant so tests can assert the exact wire query.
_CURRENT_FIELDS: Final[str] = ",".join(
    [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "snowfall",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "surface_pressure",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
    ]
)


# WMO 4677 weather-interpretation codes.
# Mapping is the standard open-meteo-documented set; kept in this file
# rather than shipped as a data file because it's small, stable, and
# tightly coupled to the parsing code below.
_WMO_CODE_LABELS: Final[dict[int, str]] = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def wmo_code_label(code: int) -> str:
    """Map a WMO 4677 weather code → human-readable label.

    Returns ``"Unknown"`` for unrecognised codes rather than raising —
    the code itself is preserved in the snapshot so callers can still
    render a numeric fallback.
    """
    return _WMO_CODE_LABELS.get(code, "Unknown")


# km/h → m/s conversion factor (open-meteo returns wind_speed_10m in
# km/h by default when no wind_speed_unit param is supplied).
_KMH_TO_MS: Final[float] = 1000.0 / 3600.0


@dataclass(slots=True)
class OpenMeteoWeatherProvider:
    """Concrete :class:`WeatherProvider` fetching from open-meteo.com.

    Tests inject an ``httpx.MockTransport``-backed sync client via
    ``http_client``. Production code omits it — the provider then opens
    a short-lived :class:`httpx.Client` per call.
    """

    http_client: httpx.Client | None = None
    timeout_seconds: float = 5.0
    endpoint: str = field(default=OPEN_METEO_ENDPOINT)

    def snapshot_at(
        self,
        moment: datetime,  # noqa: ARG002 — open-meteo /forecast is "current now"
        *,
        latitude: float,
        longitude: float,
    ) -> dict | None:
        """Return the current-weather snapshot at ``(latitude, longitude)``.

        The ``moment`` parameter is part of the :class:`WeatherProvider`
        protocol but open-meteo's ``/forecast?current=...`` always
        returns "now" — historical queries need a different endpoint.
        We accept the argument for signature-compatibility and simply
        ignore it in v1. If historical lookback is ever needed, this is
        the seam to swap in ``/archive`` calls.

        Returns ``None`` on any fetch / parse failure.
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": _CURRENT_FIELDS,
            "timezone": "auto",
        }

        try:
            if self.http_client is not None:
                response = self.http_client.get(self.endpoint, params=params)
            else:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    response = client.get(self.endpoint, params=params)
        except httpx.HTTPError as exc:
            _log.info("open-meteo fetch failed: %s", exc)
            return None

        if response.status_code != 200:
            _log.info(
                "open-meteo returned HTTP %s for (%s, %s)",
                response.status_code,
                latitude,
                longitude,
            )
            return None

        try:
            payload = response.json()
        except ValueError:
            _log.info("open-meteo returned non-JSON body")
            return None

        current = payload.get("current")
        if not isinstance(current, dict):
            _log.info("open-meteo payload missing 'current' object")
            return None

        return _normalise_current(current)


def _normalise_current(current: dict) -> dict | None:
    """Turn open-meteo's ``current`` block into our stable snapshot dict.

    Returns ``None`` if a required numeric field is missing / malformed
    rather than returning a half-populated dict — the auto-context
    banner needs the whole picture or nothing.
    """
    try:
        wind_speed_kmh = float(current["wind_speed_10m"])
        weather_code = int(current["weather_code"])
        snapshot = {
            "source": "open-meteo",
            "observed_at": str(current["time"]),
            "temperature_c": float(current["temperature_2m"]),
            "apparent_c": float(current["apparent_temperature"]),
            "humidity_pct": int(current["relative_humidity_2m"]),
            "precipitation_mm": float(current["precipitation"]),
            "wind_speed_ms": round(wind_speed_kmh * _KMH_TO_MS, 3),
            "wind_direction_deg": int(current["wind_direction_10m"]),
            "cloud_cover_pct": int(current["cloud_cover"]),
            "weather_code": weather_code,
            "weather_label": wmo_code_label(weather_code),
            "is_day": bool(current["is_day"]),
            "pressure_msl_hpa": float(current["pressure_msl"]),
        }
    except (KeyError, TypeError, ValueError) as exc:
        _log.info("open-meteo current payload malformed: %s", exc)
        return None

    return snapshot
