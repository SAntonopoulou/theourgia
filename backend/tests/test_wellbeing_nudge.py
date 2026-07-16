"""Crisis-aware nudge tests — v1-010.

Covers the pure trigger math, the privacy contract (opted-out users'
mood data is never queried — asserted via a recording fake session),
mute/dismiss persistence, the resources starter list, and the router
surface (paths + auth).
"""

from __future__ import annotations

import json
from datetime import UTC, date, datetime, time, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.routing import APIRoute
from pydantic import ValidationError

from theourgia.api.deps import get_current_user
from theourgia.api.routers.v1 import wellbeing as wb_module
from theourgia.api.routers.v1.entries import EntryCreate
from theourgia.api.routers.v1.wellbeing import (
    NudgeDismiss,
    NudgeSettingWrite,
    dismiss_nudge,
    get_nudge,
    put_nudge,
)
from theourgia.core.usersettings.defaults import register_default_settings
from theourgia.core.usersettings.registry import SettingsRegistry
from theourgia.core.wellbeing import resources as resources_module
from theourgia.core.wellbeing.resources import (
    CRISIS_RESOURCES,
    resources_payload,
)
from theourgia.core.wellbeing.service import (
    CRISIS_NUDGE_KEY,
    CRISIS_NUDGE_MUTED_UNTIL_KEY,
    MUTED_FOREVER,
    evaluate_nudge,
    is_muted,
    set_crisis_nudge_enabled,
    set_muted_until,
)
from theourgia.core.wellbeing.trigger import (
    MIN_DISTINCT_DAYS,
    MOOD_SCALE_MAX,
    MOOD_SCALE_MIN,
    SEVERE_FRACTION,
    SEVERE_MOOD_CEILING,
    MoodReading,
    evaluate_sustained_distress,
    is_severe_mood,
)

NOW = datetime(2026, 7, 16, 12, 0, tzinfo=UTC)
TODAY = NOW.date()


def reading(days_ago: int, mood: int) -> MoodReading:
    return MoodReading(day=TODAY - timedelta(days=days_ago), mood=mood)


# ── Fakes ────────────────────────────────────────────────────────────


class FakeResult:
    def __init__(self, *, scalar=None, rows=None) -> None:
        self._scalar = scalar
        self._rows = rows or []

    def scalar_one_or_none(self):
        return self._scalar

    def all(self):
        return list(self._rows)


class FakeSession:
    """Records queries; serves user_setting + entry fixtures.

    ``forbid_entry_query=True`` turns any query that touches the
    ``entry`` table into an immediate failure — this is how the
    privacy contract ("opted out means mood data is never read") is
    asserted.
    """

    def __init__(
        self,
        *,
        settings: dict[str, object] | None = None,
        mood_rows: list[tuple] | None = None,
        forbid_entry_query: bool = False,
    ) -> None:
        self.settings_rows: dict[str, SimpleNamespace] = {}
        for key, value in (settings or {}).items():
            self.settings_rows[key] = SimpleNamespace(
                key=key, value_json=json.dumps(value)
            )
        self.mood_rows = list(mood_rows or [])
        self.forbid_entry_query = forbid_entry_query
        self.executed: list[str] = []
        self.added: list[object] = []
        self.committed = False

    async def execute(self, stmt):
        sql = str(stmt)
        self.executed.append(sql)
        if "user_setting" in sql:
            params = stmt.compile().params
            key = next(
                (
                    v
                    for v in params.values()
                    if v in (CRISIS_NUDGE_KEY, CRISIS_NUDGE_MUTED_UNTIL_KEY)
                ),
                None,
            )
            return FakeResult(scalar=self.settings_rows.get(key))
        if "entry" in sql:
            if self.forbid_entry_query:
                raise AssertionError(
                    "privacy contract violated: mood data was queried"
                )
            return FakeResult(rows=self.mood_rows)
        raise AssertionError(f"unexpected statement: {sql}")

    def add(self, obj) -> None:
        self.added.append(obj)
        # Make writes visible to subsequent reads, like a real session.
        self.settings_rows[obj.key] = obj

    async def commit(self) -> None:
        self.committed = True

    @property
    def entry_queried(self) -> bool:
        return any("entry" in sql for sql in self.executed)


