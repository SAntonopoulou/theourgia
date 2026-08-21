"""Dignities - held to AstroPractise's own ``dignities_test.dart`` cases.

The five dignities are the tables a Hellenistic chart is read by. A single
transposed bound width, or one boundary-convention slip, changes charts without
looking like a break. These cases are ported verbatim from the canonical
engine's test - the same golden values, the same invariants (bound widths sum to
30 and to each planet's Greater Years, adversity is the opposite sign's
domicile, fall is opposite the exaltation) - so the Python port is pinned to the
Dart answers.
"""

from __future__ import annotations

import pytest

from theourgia.core.astro.hellenistic.bodies import SEVEN, Planet
from theourgia.core.astro.hellenistic.dignities import (
    CHALDEAN_DECAN_RULERS,
    DOROTHEAN_TRIPLICITY_RULERS,
    EGYPTIAN_BOUNDS,
    EXALTATIONS,
    PTOLEMAIC_TRIPLICITY_RULERS,
    SIGNS_WITHOUT_EXALTATION_RULER,
    SIGNS_WITHOUT_FALL_RULER,
    TRIPLICITY_ORDER_DECAN_RULERS,
    DecanScheme,
    TriplicityScheme,
    VariantStatus,
    adversity_lord_of,
    bound_lord_half_open,
    bound_lord_of,
    bound_lord_of_longitude,
    bound_spans_of,
    decan_index_of,
    decan_ruler_of,
    decan_ruler_of_longitude,
    decans_of,
    domicile_lord_of,
    domiciles_of,
    exaltation_of,
    exaltation_ruler_of,
    fall_ruler_of,
    is_near_bound_boundary,
    ordinal_degree,
    signs_of_adversity_for,
    triplicity_lord_of,
    triplicity_rulers_of,
    triplicity_rulers_of_trigon,
)
from theourgia.core.astro.hellenistic.sect import Sect
from theourgia.core.astro.hellenistic.zodiac import (
    SignGender,
    Triplicity,
    ZodiacSign,
    degree_in_sign,
    sign_of_longitude,
)

_MIN = 1.0 / 60.0  # one arc-minute, in degrees


# ── section 5: the arithmetic that proved the bounds reconstruction ──────────


def test_every_sign_has_exactly_five_bounds() -> None:
    assert len(EGYPTIAN_BOUNDS) == 12
    for sign in ZodiacSign:
        assert len(EGYPTIAN_BOUNDS[sign]) == 5, sign.label


def test_every_sign_sums_to_thirty_and_the_zodiac_to_360() -> None:
    total = 0
    for sign in ZodiacSign:
        s = sum(b.width for b in EGYPTIAN_BOUNDS[sign])
        assert s == 30, f"{sign.label} sums to {s}, not 30"
        total += s
    assert total == 360


def test_per_planet_totals_equal_the_greater_years() -> None:
    greater_years = {
        Planet.SATURN: 57,
        Planet.JUPITER: 79,
        Planet.MARS: 66,
        Planet.VENUS: 82,
        Planet.MERCURY: 76,
    }
    totals: dict[Planet, int] = {}
    for sign in ZodiacSign:
        for b in EGYPTIAN_BOUNDS[sign]:
            totals[b.lord] = totals.get(b.lord, 0) + b.width
    assert totals == greater_years
    assert sum(totals.values()) == 360


def test_only_the_five_non_luminaries_hold_bounds() -> None:
    for sign in ZodiacSign:
        for b in EGYPTIAN_BOUNDS[sign]:
            assert not b.lord.is_luminary, f"{b.lord.label} holds a bound in {sign.label}"
            assert not b.lord.is_node


def test_a_malefic_rules_the_last_bound_of_every_sign() -> None:
    for sign in ZodiacSign:
        assert EGYPTIAN_BOUNDS[sign][-1].lord in (Planet.MARS, Planet.SATURN), sign.label


