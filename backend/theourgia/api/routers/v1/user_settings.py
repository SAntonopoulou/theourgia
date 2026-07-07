"""User settings HTTP endpoints — Phase 02 minimal slice.

Only the location settings (``astro.lat`` + ``astro.lng``) ship in this
batch. The full settings UI lands in a later batch wired through
:mod:`theourgia.core.usersettings.service`; for now we read / write the
``user_setting`` table directly with two well-known keys.

Routes
------
``GET    /api/v1/users/me/settings/location``  → {lat, lng}
``PUT    /api/v1/users/me/settings/location``  → updates both, requires auth
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.api.deps import CurrentUser, get_db_session
from theourgia.api.errors import UnauthorizedError
from theourgia.models.usersettings import UserSetting

__all__ = ["router"]

router = APIRouter()


# Greenwich Observatory — same fallback the frontend uses today.
DEFAULT_LAT = 51.4769
DEFAULT_LNG = 0.0

LAT_KEY = "astro.lat"
LNG_KEY = "astro.lng"


class LocationRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class LocationWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


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


async def _upsert_value(db: AsyncSession, user_id, key: str, value: float) -> None:
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
