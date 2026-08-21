"""The site must compute what the phone computed.

Sophia, 15 August 2026: *"either shared tests or a shared engine … like the
same engine on the phone and on the website."*

Most of the engine already is shared — Swiss Ephemeris for positions, the same
`SE_SIDM_*` constants for the ayanamsas, pack data for the rules. What is
duplicated is eight arithmetic primitives, and this is how they are kept
honest. The reasoning, and why not one compiled core, is in
`tests/vectors/README.md`.

⚠ **The phone is the source of truth.** A disagreement here is this side's to
fix unless the phone is demonstrably wrong.

⚠ **A new primitive without a vector is not finished.** `test_every_primitive_
in_the_fixture_is_exercised` is that rule with teeth: adding a key to the
fixture without a test that reads it fails the suite.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pytest

from theourgia.core.astro.chart import EPHEMERIS_SOURCE
from theourgia.core.astro.profections import (
    profection_at,
    profection_for_date,
    profection_monthly_at,
    profection_year_bounds,
)
from theourgia.core.astro.releasing import first_level, second_level, sub_level
from theourgia.core.astro.solar_return import nearest_return, return_for_age
from theourgia.core.divination.derive import derive, layers_from_payload

VECTORS = json.loads((Path(__file__).parent / "vectors" / "astro-vectors.json").read_text())

#: Every primitive this file actually checks. ⚠ Keep in step with the fixture —
#: the last test in this module is what enforces that.
EXERCISED: frozenset[str] = frozenset(
    {
        "profect-annual",
        "sum-of-faces",
        "cycle-of",
        "band-lookup",
        "table-lookup",
        "profect-monthly",
        "zodiacal-releasing",
        "zodiacal-releasing-sub",
        "solar-return",
    }
)


def _cases(primitive: str) -> list[dict[str, Any]]:
    return VECTORS[primitive]


def _ids(primitive: str) -> list[str]:
    return [c["case"] for c in _cases(primitive)]


class TestAnnualProfections:
    @pytest.mark.parametrize("case", _cases("profect-annual"), ids=_ids("profect-annual"))
    def test_the_site_agrees_with_the_phone(self, case: dict[str, Any]) -> None:
        got = profection_at(
            datetime.fromisoformat(case["born"]),
            datetime.fromisoformat(case["at"]),
            case["ascendant_sign"],
        )
        assert got.age == case["age"], case["case"]
        assert got.profected_house == case["house"], case["case"]
        assert got.profected_sign == case["sign"], case["case"]

    def test_the_DATE_version_is_the_one_that_disagrees(self) -> None:
        """⚠ The disagreement, recorded rather than quietly fixed.

        `profection_for_date` counts whole days, so the year turns at midnight
        and the lord of the year arrives up to a day early. It is kept for
        callers holding nothing but a date, and this test is here so that
        anyone tempted to use it sees what it costs.
        """
        case = _cases("profect-annual")[0]
        born = datetime.fromisoformat(case["born"])
        at = datetime.fromisoformat(case["at"])

        by_date = profection_for_date(born.date(), at.date(), case["ascendant_sign"])
        by_instant = profection_at(born, at, case["ascendant_sign"])

        assert by_instant.age == case["age"]
        # A whole year apart — a different house and a different sign.
        #
        # ⚠ NOT asserted on the lord: this case profects into Capricorn versus
        # Aquarius and traditional rulership gives Saturn both, so the lord
        # happens to match while everything else differs. A test that checked
        # the lord here would pass for the wrong reason.
        assert by_date.age == case["age"] + 1
        assert by_date.profected_house != by_instant.profected_house
        assert by_date.profected_sign != by_instant.profected_sign

    def test_a_naive_moment_is_refused_rather_than_guessed_at(self) -> None:
        # ⚠ A datetime with no timezone is not an instant. Assuming UTC would
        # be this side inventing a fact about somebody's birth.
        with pytest.raises(ValueError, match="timezone-aware"):
            profection_at(
                datetime(1984, 3, 2, 18, 0),
                datetime.fromisoformat("2026-03-02T09:00:00Z"),
                5,
            )


class TestMonthlyProfections:
    """⚠ A month is a TWELFTH OF THE ACTUAL YEAR, not a calendar month.

    The year runs birthday to birthday — 365 days or 366 — so a twelfth is
    about thirty and a half, nothing begins on the first, and consecutive
    years have twelfths of different lengths.
    """

    @pytest.mark.parametrize("case", _cases("profect-monthly"), ids=_ids("profect-monthly"))
    def test_the_site_agrees_with_the_phone(self, case: dict[str, Any]) -> None:
        got = profection_monthly_at(
            datetime.fromisoformat(case["born"]),
            datetime.fromisoformat(case["at"]),
            case["ascendant_sign"],
        )
        assert got.profected_sign == case["sign"], case["case"]
        assert got.profected_house == case["house"], case["case"]

    @pytest.mark.parametrize("case", _cases("profect-monthly"), ids=_ids("profect-monthly"))
    def test_the_twelfth_runs_where_the_phone_says(self, case: dict[str, Any]) -> None:
        # ⚠ The bounds matter as much as the sign: a reader showing "until the
        # 2nd" where the phone says 04:00 on the 2nd is wrong for ten hours.
        year_from, year_until = profection_year_bounds(
            datetime.fromisoformat(case["born"]),
            datetime.fromisoformat(case["at"]),
        )
        length_us = int((year_until - year_from).total_seconds() * 1_000_000)
        twelfth_us = length_us // 12
        into_us = int((datetime.fromisoformat(case["at"]) - year_from).total_seconds() * 1_000_000)
        month = max(0, min(11, into_us // twelfth_us))

        from datetime import timedelta

        start = year_from + timedelta(microseconds=twelfth_us * month)
        end = year_from + timedelta(microseconds=twelfth_us * (month + 1))
        assert start == datetime.fromisoformat(case["from"]), case["case"]
        assert end == datetime.fromisoformat(case["until"]), case["case"]

    def test_the_month_wraps_past_Pisces_with_the_year(self) -> None:
        # ⚠ Half a year in, the month has advanced six signs from the year's
        # own — which for a year in Aquarius lands back in Leo.
        got = profection_monthly_at(
            datetime.fromisoformat("1984-03-02T18:00:00Z"),
            datetime.fromisoformat("2026-09-02T19:00:00Z"),
            5,
        )
        assert got.profected_sign == 5
        assert got.profected_house == 1


class TestTheDerivationPrimitives:
    """The four that are arithmetic over pack data.

    ⚠ These cases were EMITTED by practiseapp running, not transcribed from
    reading it — `test/emit_astro_vectors_test.dart` over there prints them.
    Two of the behaviours below are ones a careful reading still gets wrong.
    """

    @staticmethod
    def _layers():
        return layers_from_payload(VECTORS["derivation-layers"]["layers"])

    @pytest.mark.parametrize("case", _cases("sum-of-faces"), ids=_ids("sum-of-faces"))
    def test_the_site_derives_what_the_phone_derived(self, case: dict[str, Any]) -> None:
        got = derive(self._layers(), tuple(case["cast"]))
        assert got == case["derived"], case["case"]

    def test_a_table_MISS_leaves_the_key_absent(self) -> None:
        # ⚠ The phone does `if (value.isEmpty) continue`, so a miss drops the
        # layer entirely. A reader showing "Named: —" where the phone shows
        # nothing at all is giving a different reading.
        got = derive(self._layers(), (1, 1, 1))
        assert "named" not in got
        assert got == {"sum": "3", "rung": "3", "octave": "low"}

    def test_the_band_boundary_is_inclusive(self) -> None:
        # Six is the top of the low band and belongs to it.
        assert derive(self._layers(), (2, 2, 2))["octave"] == "low"
        assert derive(self._layers(), (1, 2, 4))["octave"] == "middle"

    def test_the_cycle_is_one_based(self) -> None:
        # ⚠ Ten on a ten-cycle is TEN, not zero; eleven is one.
        assert derive(self._layers(), (3, 3, 4))["rung"] == "10"
        assert derive(self._layers(), (4, 4, 3))["rung"] == "1"

    def test_values_are_STRINGS_because_the_layers_chain(self) -> None:
        # `named` reads `rung`, and the table is keyed by "1", not by 1.
        got = derive(self._layers(), (4, 4, 3))
        assert got["rung"] == "1"
        assert got["named"] == "Monad"
        assert all(isinstance(v, str) for v in got.values())


class TestZodiacalReleasing:
    """Valens' periods, canonical (AstroPractise) — the general period never
    looses, and the arithmetic is the 360-day year in whole minutes."""

    @pytest.mark.parametrize("case", _cases("zodiacal-releasing"), ids=_ids("zodiacal-releasing"))
    def test_every_period_matches_the_phone(self, case: dict[str, Any]) -> None:
        got = first_level(
            datetime.fromisoformat(case["born"]),
            case["start_sign"],
            years=case["years"],
            fortune_sign=case["fortune_sign"],
        )
        want = case["periods"]
        assert len(got) == len(want), case["case"]
        for g, w in zip(got, want, strict=True):
            where = case["case"]
            assert g.sign == w["sign"], where
            # ⚠ The LENGTH in whole minutes — units * 518400, the idealised
            # 360-day year. Exact, nothing rounds, so the two devices agree to
            # the minute rather than drifting a day per period.
            assert (g.until - g.start) == timedelta(minutes=w["minutes"]), where
            assert g.start == datetime.fromisoformat(w["from"]), where
            assert g.until == datetime.fromisoformat(w["until"]), where
            assert g.is_loosing_of_the_bond == w["loosing"], where
            assert g.is_peak == w["peak"], where
            assert g.is_truncated == w["truncated"], where

    def test_the_general_period_never_looses(self) -> None:
        """⚠ A loosing at level one is a modern addition the source never
        prescribes. Over 400 years the L1 sequence completes its own twelve
        signs — exactly where the old, wrong rule used to fire — and still it
        walks strictly forward."""
        born = datetime.fromisoformat("1984-03-02T18:00:00Z")
        periods = first_level(born, 3, years=400)  # from Gemini
        assert len(periods) > 12
        assert not any(p.is_loosing_of_the_bond for p in periods)
        # Cancer steps forward to Leo, never jumps to Capricorn.
        cancer = first_level(born, 4, years=60)
        assert [cancer[0].sign, cancer[1].sign] == [4, 5]


class TestZodiacalReleasingSubLevels:
    """The four levels, descending the first period of each. ⚠ Every level is
    one twelfth of the one above, in whole minutes (43200, 3600, 300); nothing
    rounds. The loosing of the bond lives here, at the subperiod levels: a single
    jump to the sign opposite the sub-sequence's start."""

    @pytest.mark.parametrize(
        "case",
        _cases("zodiacal-releasing-sub"),
        ids=_ids("zodiacal-releasing-sub"),
    )
    def test_every_level_matches_the_phone(self, case: dict[str, Any]) -> None:
        fortune_sign = case["fortune_sign"]
        l1 = first_level(
            datetime.fromisoformat(case["born"]),
            case["start_sign"],
            years=160,
            fortune_sign=fortune_sign,
        )[0]
        l2 = second_level(l1, fortune_sign=fortune_sign)
        l3 = sub_level(l2[0], fortune_sign=fortune_sign)
        l4 = sub_level(l3[0], fortune_sign=fortune_sign)

        for level, got in (("level2", l2), ("level3", l3), ("level4", l4)):
            want = case[level]
            assert len(got) == len(want), f"{case['case']} at {level}"
            for g, w in zip(got, want, strict=True):
                where = f"{case['case']} at {level}"
                assert g.sign == w["sign"], where
                assert g.start == datetime.fromisoformat(w["from"]), where
                assert g.until == datetime.fromisoformat(w["until"]), where
                assert g.is_loosing_of_the_bond == w["loosing"], where
                assert g.is_completion_period == w["completion"], where

    def test_a_first_level_parent_is_refused(self) -> None:
        """second_level is the door into a first-level period, and the assertion
        is what keeps a caller from deepening the wrong one."""
        born = datetime.fromisoformat("1984-03-02T18:00:00Z")
        l1 = first_level(born, 5)[0]
        with pytest.raises(ValueError, match="second_level"):
            sub_level(l1)