def test_cancer_follows_george_table_17_not_the_table_10_misprint() -> None:
    cancer = EGYPTIAN_BOUNDS[ZodiacSign.CANCER]
    assert (cancer[3].lord, cancer[3].width) == (Planet.JUPITER, 7)
    assert (cancer[4].lord, cancer[4].width) == (Planet.SATURN, 4)


def test_spans_derive_contiguously_from_0_to_30_in_both_conventions() -> None:
    for sign in ZodiacSign:
        spans = bound_spans_of(sign)
        assert spans[0].start_zero_based == 0
        assert spans[0].first_ordinal_degree == 1
        assert spans[-1].end_zero_based == 30
        assert spans[-1].last_ordinal_degree == 30
        for i in range(1, len(spans)):
            assert spans[i].start_zero_based == spans[i - 1].end_zero_based


def test_aries_matches_georges_verbatim_prose() -> None:
    spans = bound_spans_of(ZodiacSign.ARIES)
    assert [s.lord for s in spans] == [
        Planet.JUPITER,
        Planet.VENUS,
        Planet.MERCURY,
        Planet.MARS,
        Planet.SATURN,
    ]
    assert [s.first_ordinal_degree for s in spans] == [1, 7, 13, 21, 26]
    assert [s.last_ordinal_degree for s in spans] == [6, 12, 20, 25, 30]


# ── section 5.7: the ORDINAL boundary convention - George, not half-open ─────


def test_six_degrees_aries_is_jupiter_not_venus() -> None:
    assert bound_lord_of(ZodiacSign.ARIES, 6.0) is Planet.JUPITER
    assert bound_lord_of(ZodiacSign.ARIES, 6 + _MIN) is Planet.VENUS
    # Brennan's half-open convention gives the other answer at the boundary.
    assert bound_lord_half_open(ZodiacSign.ARIES, 6.0) is Planet.VENUS


def test_the_same_boundary_case_in_taurus_libra_sagittarius() -> None:
    assert bound_lord_of(ZodiacSign.TAURUS, 8.0) is Planet.VENUS
    assert bound_lord_of(ZodiacSign.TAURUS, 8 + _MIN) is Planet.MERCURY
    assert bound_lord_half_open(ZodiacSign.TAURUS, 8.0) is Planet.MERCURY

    assert bound_lord_of(ZodiacSign.LIBRA, 6.0) is Planet.SATURN
    assert bound_lord_of(ZodiacSign.LIBRA, 6 + _MIN) is Planet.MERCURY
    assert bound_lord_half_open(ZodiacSign.LIBRA, 6.0) is Planet.MERCURY

    assert bound_lord_of(ZodiacSign.SAGITTARIUS, 12.0) is Planet.JUPITER
    assert bound_lord_of(ZodiacSign.SAGITTARIUS, 12 + _MIN) is Planet.VENUS
    assert bound_lord_half_open(ZodiacSign.SAGITTARIUS, 12.0) is Planet.VENUS


def test_the_two_conventions_disagree_at_all_48_internal_boundaries() -> None:
    checked = 0
    for sign in ZodiacSign:
        spans = bound_spans_of(sign)
        # The four internal boundaries are the cumulative ends of bounds 0..3.
        for span in spans[:-1]:
            boundary = float(span.end_zero_based)
            assert bound_lord_of(sign, boundary) is span.lord
            assert bound_lord_half_open(sign, boundary) is not span.lord
            checked += 1
    assert checked == 48, "12 signs x 4 internal boundaries"


def test_ordinal_degree_counts_from_one() -> None:
    assert ordinal_degree(0.0) == 1  # 0 deg 00 min is in the FIRST degree
    assert ordinal_degree(0 + 10 * _MIN) == 1  # 0 deg 10 min -> first
    assert ordinal_degree(6.0) == 6  # 6 deg 00 min -> sixth
    assert ordinal_degree(6 + 3 * _MIN) == 7  # 6 deg 03 min -> seventh
    assert ordinal_degree(20 + 20 * _MIN) == 21  # 20 deg 20 min -> twenty-first
    assert ordinal_degree(29.99) == 30


