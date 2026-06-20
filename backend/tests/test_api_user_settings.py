"""User-settings router shape tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.user_settings import (
    DEFAULT_LAT,
    DEFAULT_LNG,
    LAT_KEY,
    LNG_KEY,
    LocationRead,
    LocationWrite,
)


def test_default_location_is_greenwich() -> None:
    assert DEFAULT_LAT == 51.4769
    assert DEFAULT_LNG == 0.0


def test_setting_keys_use_astro_namespace() -> None:
    assert LAT_KEY == "astro.lat"
    assert LNG_KEY == "astro.lng"


def test_location_read_round_trips() -> None:
    loc = LocationRead(lat=51.5, lng=-0.1)
    assert loc.model_dump() == {"lat": 51.5, "lng": -0.1}


@pytest.mark.parametrize(
    "lat,lng",
    [(-91, 0), (91, 0), (0, -181), (0, 181), (1000, 1000)],
)
def test_location_write_rejects_out_of_range(lat: float, lng: float) -> None:
    with pytest.raises(ValidationError):
        LocationWrite(lat=lat, lng=lng)


def test_location_write_rejects_extras() -> None:
    with pytest.raises(ValidationError):
        LocationWrite(lat=0, lng=0, altitude=100)  # type: ignore[call-arg]


def test_user_settings_router_registered() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    paths = set(schema["paths"].keys())
    assert "/api/v1/users/me/settings/location" in paths
