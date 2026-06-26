"""Unit tests for the synchronicities router + auto-tag (B120).

Covers:
  * Schemas: SyncCreate / SyncUpdate / SyncRead.
  * Auto-tag pure function: precision floor + source markers.
  * Helper round-trips: _to_sync_read.
  * Router registration smoke (six routes).
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1 import synchronicities as sync_module
from theourgia.api.routers.v1.synchronicities import (
    SyncCreate,
    SyncRead,
    SyncUpdate,
    _to_sync_read,
)
from theourgia.core.analytics.autotag import (
    AutotagResult,
    apply_precision_floor,
    autotag_synchronicity,
)
from theourgia.models.synchronicities import SynchronicityCategory


def _sync_row(
    *,
    category: SynchronicityCategory = SynchronicityCategory.NUMBER_SEQUENCE,
    intensity: int = 5,
    location_precision: str = "hidden",
    astro_snapshot: dict | None = None,
) -> SimpleNamespace:
    now = datetime(2026, 6, 26, tzinfo=timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        owner_id=uuid4(),
        occurred_at=now,
        description="Saw 1111 on the clock",
        category=category,
        intensity=intensity,
        structured_data={"number": "1111"},
        astro_snapshot=astro_snapshot or {
            "moon_phase": "waning",
            "source": "auto",
        },
        calendar_stamp={
            "iso_date": "2026-06-26",
            "weekday": "friday",
            "source": "auto",
        },
        weather_snapshot=None,
        location_lat=None,
        location_lng=None,
        location_precision=location_precision,
        linked_entry_ids=[],
        linked_entity_ids=[],
        linked_working_ids=[],
        created_at=now,
        updated_at=now,
    )


class _FixedAstroProvider:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def snapshot_at(self, moment, *, latitude=None, longitude=None):
        return dict(self.payload)


class _FixedCalendarProvider:
    def __init__(self, payload: dict) -> None:
        self.payload = payload

    def stamp_at(self, moment):
        return dict(self.payload)


class _FixedWeatherProvider:
    def __init__(self, payload: dict | None) -> None:
        self.payload = payload

    def snapshot_at(self, moment, *, latitude, longitude):
        return None if self.payload is None else dict(self.payload)


# ── apply_precision_floor ────────────────────────────────────────


def test_precision_floor_exact_keeps_full_precision() -> None:
    lat, lng = apply_precision_floor(37.971234, 23.726789, "exact")
    assert lat == pytest.approx(37.971234)
    assert lng == pytest.approx(23.726789)


def test_precision_floor_1km_rounds_to_two_decimal_places() -> None:
    lat, lng = apply_precision_floor(37.971234, 23.726789, "1km")
    assert lat == pytest.approx(37.97)
    assert lng == pytest.approx(23.73)


def test_precision_floor_10km_rounds_to_one_decimal_place() -> None:
    lat, lng = apply_precision_floor(37.971234, 23.726789, "10km")
    assert lat == pytest.approx(38.0)
    assert lng == pytest.approx(23.7)


def test_precision_floor_country_drops_location() -> None:
    assert apply_precision_floor(37.97, 23.73, "country") == (None, None)


def test_precision_floor_hidden_drops_location() -> None:
    assert apply_precision_floor(37.97, 23.73, "hidden") == (None, None)


def test_precision_floor_unknown_precision_treats_as_hidden() -> None:
    """Defensive: unknown levels drop the location."""
    assert apply_precision_floor(37.97, 23.73, "invalid") == (None, None)


def test_precision_floor_with_null_lat_or_lng_returns_nones() -> None:
    assert apply_precision_floor(None, 23.73, "exact") == (None, None)
    assert apply_precision_floor(37.97, None, "exact") == (None, None)


# ── autotag_synchronicity ─────────────────────────────────────────


def test_autotag_calls_providers_and_stamps_source() -> None:
    astro = _FixedAstroProvider({"moon_phase": "waning"})
    calendar = _FixedCalendarProvider({"iso_date": "2026-06-26"})
    result = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=None,
        location_lng=None,
        location_precision="hidden",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=None,
    )
    assert result.astro_snapshot["moon_phase"] == "waning"
    assert result.astro_snapshot["source"] == "auto"
    assert result.calendar_stamp["iso_date"] == "2026-06-26"
    assert result.calendar_stamp["source"] == "auto"
    assert result.weather_snapshot is None


def test_autotag_drops_location_for_hidden_precision() -> None:
    """The precision floor MUST be applied before providers see
    lat/lng — even if the caller supplied real values."""
    astro = _FixedAstroProvider({"moon_phase": "waning"})
    calendar = _FixedCalendarProvider({"iso_date": "2026-06-26"})
    result = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=37.971234,
        location_lng=23.726789,
        location_precision="hidden",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=None,
    )
    assert result.location_lat is None
    assert result.location_lng is None


def test_autotag_quantizes_location_to_1km() -> None:
    astro = _FixedAstroProvider({"moon_phase": "waning"})
    calendar = _FixedCalendarProvider({"iso_date": "2026-06-26"})
    result = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=37.971234,
        location_lng=23.726789,
        location_precision="1km",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=None,
    )
    assert result.location_lat == pytest.approx(37.97)
    assert result.location_lng == pytest.approx(23.73)


def test_autotag_weather_provider_called_only_with_location() -> None:
    astro = _FixedAstroProvider({"moon_phase": "waning"})
    calendar = _FixedCalendarProvider({"iso_date": "2026-06-26"})
    weather = _FixedWeatherProvider({"temp_c": 22})
    # Hidden precision: weather should NOT be populated.
    r1 = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=37.97,
        location_lng=23.73,
        location_precision="hidden",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=weather,
    )
    assert r1.weather_snapshot is None
    # Exact precision: weather IS populated.
    r2 = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=37.97,
        location_lng=23.73,
        location_precision="exact",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=weather,
    )
    assert r2.weather_snapshot is not None
    assert r2.weather_snapshot["temp_c"] == 22
    assert r2.weather_snapshot["source"] == "auto"


def test_autotag_weather_provider_returning_none_leaves_field_null() -> None:
    astro = _FixedAstroProvider({"moon_phase": "waning"})
    calendar = _FixedCalendarProvider({"iso_date": "2026-06-26"})
    weather = _FixedWeatherProvider(None)
    r = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=37.97,
        location_lng=23.73,
        location_precision="exact",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=weather,
    )
    assert r.weather_snapshot is None


def test_autotag_does_not_overwrite_existing_source_markers() -> None:
    """If a provider returns a snapshot that already has a `source`
    field, the autotagger leaves it alone."""
    astro = _FixedAstroProvider({"moon_phase": "waning", "source": "manual"})
    calendar = _FixedCalendarProvider({"iso_date": "2026-06-26"})
    r = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=None,
        location_lng=None,
        location_precision="hidden",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=None,
    )
    assert r.astro_snapshot["source"] == "manual"


def test_autotag_result_is_frozen_dataclass() -> None:
    """Defensive: the result is immutable so callers can't accidentally
    mutate it after the auto-tag pipeline returns."""
    astro = _FixedAstroProvider({"moon_phase": "new"})
    calendar = _FixedCalendarProvider({"iso_date": "2026-06-26"})
    r = autotag_synchronicity(
        occurred_at=datetime(2026, 6, 26, tzinfo=timezone.utc),
        location_lat=None,
        location_lng=None,
        location_precision="hidden",
        astro_provider=astro,
        calendar_provider=calendar,
        weather_provider=None,
    )
    assert isinstance(r, AutotagResult)
    with pytest.raises(Exception):
        r.astro_snapshot = {}  # type: ignore[misc]


# ── Schema validation ───────────────────────────────────────────


def test_sync_create_minimal_validates() -> None:
    p = SyncCreate(
        description="Saw 1111",
        category=SynchronicityCategory.NUMBER_SEQUENCE,
    )
    assert p.intensity == 5
    assert p.occurred_at is None
    assert p.location_precision == "hidden"


def test_sync_create_rejects_empty_description() -> None:
    with pytest.raises(ValidationError):
        SyncCreate(
            description="",
            category=SynchronicityCategory.NUMBER_SEQUENCE,
        )


def test_sync_create_rejects_intensity_out_of_range() -> None:
    with pytest.raises(ValidationError):
        SyncCreate(
            description="Saw 1111",
            category=SynchronicityCategory.NUMBER_SEQUENCE,
            intensity=0,
        )
    with pytest.raises(ValidationError):
        SyncCreate(
            description="Saw 1111",
            category=SynchronicityCategory.NUMBER_SEQUENCE,
            intensity=11,
        )


def test_sync_create_accepts_all_categories() -> None:
    for cat in SynchronicityCategory:
        p = SyncCreate(description="x", category=cat)
        assert p.category == cat


def test_sync_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        SyncCreate(
            description="x",
            category=SynchronicityCategory.NUMBER_SEQUENCE,
            owner_id=uuid4(),  # type: ignore[call-arg]
        )


def test_sync_update_is_fully_optional() -> None:
    p = SyncUpdate()
    assert p.model_dump(exclude_unset=True) == {}


def test_sync_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        SyncUpdate(owner_id=uuid4())  # type: ignore[call-arg]


def test_sync_update_clamps_intensity() -> None:
    with pytest.raises(ValidationError):
        SyncUpdate(intensity=15)


# ── Helpers ──────────────────────────────────────────────────────


def test_to_sync_read_serialises_enum_and_uuids() -> None:
    row = _sync_row(category=SynchronicityCategory.NAME_OCCURRENCE)
    read = _to_sync_read(row)
    assert read.id == str(row.id)
    assert read.owner_id == str(row.owner_id)
    assert read.category == "name_occurrence"
    assert read.intensity == 5
    assert read.linked_entry_ids == []


def test_to_sync_read_carries_source_markers_through() -> None:
    row = _sync_row(
        astro_snapshot={"moon_phase": "full", "source": "manual"},
    )
    read = _to_sync_read(row)
    assert read.astro_snapshot is not None
    assert read.astro_snapshot["source"] == "manual"


# ── Router smoke ─────────────────────────────────────────────────


def test_synchronicities_router_registers_six_routes() -> None:
    paths_methods = {
        (r.path, m)
        for r in sync_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    expected = {
        ("/synchronicities", "GET"),
        ("/synchronicities", "POST"),
        ("/synchronicities/{sync_id}", "GET"),
        ("/synchronicities/{sync_id}", "PATCH"),
        ("/synchronicities/{sync_id}", "DELETE"),
        ("/synchronicities/{sync_id}/retag", "POST"),
    }
    assert expected.issubset(paths_methods)


def test_synchronicities_router_response_models() -> None:
    from fastapi.routing import APIRoute

    by_key: dict[tuple[str, str], object] = {}
    for r in sync_module.router.routes:
        if not isinstance(r, APIRoute):
            continue
        for m in r.methods or ():
            by_key[(r.path, m)] = r.response_model
    assert by_key[("/synchronicities", "GET")] == list[SyncRead]
    assert by_key[("/synchronicities", "POST")] == SyncRead
    assert (
        by_key[("/synchronicities/{sync_id}/retag", "POST")] == SyncRead
    )


def test_set_providers_swaps_in_test_doubles() -> None:
    """The module-level provider setter accepts stubs (used by both
    the live boot path and tests)."""
    astro = _FixedAstroProvider({"moon_phase": "test"})
    calendar = _FixedCalendarProvider({"iso_date": "test"})
    weather = _FixedWeatherProvider({"temp_c": 99})
    sync_module.set_providers(
        astro=astro, calendar=calendar, weather=weather,
    )
    assert sync_module._ASTRO_PROVIDER is astro
    assert sync_module._CALENDAR_PROVIDER is calendar
    assert sync_module._WEATHER_PROVIDER is weather
    # Reset to defaults so other tests aren't affected.
    sync_module.set_providers(
        astro=sync_module._StubAstroProvider(),
        calendar=sync_module._StubCalendarProvider(),
    )
    sync_module._WEATHER_PROVIDER = None
