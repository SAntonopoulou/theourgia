"""Lunar adorations — the four lunar stations of the day.

The lunar counterpart of ``GET /resh/today`` (the solar Liber Resh rite). Web
parity, 20 Aug: enabling lunar adorations on the phone shows a four-station rite
(moonrise / culmination / moonset / nadir); the web had only a calendar chip, so
"nothing came up". This serves the four station times for the practitioner's day.

Pure computation from lat/lng/tz (no auth, like ``/calendar/today``). No godform
preset yet — that text comes from a chosen adoration set, which has no web
surface; the stations carry their plain names until it does. See
:mod:`theourgia.core.lunar`.
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict

from theourgia.core.lunar import lunar_stations

__all__ = ["router"]

router = APIRouter()


class LunarStationRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    #: UTC instant, or null where the moon gives no such event (polar days).
    at: datetime | None


class LunarToday(BaseModel):
    model_config = ConfigDict(extra="forbid")

    civil_date: date_cls
    stations: list[LunarStationRead]
    attribution: str


def _safe_zone(tz: str | None) -> ZoneInfo | type[UTC]:
    if not tz:
        return UTC
    try:
        return ZoneInfo(tz)
    except (KeyError, ValueError):
        return UTC


@router.get("/lunar/today", response_model=LunarToday, tags=["lunar"])
async def lunar_today(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    tz: str | None = Query(
        default=None,
        description="IANA timezone for resolving 'today'; falls back to UTC.",
    ),
) -> LunarToday:
    """The four lunar stations of the practitioner's civil day, sorted by time."""
    zone = _safe_zone(tz)
    day_start = datetime.now(zone).replace(hour=0, minute=0, second=0, microsecond=0)
    stations = lunar_stations(day_start, lat, lng)
    return LunarToday(
        civil_date=day_start.date(),
        stations=[LunarStationRead(key=s.key, label=s.label, at=s.at) for s in stations],
        attribution="Moon stations computed locally (Moshier ephemeris).",
    )
