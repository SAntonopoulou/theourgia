"""User settings HTTP endpoints — Phase 02 minimal slice.

The location settings (``astro.lat`` + ``astro.lng``) shipped first;
v1-016 added the calendar multi-select (``calendars.enabled``) that
the first-run wizard persists. The full settings UI lands in a later
batch wired through :mod:`theourgia.core.usersettings.service`; for
now we read / write the ``user_setting`` table directly with
well-known keys.

Routes
------
``GET    /api/v1/users/me/settings/location``   → {lat, lng}
``PUT    /api/v1/users/me/settings/location``   → updates both, requires auth
``GET    /api/v1/users/me/settings/calendars``  → {enabled: [...]}
``PUT    /api/v1/users/me/settings/calendars``  → replaces the list, requires auth
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.errors import UnauthorizedError, ValidationFailedError
from theourgia.models.usersettings import UserSetting

__all__ = ["router"]

router = APIRouter()


# Greenwich Observatory — same fallback the frontend uses today.
DEFAULT_LAT = 51.4769
DEFAULT_LNG = 0.0

LAT_KEY = "astro.lat"
LNG_KEY = "astro.lng"

# v1-016 — the setup wizard's calendar multi-select. Mirrors the
# ``calendars.enabled`` definition in usersettings/defaults.py; the
# always-stamped four are the default for users who never chose.
CALENDARS_KEY = "calendars.enabled"
DEFAULT_CALENDARS = ("gregorian", "julian", "hebrew", "thelemic")


class LocationRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class LocationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class CalendarsRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: list[str]


class CalendarsWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: list[str] = Field(max_length=32)


async def _read_value(db: AsyncSession, user_id, key: str) -> float | None:
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == key
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        return None
    try:
        # value_json stores text; for our two numeric keys it's a JSON number.
        import json

        return float(json.loads(row.value_json))
    except (ValueError, TypeError):
        return None


async def _upsert_value(
    db: AsyncSession, user_id, key: str, value: float | list[str]
) -> None:
    import json

    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == key
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
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


async def read_enabled_calendars(db: AsyncSession, user_id) -> list[str]:
    """The user's ``calendars.enabled`` list, or the default four.

    Shared with the entries auto-stamp (v1-016): entry creation reads
    this to decide which optional calendars join the snapshot.
    Malformed rows fall back to the default — never raise.
    """
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == CALENDARS_KEY
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return list(DEFAULT_CALENDARS)
    try:
        import json

        value = json.loads(row.value_json)
    except (ValueError, TypeError):
        return list(DEFAULT_CALENDARS)
    if not isinstance(value, list) or not all(
        isinstance(item, str) for item in value
    ):
        return list(DEFAULT_CALENDARS)
    return value


@router.get(
    "/users/me/settings/location",
    summary="Read the signed-in user's lat/lng",
    description="Returns the user's stored astrological location, or Greenwich when unset.",
    response_model=LocationRead,
)
async def get_my_location(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> LocationRead:
    if current_user is None:
        raise UnauthorizedError("location requires authentication")
    lat = await _read_value(db, current_user.id, LAT_KEY)
    lng = await _read_value(db, current_user.id, LNG_KEY)
    return LocationRead(
        lat=lat if lat is not None else DEFAULT_LAT,
        lng=lng if lng is not None else DEFAULT_LNG,
    )


@router.put(
    "/users/me/settings/location",
    summary="Update the signed-in user's lat/lng",
    response_model=LocationRead,
)
async def put_my_location(
    payload: LocationWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> LocationRead:
    if current_user is None:
        raise UnauthorizedError("location requires authentication")
    await _upsert_value(db, current_user.id, LAT_KEY, payload.lat)
    await _upsert_value(db, current_user.id, LNG_KEY, payload.lng)
    await db.commit()
    return LocationRead(lat=payload.lat, lng=payload.lng)


@router.get(
    "/users/me/settings/calendars",
    summary="Read the signed-in user's enabled calendars",
    description=(
        "Returns the calendar ids the user chose (setup wizard or "
        "settings), or the default four when unset."
    ),
    response_model=CalendarsRead,
)
async def get_my_calendars(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CalendarsRead:
    if current_user is None:
        raise UnauthorizedError("calendar settings require authentication")
    return CalendarsRead(
        enabled=await read_enabled_calendars(db, current_user.id)
    )


@router.put(
    "/users/me/settings/calendars",
    summary="Update the signed-in user's enabled calendars",
    response_model=CalendarsRead,
)
async def put_my_calendars(
    payload: CalendarsWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CalendarsRead:
    if current_user is None:
        raise UnauthorizedError("calendar settings require authentication")

    # Every id must name a registered calendar — a typo'd or
    # not-yet-shipped id would silently stamp nothing.
    from theourgia.core.calendars import registered_calendars

    known = {cal.id for cal in registered_calendars()}
    unknown = [c for c in payload.enabled if c not in known]
    if unknown:
        raise ValidationFailedError(
            f"Unknown calendar ids: {', '.join(sorted(unknown))}. "
            f"Registered: {', '.join(sorted(known))}."
        )

    # De-duplicate, preserving the order the client sent.
    deduped = list(dict.fromkeys(payload.enabled))
    await _upsert_value(db, current_user.id, CALENDARS_KEY, deduped)
    await db.commit()
    return CalendarsRead(enabled=deduped)
