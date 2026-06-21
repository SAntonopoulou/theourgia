"""Calendar substrate tests.

Validates the protocol contract (registry round-trip), then exercises
each of the four shipped calendars on a fixed instant. Reference
values are computed by hand from published tables (Reingold &
Dershowitz, US Naval Observatory) so the tests catch arithmetic
regressions even if the implementation is rewritten.

Fixed reference instant: **2026-06-21 12:00 UTC** — the Northern
summer solstice, a date with good cross-tradition reference values.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from theourgia.core.calendars import (
    Calendar,
    CalendarDate,
    get_calendar,
    register_calendar,
    registered_calendars,
)


REFERENCE = datetime(2026, 6, 21, 12, 0, tzinfo=UTC)


# ───── Registry ──────────────────────────────────────────────────────────


def test_default_calendars_are_registered() -> None:
    ids = {cal.id for cal in registered_calendars()}
    assert {"gregorian", "julian", "hebrew", "thelemic"} <= ids


def test_get_calendar_returns_protocol_implementation() -> None:
    gregorian = get_calendar("gregorian")
    assert isinstance(gregorian, Calendar)
    assert gregorian.name == "Gregorian"


def test_get_calendar_raises_for_unknown_id() -> None:
    with pytest.raises(KeyError):
        get_calendar("klingon")


def test_register_calendar_is_idempotent_on_id() -> None:
    original = get_calendar("gregorian")
    register_calendar(original)
    assert get_calendar("gregorian") is original


# ───── Gregorian ─────────────────────────────────────────────────────────


def test_gregorian_from_instant_english() -> None:
    cal = get_calendar("gregorian")
    d = cal.from_instant(REFERENCE, locale="en")
    assert (d.year, d.month, d.day) == (2026, 6, 21)
    assert d.numeric == "2026-06-21"
    assert "June" in d.long
    assert "Sunday" in d.with_day_name


def test_gregorian_from_instant_greek() -> None:
    cal = get_calendar("gregorian")
    d = cal.from_instant(REFERENCE, locale="el")
    assert "Ιουνίου" in d.long
    assert "Κυριακή" in d.with_day_name


def test_gregorian_round_trip() -> None:
    cal = get_calendar("gregorian")
    d = cal.from_instant(REFERENCE)
    assert cal.to_instant(d) == datetime(2026, 6, 21, tzinfo=UTC)


def test_gregorian_rejects_naive_datetime() -> None:
    cal = get_calendar("gregorian")
    with pytest.raises(ValueError):
        cal.from_instant(datetime(2026, 6, 21))  # noqa: DTZ001


# ───── Julian ────────────────────────────────────────────────────────────


def test_julian_offset_from_gregorian() -> None:
    cal = get_calendar("julian")
    d = cal.from_instant(REFERENCE)
    # 2026 Gregorian → 13-day offset before Julian (1900–2099).
    assert (d.year, d.month, d.day) == (2026, 6, 8)
    assert "OS" in d.long  # "Old Style"


def test_julian_historical_anchor() -> None:
    cal = get_calendar("julian")
    # 350 AD — patristic-era anchor. The Julian-Gregorian shift at this
    # point in proleptic time is 1 day (10-day shift at 1582 minus the
    # nine Julian-leap-but-Gregorian-common century years crossed
    # going back: 1500, 1400, 1300, 1100, 1000, 900, 700, 600, 500).
    # Mar 25 Gregorian → Mar 24 Julian. Confirmed against Meeus
    # *Astronomical Algorithms* 2nd ed. Ch. 7.
    d = cal.from_instant(datetime(350, 3, 25, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (350, 3, 24)


def test_julian_round_trip() -> None:
    cal = get_calendar("julian")
    d = cal.from_instant(REFERENCE)
    back = cal.to_instant(d)
    assert back == datetime(2026, 6, 21, tzinfo=UTC)


# ───── Hebrew ────────────────────────────────────────────────────────────


def test_hebrew_from_instant_solstice() -> None:
    cal = get_calendar("hebrew")
    d = cal.from_instant(REFERENCE)
    # 2026-06-21 Gregorian = 6 Tammuz 5786 (reference: hebcal.com).
    assert d.year == 5786
    assert d.raw["month_name"] == "Tammuz"
    assert d.day == 6


def test_hebrew_leap_year_detection() -> None:
    cal = get_calendar("hebrew")
    # AM 5787 is a leap year (year 3 of the 305th Metonic cycle).
    leap = cal.from_instant(datetime(2026, 10, 1, tzinfo=UTC))
    assert leap.raw["is_leap_year"] is True


def test_hebrew_round_trip() -> None:
    cal = get_calendar("hebrew")
    d = cal.from_instant(REFERENCE)
    back = cal.to_instant(d)
    # Hebrew → Gregorian conversion is day-granular, so the round-trip
    # lands at midnight UTC of the same civil day.
    assert back.date() == REFERENCE.date()


def test_hebrew_anchor_reingold() -> None:
    """Reingold & Dershowitz *Calendrical Calculations* 4th ed.
    Appendix C worked example: Iyyar 10 5727 = May 20 1967.
    """
    cal = get_calendar("hebrew")
    d = cal.from_instant(datetime(1967, 5, 20, tzinfo=UTC))
    assert (d.year, d.month, d.day) == (5727, 2, 10)
    assert d.raw["month_name"] == "Iyyar"


# ───── Thelemic ──────────────────────────────────────────────────────────


def test_thelemic_anno_count() -> None:
    cal = get_calendar("thelemic")
    d = cal.from_instant(REFERENCE)
    # 2026 EV is Anno 123 (since 1904).
    assert d.raw["anni"] == 123
    # 22-year cycles: anno 123 is cycle 6 (1+(123-1)//22), year 13 within cycle.
    assert d.raw["docosaeteris"] == 6
    assert d.raw["year_in_cycle"] == 13
    assert d.raw["cycle_roman"] == "VI"
    assert d.raw["year_roman"] == "xiii"
    assert "An VIxiii" in d.short


def test_thelemic_year_starts_at_vernal_equinox() -> None:
    cal = get_calendar("thelemic")
    # March 19 EV is still in the *previous* Thelemic year (anno - 1).
    before = cal.from_instant(datetime(2026, 3, 19, tzinfo=UTC))
    after = cal.from_instant(datetime(2026, 3, 21, tzinfo=UTC))
    assert before.raw["anni"] + 1 == after.raw["anni"]


def test_thelemic_round_trip() -> None:
    cal = get_calendar("thelemic")
    d = cal.from_instant(REFERENCE)
    back = cal.to_instant(d)
    assert back.date() == REFERENCE.date()


# ───── Cross-tradition ──────────────────────────────────────────────────


@pytest.mark.parametrize(
    "calendar_id",
    ["gregorian", "julian", "hebrew", "thelemic"],
)
def test_every_calendar_produces_well_formed_dates(calendar_id: str) -> None:
    cal = get_calendar(calendar_id)
    d = cal.from_instant(REFERENCE)
    assert d.calendar_id == calendar_id
    assert d.long
    assert d.short
    assert d.numeric
    assert d.with_day_name
    assert d.locale
    assert isinstance(d.raw, dict)


def test_two_instants_a_day_apart_advance_by_one_day_everywhere() -> None:
    """The protocol's invariant: two calendars looking at the same
    instant agree on *when* — they only disagree on *how to spell it*.
    """
    for cal in registered_calendars():
        today = cal.from_instant(REFERENCE)
        tomorrow = cal.from_instant(REFERENCE + timedelta(days=1))
        # Every calendar's day-of-month should advance by 1, OR roll
        # over to the next month/year (some lunisolar calendars at
        # month boundaries).
        if today.month == tomorrow.month and today.year == tomorrow.year:
            assert tomorrow.day == today.day + 1, (
                f"{cal.id}: {today.day} → {tomorrow.day}"
            )