def user() -> SimpleNamespace:
    return SimpleNamespace(id=uuid4())


def mood_row(day: date, mood: int) -> tuple:
    stamp = datetime.combine(day, time(10, 0), tzinfo=UTC)
    return (stamp, stamp, mood)


# ── Trigger math — scale + severity ──────────────────────────────────


def test_scale_bounds_match_entries_api_contract() -> None:
    """The wellbeing constants mirror EntryCreate's mood validator —
    behavioral cross-check so the two cannot drift apart silently."""
    EntryCreate(title="t", mood=MOOD_SCALE_MIN)
    EntryCreate(title="t", mood=MOOD_SCALE_MAX)
    with pytest.raises(ValidationError):
        EntryCreate(title="t", mood=MOOD_SCALE_MIN - 1)
    with pytest.raises(ValidationError):
        EntryCreate(title="t", mood=MOOD_SCALE_MAX + 1)


def test_severe_is_bottom_fifth_computed_from_bounds() -> None:
    assert pytest.approx(2.8) == SEVERE_MOOD_CEILING
    assert is_severe_mood(1)
    assert is_severe_mood(2)
    assert not is_severe_mood(3)
    assert not is_severe_mood(MOOD_SCALE_MAX)


def test_rule_parameters_are_the_documented_ones() -> None:
    assert MIN_DISTINCT_DAYS == 3
    assert SEVERE_FRACTION == 0.6


# ── Trigger math — the rule ──────────────────────────────────────────


def test_no_readings_never_triggers() -> None:
    assert evaluate_sustained_distress([], as_of=TODAY) is False


def test_two_days_all_severe_never_triggers() -> None:
    readings = [reading(0, 1), reading(1, 1), reading(1, 2)]
    assert evaluate_sustained_distress(readings, as_of=TODAY) is False


def test_exactly_three_days_and_exactly_sixty_percent_triggers() -> None:
    readings = [
        reading(0, 1),
        reading(1, 2),
        reading(2, 2),
        reading(2, 8),
        reading(0, 9),
    ]  # 3 distinct days, 3/5 = 60% severe
    assert evaluate_sustained_distress(readings, as_of=TODAY) is True


def test_three_days_but_below_sixty_percent_does_not_trigger() -> None:
    readings = [
        reading(0, 1),
        reading(1, 2),
        reading(2, 8),
        reading(3, 9),
    ]  # 4 days, 2/4 = 50% severe
    assert evaluate_sustained_distress(readings, as_of=TODAY) is False


def test_three_days_all_severe_triggers() -> None:
    readings = [reading(0, 1), reading(3, 2), reading(7, 1)]
    assert evaluate_sustained_distress(readings, as_of=TODAY) is True


def test_one_off_spike_alone_never_triggers() -> None:
    # A single severe reading is 100% severe but only one data day.
    assert (
        evaluate_sustained_distress([reading(0, 1)], as_of=TODAY) is False
    )


def test_one_off_spike_among_good_days_never_triggers() -> None:
    readings = [
        reading(0, 2),
        reading(1, 8),
        reading(2, 9),
        reading(3, 7),
    ]  # 1/4 = 25% severe
    assert evaluate_sustained_distress(readings, as_of=TODAY) is False


def test_readings_outside_window_are_ignored() -> None:
    # Three severe days — but all older than the 14-day window.
    readings = [reading(20, 1), reading(21, 1), reading(25, 2)]
    assert evaluate_sustained_distress(readings, as_of=TODAY) is False


def test_old_severe_readings_do_not_inflate_the_window() -> None:
    # Severe data outside the window + healthy data inside it.
    readings = [
        reading(20, 1),
        reading(21, 1),
        reading(0, 8),
        reading(1, 9),
        reading(2, 8),
    ]
    assert evaluate_sustained_distress(readings, as_of=TODAY) is False


