"""The /astro/chart/doctrine reading — the engine honours the practitioner.

Golden tests for #125/#126: the server-derived sect/lots/dignities block, and
the proof that each contested-doctrine choice observably changes the verdict.
The per-planet judgment (`_judge_planet`) is pure, so Saturn can be stood on
any degree of Libra without an ephemeris.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from theourgia.api.routers.v1.astro import (
    _judge_planet,
    _serialize_doctrine,
)
from theourgia.api.routers.v1.user_settings import AstroDoctrineModel
from theourgia.core.astro import ChartRequest, Zodiac
from theourgia.core.astro.houses import HouseSystem
from theourgia.core.astro.hellenistic.bodies import Planet
from theourgia.core.astro.hellenistic.sect import Sect

LIBRA = 180.0  # 0° Libra, absolute longitude
PISCES = 330.0
ARIES = 0.0


def _req(when: datetime) -> ChartRequest:
    # Athens.
    return ChartRequest(
        instant=when,
        latitude=37.98,
        longitude=23.73,
        zodiac=Zodiac("tropical"),
        house_system=HouseSystem("whole-sign"),
    )


def test_route_registered() -> None:
    from theourgia.api.app import create_app

    app = create_app()
    paths = set(app.openapi()["paths"].keys())
    assert "/api/v1/astro/chart/doctrine" in paths


def test_noon_athens_is_diurnal_with_the_suns_team() -> None:
    reading = _serialize_doctrine(
        _req(datetime(2026, 6, 21, 12, 0, tzinfo=UTC)), AstroDoctrineModel()
    )
    assert reading.sect.sect == "diurnal"
    assert reading.sect.light == "sun"
    assert reading.sect.benefic == "jupiter"
    assert reading.sect.malefic_contrary == "mars"


def test_midnight_athens_is_nocturnal_with_the_moons_team() -> None:
    reading = _serialize_doctrine(
        _req(datetime(2026, 6, 21, 0, 0, tzinfo=UTC)), AstroDoctrineModel()
    )
    assert reading.sect.sect == "nocturnal"
    assert reading.sect.light == "moon"
    assert reading.sect.benefic == "venus"
    assert reading.sect.malefic_contrary == "saturn"


def test_all_seven_lots_and_all_seven_judgments() -> None:
    reading = _serialize_doctrine(
        _req(datetime(2026, 6, 21, 12, 0, tzinfo=UTC)), AstroDoctrineModel()
    )
    assert {lot.id for lot in reading.lots} == {
        "fortune",
        "spirit",
        "eros",
        "necessity",
        "courage",
        "victory",
        "nemesis",
    }
    assert {d.body_id for d in reading.dignities} == {
        "sun",
        "moon",
        "mercury",
        "venus",
        "mars",
        "jupiter",
        "saturn",
    }
    # The reading echoes what it honoured.
    assert reading.doctrine == AstroDoctrineModel()


# ─── the degree choice changes the verdict (the point of #125) ───────────


def _saturn_at(degree_in_libra: float, doctrine: AstroDoctrineModel):
    return _judge_planet(Planet.SATURN, LIBRA + degree_in_libra, Sect.DIURNAL, doctrine)


def test_sign_level_default_never_awards_the_degree() -> None:
    d = _saturn_at(20.5, AstroDoctrineModel())  # the 21st degree
    assert "exaltation" in d.held
    assert "exaltation degree" not in d.held


def test_degree_mode_awards_saturn_21_by_default() -> None:
    doctrine = AstroDoctrineModel(exaltation_degrees="degree")
    assert "exaltation degree" in _saturn_at(20.5, doctrine).held  # 21st degree
    assert "exaltation degree" not in _saturn_at(19.5, doctrine).held  # 20th


def test_degree_mode_honours_the_paulus_variant_saturn_20() -> None:
    doctrine = AstroDoctrineModel(
        exaltation_degrees="degree", saturn_exaltation_degree=20
    )
    assert "exaltation degree" in _saturn_at(19.5, doctrine).held  # 20th degree
    assert "exaltation degree" not in _saturn_at(20.5, doctrine).held  # 21st


def test_degree_mode_honours_the_porphyry_variant_venus_26() -> None:
    default = AstroDoctrineModel(exaltation_degrees="degree")
    porphyry = AstroDoctrineModel(
        exaltation_degrees="degree", venus_exaltation_degree=26
    )
    venus_26th = PISCES + 25.5
    assert "exaltation degree" not in _judge_planet(
        Planet.VENUS, venus_26th, Sect.DIURNAL, default
    ).held
    assert "exaltation degree" in _judge_planet(
        Planet.VENUS, venus_26th, Sect.DIURNAL, porphyry
    ).held


def test_fall_degree_mirrors_the_same_choice() -> None:
    # Saturn falls in Aries at the same degree it is exalted in Libra.
    doctrine = AstroDoctrineModel(exaltation_degrees="degree")
    d = _judge_planet(Planet.SATURN, ARIES + 20.5, Sect.DIURNAL, doctrine)
    assert "fall" in d.debilities
    assert "fall degree" in d.debilities
    sign_level = _judge_planet(Planet.SATURN, ARIES + 20.5, Sect.DIURNAL, AstroDoctrineModel())
    assert "fall degree" not in sign_level.debilities


# ─── the judgment matches the retired client table on its fixed cases ────


def test_sun_in_aries_holds_exaltation_and_mars_rules_the_domicile() -> None:
    d = _judge_planet(Planet.SUN, ARIES + 10.0, Sect.DIURNAL, AstroDoctrineModel())
    assert d.domicile_lord == "mars"
    assert d.exaltation_lord == "sun"
    assert "exaltation" in d.held
    # Fire by day: the Sun is its own triplicity lord (Dorothean).
    assert "triplicity" in d.held


def test_scorpio_has_no_exaltation_ruler_and_none_is_the_answer() -> None:
    d = _judge_planet(Planet.MARS, 210.0 + 5.0, Sect.NOCTURNAL, AstroDoctrineModel())
    assert d.exaltation_lord is None
    assert "domicile" in d.held


def test_peregrine_is_no_dignity_and_no_debility() -> None:
    # The Moon early in Aquarius: Saturn's domicile, no exaltation ruler,
    # air-by-day is Saturn's trigon, the first bound and decan are not hers.
    d = _judge_planet(Planet.MOON, 300.0 + 2.0, Sect.DIURNAL, AstroDoctrineModel())
    assert d.peregrine is (not d.held and not d.debilities)


@pytest.mark.anyio
async def test_anonymous_reading_uses_the_ledger_defaults() -> None:
    from theourgia.api.routers.v1.astro import astro_chart_doctrine

    reading = await astro_chart_doctrine(
        None,  # db unused when signed out
        None,  # anonymous
        when=datetime(2026, 6, 21, 12, 0, tzinfo=UTC),
        latitude=37.98,
        longitude=23.73,
    )
    assert reading.doctrine.predominator == "valensWholeSign"
    assert reading.doctrine.exaltation_degrees == "signLevel"


# ─── void of course, under either doctrine ───────────────────────────────


def test_moon_advances_by_thirty_degrees_lands_on_the_arc() -> None:
    from theourgia.core.astro.void_of_course import moon_advances_by

    import swisseph as swe

    start = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)
    reached = moon_advances_by(start, 30.0)
    # The Moon covers 30° in roughly 47–61 hours.
    hours = (reached - start).total_seconds() / 3600
    assert 40 < hours < 65

    def lon(d: datetime) -> float:
        jd = swe.julday(d.year, d.month, d.day, d.hour + d.minute / 60)
        pos, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_MOSEPH)
        return float(pos[0]) % 360

    arc = (lon(reached) - lon(start)) % 360
    assert abs(arc - 30.0) < 0.01


def test_thirty_degree_void_implies_sign_exit_void() -> None:
    # The sign boundary always falls inside the thirty-degree arc, so a Moon
    # void under kenodromia is void under the later rule too — never the
    # reverse. Sampled across a fortnight so the property is exercised on
    # skies nobody hand-picked.
    from theourgia.core.astro.void_of_course import is_void_of_course

    for day in range(0, 14, 2):
        moment = datetime(2026, 8, 1 + day, 6, 0, tzinfo=UTC)
        if is_void_of_course(moment, rule="thirtyDegrees"):
            assert is_void_of_course(moment, rule="signExit")


def test_unknown_rule_reads_as_the_default() -> None:
    from theourgia.core.astro.void_of_course import is_void_of_course

    moment = datetime(2026, 8, 22, 12, 0, tzinfo=UTC)
    assert is_void_of_course(moment, rule="orbBased") == is_void_of_course(
        moment, rule="thirtyDegrees"
    )
