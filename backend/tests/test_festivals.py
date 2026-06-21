"""Festival overlay tests.

Validates that:

* Every shipped festival has at least one citation (the
  provenance-mandatory invariant).
* The five traditions all populate.
* Solstice/equinox-keyed festivals land within a day of the
  astronomical event.
* Cross-quarter festivals fall on their canonical Gregorian dates.
* Hekatean Deipnon / Noumenia track the lunar cycle (≥12 occurrences
  per year — one per synodic month).
* Greek festivals fall in their canonical Attic month windows.
* Festival sources are typed (primary / scholarly / community).
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from theourgia.core.festivals import (
    Citation,
    CitationKind,
    Festival,
    Tradition,
    festivals_by_tradition,
    festivals_for_year,
    get_festival,
    register_festival,
    registered_festivals,
)


YEAR = 2026


# ───── Provenance invariant ─────────────────────────────────────────────


def test_every_festival_has_at_least_one_citation() -> None:
    for festival in registered_festivals():
        assert len(festival.sources) >= 1, (
            f"{festival.id} has no citations — provenance is non-negotiable."
        )


def test_festival_init_rejects_zero_sources() -> None:
    """Constructor enforces the provenance invariant."""
    with pytest.raises(ValueError):
        Festival(
            id="bogus",
            name="Bogus",
            tradition=Tradition.CUSTOM,
            description="d",
            practice_notes="",
            sources=(),
            compute=lambda y: [],
        )


def test_citation_kinds_are_typed() -> None:
    """Every citation carries one of the three kinds — so the UI can
    distinguish primary attestations from modern reconstructions.
    """
    valid_kinds = set(CitationKind)
    for festival in registered_festivals():
        for cite in festival.sources:
            assert cite.kind in valid_kinds


# ───── Tradition coverage ───────────────────────────────────────────────


def test_five_traditions_populated() -> None:
    expected = {
        Tradition.WHEEL_OF_THE_YEAR,
        Tradition.GREEK,
        Tradition.ROMAN,
        Tradition.HEKATEAN,
        Tradition.THELEMIC,
    }
    for tradition in expected:
        ids = {f.id for f in festivals_by_tradition(tradition)}
        assert ids, f"No festivals registered for tradition {tradition!r}"


def test_wheel_of_the_year_has_eight_sabbats() -> None:
    sabbats = festivals_by_tradition(Tradition.WHEEL_OF_THE_YEAR)
    ids = {f.id for f in sabbats}
    assert ids == {
        "yule", "ostara", "litha", "mabon",
        "imbolc", "beltane", "lammas", "samhain",
    }


def test_thelemic_feasts_include_four_feasts_of_the_times() -> None:
    thel = {f.id for f in festivals_by_tradition(Tradition.THELEMIC)}
    assert {
        "thel-spring-equinox",
        "thel-autumn-equinox",
        "thel-summer-solstice",
        "thel-winter-solstice",
    } <= thel


# ───── Astronomical anchors ─────────────────────────────────────────────


def test_litha_falls_on_summer_solstice() -> None:
    """Litha is computed as the astronomical Cancer ingress; should
    fall on June 20 / 21 within 24 hours of the canonical solstice.
    """
    litha = get_festival("litha")
    instances = litha.compute(YEAR)
    assert len(instances) == 1
    # 2026 NH summer solstice is on June 21.
    assert instances[0].start.month == 6
    assert instances[0].start.day in (20, 21)


def test_yule_falls_on_winter_solstice() -> None:
    yule = get_festival("yule")
    instances = yule.compute(YEAR)
    assert instances[0].start.month == 12
    assert instances[0].start.day in (20, 21, 22)


def test_ostara_and_thel_spring_equinox_agree() -> None:
    """Both are computed from the same Sun-at-0°-Aries instant — they
    must align to within seconds.
    """
    ostara = get_festival("ostara").compute(YEAR)[0]
    thel = get_festival("thel-spring-equinox").compute(YEAR)[0]
    drift = abs((ostara.start - thel.start).total_seconds())
    assert drift < 1.0


# ───── Cross-quarter civil dates ────────────────────────────────────────


def test_imbolc_is_february_1() -> None:
    inst = get_festival("imbolc").compute(YEAR)[0]
    assert (inst.start.month, inst.start.day) == (2, 1)


def test_beltane_is_may_1() -> None:
    inst = get_festival("beltane").compute(YEAR)[0]
    assert (inst.start.month, inst.start.day) == (5, 1)


def test_samhain_is_october_31() -> None:
    inst = get_festival("samhain").compute(YEAR)[0]
    assert (inst.start.month, inst.start.day) == (10, 31)


# ───── Roman fixed dates ────────────────────────────────────────────────


def test_lupercalia_is_february_15() -> None:
    inst = get_festival("lupercalia").compute(YEAR)[0]
    assert (inst.start.month, inst.start.day) == (2, 15)


def test_saturnalia_runs_dec_17_to_dec_24() -> None:
    inst = get_festival("saturnalia").compute(YEAR)[0]
    assert (inst.start.month, inst.start.day) == (12, 17)
    assert (inst.end.month, inst.end.day) == (12, 24)


# ───── Hekatean lunar cycle ─────────────────────────────────────────────


def test_deipnon_occurs_every_lunar_month() -> None:
    """One Deipnon per new moon — 12 or 13 per Gregorian year."""
    deipnons = get_festival("deipnon").compute(YEAR)
    assert 12 <= len(deipnons) <= 13


def test_noumenia_count_matches_deipnon() -> None:
    deipnons = get_festival("deipnon").compute(YEAR)
    noumenias = get_festival("noumenia").compute(YEAR)
    # Every new moon spawns both — though Noumenia can land in the next
    # calendar year, so allow a 1-off difference.
    assert abs(len(deipnons) - len(noumenias)) <= 1


def test_noumenia_follows_deipnon() -> None:
    """Each Noumenia begins after the corresponding Deipnon ends."""
    deipnons = get_festival("deipnon").compute(YEAR)
    noumenias = get_festival("noumenia").compute(YEAR)
    for d, n in zip(deipnons, noumenias, strict=False):
        assert n.start > d.end


# ───── Greek attic month windows ────────────────────────────────────────


def test_anthesteria_falls_late_winter() -> None:
    """Anthesterion is the lunar month around February-March; in years
    where the new moon falls early, 11 Anthesterion can land in late
    January.
    """
    inst = get_festival("anthesteria").compute(YEAR)[0]
    assert inst.start.month in (1, 2, 3)


def test_thesmophoria_in_mid_autumn() -> None:
    """Pyanepsion is the lunar month around October-November."""
    inst = get_festival("thesmophoria").compute(YEAR)[0]
    assert inst.start.month in (9, 10, 11)


def test_eleusinia_runs_seven_days() -> None:
    inst = get_festival("eleusinia").compute(YEAR)[0]
    assert (inst.end - inst.start).days == 7


# ───── Year-wide stream ─────────────────────────────────────────────────


def test_festivals_for_year_is_sorted() -> None:
    instances = festivals_for_year(YEAR)
    assert instances == sorted(instances, key=lambda i: i.start)


def test_festivals_for_year_returns_many() -> None:
    """8 sabbats + 5 Greek + 5 Roman + 6 Thelemic + ~24-26 Hekatean (12+12)
    = ~50 instances per year."""
    instances = festivals_for_year(YEAR)
    assert len(instances) >= 40


# ───── Custom festivals (user-defined plugin extension) ─────────────────


def test_custom_festival_registration() -> None:
    """A user can register a custom tradition entry with their own
    citation — typically their own practice journal or a community
    source.
    """
    from datetime import timedelta as _td
    custom = Festival(
        id="test-custom-fest",
        name="My Quiet Wednesday",
        tradition=Tradition.CUSTOM,
        description="A personal observance.",
        practice_notes="A weekly silent walk.",
        sources=(Citation(
            title="Personal journal",
            author="Aspasia",
            year=2026,
            kind=CitationKind.COMMUNITY,
        ),),
        compute=lambda year: [],
    )
    register_festival(custom)
    assert get_festival("test-custom-fest") is custom