def test_future_dated_readings_are_ignored() -> None:
    future = MoodReading(day=TODAY + timedelta(days=2), mood=1)
    readings = [future, reading(0, 1), reading(1, 1)]  # only 2 valid days
    assert evaluate_sustained_distress(readings, as_of=TODAY) is False


# ── Mute horizon ─────────────────────────────────────────────────────


def test_is_muted_empty_and_none_are_not_muted() -> None:
    assert is_muted("", today=TODAY) is False
    assert is_muted(None, today=TODAY) is False


def test_is_muted_forever() -> None:
    assert is_muted(MUTED_FOREVER, today=TODAY) is True


def test_is_muted_through_the_date_inclusive() -> None:
    assert is_muted(TODAY.isoformat(), today=TODAY) is True
    assert is_muted((TODAY + timedelta(days=3)).isoformat(), today=TODAY) is True
    assert is_muted((TODAY - timedelta(days=1)).isoformat(), today=TODAY) is False


def test_is_muted_garbage_value_fails_open() -> None:
    # A corrupt row must not silence the feature the user asked for.
    assert is_muted("next tuesday", today=TODAY) is False


# ── Service — privacy contract ───────────────────────────────────────


async def test_opted_out_never_queries_mood_data() -> None:
    """THE privacy contract: no opt-in row at all → the entry table is
    never touched (FakeSession raises if it is)."""
    session = FakeSession(forbid_entry_query=True)
    state = await evaluate_nudge(session, uuid4(), now=NOW)
    assert state.enabled is False
    assert state.show is False
    assert not session.entry_queried


async def test_explicitly_disabled_never_queries_mood_data() -> None:
    session = FakeSession(
        settings={CRISIS_NUDGE_KEY: False},
        forbid_entry_query=True,
    )
    state = await evaluate_nudge(session, uuid4(), now=NOW)
    assert state.enabled is False
    assert state.show is False


async def test_muted_forever_suppresses_and_skips_mood_query() -> None:
    session = FakeSession(
        settings={
            CRISIS_NUDGE_KEY: True,
            CRISIS_NUDGE_MUTED_UNTIL_KEY: MUTED_FOREVER,
        },
        forbid_entry_query=True,
    )
    state = await evaluate_nudge(session, uuid4(), now=NOW)
    assert state.enabled is True
    assert state.muted is True
    assert state.show is False


async def test_muted_until_future_date_suppresses() -> None:
    session = FakeSession(
        settings={
            CRISIS_NUDGE_KEY: True,
            CRISIS_NUDGE_MUTED_UNTIL_KEY: (
                TODAY + timedelta(days=7)
            ).isoformat(),
        },
        forbid_entry_query=True,
    )
    state = await evaluate_nudge(session, uuid4(), now=NOW)
    assert state.show is False
    assert state.muted is True


async def test_expired_mute_evaluates_the_trigger_again() -> None:
    session = FakeSession(
        settings={
            CRISIS_NUDGE_KEY: True,
            CRISIS_NUDGE_MUTED_UNTIL_KEY: (
                TODAY - timedelta(days=1)
            ).isoformat(),
        },
        mood_rows=[
            mood_row(TODAY, 1),
            mood_row(TODAY - timedelta(days=1), 2),
            mood_row(TODAY - timedelta(days=2), 1),
        ],
    )
    state = await evaluate_nudge(session, uuid4(), now=NOW)
    assert state.muted is False
    assert state.show is True
    assert session.entry_queried


async def test_enabled_with_sustained_distress_shows() -> None:
    session = FakeSession(
        settings={CRISIS_NUDGE_KEY: True},
        mood_rows=[
            mood_row(TODAY, 1),
            mood_row(TODAY - timedelta(days=3), 2),
            mood_row(TODAY - timedelta(days=6), 1),
        ],
    )
    state = await evaluate_nudge(session, uuid4(), now=NOW)
    assert state == state.__class__(enabled=True, muted=False, show=True)


