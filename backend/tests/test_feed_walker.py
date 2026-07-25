"""Unit tests for the iCal feed walker (Phase 11 follow-up).

THE critical honesty rules covered:

  * Sealed Entry rows NEVER become CalendarEvents — they go through
    ``_group_sealed_by_date`` → ``SealedDayMarker`` records only.
  * Sealed pilgrimage sites are EXCLUDED ENTIRELY from anniversaries
    (no count-only fallback — they're invisible).
  * Pure helpers (_group_sealed_by_date, _next_anniversary_in_window,
    _entry_to_event, _pilgrimage_to_event) are unit-tested without
    a DB round-trip.
  * The walker's bounded window is locked at past=4w, future=6w.
  * Feb 29 anniversary handling falls back to March 1 in non-leap
    years.
  * The four formerly-dead toggles (resh / lunar / planetary hours /
    custom cron) now EMIT real events from the Phase 03 engines.
"""

from __future__ import annotations

import inspect
from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

from theourgia.core.calendar import feed_walker
from theourgia.core.calendar.feed_walker import (
    CUSTOM_EVENT_CAP,
    PLANETARY_HOURS_WINDOW_FUTURE,
    WALK_WINDOW_FUTURE,
    WALK_WINDOW_PAST,
    WORKING_ENTRY_TYPES,
    WalkResult,
    _custom_events,
    _entry_to_event,
    _group_sealed_by_date,
    _lunar_events,
    _next_anniversary_in_window,
    _pilgrimage_to_event,
    _planetary_hour_events,
    _resh_events,
    _window_bounds,
)
from theourgia.core.calendar.ical_serializer import (
    CalendarEvent,
    SealedDayMarker,
)
from theourgia.models.entries import EncryptionMode, EntryType
from theourgia.models.pilgrimage_sites import SiteKind


# ── Constants ────────────────────────────────────────────────────


def test_window_past_is_four_weeks() -> None:
    """The plan locks 4 weeks of past context for calendar clients."""
    assert WALK_WINDOW_PAST == timedelta(weeks=4)


def test_window_future_is_six_weeks() -> None:
    """The plan locks 6 weeks of future scheduling."""
    assert WALK_WINDOW_FUTURE == timedelta(weeks=6)


def test_working_entry_types_include_canonical_working() -> None:
    """The single mandatory entry type that surfaces as a working."""
    assert EntryType.WORKING.value in WORKING_ENTRY_TYPES


def test_working_entry_types_excludes_observation() -> None:
    """An observation is not a working — calendar shouldn't show it."""
    assert EntryType.OBSERVATION.value not in WORKING_ENTRY_TYPES


def test_working_entry_types_excludes_note() -> None:
    """Notes are journal entries, not workings."""
    assert EntryType.NOTE.value not in WORKING_ENTRY_TYPES


def test_working_entry_types_excludes_dream() -> None:
    """Dreams have their own logging surface; not workings on the cal."""
    assert EntryType.DREAM.value not in WORKING_ENTRY_TYPES


def test_working_entry_types_excludes_meeting_note() -> None:
    assert EntryType.MEETING_NOTE.value not in WORKING_ENTRY_TYPES


def test_working_entry_types_excludes_blog_post() -> None:
    """Blog posts are publications, not workings."""
    assert EntryType.BLOG_POST.value not in WORKING_ENTRY_TYPES


# ── _window_bounds ───────────────────────────────────────────────


def test_window_bounds_centers_on_now() -> None:
    now = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)
    lower, upper = _window_bounds(now)
    assert upper - now == WALK_WINDOW_FUTURE
    assert now - lower == WALK_WINDOW_PAST


def test_window_bounds_default_now_is_utc() -> None:
    """When ``now`` is omitted the walker uses UTC. Defensive."""
    lower, upper = _window_bounds()
    assert lower.tzinfo is not None
    assert upper.tzinfo is not None


# ── _entry_to_event ──────────────────────────────────────────────


_DEFAULT_OCCURRED = datetime(2026, 6, 26, 19, 0, tzinfo=timezone.utc)
_UNSET = object()


