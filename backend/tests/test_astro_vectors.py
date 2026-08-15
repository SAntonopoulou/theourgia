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
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

from theourgia.core.astro.chart import EPHEMERIS_SOURCE
from theourgia.core.astro.releasing import BondRule, first_level
from theourgia.core.astro.profections import (
    profection_at,
    profection_for_date,
    profection_monthly_at,
    profection_year_bounds,
)
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
    """Valens' periods, and the three readings of the loosing of the bond."""

    @pytest.mark.parametrize("case", _cases("zodiacal-releasing"), ids=_ids("zodiacal-releasing"))
    def test_every_period_matches_the_phone(self, case: dict[str, Any]) -> None:
        got = first_level(
            datetime.fromisoformat(case["born"]),
            case["start_sign"],
            years=case["years"],
            bond=BondRule(case["bond"]),
        )
        want = case["periods"]
        assert len(got) == len(want), case["case"]
        for g, w in zip(got, want, strict=True):
            assert g.sign == w["sign"], case["case"]
            # ⚠ The LENGTH in whole days, not just the sign. round(years *
            # 365.2422) — fifteen years of Aries is 5479 days, not 5478.633.
            # A float implementation drifts a day per period and is a
            # fortnight out by the end of a life.
            assert (g.until - g.start).days == w["days"], case["case"]
            assert g.start == datetime.fromisoformat(w["from"]), case["case"]
            assert g.is_loosing_of_the_bond == w["loosing"], case["case"]

    def test_the_three_rules_give_visibly_different_lives(self) -> None:
        """⚠ Anything reporting a time lord must say which rule it used."""
        born = datetime.fromisoformat("1984-03-02T18:00:00Z")
        runs = {
            rule: [p.sign for p in first_level(born, 5, years=160, bond=rule)] for rule in BondRule
        }
        assert runs[BondRule.NONE] != runs[BondRule.SKIP]
        assert runs[BondRule.NONE] != runs[BondRule.TO_START]
        # SKIP never reaches the opposite sign at all, so nothing is loosed.
        assert 11 not in runs[BondRule.SKIP]
        # TO_START returns to Leo after the loosing rather than going on.
        assert runs[BondRule.TO_START][-2:] == [5, 6]


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

    def test_the_eight_primitives_are_named_so_the_gap_is_visible(self) -> None:
        """The list, and how much of it is still to do.

        ⚠ Not a failure — a statement. Seven of the eight have no vectors yet
        and this is where somebody finds that out.
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