def _linear_sun(case: dict[str, Any]):
    """The phone's `LinearEphemeris`, as a plain function.

    ⚠ **A linear Sun on purpose.** The primitive being vectored is the SEARCH,
    not the ephemeris. Pinning a real return instant would pin the `.se1` files
    instead, and the fixture would break the day they are updated for a reason
    that is not a disagreement between the two implementations. That the two
    read the same real ephemeris is `TestTheEphemerisItself` below.
    """
    epoch = datetime.fromisoformat(case["epoch"])
    at_epoch = case["sun_at_epoch"]
    per_day = case["degrees_per_day"]

    def longitude_at(moment: datetime) -> float:
        days = (moment - epoch).total_seconds() / 86400
        return (at_epoch + per_day * days) % 360

    return longitude_at


class TestSolarReturns:
    """The bisection, to the microsecond the phone reached."""

    @pytest.mark.parametrize("case", _cases("solar-return"), ids=_ids("solar-return"))
    def test_every_return_matches_the_phone(self, case: dict[str, Any]) -> None:
        got = return_for_age(
            _linear_sun(case),
            born=datetime.fromisoformat(case["born"]),
            natal_sun=case["target"],
            age=case["age"],
        )
        # ⚠ Exactly, not to the second. The halving sequence is deterministic,
        # so a microsecond of disagreement means the two sides are stepping
        # differently — from float division rounding to even, say — and that
        # is worth failing over even though nobody would feel a microsecond.
        assert got == datetime.fromisoformat(case["found"]), case["case"]

    def test_a_degree_the_sun_does_not_reach_is_refused(self) -> None:
        """⚠ Refused, never approximated.

        Returning the nearest bracket end would be a confident wrong answer,
        and a return chart is read entirely from its angles — an answer hours
        out is a different chart, not a slightly worse one.
        """
        case = _cases("solar-return")[0]
        with pytest.raises(ValueError, match="did not reach"):
            return_for_age(
                _linear_sun(case),
                born=datetime.fromisoformat(case["born"]),
                # Some 160° from where this Sun is at the birthday — far
                # outside even the widened bracket.
                natal_sun=140.0,
                age=case["age"],
            )

    def test_the_widened_bracket_is_what_saves_the_five_day_case(self) -> None:
        """⚠ 335° is five days back, so the ±3 bracket does not hold it."""
        case = next(c for c in _cases("solar-return") if c["target"] == 335.0)
        got = return_for_age(
            _linear_sun(case),
            born=datetime.fromisoformat(case["born"]),
            natal_sun=case["target"],
            age=case["age"],
        )
        guess = datetime.fromisoformat("2026-03-02T18:00:00Z")
        assert abs((got - guess).days) >= 3, "this case no longer exercises the widening"
        assert got == datetime.fromisoformat(case["found"])

    def test_january_belongs_to_the_return_before_it(self) -> None:
        """⚠ Which return governs a moment is not which birthday is nearest.

        A return falling on 3 January governs from that instant, so 1 January
        belongs to the one before — a year earlier, not a day.
        """
        case = _cases("solar-return")[0]
        sun = _linear_sun(case)
        born = datetime.fromisoformat(case["born"])
        # New Year's Day, two months before the birthday comes round.
        governing = nearest_return(
            sun,
            born=born,
            natal_sun=case["target"],
            at=datetime.fromisoformat("2026-01-01T00:00:00Z"),
        )
        assert governing.year == 2025, "the 2026 return has not happened yet on 1 January"
        assert governing < datetime.fromisoformat("2026-01-01T00:00:00Z")


