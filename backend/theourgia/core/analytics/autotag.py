"""Synchronicity auto-tagger (B120).

Computes the astro_snapshot, calendar_stamp, and (optional)
weather_snapshot for a synchronicity at a given moment + location.

Pure: no I/O. The providers are dependency-injected so tests can
pass stubs that return known fixtures, and the route can swap in
live implementations that hit the Phase 03 astro engine, the
calendar engine, and an optional weather provider.

Honesty rules:
  * Every auto-tagged snapshot carries ``source: "auto"``. When
    the practitioner edits a snapshot later, the route replaces it
    with ``source: "manual"``.
  * The location-precision floor is enforced HERE before any
    provider sees lat/lng. If the floor is "hidden", providers are
    called with ``location=None`` so they cannot leak.
  * The weather provider is optional. When absent, the response's
    ``weather_snapshot`` is ``None`` (not an empty object) so the
    frontend can distinguish "no weather provider configured" from
    "no weather data at that time".
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

__all__ = [
    "AstroProvider",
    "AutotagResult",
    "CalendarProvider",
    "WeatherProvider",
    "apply_precision_floor",
    "autotag_synchronicity",
]


# ── Provider protocols ────────────────────────────────────────────


class AstroProvider(Protocol):
    """Returns the astrological snapshot at a moment.

    Shape (frozen for v1):
      {
        "moon_phase": "new" | "waxing" | "full" | "waning",
        "planetary_hour": "saturn" | ...,
        "sun_sign": "cancer" | ...,
        "moon_sign": "scorpio" | ...,
        "void_of_course": bool,
      }
    """

    def snapshot_at(
        self,
        moment: datetime,
        *,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> dict: ...


class CalendarProvider(Protocol):
    """Returns the calendar stamp at a moment.

    Shape (frozen for v1):
      {
        "iso_date": "YYYY-MM-DD",
        "weekday": "monday" | ...,
        "season": "spring" | ...,
        "festivals": [<slug>, ...],
        "hellenic_day": "deipnon" | ... | null,
        "thelemic_day": "festival_of_isis" | ... | null,
      }
    """

    def stamp_at(self, moment: datetime) -> dict: ...


class WeatherProvider(Protocol):
    """Returns a small weather snapshot. ``None`` is a valid return
    (no data at this time / outside service coverage)."""

    def snapshot_at(
        self,
        moment: datetime,
        *,
        latitude: float,
        longitude: float,
    ) -> dict | None: ...


# ── Precision floor ───────────────────────────────────────────────


# Per-precision-level decimal-places kept on lat/lng.
# These match the Pilgrimage Map quantization grid:
#   exact   — full precision
#   1km     — ~3 decimal places (0.001° ≈ 111m at the equator;
#             we round to 0.01° for the 1km bucket)
#   10km    — ~1 decimal place (0.1° ≈ 11km)
#   country — drop lat/lng entirely
#   hidden  — drop lat/lng entirely

_PRECISION_DECIMALS: dict[str, int | None] = {
    "exact": 6,
    "1km": 2,
    "10km": 1,
    "country": None,  # drop
    "hidden": None,  # drop
}


def apply_precision_floor(
    latitude: float | None,
    longitude: float | None,
    precision: str,
) -> tuple[float | None, float | None]:
    """Apply the precision floor to a lat/lng pair.

    Returns ``(None, None)`` for ``country`` + ``hidden``.
    Otherwise rounds both values to the precision's decimal places.
    Unknown precisions are treated as ``hidden`` (the safest default).
    """
    if latitude is None or longitude is None:
        return (None, None)
    decimals = _PRECISION_DECIMALS.get(precision)
    if decimals is None:
        return (None, None)
    return (round(latitude, decimals), round(longitude, decimals))


# ── Autotag pipeline ──────────────────────────────────────────────


@dataclass(frozen=True)
class AutotagResult:
    """The four snapshots the route writes into the synchronicity
    row. Each carries a ``source`` marker so the frontend can
    distinguish auto-tagged from practitioner-supplied data."""

    astro_snapshot: dict
    calendar_stamp: dict
    weather_snapshot: dict | None
    # The lat/lng after the precision floor has been applied.
    location_lat: float | None
    location_lng: float | None


def _stamp_source(snapshot: dict | None, source: str) -> dict | None:
    """Embed a ``source`` marker without overwriting an existing one."""
    if snapshot is None:
        return None
    if "source" in snapshot:
        return snapshot
    return {**snapshot, "source": source}


def autotag_synchronicity(
    *,
    occurred_at: datetime,
    location_lat: float | None,
    location_lng: float | None,
    location_precision: str,
    astro_provider: AstroProvider,
    calendar_provider: CalendarProvider,
    weather_provider: WeatherProvider | None = None,
) -> AutotagResult:
    """Compute the astro / calendar / weather snapshots at
    ``occurred_at`` for the given location.

    The location-precision floor is applied BEFORE any provider
    sees lat/lng. ``country`` and ``hidden`` precisions zero out
    the location entirely (None / None) so providers cannot leak
    precise positioning even if their inputs accept floats.
    """
    safe_lat, safe_lng = apply_precision_floor(
        location_lat, location_lng, location_precision,
    )

    astro_raw = astro_provider.snapshot_at(
        occurred_at, latitude=safe_lat, longitude=safe_lng,
    )
    calendar_raw = calendar_provider.stamp_at(occurred_at)

    weather_raw: dict | None = None
    if (
        weather_provider is not None
        and safe_lat is not None
        and safe_lng is not None
    ):
        weather_raw = weather_provider.snapshot_at(
            occurred_at, latitude=safe_lat, longitude=safe_lng,
        )

    return AutotagResult(
        astro_snapshot=_stamp_source(astro_raw, "auto") or {"source": "auto"},
        calendar_stamp=_stamp_source(calendar_raw, "auto") or {"source": "auto"},
        weather_snapshot=_stamp_source(weather_raw, "auto"),
        location_lat=safe_lat,
        location_lng=safe_lng,
    )
