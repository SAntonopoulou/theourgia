"""v1-016 calendar tests — Islamic (civil) · Coptic · Mayan · French Republican.

Closes the calendar gap: FEATURES §1 promised these four beyond the
b108 set (Gregorian · Julian · Hebrew · Thelemic), and the setup
wizard offered checkboxes that did nothing. Reference values follow
the same discipline as test_calendars.py: documented anchors
(Reingold & Dershowitz *Calendrical Calculations* 4th ed., the GMT
correlation, the proclamation of the French Republic) so the tests
catch arithmetic regressions even if an implementation is rewritten.

Also guards the v1-016 wiring: the ``calendars.enabled`` user
setting, the wizard-persistence endpoints, and the auto-stamp's
per-user extras — including the b108-2hz regression class (a reader
must NEVER see "month 4" where a month has a name).
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from theourgia.core.calendars import (
    Calendar,
    get_calendar,
    registered_calendars,
)
from theourgia.core.calendars.base import CalendarDate
from theourgia.core.entries.autostamp import (
    ALWAYS_STAMPED_CALENDAR_IDS,
    AutoStampInput,
    compute_snapshots,
)


REFERENCE = datetime(2026, 6, 21, 12, 0, tzinfo=UTC)  # same as test_calendars.py

NEW_CALENDAR_IDS = ("islamic", "coptic", "mayan", "french-republican")


# ───── Registry ──────────────────────────────────────────────────────────


def test_v1_016_calendars_are_registered() -> None:
    ids = {cal.id for cal in registered_calendars()}
    assert set(NEW_CALENDAR_IDS) <= ids


@pytest.mark.parametrize("calendar_id", NEW_CALENDAR_IDS)
def test_new_calendars_implement_the_protocol(calendar_id: str) -> None:
    assert isinstance(get_calendar(calendar_id), Calendar)


# ───── Islamic (civil / tabular) ─────────────────────────────────────────


def test_islamic_epoch_anchor() -> None:
    """1 Muharram 1 AH = 16 July 622 Julian = 19 July 622 proleptic
    Gregorian (the civil / Friday epoch, R.D. 227015)."""
    cal = get_calendar("islamic")
    d = cal.from_instant(datetime(622, 7, 19, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (1, 1, 1)
    assert d.raw["month_name"] == "Muharram"
    assert d.long == "1 Muharram 1 AH"


def test_islamic_documented_anchor_y2k() -> None:
    """1 January 2000 = 24 Ramadan 1420 AH under the tabular civil
    calendar (the widely documented "Kuwaiti algorithm" value)."""
    cal = get_calendar("islamic")
    d = cal.from_instant(datetime(2000, 1, 1, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (1420, 9, 24)
    assert d.raw["month_name"] == "Ramadan"


def test_islamic_solstice_reference() -> None:
    cal = get_calendar("islamic")
    d = cal.from_instant(REFERENCE)
    assert (d.year, d.month, d.day) == (1448, 1, 5)
    assert "Muharram" in d.long
    assert "AH" in d.long


def test_islamic_leap_cycle_is_type_ii() -> None:
    """30-year cycle, leap years 2 5 7 10 13 16 18 21 24 26 29."""
    from theourgia.core.calendars.islamic import _is_islamic_leap

    assert [y for y in range(1, 31) if _is_islamic_leap(y)] == [
        2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29,
    ]


def test_islamic_name_admits_it_is_the_civil_calendar() -> None:
    """Honesty rule: the arithmetic calendar approximates observational
    practice (regional moon sighting differs by a day or two). The
    display name must say so — no false precision."""
    cal = get_calendar("islamic")
    assert "civil" in cal.name.lower()
    d = cal.from_instant(REFERENCE)
    assert d.raw["variant"] == "civil (tabular)"


def test_islamic_round_trip() -> None:
    cal = get_calendar("islamic")
    d = cal.from_instant(REFERENCE)
    assert cal.to_instant(d).date() == REFERENCE.date()


# ───── Coptic ────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "gregorian,coptic_year",
    [((2023, 9, 12), 1740), ((2024, 9, 11), 1741), ((2025, 9, 11), 1742)],
)
def test_coptic_nayrouz_anchors(
    gregorian: tuple[int, int, int], coptic_year: int
) -> None:
    """Nayrouz (1 Thout) = 11 September Gregorian, 12 September in the
    year preceding a Julian leap year."""
    cal = get_calendar("coptic")
    d = cal.from_instant(datetime(*gregorian, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (coptic_year, 1, 1)
    assert d.raw["month_name"] == "Thout"


def test_coptic_thirteenth_month_is_pi_kogi_enavot() -> None:
    """The epagomenal days form a short thirteenth month."""
    cal = get_calendar("coptic")
    d = cal.from_instant(datetime(2025, 9, 6, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (1741, 13, 1)
    assert d.raw["month_name"] == "Pi Kogi Enavot"


def test_coptic_era_is_anno_martyrum() -> None:
    cal = get_calendar("coptic")
    d = cal.from_instant(REFERENCE)
    assert d.raw["era"] == "Anno Martyrum"
    assert d.long.endswith("AM")


def test_coptic_solstice_reference() -> None:
    cal = get_calendar("coptic")
    d = cal.from_instant(REFERENCE)
    assert (d.year, d.month, d.day) == (1742, 10, 14)
    assert d.raw["month_name"] == "Paoni"


def test_coptic_round_trip() -> None:
    cal = get_calendar("coptic")
    d = cal.from_instant(REFERENCE)
    assert cal.to_instant(d).date() == REFERENCE.date()


# ───── Mayan ─────────────────────────────────────────────────────────────


def test_mayan_gmt_correlation_constants() -> None:
    """GMT (Goodman-Martinez-Thompson) correlation: JDN 584283, i.e.
    the Long Count epoch at R.D. -1137142."""
    from theourgia.core.calendars.mayan import (
        MAYAN_CORRELATION_JDN,
        MAYAN_EPOCH,
    )

    assert MAYAN_CORRELATION_JDN == 584283
    assert MAYAN_EPOCH == -1137142


def test_mayan_2012_baktun_completion_anchor() -> None:
    """21 December 2012 = 13.0.0.0.0 · 4 Ajaw · 3 Kankin under the GMT
    correlation — the most-documented Long Count date there is."""
    cal = get_calendar("mayan")
    d = cal.from_instant(datetime(2012, 12, 21, tzinfo=UTC))
    assert d.numeric == "13.0.0.0.0"
    assert d.raw["tzolkin"] == {"number": 4, "name": "Ajaw"}
    assert d.raw["haab"] == {"day": 3, "month": 14, "month_name": "Kankin"}
    assert d.long == "13.0.0.0.0 · 4 Ajaw · 3 Kankin"


def test_mayan_long_combines_all_three_cycles() -> None:
    cal = get_calendar("mayan")
    d = cal.from_instant(REFERENCE)
    assert d.long == "13.0.13.12.10 · 7 Ok · 3 Sek"
    assert d.numeric == "13.0.13.12.10"
    # Protocol ints: baktun as year, Haab position as month/day.
    assert (d.year, d.month, d.day) == (13, 5, 3)


def test_mayan_round_trip_via_raw_day_tally() -> None:
    cal = get_calendar("mayan")
    d = cal.from_instant(REFERENCE)
    assert cal.to_instant(d).date() == REFERENCE.date()


def test_mayan_round_trip_via_long_count_numeric() -> None:
    """The Haab-shaped (year, month, day) triple repeats within a
    baktun; the inverse must survive on the numeric Long Count alone
    when ``raw`` is absent (e.g. a hand-built CalendarDate)."""
    cal = get_calendar("mayan")
    d = cal.from_instant(REFERENCE)
    stripped = CalendarDate(
        calendar_id=d.calendar_id,
        year=d.year,
        month=d.month,
        day=d.day,
        long=d.long,
        short=d.short,
        numeric=d.numeric,
        with_day_name=d.with_day_name,
        locale=d.locale,
        raw={},
    )
    assert cal.to_instant(stripped).date() == REFERENCE.date()


# ───── French Republican (arithmetic / Romme) ────────────────────────────


def test_french_epoch_anchor() -> None:
    """22 September 1792 (proclamation of the Republic) =
    1 Vendémiaire An I."""
    cal = get_calendar("french-republican")
    d = cal.from_instant(datetime(1792, 9, 22, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (1, 1, 1)
    assert d.long == "1 Vendémiaire An I"


def test_french_long_uses_roman_numeral_year() -> None:
    cal = get_calendar("french-republican")
    d = cal.from_instant(REFERENCE)
    assert (d.year, d.month, d.day) == (234, 10, 3)
    assert d.long == "3 Messidor An CCXXXIV"
    assert d.raw["year_roman"] == "CCXXXIV"


def test_french_sansculottides_carry_festival_names() -> None:
    """The five complementary days are month 13 and each is a named
    festival — with_day_name renders it."""
    cal = get_calendar("french-republican")
    d = cal.from_instant(datetime(2025, 9, 17, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (233, 13, 1)
    assert d.raw["month_name"] == "Sansculottides"
    assert d.with_day_name == "Fête de la Vertu, An CCXXXIII"


def test_french_leap_rule_is_romme_arithmetic() -> None:
    """Leap when divisible by 4 (except 100/200/300 mod 400 and 4000).
    The honest caveat: historical practice used equinox years with
    An III/VII/XI sextile; the module docstring owns that gap."""
    from theourgia.core.calendars.french_republican import _is_french_leap

    assert [y for y in range(1, 20) if _is_french_leap(y)] == [4, 8, 12, 16]
    assert not _is_french_leap(100)
    assert _is_french_leap(400)
    assert not _is_french_leap(4000)


def test_french_round_trip() -> None:
    cal = get_calendar("french-republican")
    d = cal.from_instant(REFERENCE)
    assert cal.to_instant(d).date() == REFERENCE.date()


# ───── b108-2hz regression class: NEVER "month N" ────────────────────────


@pytest.mark.parametrize("calendar_id", NEW_CALENDAR_IDS)
def test_month_name_is_a_name_not_a_number(calendar_id: str) -> None:
    """The b108-2hz bug class: a reader must never see "month 4" where
    the month has a name. Every new calendar puts a real ``month_name``
    in ``raw`` so the auto-stamp serialiser surfaces it, and none of
    the pre-rendered strings fall back to numbered months."""
    from theourgia.core.entries.autostamp import _serialise_calendar_date

    cal = get_calendar(calendar_id)
    d = cal.from_instant(REFERENCE)

    month_name = d.raw["month_name"]
    assert isinstance(month_name, str) and month_name
    assert not re.fullmatch(r"month \d+", month_name, flags=re.IGNORECASE)

    serialised = _serialise_calendar_date(d)
    assert serialised.get("month_name") == month_name
    assert serialised.get("long") == d.long

    for rendered in (d.long, d.short, d.with_day_name):
        assert not re.search(r"\bmonth \d+\b", rendered, flags=re.IGNORECASE)


@pytest.mark.parametrize("calendar_id", NEW_CALENDAR_IDS)
def test_new_calendars_produce_well_formed_dates(calendar_id: str) -> None:
    """Same contract test_calendars.py applies to the first four."""
    cal = get_calendar(calendar_id)
    d = cal.from_instant(REFERENCE)
    assert d.calendar_id == calendar_id
    assert d.long
    assert d.short
    assert d.numeric
    assert d.with_day_name
    assert d.locale
    assert isinstance(d.raw, dict)


@pytest.mark.parametrize("calendar_id", NEW_CALENDAR_IDS)
def test_new_calendars_reject_naive_datetimes(calendar_id: str) -> None:
    cal = get_calendar(calendar_id)
    with pytest.raises(ValueError):
        cal.from_instant(datetime(2026, 6, 21))  # noqa: DTZ001


# ───── Auto-stamp: per-user extras ───────────────────────────────────────


def _stamp_calendars(extra: tuple[str, ...] = ()) -> dict:
    result = compute_snapshots(
        AutoStampInput(
            instant=datetime(2026, 7, 9, 12, tzinfo=UTC),
            latitude=37.98,
            longitude=23.72,
            extra_calendar_ids=extra,
        )
    )
    return json.loads(result.calendar_snapshot)


def test_autostamp_default_excludes_optional_calendars() -> None:
    """A user who never enabled extras sees exactly the b108-2hy four."""
    cal = _stamp_calendars()
    assert set(cal) == {"instant_utc", *ALWAYS_STAMPED_CALENDAR_IDS}
    for optional in NEW_CALENDAR_IDS:
        assert optional not in cal


def test_autostamp_includes_enabled_extras() -> None:
    cal = _stamp_calendars(extra=("islamic", "french-republican"))
    assert "islamic" in cal
    assert "french-republican" in cal
    assert "coptic" not in cal
    assert "mayan" not in cal
    # The extras carry the pre-rendered strings the frontend renders
    # verbatim (the b108-2hz pattern — no frontend name tables).
    assert cal["islamic"]["month_name"] == "Muharram"
    assert "AH" in cal["islamic"]["long"]
    assert "An CCXXXIV" in cal["french-republican"]["long"]


def test_autostamp_extras_never_displace_the_fixed_four() -> None:
    cal = _stamp_calendars(extra=("mayan", "coptic"))
    for always in ALWAYS_STAMPED_CALENDAR_IDS:
        assert always in cal


def test_autostamp_deduplicates_extras_against_the_fixed_four() -> None:
    cal = _stamp_calendars(extra=("gregorian", "hebrew", "mayan"))
    assert set(cal) == {"instant_utc", *ALWAYS_STAMPED_CALENDAR_IDS, "mayan"}


def test_autostamp_skips_unknown_extra_ids() -> None:
    """A stale setting or unloaded plugin id must not fail the stamp
    or leave an error blob behind."""
    cal = _stamp_calendars(extra=("klingon", "coptic"))
    assert "klingon" not in cal
    assert "coptic" in cal


# ───── Wizard persistence: calendars.enabled ─────────────────────────────


def test_calendars_enabled_setting_is_registered() -> None:
    from theourgia.core.usersettings.defaults import register_default_settings
    from theourgia.core.usersettings.registry import SettingsRegistry

    registry = SettingsRegistry()
    register_default_settings(registry)
    d = registry.get("calendars.enabled")
    assert d.value_type is list
    assert d.default == ["gregorian", "julian", "hebrew", "thelemic"]


@pytest.mark.asyncio
async def test_calendars_enabled_round_trips_through_the_service() -> None:
    from theourgia.core.usersettings.defaults import register_default_settings
    from theourgia.core.usersettings.registry import SettingsRegistry
    from theourgia.core.usersettings.service import (
        InMemoryUserSettingsStore,
        UserSettingsService,
    )

    registry = SettingsRegistry()
    register_default_settings(registry)
    service = UserSettingsService(
        store=InMemoryUserSettingsStore(), registry=registry
    )
    user_id = uuid4()

    # Default before any write.
    assert await service.get_typed(user_id=user_id, key="calendars.enabled") == [
        "gregorian", "julian", "hebrew", "thelemic",
    ]

    chosen = ["gregorian", "islamic", "mayan"]
    await service.set(user_id=user_id, key="calendars.enabled", value=chosen)
    assert (
        await service.get_typed(user_id=user_id, key="calendars.enabled")
        == chosen
    )


def test_calendars_write_model_rejects_extras() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.user_settings import CalendarsWrite

    with pytest.raises(ValidationError):
        CalendarsWrite(enabled=["gregorian"], extra=True)  # type: ignore[call-arg]


def test_calendars_default_matches_always_stamped_set() -> None:
    from theourgia.api.routers.v1.user_settings import (
        CALENDARS_KEY,
        DEFAULT_CALENDARS,
    )

    assert CALENDARS_KEY == "calendars.enabled"
    assert DEFAULT_CALENDARS == ALWAYS_STAMPED_CALENDAR_IDS


def test_calendars_endpoints_registered() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    schema = app.openapi()
    calendars_path = schema["paths"].get("/api/v1/users/me/settings/calendars")
    assert calendars_path is not None
    assert "get" in calendars_path
    assert "put" in calendars_path


def test_calendars_put_validates_against_the_registry() -> None:
    """Source-level guard (house pattern): the PUT endpoint must check
    ids against registered_calendars and refuse unknowns — a typo'd id
    would otherwise silently stamp nothing."""
    from inspect import getsource

    from theourgia.api.routers.v1 import user_settings as module

    src = getsource(module.put_my_calendars)
    assert "registered_calendars" in src
    assert "ValidationFailedError" in src


def test_entry_router_reads_enabled_calendars() -> None:
    """Source-level guard: create_entry threads the user's enabled
    calendars into the auto-stamp, and a failed settings read means
    no extras — never a failed entry."""
    from inspect import getsource

    from theourgia.api.routers.v1 import entries as entries_module

    src = getsource(entries_module.create_entry)
    assert "read_enabled_calendars" in src
    assert "extra_calendar_ids" in src
    assert "extra_calendar_ids = ()" in src
