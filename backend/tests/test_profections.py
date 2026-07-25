"""Annual profections + transits-to-natal tests.

Pure-computation coverage: the traditional rulership table, the
age/house/sign arithmetic, and classical-aspect detection between a
transiting and a natal position set with the tight 3° default orb.
"""

from __future__ import annotations

from datetime import date

import pytest

from theourgia.core.astro import (
    DEFAULT_TRANSIT_ORB,
    TRADITIONAL_RULERS,
    Planet,
    age_at,
    profection_for_date,
    transits_to_natal,
)
from theourgia.core.astro.aspects import AspectKind


# ───── Traditional rulerships ───────────────────────────────────────────


def test_rulership_table_covers_all_twelve_signs() -> None:
    assert set(TRADITIONAL_RULERS) == set(range(1, 13))


def test_traditional_not_modern_rulerships() -> None:
    """Mars rules Scorpio, Saturn rules Aquarius, Jupiter rules Pisces
    — no Pluto / Uranus / Neptune."""
    assert TRADITIONAL_RULERS[8] is Planet.MARS  # Scorpio
    assert TRADITIONAL_RULERS[11] is Planet.SATURN  # Aquarius
    assert TRADITIONAL_RULERS[12] is Planet.JUPITER  # Pisces


def test_luminaries_rule_cancer_and_leo() -> None:
    assert TRADITIONAL_RULERS[4] is Planet.MOON  # Cancer
    assert TRADITIONAL_RULERS[5] is Planet.SUN  # Leo


def test_each_non_luminary_rules_two_signs() -> None:
    counts: dict[Planet, int] = {}
    for ruler in TRADITIONAL_RULERS.values():
        counts[ruler] = counts.get(ruler, 0) + 1
    assert counts[Planet.SUN] == 1
    assert counts[Planet.MOON] == 1
    for planet in (Planet.MERCURY, Planet.VENUS, Planet.MARS,
                   Planet.JUPITER, Planet.SATURN):
        assert counts[planet] == 2


# ───── Age arithmetic ───────────────────────────────────────────────────


def test_age_zero_before_first_birthday() -> None:
    assert age_at(date(1990, 6, 15), date(1990, 6, 15)) == 0
    assert age_at(date(1990, 6, 15), date(1991, 6, 14)) == 0


def test_age_increments_on_birthday() -> None:
    assert age_at(date(1990, 6, 15), date(1991, 6, 15)) == 1
    assert age_at(date(1990, 6, 15), date(2026, 6, 15)) == 36
    assert age_at(date(1990, 6, 15), date(2026, 6, 14)) == 35


def test_age_rejects_date_before_birth() -> None:
    with pytest.raises(ValueError):
        age_at(date(1990, 6, 15), date(1990, 6, 14))


# ───── Profection arithmetic ────────────────────────────────────────────


def test_age_zero_profects_to_first_house() -> None:
    p = profection_for_date(date(1990, 6, 15), date(1990, 9, 1), 8)
    assert p.age == 0
    assert p.profected_house == 1
    assert p.profected_sign == 8  # the Ascendant sign itself
    assert p.profected_sign_name == "Scorpio"
    assert p.year_lord is Planet.MARS


def test_profection_wraps_every_twelve_years() -> None:
    birth = date(1990, 6, 15)
    for age_years in (12, 24, 36):
        on = date(1990 + age_years, 7, 1)
        p = profection_for_date(birth, on, 3)
        assert p.profected_house == 1
        assert p.profected_sign == 3


def test_profection_advances_one_sign_per_year() -> None:
    birth = date(1990, 6, 15)
    # Age 1 from a Gemini (3) Ascendant → 2nd house → Cancer → Moon.
    p = profection_for_date(birth, date(1991, 7, 1), 3)
    assert p.age == 1
    assert p.profected_house == 2
    assert p.profected_sign == 4
    assert p.year_lord is Planet.MOON


def test_profection_sign_wraps_through_pisces() -> None:
    # Age 5 from a Scorpio Ascendant (8): 8 + 5 → 13 → wraps to Aries.
    p = profection_for_date(date(2000, 1, 10), date(2005, 2, 1), 8)
    assert p.profected_house == 6
    assert p.profected_sign == 1
    assert p.profected_sign_name == "Aries"
    assert p.year_lord is Planet.MARS


def test_profection_rejects_bad_ascendant_sign() -> None:
    with pytest.raises(ValueError):
        profection_for_date(date(1990, 6, 15), date(2026, 7, 1), 13)


# ───── Transits to natal ────────────────────────────────────────────────


def test_default_orb_is_three_degrees() -> None:
    assert DEFAULT_TRANSIT_ORB == 3.0


def test_exact_conjunction_detected() -> None:
    hits = transits_to_natal({"sun": 100.0}, {"saturn": 100.0})
    assert len(hits) == 1
    hit = hits[0]
    assert hit.kind is AspectKind.CONJUNCTION
    assert hit.transiting_body == "saturn"
    assert hit.natal_body == "sun"
    assert hit.orb == 0.0


def test_all_five_classical_aspects_detected() -> None:
    natal = {"sun": 10.0}
    transiting = {
        "a": 10.0,    # conjunction
        "b": 70.0,    # sextile
        "c": 100.0,   # square
        "d": 130.0,   # trine
        "e": 190.0,   # opposition
    }
    hits = transits_to_natal(natal, transiting)
    kinds = {h.transiting_body: h.kind for h in hits}
    assert kinds == {
        "a": AspectKind.CONJUNCTION,
        "b": AspectKind.SEXTILE,
        "c": AspectKind.SQUARE,
        "d": AspectKind.TRINE,
        "e": AspectKind.OPPOSITION,
    }


def test_orb_boundary_inclusive_and_exclusive() -> None:
    # 3° out: inside the default orb (inclusive).
    assert transits_to_natal({"sun": 0.0}, {"mars": 93.0})
    # 3.5° out: outside the default orb.
    assert not transits_to_natal({"sun": 0.0}, {"mars": 93.5})
    # …but inside a widened one.
    assert transits_to_natal({"sun": 0.0}, {"mars": 93.5}, orb=4.0)


def test_separation_wraps_around_zero_aries() -> None:
    """358° vs 2° is a 4° separation — a conjunction inside a 5° orb."""
    hits = transits_to_natal({"sun": 358.0}, {"moon": 2.0}, orb=5.0)
    assert hits[0].kind is AspectKind.CONJUNCTION
    assert hits[0].angle == pytest.approx(4.0)


def test_results_sorted_by_tightness() -> None:
    hits = transits_to_natal(
        {"sun": 0.0, "moon": 90.0},
        {"mars": 2.0, "venus": 90.5},
    )
    orbs = [h.orb for h in hits]
    assert orbs == sorted(orbs)


def test_own_position_return_is_reported() -> None:
    """A body conjunct its own natal position — the 'return'."""
    hits = transits_to_natal({"saturn": 200.0}, {"saturn": 201.0})
    assert any(
        h.transiting_body == "saturn" and h.natal_body == "saturn"
        and h.kind is AspectKind.CONJUNCTION
        for h in hits
    )


def test_rejects_non_positive_orb() -> None:
    with pytest.raises(ValueError):
        transits_to_natal({"sun": 0.0}, {"moon": 0.0}, orb=0.0)
