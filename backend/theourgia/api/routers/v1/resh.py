"""Four-station daily rite HTTP endpoints (né Liber Resh).

``GET    /api/v1/resh/today?lat=&lng=&date=&tz=``    — the four stations + per-station observed flag
``GET    /api/v1/resh/streak?date=&tz=``              — current streak ending today
``GET    /api/v1/resh/config``                        — the caller's rite configuration
``PUT    /api/v1/resh/config``                        — update preset / overrides / streak anchor
``POST   /api/v1/resh/adorations``                    — record an adoration (with home/xenos mode)
``GET    /api/v1/resh/adorations``                    — list (filter date range)
``DELETE /api/v1/resh/adorations/{id}``               — soft delete

Composes `core/resh/` for the transition computation; the table
stores observed adorations so streaks + Today-card status survive
restarts. Station labels/deities are configurable per user (the
``resh.*`` settings keys): the ``hellenic`` preset ships as default,
``thelemic`` remains available, and per-station overrides layer on
top. Streaks follow the minimum-viable-station rule (default: dusk).
"""

from __future__ import annotations

import json
from datetime import UTC, date as date_cls, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.core.resh import (
    DEFAULT_MINIMUM_VIABLE_STATION,
    DEFAULT_PRESET,
    Adoration as StationDef,
    AdorationLog,
    Transition,
    compute_transitions,
    stations_for_preset,
    streak_at_date,
)
from theourgia.models.resh import Adoration as AdorationModel
from theourgia.models.resh import ReshMode, ReshTransition
from theourgia.models.usersettings import UserSetting

__all__ = ["router"]

router = APIRouter()


TransitionLiteral = Literal["sunrise", "noon", "sunset", "midnight"]
ModeLiteral = Literal["home", "xenos"]
PresetLiteral = Literal["hellenic", "thelemic"]

PRESET_KEY = "resh.preset"
STATIONS_KEY = "resh.stations"
MIN_STATION_KEY = "resh.minimum_viable_station"

_STATION_OVERRIDE_FIELDS = ("godform", "direction", "short_invocation")


class StationOverride(BaseModel):
    """Per-station override on top of the preset."""

    model_config = ConfigDict(extra="forbid")

    godform: str | None = Field(default=None, max_length=256)
    direction: str | None = Field(default=None, max_length=64)
    short_invocation: str | None = Field(default=None, max_length=1024)


class RiteConfig(BaseModel):
    """The caller's four-station rite configuration."""

    model_config = ConfigDict(extra="forbid")

    preset: PresetLiteral
    minimum_viable_station: TransitionLiteral
    stations: dict[TransitionLiteral, StationOverride] = Field(
        default_factory=dict,
        description="Per-station overrides layered on the preset.",
    )


class RiteConfigWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preset: PresetLiteral | None = None
    minimum_viable_station: TransitionLiteral | None = None
    stations: dict[TransitionLiteral, StationOverride] | None = None


class StationRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transition: TransitionLiteral
    at: datetime | None
    godform: str
    direction: str
    short_invocation: str
    observed_at: datetime | None
    note: str | None
    mode: ModeLiteral | None = Field(
        default=None,
        description="Liturgy form of the observed adoration, if any.",
    )


class ReshToday(BaseModel):
    model_config = ConfigDict(extra="forbid")

    civil_date: date_cls
    stations: list[StationRead]
    streak_days: int = Field(
        description=(
            "Consecutive days ending today with the minimum-viable "
            "station observed."
        ),
    )
    minimum_viable_station: TransitionLiteral = "sunset"
    preset: PresetLiteral = "hellenic"
    mode: ModeLiteral | None = Field(
        default=None,
        description=(
            "Liturgy form of today's most recent observed adoration "
            "(home/xenos), or null when nothing is observed yet."
        ),
    )


class ReshStreak(BaseModel):
    model_config = ConfigDict(extra="forbid")

    as_of_date: date_cls
    streak_days: int
    minimum_viable_station: TransitionLiteral


