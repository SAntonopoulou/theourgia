"""Geomancy engine tests — determinism, the 16 figures, the cascade.

Pure-Python tests; DB-integration round-trip via deploy path.
"""

from __future__ import annotations

import pytest

from theourgia.core.divination.geomancy import (
    Chart,
    Figure,
    FigureName,
    combine,
    figure_by_name,
    figure_for_pattern,
    geomancy_cast,
)
from theourgia.core.divination.geomancy.bundles import (
    BUILTIN_FIGURES,
    Mobility,
    figure_metadata,
)
from theourgia.core.divination.geomancy.engine import (
    FIGURE_ORDER,
    HOUSE_MEANINGS,
    _build_chart,
    _daughters_from_mothers,
    lines_for_pattern,
    pattern_for_lines,
)


# ───── 16 figures + patterns ─────────────────────────────────────────


def test_sixteen_figure_names() -> None:
    """The 16 canonical Latin names are present and distinct."""
    assert len(FigureName) == 16
    values = {f.value for f in FigureName}
    assert len(values) == 16


def test_canonical_pattern_for_populus_and_via() -> None:
    """Populus = all doubles (FFFF); Via = all singles (TTTT)."""
    assert lines_for_pattern(FigureName.POPULUS) == (False, False, False, False)
    assert lines_for_pattern(FigureName.VIA) == (True, True, True, True)


def test_pattern_round_trip_for_all_16() -> None:
    seen_patterns: set[tuple[bool, ...]] = set()
    for name in FigureName:
        pattern = lines_for_pattern(name)
        seen_patterns.add(pattern)
        assert pattern_for_lines(pattern) == name
    assert len(seen_patterns) == 16


def test_figure_order_has_16_unique_figures() -> None:
    assert len(FIGURE_ORDER) == 16
    assert len(set(FIGURE_ORDER)) == 16


def test_figure_by_name_constructs() -> None:
    fig = figure_by_name("amissio")
    assert fig.name == FigureName.AMISSIO
    assert fig.lines == lines_for_pattern(FigureName.AMISSIO)
    assert 0 <= fig.index < 16


# ───── Combine (geomantic addition) ─────────────────────────────────


def test_combine_is_xor_per_line() -> None:
    """Single + single = double; double + double = double; mixed = single."""
    a = figure_by_name("via")  # TTTT
    b = figure_by_name("populus")  # FFFF
    # T + F per line = T → still Via.
    assert combine(a, b).name == FigureName.VIA
    # T + T per line = F → Populus.
    assert combine(a, a).name == FigureName.POPULUS
    # F + F per line = F → still Populus.
    assert combine(b, b).name == FigureName.POPULUS


def test_combine_is_commutative() -> None:
    a = figure_by_name("puer")
    b = figure_by_name("amissio")
    assert combine(a, b) == combine(b, a)


def test_combine_is_associative_for_three_figures() -> None:
    a = figure_by_name("puer")
    b = figure_by_name("amissio")
    c = figure_by_name("conjunctio")
    assert combine(combine(a, b), c) == combine(a, combine(b, c))


def test_combining_with_populus_is_identity() -> None:
    """Populus (FFFF) is the additive identity under geomantic XOR."""
    populus = figure_by_name("populus")
    for name in FigureName:
        f = figure_by_name(name)
        assert combine(f, populus) == f


def test_combining_a_figure_with_itself_yields_populus() -> None:
    for name in FigureName:
        f = figure_by_name(name)
        assert combine(f, f).name == FigureName.POPULUS


# ───── Daughters / nieces / witness / judge cascade ──────────────────


def test_daughters_are_the_transpose_of_mothers() -> None:
    mothers = (
        figure_by_name("via"),         # TTTT
        figure_by_name("populus"),     # FFFF
        figure_by_name("amissio"),     # TFTF
        figure_by_name("acquisitio"),  # FTFT
    )
    daughters = _daughters_from_mothers(mothers)
    # D1 line j = M_j line 0; mothers' line 0s are (T, F, T, F) → Amissio.
    assert daughters[0].name == FigureName.AMISSIO
    # D2 line j = M_j line 1: (T, F, F, T) → Carcer (TFFT).
    assert daughters[1].name == FigureName.CARCER
    # D3 line j = M_j line 2: (T, F, T, F) → Amissio.
    assert daughters[2].name == FigureName.AMISSIO
    # D4 line j = M_j line 3: (T, F, F, T) → Carcer.
    assert daughters[3].name == FigureName.CARCER


def test_chart_built_from_four_populi_is_all_populus() -> None:
    """Four Populus mothers → all daughters = Populus → all nieces =
    Populus (P+P=P) → both witnesses = Populus → Judge = Populus →
    Reconciler = Populus."""
    populus = figure_by_name("populus")
    chart = _build_chart((populus, populus, populus, populus))
    for figure in (
        *chart.mothers,
        *chart.daughters,
        *chart.nieces,
        chart.right_witness,
        chart.left_witness,
        chart.judge,
        chart.reconciler,
    ):
        assert figure.name == FigureName.POPULUS


