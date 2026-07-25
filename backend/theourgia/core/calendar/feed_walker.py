"""iCal feed data walker (Phase 11 follow-up).

B135 shipped the ``/ical/v1/{token}.ics`` route as a VCALENDAR shell;
this module supplies the bridge between the live database and the
pure RFC 5545 serializer.

The emission paths, one per ``include_*`` toggle:

* **Workings** — Entry rows with ``encryption_mode != SEALED`` and
  ``type`` in the working-kind set, ``occurred_at`` in the configured
  window. Each row becomes a :class:`CalendarEvent`.
* **Pilgrimage anniversaries** — :class:`PilgrimageSite` rows where
  ``sealed == False``. The site's ``created_at`` recurs annually; we
  emit a single event for the next anniversary in the window.
* **Rite stations** — the four solar transitions per day, from
  :mod:`theourgia.core.resh.adorations` (Phase 03 sun times). Station
  labels come from the FEED OWNER's rite configuration (the
  ``resh.*`` settings keys), resolved through the SAME path the
  ``/api/v1/resh/*`` endpoints use
  (:func:`theourgia.core.resh.user_config.resolve_rite_config`) — the
  operator's Hellenic preset exports Hellenic labels. Callers without
  user context fall back to the canonical Thelemic labels (see
  :func:`_resh_events`).
* **Lunar events** — new / quarter / full moons from
  :func:`theourgia.core.astro.events.lunar_phases_in_range`, plus the
  Hekatean monthly observances (Deipnon / Noumenia / Agathos Daimon)
  with their Attic month/day in the description, from
  :func:`theourgia.core.calendars.attic.attic_context`.
* **Planetary hours** — :mod:`theourgia.core.astro.planetary_hours`,
  bounded to one week ahead (24 events/day; the full ten-week window
  would be ~1.7k VEVENTs).
* **Custom cron** — the feed's ``custom_cron`` expression expanded by
  the pure evaluator in :mod:`theourgia.core.calendar.cron`.

The sealed-day collapse rule is enforced HERE (the build-side single
chokepoint): sealed Entry rows are grouped by their ``occurred_at``
date and emitted as :class:`SealedDayMarker` records — never as
``CalendarEvent`` (which would expose the title).

Location for the geo-dependent paths (resh, planetary hours) comes
from the practitioner's stored astro location (``astro.lat`` /
``astro.lng`` user settings) with the same Greenwich fallback the
``GET /users/me/settings/location`` endpoint reports when unset.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Mapping
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.astro.events import AstroEventKind, lunar_phases_in_range
from theourgia.core.astro.planetary_hours import compute_planetary_hours
from theourgia.core.calendar.cron import (
    CronParseError,
    cron_occurrences,
    parse_cron,
)
from theourgia.core.calendar.ical_serializer import (
    CalendarEvent,
    SealedDayMarker,
)
from theourgia.core.calendars.attic import attic_context
from theourgia.core.resh.adorations import (
    Adoration,
    Transition,
    adoration_for_transition,
    compute_transitions,
)
from theourgia.core.resh.user_config import resolve_rite_config
from theourgia.models.entries import EncryptionMode, Entry, EntryType
from theourgia.models.ical_feed import ICalFeed
from theourgia.models.pilgrimage_sites import PilgrimageSite
from theourgia.models.usersettings import UserSetting

__all__ = [
    "WALK_WINDOW_PAST",
    "WALK_WINDOW_FUTURE",
    "PLANETARY_HOURS_WINDOW_FUTURE",
    "CUSTOM_EVENT_CAP",
    "DEFAULT_FEED_LAT",
    "DEFAULT_FEED_LNG",
    "WORKING_ENTRY_TYPES",
    "WalkResult",
    "walk_feed_data",
    "_collect_workings",
    "_collect_sealed_markers",
    "_collect_pilgrimage_anniversaries",
    "_next_anniversary_in_window",
    "_resh_events",
    "_lunar_events",
    "_observance_events",
    "_planetary_hour_events",
    "_custom_events",
    "_feed_location",
]


# Window for events. The plan locks "next 6 weeks + past 4 weeks"
# for workings — calendar clients want enough recent context to
# render the surrounding week without paging.
WALK_WINDOW_PAST = timedelta(weeks=4)
WALK_WINDOW_FUTURE = timedelta(weeks=6)

# Planetary hours are 24 events/day — a full ten-week window would be
# ~1.7k VEVENTs. One week ahead keeps the feed digestible while still
# letting the practitioner plan elections.
PLANETARY_HOURS_WINDOW_FUTURE = timedelta(days=7)

# Hard cap on custom-cron occurrences per feed build. An every-minute
# expression over the ten-week window would otherwise emit ~100k
# VEVENTs.
CUSTOM_EVENT_CAP = 500

# Greenwich Observatory — the SAME fallback the location settings
# endpoint (GET /users/me/settings/location) reports when the
# practitioner never stored a location, and the same one the entry
# auto-stamp uses.
DEFAULT_FEED_LAT = 51.4769
DEFAULT_FEED_LNG = 0.0


# The Entry types that surface as workings on the calendar. The
# executor (B122) defaults to ``EntryType.WORKING`` only; the feed
# is slightly more generous because ritual_log / pathworking /
# body_practice / scrying all benefit from showing up alongside
# workings on a practitioner's schedule.
WORKING_ENTRY_TYPES: tuple[str, ...] = (
    EntryType.WORKING.value,
    EntryType.RITUAL.value,
    EntryType.RITUAL_LOG.value,
    EntryType.PATHWORKING.value,
    EntryType.BODY_PRACTICE.value,
    EntryType.SCRYING.value,
)


@dataclass(frozen=True, slots=True)
class WalkResult:
    """Returned by :func:`walk_feed_data`. The router hands this
    straight to ``build_vcalendar``."""

    events: list[CalendarEvent]
    sealed_markers: list[SealedDayMarker]


# ── Time window ────────────────────────────────────────────────────


def _window_bounds(
    now: datetime | None = None,
) -> tuple[datetime, datetime]:
    """Return the ``(lower, upper)`` UTC window bounds. Pure — the
    caller injects ``now`` for deterministic tests."""
    n = now or datetime.now(tz=timezone.utc)
    return (n - WALK_WINDOW_PAST, n + WALK_WINDOW_FUTURE)


# ── Workings (non-sealed) → CalendarEvent ──────────────────────────


def _entry_to_event(row: Entry) -> CalendarEvent:
    """Map a (non-sealed) Entry row to a CalendarEvent.

    The Entry's ``title`` becomes the SUMMARY; ``occurred_at`` is
    the DTSTART. We don't emit DTEND (the plan calls for point-in-
    time events; a future batch can wire duration when the data
    model carries it).
    """
    return CalendarEvent(
        uid=f"working-{row.id}@theourgia",
        summary=row.title or "(untitled working)",
        start=row.occurred_at or row.created_at,
        description="",
        location="",
        is_all_day=False,
    )


async def _collect_workings(
    db: AsyncSession,
    owner_id: UUID,
    *,
    now: datetime | None = None,
) -> list[CalendarEvent]:
    """Walk Entry rows in the window that should appear as workings.

    EXCLUDES sealed rows — those go through ``_collect_sealed_markers``
    as count-only day markers. The sealed-day collapse is the single
    chokepoint protecting the iCal feed from leaking sealed titles.
    """
    lower, upper = _window_bounds(now)
    stmt = (
        select(Entry)
        .where(Entry.owner_id == owner_id)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.encryption_mode != EncryptionMode.SEALED)
        .where(Entry.__table__.c.type.in_(list(WORKING_ENTRY_TYPES)))
        .where(Entry.occurred_at.is_not(None))
        .where(Entry.occurred_at >= lower)
        .where(Entry.occurred_at <= upper)
        .order_by(Entry.occurred_at.asc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_entry_to_event(r) for r in rows]


# ── Sealed-day collapse ────────────────────────────────────────────


def _group_sealed_by_date(
    rows: Iterable[Entry],
) -> list[SealedDayMarker]:
    """Group sealed Entry rows by their occurred_at date.

    Returns ONE :class:`SealedDayMarker` per distinct date with the
    count of sealed entries on that date. The marker dataclass is
    restricted to ``{date, count}`` by construction (B135) so the
    underlying titles can NEVER leak."""
    counts: dict[date, int] = {}
    for r in rows:
        if r.occurred_at is None:
            continue
        d = r.occurred_at.date()
        counts[d] = counts.get(d, 0) + 1
    return [
        SealedDayMarker(date=d, count=c)
        for d, c in sorted(counts.items())
    ]


async def _collect_sealed_markers(
    db: AsyncSession,
    owner_id: UUID,
    *,
    now: datetime | None = None,
) -> list[SealedDayMarker]:
    """Walk sealed Entry rows in the window and collapse them by
    date.

    No filter on entry type — ALL sealed entries collapse, regardless
    of kind. The serializer emits each marker as a single all-day
    VEVENT with summary "{N} sealed entries today" (no description,
    no location)."""
    lower, upper = _window_bounds(now)
    stmt = (
        select(Entry)
        .where(Entry.owner_id == owner_id)
        .where(Entry.deleted_at.is_(None))
        .where(Entry.encryption_mode == EncryptionMode.SEALED)
        .where(Entry.occurred_at.is_not(None))
        .where(Entry.occurred_at >= lower)
        .where(Entry.occurred_at <= upper)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return _group_sealed_by_date(rows)


# ── Pilgrimage anniversaries (non-sealed only) ─────────────────────


def _next_anniversary_in_window(
    site_created_at: datetime,
    *,
    now: datetime | None = None,
) -> datetime | None:
    """Return the next yearly anniversary of ``site_created_at`` that
    falls inside the walk window, or ``None`` if no anniversary lands
    inside the window.

    The window is ``[now - WALK_WINDOW_PAST, now + WALK_WINDOW_FUTURE]``
    (the same bounds used for workings).
    """
    lower, upper = _window_bounds(now)
    n = now or datetime.now(tz=timezone.utc)
    # Try this year's anniversary first, then next year's. February
    # 29 anniversaries fall back to March 1 on non-leap years (the
    # iCal viewer renders them as the substitute date — matches
    # most calendar clients' anniversary handling).
    for year in (n.year, n.year + 1):
        month = site_created_at.month
        day = site_created_at.day
        try:
            candidate = site_created_at.replace(year=year)
        except ValueError:
            # Feb 29 in a non-leap year → fall back to March 1.
            if month == 2 and day == 29:
                candidate = site_created_at.replace(
                    year=year, month=3, day=1,
                )
            else:
                continue
        if lower <= candidate <= upper:
            return candidate
    return None


def _pilgrimage_to_event(
    row: PilgrimageSite, anniversary: datetime,
) -> CalendarEvent:
    """The anniversary VEVENT is all-day (matches how calendar
    clients render birthdays). The description carries the site's
    kind so the practitioner sees "pilgrimage anniversary" at a
    glance without revealing finer detail."""
    return CalendarEvent(
        uid=f"pilgrimage-{row.id}-{anniversary.year}@theourgia",
        summary=f"Anniversary: {row.name}",
        start=anniversary,
        description=f"{row.kind.value} site anniversary",
        location="",
        is_all_day=True,
    )


async def _collect_pilgrimage_anniversaries(
    db: AsyncSession,
    owner_id: UUID,
    *,
    now: datetime | None = None,
) -> list[CalendarEvent]:
    """Walk non-sealed pilgrimage sites and emit anniversary events.

    SEALED sites are EXCLUDED ENTIRELY (per the Phase 11 close memo —
    no count-only fallback; sealed pilgrimage anniversaries don't
    even surface as a date marker)."""
    stmt = (
        select(PilgrimageSite)
        .where(PilgrimageSite.owner_id == owner_id)
        .where(PilgrimageSite.deleted_at.is_(None))
        .where(PilgrimageSite.sealed.is_(False))
    )
    rows = (await db.execute(stmt)).scalars().all()
    events: list[CalendarEvent] = []
    for r in rows:
        if r.created_at is None:
            continue
        anniversary = _next_anniversary_in_window(r.created_at, now=now)
        if anniversary is None:
            continue
        events.append(_pilgrimage_to_event(r, anniversary))
    return events


# ── Stored practitioner location ───────────────────────────────────


async def _feed_location(
    db: AsyncSession, owner_id: UUID,
) -> tuple[float, float]:
    """The practitioner's stored astro location, Greenwich fallback.

    Reads the ``astro.lat`` / ``astro.lng`` user-setting rows directly
    (same row shape the user-settings router writes). Missing or
    malformed rows fall back to the Greenwich default — identical to
    what ``GET /users/me/settings/location`` reports when unset.
    """

    async def _read(key: str) -> float | None:
        stmt = select(UserSetting).where(
            UserSetting.user_id == owner_id, UserSetting.key == key,
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if row is None:
            return None
        try:
            return float(json.loads(row.value_json))
        except (TypeError, ValueError):
            return None

    lat = await _read("astro.lat")
    lng = await _read("astro.lng")
    if lat is None or lng is None:
        return (DEFAULT_FEED_LAT, DEFAULT_FEED_LNG)
    return (lat, lng)


# ── Rite stations (né Liber Resh) ──────────────────────────────────


# What the rite is CALLED in the event summary, per preset. The
# thelemic preset keeps the classical name; anything else gets the
# generalized four-station framing (matches the Today surfaces).
_RITE_TITLES: dict[str, str] = {
    "thelemic": "Liber Resh",
    "hellenic": "Four-Station Rite",
}
_FALLBACK_RITE_TITLE = "Liber Resh"


def _resh_events(
    latitude: float,
    longitude: float,
    *,
    stations: Mapping[Transition, Adoration] | None = None,
    preset: str | None = None,
    now: datetime | None = None,
) -> list[CalendarEvent]:
    """The four solar transitions for every day in the walk window,
    computed from real sun times at the given location.

    ``stations`` carries the feed owner's resolved rite stations
    (preset + overrides — see
    :meth:`theourgia.core.resh.user_config.ResolvedRiteConfig.effective_stations`)
    and ``preset`` names the preset for the summary title.

    FALLBACK (documented): with no user context — ``stations`` is
    ``None`` — this emits the canonical Thelemic labels via
    :func:`adoration_for_transition` under the "Liber Resh" title,
    exactly the pre-preset behavior.

    Polar days silently drop the sunrise/sunset stations (the
    adorations module returns ``None`` for them); noon and midnight
    are always defined.
    """
    if stations is None:
        title = _FALLBACK_RITE_TITLE
    else:
        title = _RITE_TITLES.get(preset or "", "Four-Station Rite")
    lower, upper = _window_bounds(now)
    events: list[CalendarEvent] = []
    d = lower.date()
    while d <= upper.date():
        transitions = compute_transitions(d, latitude, longitude)
        for transition, instant in transitions.as_pairs():
            if not (lower <= instant <= upper):
                continue
            if stations is None:
                adoration = adoration_for_transition(transition)
            else:
                adoration = stations[transition]
            events.append(
                CalendarEvent(
                    uid=(
                        f"resh-{d.isoformat()}-{transition.value}"
                        "@theourgia"
                    ),
                    summary=(
                        f"{title} — {transition.value} "
                        f"({adoration.godform})"
                    ),
                    start=instant,
                    description=(
                        f"Adoration of {adoration.godform}, "
                        f"facing {adoration.direction}."
                    ),
                    location="",
                    is_all_day=False,
                )
            )
        d += timedelta(days=1)
    return events


# ── Lunar phases ───────────────────────────────────────────────────


_LUNAR_SUMMARIES: dict[AstroEventKind, str] = {
    AstroEventKind.NEW_MOON: "New moon",
    AstroEventKind.FIRST_QUARTER: "First quarter",
    AstroEventKind.FULL_MOON: "Full moon",
    AstroEventKind.LAST_QUARTER: "Last quarter",
}


def _lunar_events(*, now: datetime | None = None) -> list[CalendarEvent]:
    """New / quarter / full moons in the walk window, from the real
    ephemeris. Location-independent — always emittable."""
    lower, upper = _window_bounds(now)
    events: list[CalendarEvent] = []
    for phase in lunar_phases_in_range(lower, upper):
        summary = _LUNAR_SUMMARIES.get(phase.kind)
        if summary is None:  # pragma: no cover — defensive
            continue
        stamp = phase.instant.strftime("%Y%m%dT%H%M%SZ")
        events.append(
            CalendarEvent(
                uid=f"lunar-{phase.kind.value}-{stamp}@theourgia",
                summary=summary,
                start=phase.instant,
                description=(
                    f"Moon in {phase.sign}" if phase.sign else ""
                ),
                location="",
                is_all_day=False,
            )
        )
    return events


# ── Hekatean observances (Deipnon / Noumenia / Agathos Daimon) ─────


# Display labels + one-line glosses for the monthly observance arc.
# The keys are the ``observance`` values ``attic_context`` reports.
_OBSERVANCE_LABELS: dict[str, str] = {
    "deipnon": "Deipnon",
    "noumenia": "Noumenia",
    "agathos_daimon": "Agathos Daimon",
}
_OBSERVANCE_GLOSSES: dict[str, str] = {
    "deipnon": (
        "Hekate's supper — the dark-moon day closing the month."
    ),
    "noumenia": (
        "First crescent — the new lunar month begins."
    ),
    "agathos_daimon": (
        "Libation to the household's Good Spirit — 2nd of the month."
    ),
}


def _observance_events(
    *, now: datetime | None = None,
) -> list[CalendarEvent]:
    """The Hekatean monthly observances in the walk window, as
    all-day events.

    Dating comes from :func:`theourgia.core.calendars.attic.attic_context`
    — the same astronomical new-moon reckoning the ``today-context``
    endpoint serves, so day 1 here is always the Noumenia day there —
    and each event's DESCRIPTION carries the Attic month/day
    (``"Attic date: {day} {month} {year_span}."``) so the export stays
    internally consistent with the operator's Hellenic reckoning.
    """
    lower, upper = _window_bounds(now)
    events: list[CalendarEvent] = []
    d = lower.date()
    while d <= upper.date():
        ctx = attic_context(d)
        if ctx.observance is not None:
            slug = ctx.observance.replace("_", "-")
            events.append(
                CalendarEvent(
                    uid=(
                        f"observance-{slug}-{d.isoformat()}"
                        "@theourgia"
                    ),
                    summary=_OBSERVANCE_LABELS[ctx.observance],
                    start=datetime(
                        d.year, d.month, d.day, tzinfo=timezone.utc,
                    ),
                    description=(
                        f"{_OBSERVANCE_GLOSSES[ctx.observance]} "
                        f"Attic date: {ctx.day} {ctx.month_name} "
                        f"{ctx.year_span}."
                    ),
                    location="",
                    is_all_day=True,
                )
            )
        d += timedelta(days=1)
    return events


# ── Planetary hours ────────────────────────────────────────────────


def _planetary_hour_events(
    latitude: float,
    longitude: float,
    *,
    now: datetime | None = None,
) -> list[CalendarEvent]:
    """The true (sunrise/sunset-anchored) planetary hours from now to
    :data:`PLANETARY_HOURS_WINDOW_FUTURE` ahead.

    The offset range starts at -1 so hours belonging to yesterday's
    night arc (before today's sunrise) are included.
    """
    n = now or datetime.now(tz=timezone.utc)
    end = n + PLANETARY_HOURS_WINDOW_FUTURE
    events: list[CalendarEvent] = []
    for offset in range(-1, PLANETARY_HOURS_WINDOW_FUTURE.days + 1):
        base_day = n + timedelta(days=offset)
        for hour in compute_planetary_hours(
            base_day, latitude, longitude,
        ):
            if not (n <= hour.start <= end):
                continue
            events.append(
                CalendarEvent(
                    uid=(
                        f"planetary-hour-{base_day.date().isoformat()}"
                        f"-{hour.index}@theourgia"
                    ),
                    summary=(
                        f"Hour of {hour.ruler.value.capitalize()} "
                        f"{hour.glyph}"
                    ),
                    start=hour.start,
                    end=hour.end,
                    description="",
                    location="",
                    is_all_day=False,
                )
            )
    return events


# ── Custom cron ────────────────────────────────────────────────────


def _custom_events(
    feed: ICalFeed, *, now: datetime | None = None,
) -> list[CalendarEvent]:
    """Occurrences of the feed's ``custom_cron`` expression in the
    walk window (capped at :data:`CUSTOM_EVENT_CAP`).

    An empty or unparsable expression emits nothing — the settings
    PATCH surface owns validation feedback; the feed never serves a
    guess.
    """
    if not feed.custom_cron:
        return []
    try:
        schedule = parse_cron(feed.custom_cron)
    except CronParseError:
        return []
    lower, upper = _window_bounds(now)
    return [
        CalendarEvent(
            uid=f"custom-{t.strftime('%Y%m%dT%H%MZ')}@theourgia",
            summary="Custom reminder",
            start=t,
            description=f"Recurs per cron '{feed.custom_cron}'.",
            location="",
            is_all_day=False,
        )
        for t in cron_occurrences(
            schedule, lower, upper, limit=CUSTOM_EVENT_CAP,
        )
    ]


# ── Top-level dispatch ──────────────────────────────────────────────


async def walk_feed_data(
    db: AsyncSession,
    feed: ICalFeed,
    *,
    now: datetime | None = None,
) -> WalkResult:
    """Compose every enabled include into a (events, sealed_markers)
    pair the serializer can consume.

    All six toggles are wired:

    * ``include_workings`` → workings + sealed-day collapse.
    * ``include_pilgrimage_anniversaries`` → site anniversaries
      (non-sealed only).
    * ``include_resh`` → the four daily solar transitions at the
      practitioner's stored location, labeled per the FEED OWNER's
      rite configuration (same resolution path as ``/api/v1/resh``).
    * ``include_lunar_events`` → new / quarter / full moons, plus the
      Hekatean observances with their Attic date.
    * ``include_planetary_hours`` → the true planetary hours, one
      week ahead.
    * ``include_custom`` → the ``custom_cron`` expression expanded.
    """
    events: list[CalendarEvent] = []
    sealed_markers: list[SealedDayMarker] = []

    if feed.include_workings:
        events.extend(
            await _collect_workings(db, feed.owner_id, now=now),
        )
        # The sealed-day collapse is gated by the same toggle —
        # when the practitioner asks for workings, sealed days
        # surface as the count-only markers.
        sealed_markers.extend(
            await _collect_sealed_markers(db, feed.owner_id, now=now),
        )

    if feed.include_pilgrimage_anniversaries:
        events.extend(
            await _collect_pilgrimage_anniversaries(
                db, feed.owner_id, now=now,
            ),
        )

    if feed.include_resh or feed.include_planetary_hours:
        latitude, longitude = await _feed_location(db, feed.owner_id)
        if feed.include_resh:
            # The feed is a per-user token — the owner IS the user
            # context. Resolve her rite configuration through the
            # same path as /api/v1/resh so the export speaks the
            # configured labels (Hellenic preset by default).
            rite = await resolve_rite_config(db, feed.owner_id)
            events.extend(
                _resh_events(
                    latitude,
                    longitude,
                    stations=rite.effective_stations(),
                    preset=rite.preset,
                    now=now,
                ),
            )
        if feed.include_planetary_hours:
            events.extend(
                _planetary_hour_events(latitude, longitude, now=now),
            )

    if feed.include_lunar_events:
        events.extend(_lunar_events(now=now))
        events.extend(_observance_events(now=now))

    if feed.include_custom:
        events.extend(_custom_events(feed, now=now))

    # Sort events by start time for stable output (calendar clients
    # tolerate any order; humans reading the .ics file appreciate it).
    events.sort(key=lambda e: e.start)
    return WalkResult(events=events, sealed_markers=sealed_markers)