class AdorationRead(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: str
    civil_date: date_cls
    transition: TransitionLiteral
    observed_at: datetime
    mode: ModeLiteral
    note: str | None
    location_label: str | None
    entry_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime


class AdorationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transition: TransitionLiteral
    civil_date: date_cls | None = Field(
        default=None,
        description="Local civil date. Defaults to today (UTC) — pass an explicit date for backfill or for non-UTC observers.",
    )
    observed_at: datetime | None = Field(
        default=None,
        description="When the adoration was performed. Defaults to server time at receipt.",
    )
    mode: ModeLiteral = Field(
        default="home",
        description="Liturgy form used: 'home' (in Greece) or 'xenos' (abroad).",
    )
    note: str | None = None
    location_label: str | None = Field(default=None, max_length=256)
    entry_id: UUID | None = None


def _to_read(row: AdorationModel) -> AdorationRead:
    return AdorationRead(
        id=str(row.id),
        civil_date=row.civil_date,
        transition=row.transition.value,
        observed_at=row.observed_at,
        mode=row.mode.value,
        note=row.note,
        location_label=row.location_label,
        entry_id=str(row.entry_id) if row.entry_id else None,
        owner_id=str(row.owner_id) if row.owner_id else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ────────────────────────────────────────────────────────────────────────
# Per-user rite configuration (resh.* settings keys)
# ────────────────────────────────────────────────────────────────────────


async def _load_rite_config(db: AsyncSession, user_id) -> RiteConfig:
    """Read the caller's rite configuration from the ``user_setting``
    table (same well-known-key pattern as the location + calendar
    settings). Malformed rows fall back to defaults — never raise.
    """
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id,
        UserSetting.key.in_((PRESET_KEY, STATIONS_KEY, MIN_STATION_KEY)),
    )
    rows = (await db.execute(stmt)).scalars().all()
    values: dict[str, object] = {}
    for row in rows:
        try:
            values[row.key] = json.loads(row.value_json)
        except (ValueError, TypeError):
            continue

    preset = values.get(PRESET_KEY)
    if preset not in ("hellenic", "thelemic"):
        preset = DEFAULT_PRESET

    min_station = values.get(MIN_STATION_KEY)
    if min_station not in {t.value for t in Transition}:
        min_station = DEFAULT_MINIMUM_VIABLE_STATION.value

    overrides: dict[str, StationOverride] = {}
    raw_stations = values.get(STATIONS_KEY)
    if isinstance(raw_stations, dict):
        for key, val in raw_stations.items():
            if key not in {t.value for t in Transition}:
                continue
            if not isinstance(val, dict):
                continue
            fields = {
                f: val[f]
                for f in _STATION_OVERRIDE_FIELDS
                if isinstance(val.get(f), str)
            }
            if fields:
                overrides[key] = StationOverride(**fields)

    return RiteConfig(
        preset=preset,  # type: ignore[arg-type]
        minimum_viable_station=min_station,  # type: ignore[arg-type]
        stations=overrides,  # type: ignore[arg-type]
    )


def _effective_stations(config: RiteConfig) -> dict[Transition, StationDef]:
    """The preset's stations with the user's overrides applied."""
    stations = stations_for_preset(config.preset)
    for key, override in config.stations.items():
        t = Transition(key)
        base = stations[t]
        stations[t] = StationDef(
            transition=t,
            godform=override.godform or base.godform,
            direction=override.direction or base.direction,
            short_invocation=override.short_invocation or base.short_invocation,
        )
    return stations


async def _upsert_setting(
    db: AsyncSession, user_id, key: str, value: object,
) -> None:
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == key
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    encoded = json.dumps(value)
    if row is None:
        db.add(
            UserSetting(
                user_id=user_id,
                key=key,
                value_json=encoded,
                schema_version=1,
                source="user",
            )
        )
    else:
        row.value_json = encoded


def _resolve_civil_date(
    on_date: date_cls | None, tz: str | None,
) -> date_cls:
    if on_date is not None:
        return on_date
    if tz:
        try:
            zone = ZoneInfo(tz)
        except Exception as exc:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"unknown timezone: {tz}",
            ) from exc
        return datetime.now(tz=zone).date()
    return datetime.now(tz=UTC).date()


async def _streak_for_user(
    db: AsyncSession,
    user_id,
    as_of: date_cls,
    minimum_viable_station: Transition,
) -> int:
    """Walk back from ``as_of`` over the last 60 days of the user's log."""
    stmt = (
        select(AdorationModel)
        .where(AdorationModel.deleted_at.is_(None))
        .where(AdorationModel.civil_date >= as_of - timedelta(days=60))
        .where(AdorationModel.owner_id == user_id)
    )
    rows = (await db.execute(stmt)).scalars().all()
    log = [
        AdorationLog(
            civil_date=row.civil_date,
            transition=Transition(row.transition.value),
            observed_at=row.observed_at,
            note=row.note or "",
        )
        for row in rows
    ]
    return streak_at_date(
        log, as_of, minimum_viable_station=minimum_viable_station,
    )


# ────────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────────