async def test_enabled_without_mood_data_shows_false() -> None:
    session = FakeSession(settings={CRISIS_NUDGE_KEY: True})
    state = await evaluate_nudge(session, uuid4(), now=NOW)
    assert state.enabled is True
    assert state.show is False


# ── Service — persistence ────────────────────────────────────────────


async def test_set_muted_until_persists_a_row() -> None:
    session = FakeSession()
    uid = uuid4()
    await set_muted_until(session, uid, MUTED_FOREVER)
    assert len(session.added) == 1
    row = session.added[0]
    assert row.key == CRISIS_NUDGE_MUTED_UNTIL_KEY
    assert row.value_json == json.dumps(MUTED_FOREVER)
    assert row.user_id == uid


async def test_set_muted_until_updates_existing_row() -> None:
    session = FakeSession(
        settings={CRISIS_NUDGE_MUTED_UNTIL_KEY: MUTED_FOREVER}
    )
    await set_muted_until(session, uuid4(), "2026-08-01")
    assert session.added == []  # updated in place, not duplicated
    row = session.settings_rows[CRISIS_NUDGE_MUTED_UNTIL_KEY]
    assert row.value_json == json.dumps("2026-08-01")


async def test_enable_clears_the_mute_horizon() -> None:
    session = FakeSession(
        settings={
            CRISIS_NUDGE_KEY: False,
            CRISIS_NUDGE_MUTED_UNTIL_KEY: MUTED_FOREVER,
        }
    )
    await set_crisis_nudge_enabled(session, uuid4(), enabled=True)
    assert session.settings_rows[CRISIS_NUDGE_KEY].value_json == "true"
    assert (
        session.settings_rows[CRISIS_NUDGE_MUTED_UNTIL_KEY].value_json
        == json.dumps("")
    )


async def test_disable_leaves_the_mute_horizon_alone() -> None:
    session = FakeSession(
        settings={
            CRISIS_NUDGE_KEY: True,
            CRISIS_NUDGE_MUTED_UNTIL_KEY: MUTED_FOREVER,
        }
    )
    await set_crisis_nudge_enabled(session, uuid4(), enabled=False)
    assert session.settings_rows[CRISIS_NUDGE_KEY].value_json == "false"
    assert (
        session.settings_rows[CRISIS_NUDGE_MUTED_UNTIL_KEY].value_json
        == json.dumps(MUTED_FOREVER)
    )


# ── Endpoints (handlers called directly with fakes) ──────────────────


async def test_get_nudge_disabled_returns_empty_resources() -> None:
    session = FakeSession(forbid_entry_query=True)
    out = await get_nudge(db=session, current_user=user())
    assert out.enabled is False
    assert out.show is False
    assert out.resources == []


async def test_get_nudge_enabled_returns_resources() -> None:
    session = FakeSession(settings={CRISIS_NUDGE_KEY: True})
    out = await get_nudge(db=session, current_user=user())
    assert out.enabled is True
    assert len(out.resources) == len(CRISIS_RESOURCES)
    for r in out.resources:
        assert r.region
        assert r.name
        assert r.url


async def test_put_nudge_enables_and_persists() -> None:
    session = FakeSession()
    out = await put_nudge(
        payload=NudgeSettingWrite(enabled=True),
        db=session,
        current_user=user(),
    )
    assert out.enabled is True
    assert session.committed is True
    assert session.settings_rows[CRISIS_NUDGE_KEY].value_json == "true"


async def test_dismiss_persists_and_suppresses() -> None:
    session = FakeSession(
        settings={CRISIS_NUDGE_KEY: True},
        mood_rows=[
            mood_row(TODAY, 1),
            mood_row(TODAY - timedelta(days=1), 1),
            mood_row(TODAY - timedelta(days=2), 2),
        ],
    )
    out = await dismiss_nudge(db=session, current_user=user())
    assert session.committed is True
    assert (
        session.settings_rows[CRISIS_NUDGE_MUTED_UNTIL_KEY].value_json
        == json.dumps(MUTED_FOREVER)
    )
    # Muted → show=false even though the trigger condition holds.
    assert out.enabled is True
    assert out.show is False


