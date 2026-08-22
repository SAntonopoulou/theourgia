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
``GET    /api/v1/users/me/settings/practices``  → {practices: [{key,…,enabled}]}
``PUT    /api/v1/users/me/settings/practices``  → replaces the off-set, requires auth
``GET    /api/v1/users/me/settings/correspondences``  → {tables: [...]}
``PUT    /api/v1/users/me/settings/correspondences``  → replaces the user's tables
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, ValidationError
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


class PracticeToggleView(BaseModel):
    """One built-in discipline and whether the user keeps it on."""

    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    glyph: str
    detail: str
    enabled: bool


class PracticesRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    practices: list[PracticeToggleView]


class PracticesWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # We persist the switched-OFF set, so a discipline added in a later
    # version is on for everyone until they turn it off — the phone's rule.
    disabled: list[str] = Field(default_factory=list, max_length=32)


async def _read_value(db: AsyncSession, user_id, key: str) -> float | None:
    stmt = select(UserSetting).where(UserSetting.user_id == user_id, UserSetting.key == key)
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


async def _upsert_value(db: AsyncSession, user_id, key: str, value: object) -> None:
    import json

    stmt = select(UserSetting).where(UserSetting.user_id == user_id, UserSetting.key == key)
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
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        return list(DEFAULT_CALENDARS)
    return value


# The switched-off disciplines. Absent / malformed → none disabled → all on,
# matching the phone's "everything not explicitly switched off" default.
PRACTICES_DISABLED_KEY = "practices.disabled"


async def read_disabled_practices(db: AsyncSession, user_id) -> set[str]:
    """The keys the user switched off, filtered to ones this build still ships
    (a key naming a since-removed discipline is ignored, not surfaced)."""
    from theourgia.core.practices_catalog import PRACTICE_KEYS

    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == PRACTICES_DISABLED_KEY
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return set()
    try:
        import json

        value = json.loads(row.value_json)
    except (ValueError, TypeError):
        return set()
    if not isinstance(value, list):
        return set()
    return {item for item in value if isinstance(item, str) and item in PRACTICE_KEYS}


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
    return CalendarsRead(enabled=await read_enabled_calendars(db, current_user.id))


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