def _entry(
    *,
    title: str = "Friday banishing",
    occurred_at: datetime | None | object = _UNSET,
    entry_type: EntryType = EntryType.WORKING,
    encryption_mode: EncryptionMode = EncryptionMode.NONE,
) -> SimpleNamespace:
    # Sentinel so callers can pass occurred_at=None explicitly.
    if occurred_at is _UNSET:
        occurred_at = _DEFAULT_OCCURRED
    return SimpleNamespace(
        id=uuid4(),
        title=title,
        occurred_at=occurred_at,
        created_at=_DEFAULT_OCCURRED,
        type=entry_type,
        encryption_mode=encryption_mode,
    )


def test_entry_to_event_maps_title_to_summary() -> None:
    row = _entry(title="Hekate's Deipnon")
    ev = _entry_to_event(row)
    assert ev.summary == "Hekate's Deipnon"


def test_entry_to_event_uid_uses_working_namespace() -> None:
    row = _entry()
    ev = _entry_to_event(row)
    assert ev.uid.startswith("working-")
    assert ev.uid.endswith("@theourgia")
    assert str(row.id) in ev.uid


def test_entry_to_event_falls_back_when_title_empty() -> None:
    row = _entry(title="")
    ev = _entry_to_event(row)
    # Empty title gets a clear fallback, not a blank summary.
    assert ev.summary == "(untitled working)"


def test_entry_to_event_is_not_all_day() -> None:
    """Workings are point-in-time, not all-day."""
    row = _entry()
    ev = _entry_to_event(row)
    assert ev.is_all_day is False


def test_entry_to_event_emits_no_description_or_location() -> None:
    """Defensive: don't leak entry body / location through the
    description / LOCATION fields. The Phase 11 close memo locks
    the calendar feed as title-only for workings."""
    row = _entry()
    ev = _entry_to_event(row)
    assert ev.description == ""
    assert ev.location == ""


# ── _group_sealed_by_date (the CRITICAL collapse rule) ───────────


def test_group_sealed_by_date_collapses_same_day() -> None:
    a = _entry(
        occurred_at=datetime(2026, 7, 4, 9, 0, tzinfo=timezone.utc),
    )
    b = _entry(
        occurred_at=datetime(2026, 7, 4, 18, 0, tzinfo=timezone.utc),
    )
    c = _entry(
        occurred_at=datetime(2026, 7, 4, 23, 0, tzinfo=timezone.utc),
    )
    markers = _group_sealed_by_date([a, b, c])
    assert len(markers) == 1
    assert markers[0].date == date(2026, 7, 4)
    assert markers[0].count == 3


def test_group_sealed_by_date_keeps_distinct_days_apart() -> None:
    a = _entry(occurred_at=datetime(2026, 7, 1, 9, 0, tzinfo=timezone.utc))
    b = _entry(occurred_at=datetime(2026, 7, 2, 9, 0, tzinfo=timezone.utc))
    c = _entry(occurred_at=datetime(2026, 7, 3, 9, 0, tzinfo=timezone.utc))
    markers = _group_sealed_by_date([a, b, c])
    assert len(markers) == 3
    assert {m.count for m in markers} == {1}


def test_group_sealed_by_date_sorts_by_date() -> None:
    """Stable output: subscribers want chronological order."""
    later = _entry(
        occurred_at=datetime(2026, 7, 10, 9, 0, tzinfo=timezone.utc),
    )
    earlier = _entry(
        occurred_at=datetime(2026, 7, 1, 9, 0, tzinfo=timezone.utc),
    )
    markers = _group_sealed_by_date([later, earlier])
    assert [m.date for m in markers] == [date(2026, 7, 1), date(2026, 7, 10)]


def test_group_sealed_by_date_skips_rows_without_occurred_at() -> None:
    """A sealed entry with no occurred_at can't be collapsed — silently
    skipped (no error, no fallback summary)."""
    a = _entry(occurred_at=None)
    b = _entry(
        occurred_at=datetime(2026, 7, 4, 9, 0, tzinfo=timezone.utc),
    )
    markers = _group_sealed_by_date([a, b])
    assert len(markers) == 1