async def test_dismiss_with_iso_date_persists_that_date() -> None:
    session = FakeSession(settings={CRISIS_NUDGE_KEY: True})
    until = (TODAY + timedelta(days=7)).isoformat()
    out = await dismiss_nudge(
        db=session,
        current_user=user(),
        payload=NudgeDismiss(until=until),
    )
    assert (
        session.settings_rows[CRISIS_NUDGE_MUTED_UNTIL_KEY].value_json
        == json.dumps(until)
    )
    assert out.show is False


def test_dismiss_payload_validates_until() -> None:
    assert NudgeDismiss().until == MUTED_FOREVER
    assert NudgeDismiss(until="2026-08-01").until == "2026-08-01"
    with pytest.raises(ValidationError):
        NudgeDismiss(until="next tuesday")
    with pytest.raises(ValidationError):
        NudgeDismiss(until="")


# ── Resources ────────────────────────────────────────────────────────


def test_resources_shape() -> None:
    payload = resources_payload()
    assert payload, "starter list must not be empty"
    for item in payload:
        assert set(item) == {"region", "name", "url"}
        assert item["region"] == "international"
        assert item["url"].startswith("https://")


def test_resources_include_the_two_starter_directories() -> None:
    urls = {r.url for r in CRISIS_RESOURCES}
    assert "https://www.iasp.info/resources/Crisis_Centres/" in urls
    assert "https://findahelpline.com" in urls


def test_resources_carry_the_maintainer_review_flag() -> None:
    """The Sacred Well Directory placeholder rule: the starter list
    stays flagged for maintainer review — the flag must not be
    quietly dropped."""
    doc = resources_module.__doc__ or ""
    assert "MAINTAINER REVIEW REQUIRED" in doc
    assert "Sacred Well Directory" in doc


# ── Settings registration ────────────────────────────────────────────


def test_crisis_nudge_setting_registered_off_by_default() -> None:
    registry = SettingsRegistry()
    register_default_settings(registry)
    d = registry.get(CRISIS_NUDGE_KEY)
    assert d.value_type is bool
    assert d.default is False, "opt-in rule: OFF by default"


def test_muted_until_setting_registered_empty_by_default() -> None:
    registry = SettingsRegistry()
    register_default_settings(registry)
    d = registry.get(CRISIS_NUDGE_MUTED_UNTIL_KEY)
    assert d.value_type is str
    assert d.default == ""


# ── Router surface ───────────────────────────────────────────────────


def test_router_paths_present() -> None:
    paths_methods = {
        (r.path, m)
        for r in wb_module.router.routes
        for m in getattr(r, "methods", set()) - {"HEAD", "OPTIONS"}
    }
    assert ("/wellbeing/nudge", "GET") in paths_methods
    assert ("/wellbeing/nudge", "PUT") in paths_methods
    assert ("/wellbeing/nudge/dismiss", "POST") in paths_methods


def test_every_route_requires_auth() -> None:
    for route in wb_module.router.routes:
        if not isinstance(route, APIRoute):
            continue
        deps = route.dependant.dependencies
        calls = [d.call for d in deps]
        sub_names: list[str] = [
            sub.call.__name__
            for d in deps
            for sub in d.dependencies
            if hasattr(sub.call, "__name__")
        ]
        assert (
            get_current_user in calls or "get_current_user" in sub_names
        ), f"{route.path} should require auth"


def test_wellbeing_router_registered_in_app() -> None:
    from theourgia.api.app import create_app  # noqa: PLC0415 — heavy import, keep lazy

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/api/v1/wellbeing/nudge" in paths
    assert "/api/v1/wellbeing/nudge/dismiss" in paths