@router.get(
    "/users/me/settings/practices",
    summary="Read the signed-in user's built-in practice toggles",
    description=(
        "The eight built-in disciplines with the user's on/off state. "
        "Everything not explicitly switched off is on — a fresh user keeps "
        "all eight."
    ),
    response_model=PracticesRead,
)
async def get_my_practices(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PracticesRead:
    if current_user is None:
        raise UnauthorizedError("practice settings require authentication")
    from theourgia.core.practices_catalog import PRACTICES

    disabled = await read_disabled_practices(db, current_user.id)
    return PracticesRead(
        practices=[
            PracticeToggleView(
                key=p.key,
                label=p.label,
                glyph=p.glyph,
                detail=p.detail,
                enabled=p.key not in disabled,
            )
            for p in PRACTICES
        ]
    )


@router.put(
    "/users/me/settings/practices",
    summary="Update which built-in practices are switched off",
    response_model=PracticesRead,
)
async def put_my_practices(
    payload: PracticesWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> PracticesRead:
    if current_user is None:
        raise UnauthorizedError("practice settings require authentication")
    from theourgia.core.practices_catalog import PRACTICE_KEYS, PRACTICES

    # Every key must name a shipped discipline — a typo or a not-yet-built key
    # would silently switch nothing off and read back as still-on, hiding the bug.
    unknown = [k for k in payload.disabled if k not in PRACTICE_KEYS]
    if unknown:
        raise ValidationFailedError(
            f"Unknown practice keys: {', '.join(sorted(unknown))}. "
            f"Known: {', '.join(sorted(PRACTICE_KEYS))}."
        )

    deduped = list(dict.fromkeys(payload.disabled))
    await _upsert_value(db, current_user.id, PRACTICES_DISABLED_KEY, deduped)
    await db.commit()

    off = set(deduped)
    return PracticesRead(
        practices=[
            PracticeToggleView(
                key=p.key,
                label=p.label,
                glyph=p.glyph,
                detail=p.detail,
                enabled=p.key not in off,
            )
            for p in PRACTICES
        ]
    )


# ─── custom correspondence tables (the practitioner's own 777) ──────
#
# Sophia, 20 Aug: the correspondence surface must let people build their own
# tables — a 777 / Skinner-style grid of subjects down the side, categories
# across the top. The shipped tables come from installed packs (read-only); a
# user's own tables live here, as one JSON blob per user (no new table, no
# migration — same key/value store as location, calendars and practices).
#
# A table is stored as a grid, which the web converts to the same
# subject/category/value entries a pack table renders as — so a custom table
# draws in the identical chart component.

CUSTOM_CORRESPONDENCES_KEY = "correspondences.custom"


class CorrespondenceRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=200)
    #: category name → cell value. Missing/blank cells are simply absent.
    cells: dict[str, str] = Field(default_factory=dict)


class CustomCorrespondenceTable(BaseModel):
    model_config = ConfigDict(extra="forbid")

    #: Client-generated stable id (a uuid), so edits target the right table.
    id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    columns: list[str] = Field(default_factory=list, max_length=64)
    rows: list[CorrespondenceRow] = Field(default_factory=list, max_length=2000)


class CorrespondencesRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tables: list[CustomCorrespondenceTable]


class CorrespondencesWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tables: list[CustomCorrespondenceTable] = Field(default_factory=list, max_length=200)


async def read_custom_correspondences(db: AsyncSession, user_id) -> list[CustomCorrespondenceTable]:
    """The user's own correspondence tables, or an empty list. Malformed rows
    are dropped rather than raised — a single bad table never hides the rest."""
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == CUSTOM_CORRESPONDENCES_KEY
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return []
    try:
        import json

        value = json.loads(row.value_json)
    except (ValueError, TypeError):
        return []
    if not isinstance(value, list):
        return []
    tables: list[CustomCorrespondenceTable] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            tables.append(CustomCorrespondenceTable(**item))
        except ValidationError:
            continue
    return tables


@router.get(
    "/users/me/settings/correspondences",
    summary="Read the signed-in user's own correspondence tables",
    description="Returns the tables the user built themselves (the packs' tables are separate).",
    response_model=CorrespondencesRead,
)
async def get_my_correspondences(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CorrespondencesRead:
    if current_user is None:
        raise UnauthorizedError("correspondence tables require authentication")
    return CorrespondencesRead(tables=await read_custom_correspondences(db, current_user.id))


@router.put(
    "/users/me/settings/correspondences",
    summary="Replace the signed-in user's own correspondence tables",
    response_model=CorrespondencesRead,
)
async def put_my_correspondences(
    payload: CorrespondencesWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CorrespondencesRead:
    if current_user is None:
        raise UnauthorizedError("correspondence tables require authentication")

    # Two tables sharing an id would make an edit ambiguous.
    ids = [t.id for t in payload.tables]
    if len(ids) != len(set(ids)):
        raise ValidationFailedError("Every table needs its own id; found a duplicate.")

    await _upsert_value(
        db,
        current_user.id,
        CUSTOM_CORRESPONDENCES_KEY,
        [t.model_dump() for t in payload.tables],
    )
    await db.commit()
    return CorrespondencesRead(tables=payload.tables)


# ─── correspondence charts v2 (the phone's §10, mirrored) ───────────
#
# The phone (22 Aug, NOTE_FROM_THE_PHONE-correspondences-v2.md; its
# docs/CORRESPONDENCES-DESIGN.md §10) supersedes the free-form tables
# above with authored CHARTS: rows down a scale — a canonical taxonomy
# family, or the practitioner's own — columns across, each column
# carrying ITS OWN source, because the honest unit of attribution is the
# claim, not the table. A blank cell is absent, never an empty string. A
# mapped column (categoryKey set, canonical scale only) stands in the
# subject lookup beside the packs' values; custom scales never leak
# there. Charts and columns soft-delete.
#
# Field names are camelCase to match the phone's JSON exactly — one name
# across both platforms. Same key/value storage, one blob per user; the
# legacy ``correspondences.custom`` tables are converted on read until
# the first write of the new key.

CORRESPONDENCE_CHARTS_KEY = "correspondences.charts"


class ChartSourceModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    author: str | None = Field(default=None, max_length=200)
    year: int | None = None
    note: str | None = Field(default=None, max_length=500)


class ChartRowModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=200)
    glyph: str | None = Field(default=None, max_length=8)


class ChartColumnModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=64)
    caption: str = Field(min_length=1, max_length=200)
    #: Absent means the practitioner's own claim — "Yours", never anonymous.
    source: ChartSourceModel | None = None
    #: Set (canonical charts only), the column's cells stand in the lookup.
    categoryKey: str | None = Field(default=None, max_length=64)
    commentary: str = Field(default="", max_length=5000)
    #: Tombstone (ISO-8601). Hidden, not erased — its cells stay for undelete.
    deletedAt: str | None = Field(default=None, max_length=40)


class ChartCellModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    #: Never blank: a blank cell is the ABSENT entry, not an empty string.
    value: str = Field(min_length=1, max_length=2000)
    note: str | None = Field(default=None, max_length=2000)


class CorrespondenceChartModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    #: A canonical taxonomy family key, or None for a scale of the
    #: practitioner's own (whose rows live in ``rows``).
    scaleFamily: str | None = Field(default=None, max_length=64)
    commentary: str = Field(default="", max_length=20000)
    #: Custom-scale rows, in the practitioner's order. Empty for canonical
    #: charts — their rows are the canon's, drawn client-side.
    rows: list[ChartRowModel] = Field(default_factory=list, max_length=2000)
    columns: list[ChartColumnModel] = Field(default_factory=list, max_length=64)
    #: columnId → rowKey → cell.
    cells: dict[str, dict[str, ChartCellModel]] = Field(default_factory=dict)
    deletedAt: str | None = Field(default=None, max_length=40)


class CorrespondenceChartsRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    charts: list[CorrespondenceChartModel]


class CorrespondenceChartsWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    charts: list[CorrespondenceChartModel] = Field(default_factory=list, max_length=200)


def _chart_from_legacy(table: CustomCorrespondenceTable) -> CorrespondenceChartModel:
    """A legacy free-form table, recast as a custom-scale chart.

    Its subjects become rows, its bare column names become sourceless
    columns (which read as the practitioner's own — which they were), and
    blank cells are simply not carried over. Ids derive from the table's,
    stably, so a second read converts to the same chart.
    """
    rows = [
        ChartRowModel(key=f"{table.id}:r{i}", label=r.subject)
        for i, r in enumerate(table.rows)
    ]
    columns = [
        ChartColumnModel(id=f"{table.id}:c{i}", caption=caption)
        for i, caption in enumerate(table.columns)
    ]
    by_caption = {c.caption: c.id for c in reversed(columns)}
    cells: dict[str, dict[str, ChartCellModel]] = {}
    for i, r in enumerate(table.rows):
        for caption, value in r.cells.items():
            column_id = by_caption.get(caption)
            if column_id is None or not value.strip():
                continue
            cells.setdefault(column_id, {})[f"{table.id}:r{i}"] = ChartCellModel(
                value=value.strip()
            )
    return CorrespondenceChartModel(
        id=table.id,
        name=table.title,
        rows=rows,
        columns=columns,
        cells=cells,
    )


async def read_correspondence_charts(
    db: AsyncSession, user_id
) -> list[CorrespondenceChartModel]:
    """The user's charts; malformed entries dropped. With nothing written
    under the new key yet, the legacy tables are converted on the fly —
    nothing is migrated in place until the user saves."""
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == CORRESPONDENCE_CHARTS_KEY
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        legacy = await read_custom_correspondences(db, user_id)
        return [_chart_from_legacy(t) for t in legacy]
    try:
        import json

        value = json.loads(row.value_json)
    except (ValueError, TypeError):
        return []
    if not isinstance(value, list):
        return []
    charts: list[CorrespondenceChartModel] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            charts.append(CorrespondenceChartModel(**item))
        except ValidationError:
            continue
    return charts


@router.get(
    "/users/me/settings/correspondence-charts",
    summary="Read the signed-in user's authored correspondence charts",
    description=(
        "The phone's §10 model: rows down a scale, columns each under their "
        "own source. Legacy free-form tables are converted on read until the "
        "first save."
    ),
    response_model=CorrespondenceChartsRead,
)
async def get_my_correspondence_charts(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CorrespondenceChartsRead:
    if current_user is None:
        raise UnauthorizedError("correspondence charts require authentication")
    return CorrespondenceChartsRead(
        charts=await read_correspondence_charts(db, current_user.id)
    )


@router.put(
    "/users/me/settings/correspondence-charts",
    summary="Replace the signed-in user's authored correspondence charts",
    response_model=CorrespondenceChartsRead,
)
async def put_my_correspondence_charts(
    payload: CorrespondenceChartsWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> CorrespondenceChartsRead:
    if current_user is None:
        raise UnauthorizedError("correspondence charts require authentication")

    ids = [c.id for c in payload.charts]
    if len(ids) != len(set(ids)):
        raise ValidationFailedError("Every chart needs its own id; found a duplicate.")
    for chart in payload.charts:
        column_ids = [c.id for c in chart.columns]
        if len(column_ids) != len(set(column_ids)):
            raise ValidationFailedError(
                f"Chart {chart.id!r}: every column needs its own id; found a duplicate."
            )
        known_columns = set(column_ids)
        for column_id in chart.cells:
            if column_id not in known_columns:
                raise ValidationFailedError(
                    f"Chart {chart.id!r}: cells name a column {column_id!r} it does not have."
                )
        # A mapped column stands in the lookup, which is drawn on the canon's
        # scales — a custom scale has no subjects there to stand under.
        if chart.scaleFamily is None:
            for column in chart.columns:
                if column.categoryKey is not None:
                    raise ValidationFailedError(
                        f"Chart {chart.id!r}: a custom-scale chart cannot map "
                        f"column {column.id!r} into the lookup."
                    )

    await _upsert_value(
        db,
        current_user.id,
        CORRESPONDENCE_CHARTS_KEY,
        [c.model_dump() for c in payload.charts],
    )
    await db.commit()
    return CorrespondenceChartsRead(charts=payload.charts)


# ─── adoration sets (choose whose adoration each station is) ────────
#
# Sophia, 20 Aug: with lunar (or solar) adorations enabled, you must be able to
# name each of the four stations — build a "Hekate" set and make it active, the
# way the phone does (lib/features/adorations, AdorationSet.isActive). The active
# set per body names the stations shown on Today. Stored per user (no migration,
# same key/value store); station keys are the phone's RiteStation enum names so
# the two line up (moonrise/upperCulmination/moonset/lowerCulmination for lunar,
# sunrise/noon/sunset/midnight for solar).

ADORATION_SETS_KEY = "adoration.sets"

_BODY_STATIONS: dict[str, tuple[str, ...]] = {
    "lunar": ("moonrise", "upperCulmination", "moonset", "lowerCulmination"),
    "solar": ("sunrise", "noon", "sunset", "midnight"),
}


class AdorationSetModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    body: Literal["lunar", "solar"]
    #: The active set for a body names that body's Today stations. One per body.
    active: bool = False
    #: station key → the words/title said at it. Unknown keys are ignored.
    stations: dict[str, str] = Field(default_factory=dict)


class AdorationSetsRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sets: list[AdorationSetModel]


class AdorationSetsWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sets: list[AdorationSetModel] = Field(default_factory=list, max_length=100)


async def read_adoration_sets(db: AsyncSession, user_id) -> list[AdorationSetModel]:
    """The user's adoration sets, malformed ones dropped."""
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == ADORATION_SETS_KEY
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return []
    try:
        import json

        value = json.loads(row.value_json)
    except (ValueError, TypeError):
        return []
    if not isinstance(value, list):
        return []
    out: list[AdorationSetModel] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            out.append(AdorationSetModel(**item))
        except ValidationError:
            continue
    return out


@router.get(
    "/users/me/settings/adorations",
    summary="Read the signed-in user's adoration sets",
    response_model=AdorationSetsRead,
)
async def get_my_adorations(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> AdorationSetsRead:
    if current_user is None:
        raise UnauthorizedError("adoration sets require authentication")
    return AdorationSetsRead(sets=await read_adoration_sets(db, current_user.id))


@router.put(
    "/users/me/settings/adorations",
    summary="Replace the signed-in user's adoration sets",
    response_model=AdorationSetsRead,
)
async def put_my_adorations(
    payload: AdorationSetsWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> AdorationSetsRead:
    if current_user is None:
        raise UnauthorizedError("adoration sets require authentication")

    ids = [s.id for s in payload.sets]
    if len(ids) != len(set(ids)):
        raise ValidationFailedError("Every set needs its own id; found a duplicate.")

    # At most one active set per body — the last one wins if the client sent more.
    seen_active: set[str] = set()
    for s in payload.sets:
        if s.active:
            if s.body in seen_active:
                s.active = False
            else:
                seen_active.add(s.body)

    await _upsert_value(
        db, current_user.id, ADORATION_SETS_KEY, [s.model_dump() for s in payload.sets]
    )
    await db.commit()
    return AdorationSetsRead(sets=payload.sets)


# ─── spiritual maps (a figure of named nodes, worked one at a time) ──────
#
# The phone's spiritual map is a figure whose nodes are "worked" and kept. Its
# node graphs are local; here the web authors its own maps (stored as this
# per-user setting), and the WORK of a node is kept through the record store as
# an observance — so the works cross to the phone even though the figure is the
# web's own.

MAPS_KEY = "spiritual.maps"


class SpiritualMapNodeModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    note: str = Field(default="", max_length=2000)


class SpiritualMapModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=200)
    summary: str = Field(default="", max_length=2000)
    nodes: list[SpiritualMapNodeModel] = Field(default_factory=list, max_length=200)


class MapsRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    maps: list[SpiritualMapModel]


class MapsWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    maps: list[SpiritualMapModel] = Field(default_factory=list, max_length=100)


async def read_maps(db: AsyncSession, user_id) -> list[SpiritualMapModel]:
    """The user's spiritual maps, malformed ones dropped."""
    stmt = select(UserSetting).where(
        UserSetting.user_id == user_id, UserSetting.key == MAPS_KEY
    )
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row is None:
        return []
    try:
        import json

        value = json.loads(row.value_json)
    except (ValueError, TypeError):
        return []
    if not isinstance(value, list):
        return []
    out: list[SpiritualMapModel] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            out.append(SpiritualMapModel(**item))
        except ValidationError:
            continue
    return out


@router.get(
    "/users/me/settings/maps",
    summary="Read the signed-in user's spiritual maps",
    response_model=MapsRead,
)
async def get_my_maps(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MapsRead:
    if current_user is None:
        raise UnauthorizedError("spiritual maps require authentication")
    return MapsRead(maps=await read_maps(db, current_user.id))


@router.put(
    "/users/me/settings/maps",
    summary="Replace the signed-in user's spiritual maps",
    response_model=MapsRead,
)
async def put_my_maps(
    payload: MapsWrite,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: CurrentUser,
) -> MapsRead:
    if current_user is None:
        raise UnauthorizedError("spiritual maps require authentication")

    ids = [m.id for m in payload.maps]
    if len(ids) != len(set(ids)):
        raise ValidationFailedError("Every map needs its own id; found a duplicate.")

    await _upsert_value(
        db, current_user.id, MAPS_KEY, [m.model_dump() for m in payload.maps]
    )
    await db.commit()
    return MapsRead(maps=payload.maps)