@router.get("/resh/today", response_model=ReshToday, tags=["resh"])
async def today(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    on_date: date_cls | None = Query(
        default=None,
        description="Civil date; defaults to current UTC date.",
        alias="date",
    ),
    tz: str | None = Query(
        default=None,
        description="IANA timezone for resolving 'today'; falls back to UTC.",
    ),
) -> ReshToday:
    """Four stations for the day + per-station observed marker + streak.

    Station labels come from the caller's rite configuration
    (``GET /resh/config``) — Hellenic preset by default.
    """
    on_date = _resolve_civil_date(on_date, tz)

    config = await _load_rite_config(db, current_user.id)
    station_defs = _effective_stations(config)
    min_station = Transition(config.minimum_viable_station)

    transitions = compute_transitions(on_date, lat, lng)
    pairs = dict(transitions.as_pairs())

    # Pull any persisted adorations for today (this user only).
    stmt = (
        select(AdorationModel)
        .where(AdorationModel.deleted_at.is_(None))
        .where(AdorationModel.civil_date == on_date)
        .where(AdorationModel.owner_id == current_user.id)
    )
    observed_rows = (await db.execute(stmt)).scalars().all()
    by_transition = {row.transition: row for row in observed_rows}

    stations: list[StationRead] = []
    for t in (Transition.SUNRISE, Transition.NOON, Transition.SUNSET, Transition.MIDNIGHT):
        meta = station_defs[t]
        instant = pairs.get(t)  # None when polar fallback ate sunrise/sunset
        observed = by_transition.get(ReshTransition(t.value))
        stations.append(
            StationRead(
                transition=t.value,
                at=instant,
                godform=meta.godform,
                direction=meta.direction,
                short_invocation=meta.short_invocation,
                observed_at=observed.observed_at if observed else None,
                note=observed.note if observed else None,
                mode=observed.mode.value if observed else None,
            )
        )

    streak = await _streak_for_user(db, current_user.id, on_date, min_station)

    # Day-level mode: the most recently observed adoration's form.
    latest = max(observed_rows, key=lambda r: r.observed_at, default=None)

    return ReshToday(
        civil_date=on_date,
        stations=stations,
        streak_days=streak,
        minimum_viable_station=min_station.value,
        preset=config.preset,
        mode=latest.mode.value if latest else None,
    )


@router.get("/resh/streak", response_model=ReshStreak, tags=["resh"])
async def streak(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    on_date: date_cls | None = Query(
        default=None,
        description="Civil date to end the streak at; defaults to today.",
        alias="date",
    ),
    tz: str | None = Query(
        default=None,
        description="IANA timezone for resolving 'today'; falls back to UTC.",
    ),
) -> ReshStreak:
    """The caller's current streak under the minimum-viable-station rule."""
    as_of = _resolve_civil_date(on_date, tz)
    config = await _load_rite_config(db, current_user.id)
    min_station = Transition(config.minimum_viable_station)
    days = await _streak_for_user(db, current_user.id, as_of, min_station)
    return ReshStreak(
        as_of_date=as_of,
        streak_days=days,
        minimum_viable_station=min_station.value,
    )


@router.get("/resh/config", response_model=RiteConfig, tags=["resh"])
async def get_config(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> RiteConfig:
    """The caller's rite configuration (preset, overrides, streak anchor)."""
    return await _load_rite_config(db, current_user.id)


@router.put("/resh/config", response_model=RiteConfig, tags=["resh"])
async def put_config(
    payload: RiteConfigWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> RiteConfig:
    """Update the caller's rite configuration. Partial: omitted fields
    keep their current value; ``stations`` (when present) replaces the
    override map wholesale."""
    if payload.preset is not None:
        await _upsert_setting(db, current_user.id, PRESET_KEY, payload.preset)
    if payload.minimum_viable_station is not None:
        await _upsert_setting(
            db, current_user.id, MIN_STATION_KEY, payload.minimum_viable_station,
        )
    if payload.stations is not None:
        encoded = {
            key: override.model_dump(exclude_none=True)
            for key, override in payload.stations.items()
        }
        await _upsert_setting(db, current_user.id, STATIONS_KEY, encoded)
    await db.commit()
    return await _load_rite_config(db, current_user.id)


@router.post(
    "/resh/adorations",
    response_model=AdorationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["resh"],
)
async def create_adoration(
    payload: AdorationCreate,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> AdorationRead:
    now = datetime.now(tz=UTC)
    civil_date = payload.civil_date or now.date()
    row = AdorationModel(
        civil_date=civil_date,
        transition=ReshTransition(payload.transition),
        observed_at=payload.observed_at or now,
        mode=ReshMode(payload.mode),
        note=payload.note,
        location_label=payload.location_label,
        entry_id=payload.entry_id,
        owner_id=current_user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_read(row)


@router.get("/resh/adorations", response_model=list[AdorationRead], tags=["resh"])
async def list_adorations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
    since: date_cls | None = None,
    until: date_cls | None = None,
    transition: TransitionLiteral | None = None,
    mode: ModeLiteral | None = None,
    limit: int = 200,
) -> list[AdorationRead]:
    stmt = select(AdorationModel).where(
        AdorationModel.deleted_at.is_(None),
        AdorationModel.owner_id == current_user.id,
    )
    if since is not None:
        stmt = stmt.where(AdorationModel.civil_date >= since)
    if until is not None:
        stmt = stmt.where(AdorationModel.civil_date <= until)
    if transition is not None:
        stmt = stmt.where(AdorationModel.transition == ReshTransition(transition))
    if mode is not None:
        stmt = stmt.where(AdorationModel.mode == ReshMode(mode))
    stmt = stmt.order_by(AdorationModel.observed_at.desc()).limit(min(limit, 1000))
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_read(row) for row in rows]


@router.delete(
    "/resh/adorations/{adoration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["resh"],
)
async def delete_adoration(
    adoration_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> Response:
    row = await db.get(AdorationModel, adoration_id)
    if row is None or row.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Adoration not found.")
    if row.owner_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Adoration not found.")
    row.deleted_at = datetime.now(tz=UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
