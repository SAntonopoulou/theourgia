"""Astrology + calendar + events HTTP endpoints (Phase 03 Batch 27).

Six endpoints per `plan/03-time-and-cosmos.md` §8:

* ``GET  /api/v1/calendar/today``         — multi-calendar today
* ``GET  /api/v1/astro/chart``            — compute and return a chart
* ``GET  /api/v1/astro/now``              — current sky state (compact chart)
* ``GET  /api/v1/astro/planetary-hours``  — for a date + location
* ``POST /api/v1/astro/election/search``  — election finder
* ``GET  /api/v1/events``                 — astronomical + festival events

Mounted at the v1 prefix in ``routers/__init__.py``. No auth gates
this phase — astrology data is public-by-default; the user's saved
charts (Phase 04) will gate per-user.

Every astrology response carries the Swiss Ephemeris + JPL DE441
attribution per the AGPL-3.0 license obligations (see
`plan/03-time-and-cosmos.md` §"Swiss Ephemeris licensing").
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from theourgia.core.astro import (
    ATTRIBUTION,
    ChartRequest,
    Zodiac,
    compute_chart,
    compute_planetary_hours,
    current_planetary_hour,
)
from theourgia.core.astro.events import events_in_range
from theourgia.core.astro.houses import HouseSystem
from theourgia.core.astro.zodiac import Ayanamsa
from theourgia.core.calendars import get_calendar, registered_calendars
from theourgia.core.election import (
    AspectConstraint,
    Constraint,
    ElectionRequest,
    MoonPhaseConstraint,
    MoonSignConstraint,
    PlanetaryHourConstraint,
    PlanetSignConstraint,
    PreBuiltQueries,
    find_election,
)
from theourgia.core.astro.aspects import AspectKind
from theourgia.core.astro.planetary_hours import Planet
from theourgia.core.festivals import festivals_for_year, get_festival

__all__ = ["router"]

router = APIRouter()


# ════════════════════════════════════════════════════════════════════════
# /calendar/today
# ════════════════════════════════════════════════════════════════════════


class CalendarDateRead(BaseModel):
    """A single calendar's view of a single instant."""

    model_config = ConfigDict(extra="forbid")

    calendar_id: str
    name: str
    family: Literal["solar", "lunisolar", "lunar", "ritual"]
    year: int
    month: int
    day: int
    long: str
    short: str
    numeric: str
    with_day_name: str
    locale: str
    raw: dict[str, object | None]


class CalendarTodayResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instant: datetime
    locale: str
    calendars: list[CalendarDateRead]


@router.get("/calendar/today", response_model=CalendarTodayResponse, tags=["astro"])
async def calendar_today(
    locale: str = Query(default="en"),
    when: datetime | None = Query(default=None),
) -> CalendarTodayResponse:
    """Today (or any supplied instant) in every registered calendar."""
    instant = when or datetime.now(tz=UTC)
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=UTC)
    cals: list[CalendarDateRead] = []
    for calendar in registered_calendars():
        d = calendar.from_instant(instant, locale=locale)
        cals.append(CalendarDateRead(
            calendar_id=calendar.id,
            name=calendar.name,
            family=calendar.family,  # type: ignore[arg-type]
            year=d.year,
            month=d.month,
            day=d.day,
            long=d.long,
            short=d.short,
            numeric=d.numeric,
            with_day_name=d.with_day_name,
            locale=d.locale,
            raw={k: v for k, v in d.raw.items()},
        ))
    return CalendarTodayResponse(instant=instant, locale=locale, calendars=cals)


# ════════════════════════════════════════════════════════════════════════
# /astro/chart and /astro/now
# ════════════════════════════════════════════════════════════════════════


class PlacementRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body_id: str
    body_name: str
    glyph: str
    category: str
    tropical_longitude: float
    tropical_sign: str
    sidereal_longitude: float
    sidereal_sign: str
    house: int
    speed: float
    is_retrograde: bool


class HousesRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: str
    cusps: list[float]  # 12 entries (index 0 unused; we drop it)
    ascendant: float
    midheaven: float


class AspectRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body_a: str
    body_b: str
    kind: str
    angle: float
    orb: float


class ChartResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instant: datetime
    julian_day: float
    latitude: float
    longitude: float
    zodiac: str
    house_system: str
    placements: list[PlacementRead]
    houses: HousesRead
    aspects: list[AspectRead]
    attribution: str