class TestTheEphemerisItself:
    """⚠ Both sides must ask Swiss Ephemeris for the SAME ephemeris.

    They call the same library, which is not the same thing. practiseapp uses
    `SEFLG_SWIEPH` — the compressed Swiss data files it ships — and this side
    used `FLG_MOSEPH`, an analytical series accurate to about an arcsecond.

    An arcsecond of solar longitude is roughly **25 seconds of time**, and a
    solar return is read entirely from its angles: half a minute moves the
    Ascendant about seven arcminutes, which near a sign boundary is a
    different chart. No amount of vectoring the arithmetic helps if the
    numbers going in differ.
    """

    def test_this_deployment_is_on_the_swiss_files(self) -> None:
        # ⚠ Swiss Ephemeris drops to Moshier SILENTLY when its files are
        # missing — everything works, the numbers are plausible, and nobody
        # finds out until two devices disagree about somebody's chart. This is
        # the check that makes that loud.
        assert EPHEMERIS_SOURCE == "swieph", (
            "the .se1 files are missing from backend/data/ephe/, so this "
            "process is on Moshier and will disagree with the phone by "
            "arcseconds — which is seconds of time on a return"
        )

    def test_the_files_are_the_ones_the_phone_ships(self) -> None:
        ephe = Path(__file__).resolve().parents[1] / "data" / "ephe"
        names = {f.name for f in ephe.glob("*.se1")}
        # The two practiseapp carries in `ephe_files/`. ⚠ If the phone ever
        # ships a wider set — asteroids, a longer span — this side needs the
        # same ones or the two will differ outside the covered range.
        assert {"semo_18.se1", "sepl_18.se1"} <= names, sorted(names)


