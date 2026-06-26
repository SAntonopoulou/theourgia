"""iCal feed data walker (Phase 11 follow-up).

B135 shipped the ``/ical/v1/{token}.ics`` route as a VCALENDAR shell;
this module supplies the bridge between the live database and the
pure RFC 5545 serializer.

Two paths today:

* **Workings** — Entry rows with ``encryption_mode != SEALED`` and
  ``type`` in the working-kind set, ``occurred_at`` in the configured
  window. Each row becomes a :class:`CalendarEvent`.
* **Pilgrimage anniversaries** — :class:`PilgrimageSite` rows where
  ``sealed == False``. The site's ``created_at`` recurs annually; we
  emit a single event for the next anniversary in the window.

The sealed-day collapse rule is enforced HERE (the build-side single
chokepoint): sealed Entry rows are grouped by their ``occurred_at``
date and emitted as :class:`SealedDayMarker` records — never as
``CalendarEvent`` (which would expose the title).

Out of scope (deferred follow-ups · marked with raises so silent
gaps can't sneak in):

* Resh stations (needs Phase 03 sunrise/noon/sunset integration).
* Lunar events (needs the Phase 03 astro engine).
* Planetary hours (high-cardinality; needs the same Phase 03
  substrate).
* Custom cron (needs a cron evaluator integration).

Each of those returns an EMPTY list today with a one-line ``# TODO``
in the dispatcher — the dispatcher logs the configured toggle but
emits no events. Future batches fill them in.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.core.calendar.ical_serializer import (
    CalendarEvent,
    SealedDayMarker,
)
from theourgia.models.entries import EncryptionMode, Entry, EntryType
from theourgia.models.ical_feed import ICalFeed
from theourgia.models.pilgrimage_sites import PilgrimageSite

__all__ = [
    "WALK_WINDOW_PAST",
    "WALK_WINDOW_FUTURE",
    "WORKING_ENTRY_TYPES",
    "WalkResult",
    "walk_feed_data",
    "_collect_workings",
    "_collect_sealed_markers",
    "_collect_pilgrimage_anniversaries",
    "_next_anniversary_in_window",
]


# Window for events. The plan locks "next 6 weeks + past 4 weeks"
# for workings — calendar clients want enough recent context to
# render the surrounding week without paging.
WALK_WINDOW_PAST = timedelta(weeks=4)
WALK_WINDOW_FUTURE = timedelta(weeks=6)


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


# ── Top-level dispatch ──────────────────────────────────────────────


async def walk_feed_data(
    db: AsyncSession,
    feed: ICalFeed,
    *,
    now: datetime | None = None,
) -> WalkResult:
    """Compose every enabled include into a (events, sealed_markers)
    pair the serializer can consume.

    Toggles wired today:

    * ``include_workings`` → workings + sealed-day collapse.
    * ``include_pilgrimage_anniversaries`` → site anniversaries
      (non-sealed only).

    Toggles whose substrate isn't yet integrated raise NO error —
    they simply emit no events. The router still serves a clean
    VCALENDAR; subscribers don't get partial data they can't
    interpret. Each deferred toggle is marked with a TODO comment
    below.
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

    # TODO: include_resh — needs Phase 03 sunrise/noon/sunset.
    # TODO: include_lunar_events — needs Phase 03 astro engine.
    # TODO: include_planetary_hours — needs same Phase 03 substrate.
    # TODO: include_custom (custom_cron) — needs a cron evaluator.

    # Sort events by start time for stable output (calendar clients
    # tolerate any order; humans reading the .ics file appreciate it).
    events.sort(key=lambda e: e.start)
    return WalkResult(events=events, sealed_markers=sealed_markers)