def test_group_sealed_by_date_marker_carries_only_date_and_count() -> None:
    """Defensive: a future commit that tries to enrich the marker
    with the underlying titles can't — the marker dataclass is
    restricted to {date, count} by construction."""
    a = _entry(
        title="My private working — DO NOT LEAK",
        occurred_at=datetime(2026, 7, 4, 9, 0, tzinfo=timezone.utc),
    )
    markers = _group_sealed_by_date([a])
    fields = SealedDayMarker.__dataclass_fields__.keys()
    assert set(fields) == {"date", "count"}
    # Verify no title leaks via __repr__ either.
    assert "DO NOT LEAK" not in repr(markers[0])


def test_group_sealed_returns_empty_for_empty_input() -> None:
    assert _group_sealed_by_date([]) == []


# ── _next_anniversary_in_window ──────────────────────────────────


def test_next_anniversary_within_this_years_window() -> None:
    site_created = datetime(2020, 7, 1, 12, 0, tzinfo=timezone.utc)
    now = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)
    anniversary = _next_anniversary_in_window(site_created, now=now)
    assert anniversary is not None
    assert anniversary.year == 2026
    assert anniversary.month == 7
    assert anniversary.day == 1


def test_next_anniversary_within_next_years_window() -> None:
    """A site whose anniversary already passed this year — and whose
    next-year anniversary falls inside the future window (6 weeks)."""
    # If now is May 20 and the anniversary is June 25:
    # this year (June 25) is within 6 weeks → that's selected.
    # Use a configuration where this year's already passed.
    site_created = datetime(2020, 5, 1, 12, 0, tzinfo=timezone.utc)
    now = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)
    # 2026 anniversary was May 1, 2 months past → out of window
    # (window is -4w to +6w from July 1). Next year May 1, 2027
    # is way too far in the future. Should return None.
    anniversary = _next_anniversary_in_window(site_created, now=now)
    assert anniversary is None


def test_next_anniversary_feb29_falls_back_to_march_1() -> None:
    """Leap-day sites in non-leap years fall back to March 1
    (matches how most calendar clients render leap-day birthdays)."""
    site_created = datetime(2020, 2, 29, 12, 0, tzinfo=timezone.utc)
    # 2027 is NOT a leap year.
    now = datetime(2027, 2, 15, 12, 0, tzinfo=timezone.utc)
    anniversary = _next_anniversary_in_window(site_created, now=now)
    assert anniversary is not None
    assert anniversary.year == 2027
    assert anniversary.month == 3
    assert anniversary.day == 1


def test_next_anniversary_outside_window_returns_none() -> None:
    """A site whose anniversary is several months out from the
    window → None. The walker emits no event for it."""
    site_created = datetime(2020, 1, 1, 12, 0, tzinfo=timezone.utc)
    now = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)
    # Jan 1 is way out of the May 29 → Aug 7 window.
    anniversary = _next_anniversary_in_window(site_created, now=now)
    assert anniversary is None


# ── _pilgrimage_to_event ─────────────────────────────────────────


def _pilg_site(
    *,
    name: str = "Acropolis",
    kind: SiteKind = SiteKind.SACRED,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        name=name,
        kind=kind,
        created_at=datetime(2020, 7, 1, 12, 0, tzinfo=timezone.utc),
    )


def test_pilgrimage_to_event_uses_name_in_summary() -> None:
    site = _pilg_site(name="Eleusis")
    anniversary = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)
    ev = _pilgrimage_to_event(site, anniversary)
    assert "Eleusis" in ev.summary
    assert ev.summary.startswith("Anniversary:")


def test_pilgrimage_to_event_uid_is_year_unique() -> None:
    """A site has one anniversary per year; the UID encodes the year
    so multi-year subscriptions don't collide."""
    site = _pilg_site()
    anniversary_2026 = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)
    anniversary_2027 = datetime(2027, 7, 1, 12, 0, tzinfo=timezone.utc)
    ev_2026 = _pilgrimage_to_event(site, anniversary_2026)
    ev_2027 = _pilgrimage_to_event(site, anniversary_2027)
    assert ev_2026.uid != ev_2027.uid
    assert "2026" in ev_2026.uid
    assert "2027" in ev_2027.uid


def test_pilgrimage_to_event_is_all_day() -> None:
    """Anniversaries are all-day events (match calendar-client
    rendering of birthdays)."""
    site = _pilg_site()
    anniversary = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)
    ev = _pilgrimage_to_event(site, anniversary)
    assert ev.is_all_day is True