def test_georges_worked_bound_lord_answers() -> None:
    # G pp. 212 and 216-217 - 19 of 19 verified against the ordinal rule.
    assert bound_lord_of(ZodiacSign.ARIES, 22) is Planet.MARS
    assert bound_lord_of(ZodiacSign.ARIES, 18) is Planet.MERCURY
    assert bound_lord_of(ZodiacSign.ARIES, 5) is Planet.JUPITER
    assert bound_lord_of(ZodiacSign.ARIES, 20 + 20 * _MIN) is Planet.MARS
    assert bound_lord_of(ZodiacSign.LEO, 5 + 9 * _MIN) is Planet.JUPITER
    assert bound_lord_of(ZodiacSign.ARIES, 25 + 36 * _MIN) is Planet.SATURN
    assert bound_lord_of(ZodiacSign.GEMINI, 21 + 46 * _MIN) is Planet.MARS
    assert bound_lord_of(ZodiacSign.VIRGO, 14 + 49 * _MIN) is Planet.VENUS
    assert bound_lord_of(ZodiacSign.SCORPIO, 24 + 14 * _MIN) is Planet.SATURN
    assert bound_lord_of(ZodiacSign.GEMINI, 21) is Planet.MARS
    assert bound_lord_of(ZodiacSign.TAURUS, 6) is Planet.VENUS


def test_every_whole_degree_resolves_to_a_non_luminary_bound_lord() -> None:
    for longitude in range(360):
        lord = bound_lord_of_longitude(float(longitude))
        assert not lord.is_luminary, f"longitude {longitude} returned a luminary"
        assert (
            bound_lord_of(sign_of_longitude(float(longitude)), degree_in_sign(float(longitude)))
            is lord
        )


def test_near_boundary_flagging_catches_the_arc_minute_band() -> None:
    assert is_near_bound_boundary(ZodiacSign.ARIES, 6.0)
    assert is_near_bound_boundary(ZodiacSign.ARIES, 6 + 0.5 * _MIN)
    assert not is_near_bound_boundary(ZodiacSign.ARIES, 8.0)


# ── section 2: domiciles ─────────────────────────────────────────────────────


def test_the_seven_planets_partition_the_twelve_signs() -> None:
    counts: dict[Planet, int] = {}
    for sign in ZodiacSign:
        lord = domicile_lord_of(sign)
        counts[lord] = counts.get(lord, 0) + 1
    assert set(counts) == set(SEVEN)
    assert sum(counts.values()) == 12
    for planet in SEVEN:
        assert counts[planet] == (1 if planet.is_luminary else 2), planet.label


def test_planet_domicile_agrees_with_sign_lord_and_nodes_rule_nothing() -> None:
    for planet in SEVEN:
        domiciles = domiciles_of(planet)
        assert domiciles is not None
        for sign in domiciles.all:
            assert domicile_lord_of(sign) is planet
        assert len(domiciles.all) == (1 if planet.is_luminary else 2)
    assert domiciles_of(Planet.NORTH_NODE) is None
    assert domiciles_of(Planet.SOUTH_NODE) is None


def test_the_diurnal_domicile_is_masculine_the_nocturnal_feminine() -> None:
    for planet in SEVEN:
        domiciles = domiciles_of(planet)
        assert domiciles is not None
        if domiciles.diurnal is not None:
            assert domiciles.diurnal.gender is SignGender.MASCULINE
        if domiciles.nocturnal is not None:
            assert domiciles.nocturnal.gender is SignGender.FEMININE
        assert domiciles.is_sole_domicile == planet.is_luminary


def test_adversity_is_the_opposite_sign_for_all_twelve() -> None:
    for sign in ZodiacSign:
        assert adversity_lord_of(sign) is domicile_lord_of(sign.opposite), sign.label
    assert signs_of_adversity_for(Planet.VENUS) == [ZodiacSign.ARIES, ZodiacSign.SCORPIO]
    assert signs_of_adversity_for(Planet.SUN) == [ZodiacSign.AQUARIUS]


# ── section 3: exaltations ───────────────────────────────────────────────────


def test_seven_exaltations_one_per_planet() -> None:
    assert len(EXALTATIONS) == 7
    assert {e.planet for e in EXALTATIONS} == set(SEVEN)