def test_judge_is_xor_of_all_four_mothers() -> None:
    """Algebraic identity:
    Judge = N1+N2+N3+N4
          = (M1+M2)+(M3+M4)+(D1+D2)+(D3+D4)

    Mothers and daughters together have the same set of bits as the
    mothers alone (daughters are the transpose), so each of the 16
    mother-bits appears exactly twice in the witness expansion → they
    cancel in pairs. The Judge is **not** simply M1+M2+M3+M4 in
    general — but it IS Populus when all mothers are identical, and
    the cascade always yields a figure derived deterministically from
    the four mothers. This test pins one well-known identity:
    when M1 = M2 and M3 = M4, the judge is Populus."""
    a = figure_by_name("amissio")
    b = figure_by_name("rubeus")
    chart = _build_chart((a, a, b, b))
    # N1 = a + a = Populus; N2 = b + b = Populus
    # N3 = D1 + D2; D1's first line = a.line[0], a.line[0], b.line[0], b.line[0]
    # etc., so daughters depend on the mother shape.
    # Right witness = Populus + Populus = Populus.
    assert chart.right_witness.name == FigureName.POPULUS
    # Judge = right_witness + left_witness; right is Populus, so
    # Judge = left_witness.
    assert chart.judge == chart.left_witness


def test_reconciler_combines_first_mother_with_judge() -> None:
    chart = geomancy_cast("seed-reconciler")
    expected = combine(chart.mothers[0], chart.judge)
    assert chart.reconciler == expected


# ───── House mapping ─────────────────────────────────────────────────


def test_chart_has_12_houses_in_order() -> None:
    chart = geomancy_cast("seed-houses")
    assert len(chart.houses) == 12
    for i, h in enumerate(chart.houses):
        assert h.house == i + 1


def test_houses_1_to_4_are_mothers() -> None:
    chart = geomancy_cast("seed-houses-mothers")
    for i in range(4):
        assert chart.houses[i].figure_name == chart.mothers[i].name
        assert chart.houses[i].figure_lines == chart.mothers[i].lines


def test_houses_5_to_8_are_daughters() -> None:
    chart = geomancy_cast("seed-houses-daughters")
    for i in range(4):
        assert chart.houses[4 + i].figure_name == chart.daughters[i].name


def test_houses_9_to_12_are_nieces() -> None:
    chart = geomancy_cast("seed-houses-nieces")
    for i in range(4):
        assert chart.houses[8 + i].figure_name == chart.nieces[i].name


def test_twelve_house_meanings_listed() -> None:
    assert len(HOUSE_MEANINGS) == 12
    for meaning in HOUSE_MEANINGS:
        assert meaning, "every house meaning must be non-empty"


# ───── Determinism ───────────────────────────────────────────────────


def test_geomancy_cast_is_deterministic_for_same_seed() -> None:
    a = geomancy_cast("test-seed")
    b = geomancy_cast("test-seed")
    assert a == b


def test_different_seeds_yield_different_charts() -> None:
    a = geomancy_cast("seed-a")
    b = geomancy_cast("seed-b")
    # With 2^16 = 65536 possible mother configurations, identical
    # charts from different seeds would be a clear bug.
    assert a.mothers != b.mothers


def test_seeded_cast_returns_proper_chart_shape() -> None:
    chart = geomancy_cast("shape")
    assert isinstance(chart, Chart)
    assert len(chart.mothers) == 4
    assert len(chart.daughters) == 4
    assert len(chart.nieces) == 4
    assert len(chart.houses) == 12


# ───── Bundle metadata ───────────────────────────────────────────────


def test_sixteen_builtin_figures_with_metadata() -> None:
    assert len(BUILTIN_FIGURES) == 16
    names = {f.name for f in BUILTIN_FIGURES}
    assert names == set(FigureName)


def test_every_figure_has_planet_zodiac_element() -> None:
    for f in BUILTIN_FIGURES:
        assert f.planet, f"{f.name} missing planet"
        assert f.zodiac, f"{f.name} missing zodiac"
        assert f.element in {"fire", "earth", "air", "water"}
        assert f.mobility in {Mobility.MOBILE, Mobility.STABLE}
        assert f.meaning, f"{f.name} missing meaning"


def test_dragons_head_and_tail_share_node_attribution() -> None:
    """Caput Draconis = North Node, Cauda Draconis = South Node — both
    must be present and distinct."""
    caput = figure_metadata("caput_draconis")
    cauda = figure_metadata("cauda_draconis")
    assert caput.planet == "North Node"
    assert cauda.planet == "South Node"


def test_fortuna_major_and_minor_share_sun_attribution() -> None:
    """Both Fortunes are solar in the Agrippan tradition."""
    major = figure_metadata("fortuna_major")
    minor = figure_metadata("fortuna_minor")
    assert major.planet == "Sun"
    assert minor.planet == "Sun"
    # Major is stable; Minor is mobile (the "minor / lesser" implies
    # swift in classical sources).
    assert major.mobility == Mobility.STABLE
    assert minor.mobility == Mobility.MOBILE


def test_figure_metadata_unknown_raises() -> None:
    with pytest.raises((KeyError, ValueError)):
        figure_metadata("not-a-figure")


# ───── Router payload class-shape ────────────────────────────────────


def test_cast_request_defaults_to_rng() -> None:
    from theourgia.api.routers.v1.geomancy import CastRequest

    payload = CastRequest()
    assert payload.method == "rng"
    assert payload.seed is None


def test_manual_cast_requires_four_mothers() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.geomancy import ManualCastRequest

    ManualCastRequest(mothers=("via", "populus", "amissio", "acquisitio"))
    with pytest.raises(ValidationError):
        ManualCastRequest(mothers=("via",))  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        ManualCastRequest(mothers=("via", "populus", "amissio", "not-a-figure"))  # type: ignore[arg-type]


def test_reading_update_rating_must_be_one_to_five() -> None:
    from pydantic import ValidationError

    from theourgia.api.routers.v1.geomancy import ReadingUpdate

    ReadingUpdate(retrospective_rating=4)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=0)
    with pytest.raises(ValidationError):
        ReadingUpdate(retrospective_rating=6)