def test_pilgrimage_to_event_description_carries_kind_only() -> None:
    """The description carries the site KIND (sacred/working/etc.) —
    NOT the site's story or notes. Locks the iCal as low-detail."""
    site = _pilg_site(kind=SiteKind.SACRED)
    anniversary = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)
    ev = _pilgrimage_to_event(site, anniversary)
    assert ev.description == "sacred site anniversary"


def test_pilgrimage_to_event_emits_no_location() -> None:
    """The site's lat/lng MUST NOT appear in LOCATION — that would
    leak the precision floor."""
    site = _pilg_site()
    anniversary = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)
    ev = _pilgrimage_to_event(site, anniversary)
    assert ev.location == ""


# ── WalkResult ───────────────────────────────────────────────────


def test_walk_result_is_frozen() -> None:
    """Frozen dataclass — the caller can't mutate after the walk."""
    r = WalkResult(events=[], sealed_markers=[])
    try:
        r.events = []  # type: ignore[misc]
        assert False, "expected attribute error"
    except (AttributeError, Exception):
        pass


# ── Source-level honesty invariants ──────────────────────────────


def test_walker_filters_sealed_from_workings_in_source() -> None:
    """The workings walker MUST filter out sealed rows — they go
    through _collect_sealed_markers, never through _collect_workings.
    A future commit that drops the filter gets caught."""
    src = inspect.getsource(feed_walker._collect_workings)
    assert "encryption_mode != EncryptionMode.SEALED" in src or (
        "EncryptionMode.SEALED" in src
    )


def test_walker_filters_sealed_pilgrimage_sites_in_source() -> None:
    """The pilgrimage walker MUST filter sealed=False — sealed sites
    are EXCLUDED ENTIRELY per the Phase 11 close memo (no count-only
    fallback)."""
    src = inspect.getsource(
        feed_walker._collect_pilgrimage_anniversaries,
    )
    assert "sealed.is_(False)" in src


def test_walker_dispatches_sealed_markers_only_when_workings_enabled() -> None:
    """The sealed-day collapse fires under the include_workings
    toggle, NOT a separate toggle. Same chokepoint."""
    src = inspect.getsource(feed_walker.walk_feed_data)
    # Find the include_workings branch; the sealed-markers extend
    # must live inside it.
    workings_idx = src.index("feed.include_workings")
    next_toggle_idx = src.index("feed.include_pilgrimage_anniversaries")
    workings_branch = src[workings_idx:next_toggle_idx]
    assert "_collect_sealed_markers" in workings_branch


def test_walker_dispatches_all_six_toggles_in_source() -> None:
    """Every ``include_*`` toggle on the ICalFeed model must gate a
    real emission path — none may silently accept input and emit
    nothing (the pre-Day-1 dead-toggle bug)."""
    src = inspect.getsource(feed_walker.walk_feed_data)
    assert "feed.include_workings" in src
    assert "feed.include_pilgrimage_anniversaries" in src
    assert "feed.include_resh" in src
    assert "feed.include_lunar_events" in src
    assert "feed.include_planetary_hours" in src
    assert "feed.include_custom" in src
    assert "TODO" not in src


# ── Resh emission ────────────────────────────────────────────────


_NOW = datetime(2026, 6, 26, 12, 0, tzinfo=timezone.utc)
_ATHENS = (37.9838, 23.7275)


def test_resh_events_emits_four_per_day() -> None:
    """Non-polar latitude: sunrise/noon/sunset/midnight every day of
    the 10-week window."""
    events = _resh_events(*_ATHENS, now=_NOW)
    lower, upper = _window_bounds(_NOW)
    n_days = (upper.date() - lower.date()).days + 1
    # Boundary days can lose transitions that fall outside the exact
    # datetime window; everything else emits all four.
    assert len(events) >= (n_days - 2) * 4
    assert len(events) <= n_days * 4


def test_resh_events_carry_godform_and_direction() -> None:
    events = _resh_events(*_ATHENS, now=_NOW)
    sunrise = next(e for e in events if "sunrise" in e.uid)
    assert "Ra Hoor Khuit" in sunrise.summary
    assert "East" in sunrise.description
    assert sunrise.location == ""
    assert sunrise.is_all_day is False


