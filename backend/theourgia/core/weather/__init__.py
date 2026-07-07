"""Weather substrate — H11 auto-context banner.

Exposes a concrete :class:`WeatherProvider` implementation and a
module-level default instance. The provider protocol itself lives in
:mod:`theourgia.core.analytics.autotag` so this substrate depends only
on stdlib + ``httpx``.
"""

from __future__ import annotations

from theourgia.core.weather.open_meteo import (
    OPEN_METEO_ENDPOINT,
    OpenMeteoWeatherProvider,
    wmo_code_label,
)


__all__ = [
    "OPEN_METEO_ENDPOINT",
    "OpenMeteoWeatherProvider",
    "get_default_provider",
    "wmo_code_label",
]


_default_provider: OpenMeteoWeatherProvider | None = None


def get_default_provider() -> OpenMeteoWeatherProvider:
    """Return the process-wide default open-meteo provider.

    Lazily instantiated so tests can monkey-patch or replace before
    first use. Production code — including the ``GET /api/v1/weather/
    current`` route — resolves the provider through this helper so
    tests can override via FastAPI's ``dependency_overrides``.
    """
    global _default_provider
    if _default_provider is None:
        _default_provider = OpenMeteoWeatherProvider()
    return _default_provider