@pytest.mark.parametrize(
    ("planet", "sign", "degree"),
    [
        (Planet.SUN, ZodiacSign.ARIES, 19),
        (Planet.MOON, ZodiacSign.TAURUS, 3),
        (Planet.MERCURY, ZodiacSign.VIRGO, 15),
        (Planet.VENUS, ZodiacSign.PISCES, 27),
        (Planet.MARS, ZodiacSign.CAPRICORN, 28),
        (Planet.JUPITER, ZodiacSign.CANCER, 15),
        (Planet.SATURN, ZodiacSign.LIBRA, 21),
    ],
)
def test_the_signs_and_default_degrees(planet: Planet, sign: ZodiacSign, degree: int) -> None:
    e = exaltation_of(planet)
    assert e is not None
    assert e.sign is sign
    assert e.degree == degree


def test_fall_is_opposite_the_exaltation_at_the_same_degree() -> None:
    for e in EXALTATIONS:
        assert e.fall_sign is e.sign.opposite
        assert e.fall_degree == e.degree
    assert fall_ruler_of(ZodiacSign.LIBRA) is Planet.SUN
    assert fall_ruler_of(ZodiacSign.CANCER) is Planet.MARS
    assert fall_ruler_of(ZodiacSign.SCORPIO) is Planet.MOON


def test_saturn_keeps_its_20_variant_and_rejects_the_19_artefact() -> None:
    saturn = exaltation_of(Planet.SATURN)
    assert saturn is not None
    assert saturn.degree == 21
    assert [v.degree for v in saturn.selectable_variants] == [20]
    assert [v.degree for v in saturn.degree_variants] == [20, 19]
    rejected = next(v for v in saturn.degree_variants if v.degree == 19)
    assert rejected.status is VariantStatus.REJECTED_OCR_ARTEFACT


def test_venus_keeps_porphyrys_26_as_an_attributed_variant() -> None:
    venus = exaltation_of(Planet.VENUS)
    assert venus is not None
    assert venus.degree == 27
    assert [v.degree for v in venus.selectable_variants] == [26]
    assert len(venus.degree_variants) == 1
    assert "Porphyry" in venus.degree_variants[0].attribution


def test_the_five_undisputed_planets_carry_no_degree_variants() -> None:
    for planet in (Planet.SUN, Planet.MOON, Planet.MERCURY, Planet.MARS, Planet.JUPITER):
        e = exaltation_of(planet)
        assert e is not None
        assert e.degree_variants == ()


def test_exaltation_lookup_returns_none_for_the_five_signs_without_one() -> None:
    assert ZodiacSign.SCORPIO in SIGNS_WITHOUT_EXALTATION_RULER
    assert len(SIGNS_WITHOUT_EXALTATION_RULER) == 5
    for sign in ZodiacSign:
        if sign in SIGNS_WITHOUT_EXALTATION_RULER:
            assert exaltation_ruler_of(sign) is None, sign.label
        else:
            assert exaltation_ruler_of(sign) is not None, sign.label


def test_fall_lookup_returns_none_for_the_five_signs_without_one() -> None:
    assert len(SIGNS_WITHOUT_FALL_RULER) == 5
    assert ZodiacSign.TAURUS in SIGNS_WITHOUT_FALL_RULER
    assert ZodiacSign.SCORPIO not in SIGNS_WITHOUT_FALL_RULER
    for sign in ZodiacSign:
        want_none = sign in SIGNS_WITHOUT_FALL_RULER
        assert (fall_ruler_of(sign) is None) == want_none, sign.label