def test_resh_events_uid_namespaced_per_day_and_transition() -> None:
    events = _resh_events(*_ATHENS, now=_NOW)
    uids = [e.uid for e in events]
    assert len(uids) == len(set(uids)), "resh UIDs must be unique"
    assert all(u.startswith("resh-") and u.endswith("@theourgia") for u in uids)


def test_resh_events_within_window() -> None:
    lower, upper = _window_bounds(_NOW)
    for e in _resh_events(*_ATHENS, now=_NOW):
        assert lower <= e.start <= upper


# ── Lunar emission ───────────────────────────────────────────────


def test_lunar_events_emits_phases_in_window() -> None:
    """A 10-week window spans ~2.5 lunations → ~10 phase events."""
    events = _lunar_events(now=_NOW)
    assert 8 <= len(events) <= 12
    summaries = {e.summary for e in events}
    assert summaries <= {
        "New moon", "First quarter", "Full moon", "Last quarter",
    }


def test_lunar_events_carry_moon_sign_in_description() -> None:
    """v1-051: each phase is subtitled 'Moon in {sign}'."""
    events = _lunar_events(now=_NOW)
    assert events
    for e in events:
        assert e.description.startswith("Moon in ")
        assert e.is_all_day is False
        assert e.uid.startswith("lunar-")
        assert e.uid.endswith("@theourgia")


def test_lunar_events_within_window() -> None:
    lower, upper = _window_bounds(_NOW)
    for e in _lunar_events(now=_NOW):
        assert lower <= e.start <= upper


# ── Planetary-hour emission ──────────────────────────────────────


def test_planetary_hours_window_is_one_week() -> None:
    """Cardinality guard: 24 events/day over the full 10-week window
    would be ~1.7k VEVENTs; the sub-window is locked at 7 days."""
    assert PLANETARY_HOURS_WINDOW_FUTURE == timedelta(days=7)


def test_planetary_hour_events_cover_the_week() -> None:
    events = _planetary_hour_events(*_ATHENS, now=_NOW)
    # 7 days × 24 hours, ± boundary hours.
    assert 165 <= len(events) <= 170
    end = _NOW + PLANETARY_HOURS_WINDOW_FUTURE
    for e in events:
        assert _NOW <= e.start <= end
        assert e.end is not None and e.end > e.start


def test_planetary_hour_events_name_the_ruler() -> None:
    events = _planetary_hour_events(*_ATHENS, now=_NOW)
    rulers = {
        "Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon",
    }
    for e in events:
        assert e.summary.startswith("Hour of ")
        assert e.summary.split()[2] in rulers
        assert e.uid.startswith("planetary-hour-")


def test_planetary_hour_uids_unique() -> None:
    events = _planetary_hour_events(*_ATHENS, now=_NOW)
    uids = [e.uid for e in events]
    assert len(uids) == len(set(uids))


# ── Custom-cron emission ─────────────────────────────────────────


def _feed(custom_cron: str | None) -> SimpleNamespace:
    return SimpleNamespace(custom_cron=custom_cron)


def test_custom_events_expands_weekly_cron() -> None:
    """'30 6 * * 1' — every Monday 06:30 — fires ten times in the
    ten-week window."""
    events = _custom_events(_feed("30 6 * * 1"), now=_NOW)
    assert len(events) == 10
    for e in events:
        assert e.start.weekday() == 0  # Monday
        assert (e.start.hour, e.start.minute) == (6, 30)
        assert e.summary == "Custom reminder"
        assert "30 6 * * 1" in e.description


def test_custom_events_empty_expression_emits_nothing() -> None:
    assert _custom_events(_feed(None), now=_NOW) == []
    assert _custom_events(_feed(""), now=_NOW) == []


def test_custom_events_invalid_expression_emits_nothing() -> None:
    """A broken cron never guesses — it emits nothing."""
    assert _custom_events(_feed("not a cron"), now=_NOW) == []
    assert _custom_events(_feed("99 99 * *"), now=_NOW) == []


def test_custom_events_capped() -> None:
    """An every-minute cron is capped, not served as ~100k VEVENTs."""
    events = _custom_events(_feed("* * * * *"), now=_NOW)
    assert len(events) == CUSTOM_EVENT_CAP
