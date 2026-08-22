"""Astrology + calendar + events HTTP endpoints (Phase 03 Batch 27).

Six endpoints per `plan/03-time-and-cosmos.md` §8, plus the Sprint
I-A additions (profections, transits-to-natal, today-context):

* ``GET  /api/v1/calendar/today``         — multi-calendar today
* ``GET  /api/v1/astro/chart``            — compute and return a chart
* ``GET  /api/v1/astro/now``              — current sky state (compact chart)
* ``GET  /api/v1/astro/chart/doctrine``   — sect, lots, dignities (server-derived)
* ``GET  /api/v1/astro/planetary-hours``  — for a date + location
* ``GET  /api/v1/astro/profections``      — annual profection + year lord
* ``GET  /api/v1/astro/transits``         — transiting aspects to natal
* ``POST /api/v1/astro/election/search``  — election finder
* ``GET  /api/v1/events``                 — astronomical + festival events
* ``GET  /api/v1/events/today-context``   — Attic lunar day + observance
  state + moon phase for the Today chip

Mounted at the v1 prefix in ``routers/__init__.py``. No auth gates
this phase — astrology data is public-by-default; the user's saved
charts (Phase 04) will gate per-user.

Every astrology response carries the Swiss Ephemeris + JPL DE441
attribution per the AGPL-3.0 license obligations (see
`plan/03-time-and-cosmos.md` §"Swiss Ephemeris licensing").
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.routers.v1.user_settings import AstroDoctrineModel, read_astro_doctrine

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
from theourgia.core.astro.profections import profection_for_date
from theourgia.core.astro.transits import DEFAULT_TRANSIT_ORB, transits_to_natal
from theourgia.core.calendars.attic import attic_context
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
# /astro/chart/doctrine — the server-derived traditional reading
# ════════════════════════════════════════════════════════════════════════
#
# The sect, the lots, and the essential dignities of the seven, computed by
# the hellenistic engine rather than re-derived on the client (#126 retired
# the TS copy, whose sect came from house numbers — an approximation the
# degree-based rule here replaces). Honours the signed-in practitioner's
# ``astro.doctrine`` choices; anonymous callers get the ledger defaults.


class SectRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sect: Literal["diurnal", "nocturnal"]
    #: The luminary leading the sect, and the sect's own benefic / the
    #: malefic contrary to it — the frame the reading opens with.
    light: str
    benefic: str
    malefic_contrary: str
    #: The Sun stands within a degree of the horizon: the determination is
    #: shown, not silently decided. No ancient source resolves this case.
    is_borderline: bool


class LotRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: str
    longitude: float


class DignityRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body_id: str
    sign: str
    domicile_lord: str
    exaltation_lord: str | None
    triplicity_lord: str
    bound_lord: str
    decan_lord: str
    held: list[str]
    debilities: list[str]
    peregrine: bool


class ChartDoctrineResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sect: SectRead
    lots: list[LotRead]
    dignities: list[DignityRead]
    #: The choices this reading was computed under — what was honoured.
    doctrine: AstroDoctrineModel
    attribution: str


def _effective_exaltation_degree(planet, doctrine: AstroDoctrineModel) -> int | None:
    """The ordinal exaltation degree in force — the canonical value, except
    where the practitioner chose an attested variant (Saturn, Venus)."""
    from theourgia.core.astro.hellenistic import bodies as hbodies
    from theourgia.core.astro.hellenistic import dignities as hdig

    e = hdig.exaltation_of(planet)
    if e is None:
        return None
    if planet is hbodies.Planet.SATURN:
        return doctrine.saturn_exaltation_degree
    if planet is hbodies.Planet.VENUS:
        return doctrine.venus_exaltation_degree
    return e.degree


def _judge_planet(planet, lon: float, chart_sect, doctrine: AstroDoctrineModel) -> DignityRead:
    """The essential-dignity judgment of one planet at one longitude.

    Pure — no ephemeris — so the golden tests can put Saturn at any degree of
    Libra and watch the practitioner's degree choice change the verdict.
    """
    from theourgia.core.astro.hellenistic import dignities as hdig
    from theourgia.core.astro.hellenistic.zodiac import degree_in_sign, sign_of_longitude

    sign = sign_of_longitude(lon)
    deg_in = degree_in_sign(lon)

    domicile_lord = hdig.domicile_lord_of(sign)
    exaltation_lord = hdig.exaltation_ruler_of(sign)
    triplicity_lord = hdig.triplicity_lord_of(sign, chart_sect)
    bound_lord = hdig.bound_lord_of(sign, deg_in)
    decan_lord = hdig.decan_ruler_of(sign, deg_in)

    held: list[str] = []
    if domicile_lord is planet:
        held.append("domicile")
    if exaltation_lord is planet:
        held.append("exaltation")
        # Degree mode: the throne itself. An ordinal-degree match against the
        # practitioner's chosen reading (Saturn 21° vs 20°, Venus 27° vs 26°)
        # — a refinement of the sign-level rank, never a gate on it.
        if doctrine.exaltation_degrees == "degree":
            chosen = _effective_exaltation_degree(planet, doctrine)
            if chosen is not None and hdig.ordinal_degree(deg_in) == chosen:
                held.append("exaltation degree")
    if triplicity_lord is planet:
        held.append("triplicity")
    if bound_lord is planet:
        held.append("bound")
    if decan_lord is planet:
        held.append("decan")

    debilities: list[str] = []
    if hdig.adversity_lord_of(sign) is planet:
        debilities.append("detriment")
    if hdig.fall_ruler_of(sign) is planet:
        debilities.append("fall")
        if doctrine.exaltation_degrees == "degree":
            chosen = _effective_exaltation_degree(planet, doctrine)
            if chosen is not None and hdig.ordinal_degree(deg_in) == chosen:
                debilities.append("fall degree")

    return DignityRead(
        body_id=planet.id,
        sign=sign.label,
        domicile_lord=domicile_lord.id,
        exaltation_lord=exaltation_lord.id if exaltation_lord else None,
        triplicity_lord=triplicity_lord.id,
        bound_lord=bound_lord.id,
        decan_lord=decan_lord.id,
        held=held,
        debilities=debilities,
        peregrine=not held and not debilities,
    )


def _serialize_doctrine(req: ChartRequest, doctrine: AstroDoctrineModel) -> ChartDoctrineResponse:
    from theourgia.core.astro.hellenistic import bodies as hbodies
    from theourgia.core.astro.hellenistic import lots as hlots
    from theourgia.core.astro.hellenistic import sect as hsect

    result = compute_chart(req)
    # Doctrine reads tropical longitudes regardless of the wheel's zodiac
    # setting — the Hellenistic judgment is a tropical system.
    lons = {p.body.id: p.tropical.longitude for p in result.placements}
    asc = result.houses.ascendant

    det = hsect.determine(lons["sun"], asc)
    sect_name: Literal["diurnal", "nocturnal"] = (
        "diurnal" if det.sect is hsect.Sect.DIURNAL else "nocturnal"
    )
    sect_read = SectRead(
        sect=sect_name,
        light=hsect.light_of(det.sect).id,
        benefic=hsect.benefic_of(det.sect).id,
        malefic_contrary=hsect.malefic_contrary_to(det.sect).id,
        is_borderline=det.is_borderline,
    )

    lot_values = hlots.all_lots(
        hlots.LotInputs(
            ascendant=asc,
            sun=lons["sun"],
            moon=lons["moon"],
            mercury=lons["mercury"],
            venus=lons["venus"],
            mars=lons["mars"],
            jupiter=lons["jupiter"],
            saturn=lons["saturn"],
            sect=det.sect,
        )
    )
    lots_read = [
        LotRead(id=lot.english.lower(), label=lot.english, longitude=lon)
        for lot, lon in lot_values.items()
    ]

    dignities_read = [
        _judge_planet(planet, lons[planet.id], det.sect, doctrine)
        for planet in hbodies.Planet
        if not planet.is_node and planet.id in lons
    ]

    return ChartDoctrineResponse(
        sect=sect_read,
        lots=lots_read,
        dignities=dignities_read,
        doctrine=doctrine,
        attribution=ATTRIBUTION,
    )


@router.get(
    "/astro/chart/doctrine", response_model=ChartDoctrineResponse, tags=["astro"]
)
async def astro_chart_doctrine(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    when: datetime,
    latitude: float = Query(ge=-90.0, le=90.0),
    longitude: float = Query(ge=-180.0, le=180.0),
) -> ChartDoctrineResponse:
    """The traditional reading of a chart: sect, lots, essential dignities.

    Signed-in callers get their own ``astro.doctrine`` rulings honoured;
    anonymous callers the ledger defaults.
    """
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    doctrine = (
        await read_astro_doctrine(db, current_user.id)
        if current_user is not None
        else AstroDoctrineModel()
    )
    return _serialize_doctrine(
        ChartRequest(
            instant=when,
            latitude=latitude,
            longitude=longitude,
            zodiac=Zodiac("tropical"),
            house_system=HouseSystem("whole-sign"),
        ),
        doctrine,
    )


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
# /astro/profections and /astro/transits
# ════════════════════════════════════════════════════════════════════════


class ProfectionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    birth: datetime
    on_date: date_cls
    age: int
    profected_house: int
    profected_sign: int
    profected_sign_name: str
    year_lord: str
    ascendant_sign: int
    ascendant_sign_name: str
    attribution: str


@router.get(
    "/astro/profections",
    response_model=ProfectionResponse,
    tags=["astro"],
)
async def astro_profections(
    birth: datetime,
    latitude: float = Query(ge=-90.0, le=90.0),
    longitude: float = Query(ge=-180.0, le=180.0),
    on_date: date_cls | None = Query(
        default=None,
        description="The date to profect to; defaults to today (UTC).",
    ),
) -> ProfectionResponse:
    """Annual profection: whole-sign house arithmetic from the natal
    Ascendant + birthday. The year lord is the profected sign's
    TRADITIONAL ruler (Mars→Scorpio, Saturn→Aquarius, Jupiter→Pisces).
    """
    if birth.tzinfo is None:
        birth = birth.replace(tzinfo=UTC)
    target = on_date or datetime.now(tz=UTC).date()
    natal = compute_chart(ChartRequest(
        instant=birth,
        latitude=latitude,
        longitude=longitude,
        house_system=HouseSystem.WHOLE_SIGN,
    ))
    asc = natal.ascendant
    try:
        prof = profection_for_date(birth.date(), target, asc.sign)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return ProfectionResponse(
        birth=birth,
        on_date=target,
        age=prof.age,
        profected_house=prof.profected_house,
        profected_sign=prof.profected_sign,
        profected_sign_name=prof.profected_sign_name,
        year_lord=prof.year_lord.value,
        ascendant_sign=asc.sign,
        ascendant_sign_name=asc.sign_name,
        attribution=ATTRIBUTION,
    )


class TransitAspectRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transiting_body: str
    natal_body: str
    kind: str
    angle: float
    orb: float


class TransitsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    birth: datetime
    instant: datetime
    orb: float
    aspects: list[TransitAspectRead]
    attribution: str


@router.get(
    "/astro/transits",
    response_model=TransitsResponse,
    tags=["astro"],
)
async def astro_transits(
    birth: datetime,
    latitude: float = Query(ge=-90.0, le=90.0),
    longitude: float = Query(ge=-180.0, le=180.0),
    when: datetime | None = Query(
        default=None,
        description="Instant of the transiting sky; defaults to now.",
    ),
    orb: float = Query(default=DEFAULT_TRANSIT_ORB, gt=0.0, le=15.0),
) -> TransitsResponse:
    """Transiting planet longitudes vs natal positions — the classical
    aspects (0/60/90/120/180) within the requested orb (default 3°)."""
    if birth.tzinfo is None:
        birth = birth.replace(tzinfo=UTC)
    instant = when or datetime.now(tz=UTC)
    if instant.tzinfo is None:
        instant = instant.replace(tzinfo=UTC)

    natal = compute_chart(ChartRequest(
        instant=birth, latitude=latitude, longitude=longitude,
    ))
    transiting = compute_chart(ChartRequest(
        instant=instant, latitude=latitude, longitude=longitude,
    ))
    natal_lons = {p.body.id: p.tropical.longitude for p in natal.placements}
    transit_lons = {
        p.body.id: p.tropical.longitude for p in transiting.placements
    }
    hits = transits_to_natal(natal_lons, transit_lons, orb=orb)
    return TransitsResponse(
        birth=birth,
        instant=instant,
        orb=orb,
        aspects=[
            TransitAspectRead(
                transiting_body=h.transiting_body,
                natal_body=h.natal_body,
                kind=h.kind.value,
                angle=h.angle,
                orb=h.orb,
            )
            for h in hits
        ],
        attribution=ATTRIBUTION,
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


class FestivalSourceRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: str
    title: str
    author: str
    year: int | None
    locator: str
    notes: str


class FestivalRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    festival_id: str
    name: str
    tradition: str
    label: str
    start: datetime
    end: datetime
    description: str
    # The Calendar surface's detail rail shows the observance and the
    # full attestation chain, so the wire model carries both (v1-051).
    # ``source_count`` predates ``sources`` and is kept for callers
    # that only badge a count.
    practice: str
    sources: list[FestivalSourceRead]
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
                        practice=festival.practice_notes,
                        sources=[
                            FestivalSourceRead(
                                kind=s.kind.value,
                                title=s.title,
                                author=s.author,
                                year=s.year,
                                locator=s.locator,
                                notes=s.notes,
                            )
                            for s in festival.sources
                        ],
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


# ════════════════════════════════════════════════════════════════════════
# /events/today-context
# ════════════════════════════════════════════════════════════════════════


class AtticDateRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    year: int
    year_span: str
    month: int
    month_name: str
    day: int
    month_length: int
    is_intercalary_year: bool


class MoonPhaseRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phase_angle: float  # Sun-Moon elongation, degrees 0..360
    phase_name: str  # eight-phase name ("Waxing crescent", …)


class TodayContextResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date_cls
    attic: AtticDateRead
    observance: Literal["deipnon", "noumenia", "agathos_daimon"] | None
    moon: MoonPhaseRead
    attribution: str


@router.get(
    "/events/today-context",
    response_model=TodayContextResponse,
    tags=["astro"],
)
async def events_today_context(
    on_date: date_cls | None = Query(
        default=None,
        description="Civil (UTC) date to resolve; defaults to today.",
        alias="date",
    ),
) -> TodayContextResponse:
    """The Today chip's cheap lunar-day lookup: what Attic lunar day is
    it, and what observance state — Deipnon (the dark-moon day closing
    the month), Noumenia (day 1), Agathos Daimon (day 2), or none.
    Includes coarse moon-phase info so the chip can render a glyph
    without a second call.
    """
    from theourgia.core.astro.events import _moon_phase_angle, _to_jd
    from theourgia.core.entries.autostamp import moon_phase_name

    d = on_date or datetime.now(tz=UTC).date()
    ctx = attic_context(d)
    noon = datetime(d.year, d.month, d.day, 12, tzinfo=UTC)
    angle = _moon_phase_angle(_to_jd(noon))
    return TodayContextResponse(
        date=d,
        attic=AtticDateRead(
            year=ctx.year,
            year_span=ctx.year_span,
            month=ctx.month,
            month_name=ctx.month_name,
            day=ctx.day,
            month_length=ctx.month_length,
            is_intercalary_year=ctx.is_intercalary_year,
        ),
        observance=ctx.observance,  # type: ignore[arg-type]
        moon=MoonPhaseRead(
            phase_angle=angle,
            phase_name=moon_phase_name(angle),
        ),
        attribution=ATTRIBUTION,
    )
