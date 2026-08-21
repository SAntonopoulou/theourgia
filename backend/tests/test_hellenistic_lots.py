"""Lots - held to AstroPractise's own ``lots_test.dart`` cases.

A lot is an arc laid off from a point, and the direction of counting is the
whole point - reverse it and Fortune becomes Spirit. These cases are ported
verbatim from the canonical engine's test, including George's worked arc
(Sun->Moon 60 deg, Moon->Sun 300 deg) and the mirroring theorem, so the Python
port is pinned to the Dart answers.
"""

from __future__ import annotations

import pytest

from theourgia.core.astro.hellenistic.lots import (
    HermeticLot,
    LotInputs,
    all_lots,
    fortune,
    place_from_fortune,
    project,
    spirit,
)
from theourgia.core.astro.hellenistic.sect import Sect


def inputs(
    *,
    sect: Sect,
    ascendant: float = 100,
    sun: float = 165,  # 15 deg Virgo
    moon: float = 225,  # 15 deg Scorpio
    mercury: float = 170,
    venus: float = 200,
    mars: float = 40,
    jupiter: float = 300,
    saturn: float = 20,
) -> LotInputs:
    return LotInputs(
        ascendant=ascendant,
        sun=sun,
        moon=moon,
        mercury=mercury,
        venus=venus,
        mars=mars,
        jupiter=jupiter,
        saturn=saturn,
        sect=sect,
    )


def test_georges_worked_arc_the_direction_is_the_point() -> None:
    # Sun 15 deg Virgo (165), Moon 15 deg Scorpio (225). The asymmetry of
    # counting in zodiacal order is exactly why day and night differ.
    assert (225 - 165) % 360 == 60  # Sun to Moon, in zodiacal order
    assert (165 - 225) % 360 == 300  # Moon to Sun, the long way round


def test_fortune_day_is_asc_plus_moon_minus_sun() -> None:
    assert fortune(inputs(sect=Sect.DIURNAL)) == pytest.approx(160)  # 100 + 225 - 165


def test_fortune_night_is_asc_plus_sun_minus_moon() -> None:
    assert fortune(inputs(sect=Sect.NOCTURNAL)) == pytest.approx(40)  # 100 + 165 - 225


def test_the_two_sects_give_different_answers() -> None:
    assert fortune(inputs(sect=Sect.DIURNAL)) != pytest.approx(fortune(inputs(sect=Sect.NOCTURNAL)))


def test_ptolemys_non_reversing_fortune_equals_everyone_elses_spirit() -> None:
    # Ptolemy uses the DAY formula at night, which is precisely the night
    # formula for Spirit (Rhetorius says so plainly).
    night = inputs(sect=Sect.NOCTURNAL)
    ptolemy_fortune_at_night = project(origin=night.ascendant, from_=night.sun, to=night.moon)
    assert ptolemy_fortune_at_night == pytest.approx(spirit(night))


def test_swapping_the_sect_swaps_fortune_and_spirit() -> None:
    day = inputs(sect=Sect.DIURNAL)
    night = inputs(sect=Sect.NOCTURNAL)
    assert fortune(day) == pytest.approx(spirit(night))
    assert spirit(day) == pytest.approx(fortune(night))


def test_fortune_and_spirit_are_equidistant_from_the_ascendant() -> None:
    i = inputs(sect=Sect.DIURNAL)
    from_asc_to_fortune = (fortune(i) - i.ascendant) % 360
    from_spirit_to_asc = (i.ascendant - spirit(i)) % 360
    assert from_asc_to_fortune == pytest.approx(from_spirit_to_asc)


def test_the_mirroring_theorem_lot_minus_asc_equals_the_arc() -> None:
    # George and Brennan both state it: the relationship between the two planets
    # is exactly mirrored in the relationship between the Ascendant and the Lot.
    origin = 0.0
    while origin < 360:
        from_ = 0.0
        while from_ < 360:
            to = 0.0
            while to < 360:
                lot = project(origin=origin, from_=from_, to=to)
                assert (lot - origin) % 360 == pytest.approx((to - from_) % 360, abs=1e-9)
                to += 71
            from_ += 53
        origin += 37


def test_the_set_is_exactly_seven_and_every_value_is_in_range() -> None:
    for sect in Sect:
        lots = all_lots(inputs(sect=sect))
        assert len(lots) == 7
        assert set(lots) == set(HermeticLot)
        for v in lots.values():
            assert 0 <= v <= 360


def test_all_seven_hermetic_lots_reverse_by_sect() -> None:
    day = all_lots(inputs(sect=Sect.DIURNAL))
    night = all_lots(inputs(sect=Sect.NOCTURNAL))
    for lot in HermeticLot:
        assert lot.reverses_by_sect
        assert day[lot] != pytest.approx(night[lot]), f"{lot.english} must differ between sects"


def test_the_five_derived_lots_move_when_the_sect_moves() -> None:
    day = all_lots(inputs(sect=Sect.DIURNAL))
    night = all_lots(inputs(sect=Sect.NOCTURNAL))
    for lot in (
        HermeticLot.EROS,
        HermeticLot.NECESSITY,
        HermeticLot.COURAGE,
        HermeticLot.VICTORY,
        HermeticLot.NEMESIS,
    ):
        assert day[lot] != pytest.approx(night[lot])


def test_every_lot_carries_greek_and_a_transliteration() -> None:
    for lot in HermeticLot:
        assert lot.greek
        assert lot.transliteration
        assert lot.english


def test_projection_wraps_rather_than_exceeding_360() -> None:
    assert project(origin=350, from_=10, to=30) == pytest.approx(10)


def test_projection_never_returns_a_negative_longitude() -> None:
    assert 0 <= project(origin=10, from_=350, to=20) <= 360


def test_a_zero_arc_leaves_the_lot_on_the_origin() -> None:
    assert project(origin=123.4, from_=55, to=55) == pytest.approx(123.4)


def test_fortune_sits_in_the_first_place_of_its_own_wheel() -> None:
    assert place_from_fortune(longitude=100, fortune_longitude=100) == 1
    # Anywhere in the same sign is still the first place - whole sign.
    assert place_from_fortune(longitude=119, fortune_longitude=100) == 1


def test_place_from_fortune_counts_forward_and_wraps() -> None:
    assert place_from_fortune(longitude=130, fortune_longitude=100) == 2
    assert place_from_fortune(longitude=70, fortune_longitude=100) == 12
    assert place_from_fortune(longitude=10, fortune_longitude=340) == 2


def test_place_from_fortune_always_returns_1_to_12() -> None:
    f = 0.0
    while f < 360:
        longitude = 0.0
        while longitude < 360:
            assert 1 <= place_from_fortune(longitude=longitude, fortune_longitude=f) <= 12
            longitude += 23
        f += 17
