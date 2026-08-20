"""The four lunar stations — the web's lunar adoration rite (20 Aug)."""

from __future__ import annotations

from datetime import UTC, datetime


def test_four_lunar_stations_all_present_and_chronological() -> None:
    from theourgia.core.lunar import lunar_stations
    from theourgia.core.lunar.stations import STATION_KEYS

    # Athens — not polar, so every station is found.
    stations = lunar_stations(datetime(2026, 8, 20, tzinfo=UTC), 37.98, 23.73)

    assert {s.key for s in stations} == set(STATION_KEYS)
    assert len(stations) == 4
    assert all(s.at is not None for s in stations)
    times = [s.at for s in stations]
    assert times == sorted(times), "stations must come back in time order"


def test_lunar_stations_requires_tz_aware() -> None:
    import pytest

    from theourgia.core.lunar import lunar_stations

    with pytest.raises(ValueError, match="timezone-aware"):
        lunar_stations(datetime(2026, 8, 20), 0.0, 0.0)  # noqa: DTZ001 — naive on purpose


def test_lunar_route_registered() -> None:
    from theourgia.api.app import create_app

    paths = set(create_app().openapi()["paths"].keys())
    assert "/api/v1/lunar/today" in paths