class TestTheRuleWithTeeth:
    def test_every_primitive_in_the_fixture_is_exercised(self) -> None:
        """⚠ A new primitive without a vector is not finished — and a vector
        nothing reads is not a test.

        This fails when somebody adds a primitive to the fixture and no test
        for it, which is exactly how a shared-vector arrangement rots.
        """
        in_fixture = {
            key
            for key, value in VECTORS.items()
            if not key.startswith("_") and isinstance(value, list)
        }
        missing = in_fixture - EXERCISED
        assert not missing, (
            f"these are in the fixture and nothing checks them: {sorted(missing)}. "
            "Add a test, or take them out of the fixture."
        )

    def test_all_eight_primitives_are_covered(self) -> None:
        """The eight, and that none of them has gone unvectored.

        ⚠ This became a gate on 15 August, when `solar-return` closed the set.
        Before that it only reported the gap. A NINTH primitive on the phone
        fails here, which is the point — the rule is that a new primitive
        without a vector is not finished, and a rule nobody enforces is a note.
        """
        all_eight = {
            "band-lookup",
            "cycle-of",
            "profect-annual",
            "profect-monthly",
            "solar-return",
            "sum-of-faces",
            "table-lookup",
            "zodiacal-releasing",
            # The ninth, 18 August: the sub-levels the four-level descent
            # brought. The phone grew it first, as the rule requires.
            "zodiacal-releasing-sub",
        }
        covered = {
            key
            for key, value in VECTORS.items()
            if not key.startswith("_") and isinstance(value, list)
        }
        assert covered <= all_eight, (
            f"unknown primitive in the fixture: {sorted(covered - all_eight)} — "
            "if the phone has grown a ninth, add it to this list too"
        )
        assert covered == all_eight, (
            f"no vectors for: {sorted(all_eight - covered)}. Emit them from "
            "practiseapp's test/emit_astro_vectors_test.dart rather than "
            "writing them by hand — a fixture the phone did not produce "
            "pins what somebody believed, not what the phone does."
        )