def test_porphyrys_exaltation_aspects_hold() -> None:
    # Diurnal planets are exalted a trine from one of their own domiciles, the
    # nocturnal planets a sextile. The domicile is the one the canon names, NOT
    # always the sect-matching one (Jupiter: Cancer -> Pisces, its nocturnal
    # domicile).
    def sign_distance(a: ZodiacSign, b: ZodiacSign) -> int:
        return (b.index - a.index) % 12

    trine = {4, 8}
    sextile = {2, 10}
    diurnal_pairs = {
        Planet.SUN: ZodiacSign.LEO,
        Planet.JUPITER: ZodiacSign.PISCES,
        Planet.SATURN: ZodiacSign.AQUARIUS,
    }
    nocturnal_pairs = {
        Planet.MOON: ZodiacSign.CANCER,
        Planet.VENUS: ZodiacSign.TAURUS,
        Planet.MARS: ZodiacSign.SCORPIO,
    }
    for planet, domicile in diurnal_pairs.items():
        e = exaltation_of(planet)
        assert e is not None
        assert domicile in domiciles_of(planet).all
        assert sign_distance(e.sign, domicile) in trine, planet.label
    for planet, domicile in nocturnal_pairs.items():
        e = exaltation_of(planet)
        assert e is not None
        assert domicile in domiciles_of(planet).all
        assert sign_distance(e.sign, domicile) in sextile, planet.label


# ── section 4: triplicities - both schemes ───────────────────────────────────


def test_the_dorothean_scheme_covers_all_twelve_signs_with_three_lords() -> None:
    for sign in ZodiacSign:
        rulers = triplicity_rulers_of(sign)
        assert rulers.cooperating is not None, sign.label
        assert len(rulers.ordered_for(Sect.DIURNAL)) == 3
        assert len(rulers.ordered_for(Sect.NOCTURNAL)) == 3
    assert len(DOROTHEAN_TRIPLICITY_RULERS) == 4
    covered = {s for t in Triplicity for s in t.signs}
    assert covered == set(ZodiacSign)


def test_the_ptolemaic_scheme_covers_all_twelve_signs_with_two_lords() -> None:
    for sign in ZodiacSign:
        rulers = triplicity_rulers_of(sign, scheme=TriplicityScheme.PTOLEMAIC)
        assert rulers.cooperating is None, sign.label
        assert len(rulers.ordered_for(Sect.DIURNAL)) == 2
    assert len(PTOLEMAIC_TRIPLICITY_RULERS) == 4


def test_the_dorothean_table_matches_canon() -> None:
    expected = {
        Triplicity.FIRE: [Planet.SUN, Planet.JUPITER, Planet.SATURN],
        Triplicity.EARTH: [Planet.VENUS, Planet.MOON, Planet.MARS],
        Triplicity.AIR: [Planet.SATURN, Planet.MERCURY, Planet.JUPITER],
        Triplicity.WATER: [Planet.VENUS, Planet.MARS, Planet.MOON],
    }
    for trigon, lords in expected.items():
        rulers = triplicity_rulers_of_trigon(trigon)
        assert [rulers.diurnal, rulers.nocturnal, rulers.cooperating] == lords, trigon.label


def test_the_sect_of_the_chart_not_the_column_picks_the_first_lord() -> None:
    libra = triplicity_rulers_of(ZodiacSign.LIBRA)
    assert libra.ordered_for(Sect.DIURNAL) == [Planet.SATURN, Planet.MERCURY, Planet.JUPITER]
    assert libra.ordered_for(Sect.NOCTURNAL) == [Planet.MERCURY, Planet.SATURN, Planet.JUPITER]


def test_the_per_planet_condition_rule_enters_exactly_one_lord() -> None:
    assert triplicity_lord_of(ZodiacSign.ARIES, Sect.DIURNAL) is Planet.SUN
    assert triplicity_lord_of(ZodiacSign.ARIES, Sect.NOCTURNAL) is Planet.JUPITER
    for sign in ZodiacSign:
        for sect in Sect:
            assert triplicity_lord_of(sign, sect) is triplicity_rulers_of(sign).ordered_for(sect)[0]