def _serialize_chart(req: ChartRequest) -> ChartResponse:
    result = compute_chart(req)
    return ChartResponse(
        instant=req.instant,
        julian_day=result.julian_day,
        latitude=req.latitude,
        longitude=req.longitude,
        zodiac=req.zodiac.value,
        house_system=req.house_system.value,
        placements=[
            PlacementRead(
                body_id=p.body.id,
                body_name=p.body.name,
                glyph=p.body.glyph,
                category=p.body.category,
                tropical_longitude=p.tropical.longitude,
                tropical_sign=p.tropical.sign_name,
                sidereal_longitude=p.sidereal.longitude,
                sidereal_sign=p.sidereal.sign_name,
                house=p.house,
                speed=p.speed,
                is_retrograde=p.is_retrograde,
            )
            for p in result.placements
        ],
        houses=HousesRead(
            system=result.houses.system.value,
            cusps=list(result.houses.cusps[1:]),  # drop placeholder cusps[0]
            ascendant=result.houses.ascendant,
            midheaven=result.houses.midheaven,
        ),
        aspects=[
            AspectRead(
                body_a=a.body_a,
                body_b=a.body_b,
                kind=a.kind.value,
                angle=a.angle,
                orb=a.orb,
            )
            for a in result.aspects
        ],
        attribution=result.attribution,
    )


@router.get("/astro/chart", response_model=ChartResponse, tags=["astro"])
async def astro_chart(
    when: datetime,
    latitude: float = Query(ge=-90.0, le=90.0),
    longitude: float = Query(ge=-180.0, le=180.0),
    zodiac: Literal["tropical", "sidereal"] = "tropical",
    ayanamsa: Literal["lahiri", "krishnamurti", "fagan_bradley", "raman", "yukteshwar"] = "lahiri",
    house_system: Literal["placidus", "whole-sign"] = "placidus",
) -> ChartResponse:
    """Compute a natal/event chart for the supplied instant + location."""
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    return _serialize_chart(ChartRequest(
        instant=when,
        latitude=latitude,
        longitude=longitude,
        zodiac=Zodiac(zodiac),
        ayanamsa=Ayanamsa(ayanamsa),
        house_system=HouseSystem(house_system),
    ))


@router.get("/astro/now", response_model=ChartResponse, tags=["astro"])
async def astro_now(
    latitude: float = Query(ge=-90.0, le=90.0),
    longitude: float = Query(ge=-180.0, le=180.0),
    zodiac: Literal["tropical", "sidereal"] = "tropical",
    house_system: Literal["placidus", "whole-sign"] = "placidus",
) -> ChartResponse:
    """Current sky state. Convenience wrapper around /astro/chart."""
    return _serialize_chart(ChartRequest(
        instant=datetime.now(tz=UTC),
        latitude=latitude,
        longitude=longitude,
        zodiac=Zodiac(zodiac),
        house_system=HouseSystem(house_system),
    ))


# ════════════════════════════════════════════════════════════════════════
# /astro/planetary-hours
# ════════════════════════════════════════════════════════════════════════


class PlanetaryHourRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    index: int
    ruler: str
    glyph: str
    start: datetime
    end: datetime
    is_day: bool


class PlanetaryHoursResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date_cls
    latitude: float
    longitude: float
    current_hour_index: int | None
    hours: list[PlanetaryHourRead]


@router.get(
    "/astro/planetary-hours",
    response_model=PlanetaryHoursResponse,
    tags=["astro"],
)
async def astro_planetary_hours(
    when: datetime | None = Query(default=None),
    latitude: float = Query(ge=-90.0, le=90.0),
    longitude: float = Query(ge=-180.0, le=180.0),
) -> PlanetaryHoursResponse:
    """24 planetary hours for the date containing ``when`` (or now)."""
    instant = when or datetime.now(tz=UTC)
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=UTC)
    hours = compute_planetary_hours(instant, latitude, longitude)
    cur = current_planetary_hour(instant, latitude, longitude)
    cur_index = next((h.index for h in hours if h.start == cur.start), None)
    return PlanetaryHoursResponse(
        date=instant.date(),
        latitude=latitude,
        longitude=longitude,
        current_hour_index=cur_index,
        hours=[
            PlanetaryHourRead(
                index=h.index,
                ruler=h.ruler.value,
                glyph=h.glyph,
                start=h.start,
                end=h.end,
                is_day=h.is_day,
            )
            for h in hours
        ],
    )


# ════════════════════════════════════════════════════════════════════════
# /astro/election/search
# ════════════════════════════════════════════════════════════════════════


class ConstraintInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal[
        "planetary_hour", "moon_sign", "planet_sign", "moon_phase", "aspect",
    ]
    planet: str | None = None
    sign: int | None = Field(default=None, ge=1, le=12)
    min_angle: float | None = None
    max_angle: float | None = None
    body_a: str | None = None
    body_b: str | None = None
    aspect: str | None = None
    max_orb: float = 6.0
    weight: float = 1.0


