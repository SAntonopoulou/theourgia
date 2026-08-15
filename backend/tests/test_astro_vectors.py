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

from theourgia.core.astro.profections import profection_at, profection_for_date

VECTORS = json.loads((Path(__file__).parent / "vectors" / "astro-vectors.json").read_text())

#: Every primitive this file actually checks. ⚠ Keep in step with the fixture —
#: the last test in this module is what enforces that.
EXERCISED: frozenset[str] = frozenset({"profect-annual"})


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