def test_ptolemys_irregular_water_row_keeps_both_co_rulers() -> None:
    water = triplicity_rulers_of_trigon(Triplicity.WATER, scheme=TriplicityScheme.PTOLEMAIC)
    assert water.diurnal is Planet.MARS
    assert water.nocturnal is Planet.MARS
    assert water.co_ruler_for(Sect.DIURNAL) is Planet.VENUS
    assert water.co_ruler_for(Sect.NOCTURNAL) is Planet.MOON
    assert water.provenance_note is not None
    assert "SINGLE-SOURCED" in water.provenance_note
    for trigon in (Triplicity.FIRE, Triplicity.EARTH, Triplicity.AIR):
        rulers = triplicity_rulers_of_trigon(trigon, scheme=TriplicityScheme.PTOLEMAIC)
        assert rulers.co_ruler_for(Sect.DIURNAL) is None
        assert rulers.co_ruler_for(Sect.NOCTURNAL) is None


# ── section 6: decans - the OPPOSITE boundary convention ─────────────────────


def test_decan_boundaries_are_half_open() -> None:
    assert decan_index_of(0.0) == 0
    assert decan_index_of(9.99) == 0
    assert decan_index_of(10.0) == 1
    assert decan_index_of(19.99) == 1
    assert decan_index_of(20.0) == 2
    assert decan_index_of(29.99) == 2
    # The same six probes through the ruler lookup, in Aries.
    assert decan_ruler_of(ZodiacSign.ARIES, 0.0) is Planet.MARS
    assert decan_ruler_of(ZodiacSign.ARIES, 9.99) is Planet.MARS
    assert decan_ruler_of(ZodiacSign.ARIES, 10.0) is Planet.SUN
    assert decan_ruler_of(ZodiacSign.ARIES, 19.99) is Planet.SUN
    assert decan_ruler_of(ZodiacSign.ARIES, 20.0) is Planet.VENUS
    assert decan_ruler_of(ZodiacSign.ARIES, 29.99) is Planet.VENUS


def test_the_decan_rule_is_not_the_bounds_rule() -> None:
    # At 10 deg 00 min the two subdivisions move in opposite directions.
    assert decan_index_of(10.0) == 1
    assert bound_lord_of(ZodiacSign.ARIES, 6.0) is Planet.JUPITER


def test_36_decans_in_unbroken_descending_chaldean_order() -> None:
    descending = [
        Planet.SATURN,
        Planet.JUPITER,
        Planet.MARS,
        Planet.SUN,
        Planet.VENUS,
        Planet.MERCURY,
        Planet.MOON,
    ]
    flat = [ruler for sign in ZodiacSign for ruler in CHALDEAN_DECAN_RULERS[sign]]
    assert len(flat) == 36
    assert flat[0] is Planet.MARS, "Aries I = Mars"
    start = descending.index(Planet.MARS)
    for i in range(36):
        assert flat[i] is descending[(start + i) % 7], f"decan {i + 1} breaks the Chaldean cycle"


def test_georges_own_decan_example_mars_at_26_leo() -> None:
    assert decan_ruler_of(ZodiacSign.LEO, 26) is Planet.MARS


def test_the_triplicity_order_scheme_matches_its_generating_rule() -> None:
    for sign in ZodiacSign:
        trigon_lords = [domicile_lord_of(s) for s in sign.triplicity.signs]
        start_at = list(sign.triplicity.signs).index(sign)
        expected = tuple(trigon_lords[(start_at + i) % 3] for i in range(3))
        assert TRIPLICITY_ORDER_DECAN_RULERS[sign] == expected, sign.label
    # Aries III diverges: Venus (Chaldean) vs Jupiter (triplicity order).
    assert (
        decan_ruler_of(ZodiacSign.ARIES, 25, scheme=DecanScheme.TRIPLICITY_ORDER) is Planet.JUPITER
    )
    assert decan_ruler_of(ZodiacSign.ARIES, 25) is Planet.VENUS


def test_decans_resolve_for_every_whole_degree() -> None:
    for longitude in range(360):
        ruler = decan_ruler_of_longitude(float(longitude))
        assert not ruler.is_node
        decans = decans_of(sign_of_longitude(float(longitude)))
        assert len(decans) == 3
        assert decans[decan_index_of(degree_in_sign(float(longitude)))].ruler is ruler
    assert decans_of(ZodiacSign.PISCES)[-1].number_in_zodiac == 36