def _constraint_from_input(input_: ConstraintInput) -> Constraint:
    if input_.kind == "planetary_hour":
        return PlanetaryHourConstraint(
            Planet(input_.planet or "venus"),
            weight=input_.weight,
        )
    if input_.kind == "moon_sign":
        if input_.sign is None:
            raise HTTPException(422, "moon_sign requires `sign` (1..12).")
        return MoonSignConstraint(input_.sign, weight=input_.weight)
    if input_.kind == "planet_sign":
        if input_.planet is None or input_.sign is None:
            raise HTTPException(422, "planet_sign requires `planet` and `sign`.")
        return PlanetSignConstraint(
            Planet(input_.planet), input_.sign, weight=input_.weight,
        )
    if input_.kind == "moon_phase":
        if input_.min_angle is None or input_.max_angle is None:
            raise HTTPException(422, "moon_phase requires `min_angle` and `max_angle`.")
        return MoonPhaseConstraint(
            input_.min_angle, input_.max_angle, weight=input_.weight,
        )
    if input_.kind == "aspect":
        if not (input_.body_a and input_.body_b and input_.aspect):
            raise HTTPException(422, "aspect requires `body_a`, `body_b`, `aspect`.")
        return AspectConstraint(
            Planet(input_.body_a),
            Planet(input_.body_b),
            AspectKind(input_.aspect),
            max_orb=input_.max_orb,
            weight=input_.weight,
        )
    raise HTTPException(422, f"Unknown constraint kind {input_.kind!r}.")


class ElectionSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    constraints: list[ConstraintInput] | None = None
    preset: Literal["venus_talisman", "mercury_correspondence", "hekate_working"] | None = None
    start: datetime
    end: datetime
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    step_minutes: int = Field(default=15, ge=1, le=1440)
    top_n: int = Field(default=5, ge=1, le=50)


class ElectionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instant: datetime
    score: float
    passes_all: bool
    breakdown: list[dict[str, object]]


class ElectionSearchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    elections: list[ElectionResult]
    attribution: str


@router.post(
    "/astro/election/search",
    response_model=ElectionSearchResponse,
    tags=["astro"],
)
async def astro_election_search(req: ElectionSearchRequest) -> ElectionSearchResponse:
    """Find the most magickally favorable instants in the time window
    that satisfy the user-supplied constraints, or pre-built recipe.
    """
    if req.preset is not None and req.constraints:
        raise HTTPException(422, "Pass either `preset` or `constraints`, not both.")
    if req.preset is None and not req.constraints:
        raise HTTPException(422, "One of `preset` or `constraints` is required.")

    if req.preset == "venus_talisman":
        constraints = PreBuiltQueries.consecrate_venus_talisman()
    elif req.preset == "mercury_correspondence":
        constraints = PreBuiltQueries.consult_mercury_before_correspondence()
    elif req.preset == "hekate_working":
        constraints = PreBuiltQueries.hekate_working()
    else:
        constraints = tuple(_constraint_from_input(c) for c in (req.constraints or []))

    start = req.start.replace(tzinfo=UTC) if req.start.tzinfo is None else req.start
    end = req.end.replace(tzinfo=UTC) if req.end.tzinfo is None else req.end

    results = find_election(ElectionRequest(
        constraints=constraints,
        start=start,
        end=end,
        latitude=req.latitude,
        longitude=req.longitude,
        step=timedelta(minutes=req.step_minutes),
        top_n=req.top_n,
    ))

    return ElectionSearchResponse(
        elections=[
            ElectionResult(
                instant=r.instant,
                score=r.score,
                passes_all=r.passes_all,
                breakdown=[
                    {
                        "constraint": description,
                        "passes": result.passes,
                        "score": result.score,
                        "reason": result.reason,
                    }
                    for description, result in r.breakdown
                ],
            )
            for r in results
        ],
        attribution=ATTRIBUTION,
    )


# ════════════════════════════════════════════════════════════════════════
# /events
# ════════════════════════════════════════════════════════════════════════


class EventRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: str
    instant: datetime
    body: str | None
    sign: str | None
    meta: dict[str, object | None]


class FestivalRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    festival_id: str
    name: str
    tradition: str
    label: str
    start: datetime
    end: datetime
    description: str
    source_count: int


class EventsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: datetime
    end: datetime
    astronomical: list[EventRead]
    festivals: list[FestivalRead]
    attribution: str


@router.get("/events", response_model=EventsResponse, tags=["astro"])
async def events(
    start: datetime,
    end: datetime,
    include_festivals: bool = Query(default=True),
) -> EventsResponse:
    """Astronomical + festival events between ``start`` and ``end``."""
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)
    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    if end <= start:
        raise HTTPException(422, "`end` must be after `start`.")

    astro = events_in_range(start, end)

    festivals_list: list[FestivalRead] = []
    if include_festivals:
        for year in range(start.year, end.year + 1):
            for instance in festivals_for_year(year):
                if instance.start <= end and instance.end >= start:
                    festival = get_festival(instance.festival_id)
                    festivals_list.append(FestivalRead(
                        festival_id=festival.id,
                        name=festival.name,
                        tradition=festival.tradition.value,
                        label=instance.label,
                        start=instance.start,
                        end=instance.end,
                        description=festival.description,
                        source_count=len(festival.sources),
                    ))
    festivals_list.sort(key=lambda f: f.start)

    return EventsResponse(
        start=start,
        end=end,
        astronomical=[
            EventRead(
                kind=e.kind.value,
                instant=e.instant,
                body=e.body,
                sign=e.sign,
                meta={k: v for k, v in e.meta.items()},
            )
            for e in astro
        ],
        festivals=festivals_list,
        attribution=ATTRIBUTION,
    )
