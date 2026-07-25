"""Attic lunar calendar tests.

Validates the astronomical Attic reckoning: months begin at Noumenia
(day after the new moon), the year begins at the first Noumenia after
the summer solstice, days count from 1 = Noumenia, and the
observance arc Deipnon → Noumenia → Agathos Daimon falls on
consecutive days at the month boundary. Reference instants
cross-check against the hekatean festival computations — both derive
from the same new-moon search, so they must never disagree.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from theourgia.core.calendars import get_calendar
from theourgia.core.calendars.attic import (
    ATTIC_MONTH_NAMES,
    attic_context,
    _attic_year,
    _summer_solstice,
)
from theourgia.core.festivals import get_festival


# ───── Registration ─────────────────────────────────────────────────────


def test_attic_calendar_is_registered() -> None:
    cal = get_calendar("attic")
    assert cal.name == "Attic"
    assert cal.family == "lunisolar"


def test_month_names_are_the_twelve_attic_months() -> None:
    assert ATTIC_MONTH_NAMES == (
        "Hekatombaion", "Metageitnion", "Boedromion", "Pyanepsion",
        "Maimakterion", "Poseideon", "Gamelion", "Anthesterion",
        "Elaphebolion", "Mounichion", "Thargelion", "Skirophorion",
    )


# ───── Year anchor ──────────────────────────────────────────────────────


def test_year_begins_at_first_noumenia_after_summer_solstice() -> None:
    solstice = _summer_solstice(2026)
    assert (solstice.month, solstice.day) == (6, 21)
    months = _attic_year(2026)
    first_name, first_day = months[0]
    assert first_name == "Hekatombaion"
    # Must start after the solstice but within a synodic month of it.
    assert first_day > solstice.date()
    assert (first_day - solstice.date()).days <= 31


def test_year_has_twelve_or_thirteen_months() -> None:
    for year in (2024, 2025, 2026, 2027):
        assert len(_attic_year(year)) in (12, 13)


def test_intercalary_year_inserts_poseideon_ii_after_poseideon() -> None:
    """2025/2026 resolves to thirteen lunations — Poseideon II follows
    Poseideon and the remaining months keep their order."""
    months = _attic_year(2025)
    assert len(months) == 13
    names = [name for name, _ in months]
    poseideon = names.index("Poseideon")
    assert names[poseideon + 1] == "Poseideon II"
    assert names[poseideon + 2] == "Gamelion"
    assert names[-1] == "Skirophorion"


def test_common_year_has_no_poseideon_ii() -> None:
    months = _attic_year(2026)
    assert len(months) == 12
    assert [name for name, _ in months] == list(ATTIC_MONTH_NAMES)


# ───── Day reckoning ────────────────────────────────────────────────────


def test_day_one_is_noumenia() -> None:
    months = _attic_year(2026)
    _, first_day = months[0]
    ctx = attic_context(first_day)
    assert ctx.day == 1
    assert ctx.observance == "noumenia"
    assert ctx.month == 1
    assert ctx.month_name == "Hekatombaion"


def test_day_two_is_agathos_daimon() -> None:
    _, first_day = _attic_year(2026)[0]
    ctx = attic_context(first_day + timedelta(days=1))
    assert ctx.day == 2
    assert ctx.observance == "agathos_daimon"


def test_last_day_of_month_is_deipnon() -> None:
    """The dark-moon day before the next Noumenia closes the month."""
    months = _attic_year(2026)
    _, second_month_start = months[1]
    ctx = attic_context(second_month_start - timedelta(days=1))
    assert ctx.month == 1
    assert ctx.day == ctx.month_length
    assert ctx.observance == "deipnon"


def test_observance_arc_is_three_consecutive_days() -> None:
    """Deipnon → Noumenia → Agathos Daimon on consecutive days."""
    _, month_start = _attic_year(2026)[3]
    days = [
        attic_context(month_start + timedelta(days=offset))
        for offset in (-1, 0, 1)
    ]
    assert [c.observance for c in days] == [
        "deipnon", "noumenia", "agathos_daimon",
    ]


def test_mid_month_has_no_observance() -> None:
    _, month_start = _attic_year(2026)[0]
    ctx = attic_context(month_start + timedelta(days=14))
    assert ctx.observance is None


def test_month_lengths_are_lunar() -> None:
    for start_year in (2025, 2026):
        months = _attic_year(start_year)
        for _, first_day in months:
            ctx = attic_context(first_day)
            assert ctx.month_length in (29, 30)


# ───── Cross-check against the hekatean festival stream ─────────────────


def test_noumenia_days_match_hekatean_festival() -> None:
    """The calendar's day 1 must be a Noumenia festival day — same
    astronomical convention, same dates."""
    festival_days = {
        inst.start.date()
        for inst in get_festival("noumenia").compute(2026)
        + get_festival("noumenia").compute(2027)
    }
    for _, first_day in _attic_year(2026):
        assert first_day in festival_days


def test_agathos_daimon_days_match_hekatean_festival() -> None:
    festival_days = {
        inst.start.date()
        for inst in get_festival("agathos-daimon").compute(2026)
        + get_festival("agathos-daimon").compute(2027)
    }
    for _, first_day in _attic_year(2026):
        assert first_day + timedelta(days=1) in festival_days


# ───── CalendarDate protocol surface ────────────────────────────────────


def test_from_instant_shape_and_raw() -> None:
    cal = get_calendar("attic")
    d = cal.from_instant(datetime(2026, 7, 24, 12, tzinfo=UTC))
    assert d.calendar_id == "attic"
    assert d.year == 2026
    assert d.raw["year_span"] == "2026/2027"
    assert d.raw["month_name"] in (*ATTIC_MONTH_NAMES, "Poseideon II")
    assert d.raw["observance"] in (
        None, "deipnon", "noumenia", "agathos_daimon",
    )
    assert str(d.day) in d.long
    assert d.raw["month_name"] in d.long


def test_from_instant_rejects_naive_datetime() -> None:
    cal = get_calendar("attic")
    with pytest.raises(ValueError):
        cal.from_instant(datetime(2026, 7, 24, 12))  # noqa: DTZ001


def test_to_instant_round_trips() -> None:
    cal = get_calendar("attic")
    for probe in (
        datetime(2026, 7, 24, 12, tzinfo=UTC),
        datetime(2026, 1, 3, 12, tzinfo=UTC),  # intercalary 2025/26 year
        datetime(2026, 6, 18, 12, tzinfo=UTC),  # near year boundary
    ):
        d = cal.from_instant(probe)
        back = cal.to_instant(d)
        assert back.date() == probe.date()


def test_to_instant_rejects_wrong_calendar() -> None:
    cal = get_calendar("attic")
    other = get_calendar("gregorian").from_instant(
        datetime(2026, 7, 24, 12, tzinfo=UTC)
    )
    with pytest.raises(ValueError):
        cal.to_instant(other)


def test_year_boundary_days_resolve_to_adjacent_years() -> None:
    """The day before the year starts belongs to the previous Attic
    year (as Skirophorion's tail or an epagomenal dark day)."""
    months = _attic_year(2026)
    _, first_day = months[0]
    before = attic_context(first_day - timedelta(days=1))
    after = attic_context(first_day)
    assert after.year == 2026
    assert before.year == 2025
    assert before.is_intercalary_year is True
    assert after.is_intercalary_year is False
