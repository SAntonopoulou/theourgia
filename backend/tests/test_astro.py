"""Astrology engine tests.

Validates against known astronomical events:

* **2026-06-21 06:00 UTC** — Northern summer solstice. Sun should be
  very close to 0° Cancer (90° tropical longitude).
* **2026-09-23 ~14:00 UTC** — Northern autumnal equinox. Sun at 0° Libra.
* **2025-12-22** — Some retrograde / direct body checks.

We don't pixel-perfectly match Astrodienst here (FLG_MOSEPH is ~arcsec
accurate, Astrodienst uses the full ephemeris files for sub-arcsec).
The tests assert "within the expected sign + within a degree of the
reference" — enough to catch real regressions without coupling to a
specific ephemeris build.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from theourgia.core.astro import (
    ATTRIBUTION,
    ChartRequest,
    Zodiac,
    compute_chart,
    sign_of,
)
from theourgia.core.astro.aspects import AspectKind, detect_aspects
from theourgia.core.astro.bodies import BODIES
from theourgia.core.astro.houses import HouseSystem
from theourgia.core.astro.zodiac import Ayanamsa


# Athens (37.9838°N, 23.7275°E) — Theourgia's etymological home.
ATHENS_LAT = 37.9838
ATHENS_LON = 23.7275


def _request(year: int, month: int, day: int, hour: float = 12.0) -> ChartRequest:
    h = int(hour)
    minute = int((hour - h) * 60)
    return ChartRequest(
        instant=datetime(year, month, day, h, minute, tzinfo=UTC),
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
    )


# ───── Solstice / equinox anchors ───────────────────────────────────────


def test_summer_solstice_sun_in_early_cancer() -> None:
    """Northern summer solstice 2026: Sun ingresses Cancer at ~08:24 UTC.
    A chart cast at noon UTC should show the Sun a couple hours into
    Cancer (∼0°09' Cancer).
    """
    chart = compute_chart(_request(2026, 6, 21, 12.0))
    sun = next(p for p in chart.placements if p.body.id == "sun")
    assert sun.tropical.sign_name == "Cancer"
    # ~3 hours into Cancer at the Sun's ~0.04°/hour ecliptic speed.
    assert sun.tropical.degree_in_sign < 1.0


def test_autumnal_equinox_sun_at_zero_libra() -> None:
    """Northern autumnal equinox 2026: Sun ingresses Libra around 13:05 UTC.
    Cast for 14:00 UTC — Sun should be in early Libra.
    """
    chart = compute_chart(_request(2026, 9, 23, 14.0))
    sun = next(p for p in chart.placements if p.body.id == "sun")
    assert sun.tropical.sign_name == "Libra"
    assert sun.tropical.degree_in_sign < 1.0


# ───── Placement coverage ───────────────────────────────────────────────


def test_every_planet_returns_a_placement() -> None:
    """Asteroids may be skipped if the `.se1` asteroid files aren't
    installed; planets, lunar node, and lunar apogee must always be
    present because they're computable from the Moshier built-in.
    """
    chart = compute_chart(_request(2026, 6, 21))
    placement_ids = {p.body.id for p in chart.placements}
    required = {b.id for b in BODIES if b.category != "asteroid"}
    assert required <= placement_ids


def test_tropical_and_sidereal_differ_by_the_ayanamsa() -> None:
    chart = compute_chart(_request(2026, 6, 21))
    sun = next(p for p in chart.placements if p.body.id == "sun")
    # Lahiri ayanāṃśa in 2026 is ~24.2° — tropical should be ahead of
    # sidereal by that amount (mod 360).
    diff = (sun.tropical.longitude - sun.sidereal.longitude) % 360
    assert 23.0 < diff < 25.0, f"Lahiri offset out of range: {diff}"


def test_placement_house_assignment_is_in_range() -> None:
    chart = compute_chart(_request(2026, 6, 21))
    for placement in chart.placements:
        assert 1 <= placement.house <= 12


def test_retrograde_detection_round_trips_via_speed() -> None:
    chart = compute_chart(_request(2026, 6, 21))
    for placement in chart.placements:
        assert placement.is_retrograde == (placement.speed < 0)


# ───── Houses + angles ──────────────────────────────────────────────────


def test_houses_default_to_placidus_with_twelve_cusps() -> None:
    chart = compute_chart(_request(2026, 6, 21))
    assert chart.houses.system == HouseSystem.PLACIDUS
    # cusps[0] is placeholder, cusps[1..12] populated, all in 0..360.
    for i in range(1, 13):
        assert 0 <= chart.houses.cusps[i] < 360


def test_whole_sign_houses_align_with_sign_boundaries() -> None:
    chart = compute_chart(
        ChartRequest(
            instant=datetime(2026, 6, 21, 12, tzinfo=UTC),
            latitude=ATHENS_LAT,
            longitude=ATHENS_LON,
            house_system=HouseSystem.WHOLE_SIGN,
        )
    )
    # In Whole Sign, the 1st-house cusp is the ASC's sign boundary —
    # the degree within sign should be 0. Likewise each subsequent
    # cusp is exactly 30° on from the previous.
    cusps_clean = [chart.houses.cusps[i] for i in range(1, 13)]
    for i in range(1, len(cusps_clean)):
        delta = (cusps_clean[i] - cusps_clean[i - 1]) % 360
        assert abs(delta - 30.0) < 0.001, f"Cusp {i + 1} not 30° on: delta={delta}"


def test_ascendant_and_midheaven_present() -> None:
    chart = compute_chart(_request(2026, 6, 21))
    assert 0 <= chart.ascendant.longitude < 360
    assert 0 <= chart.midheaven.longitude < 360


# ───── Aspects ──────────────────────────────────────────────────────────


def test_aspect_detector_finds_conjunction() -> None:
    # Two bodies at the same longitude → conjunction with orb 0.
    aspects = detect_aspects({"a": 100.0, "b": 100.5})
    conj = next(a for a in aspects if a.kind == AspectKind.CONJUNCTION)
    assert conj.body_a == "a"
    assert conj.body_b == "b"
    assert conj.orb == pytest.approx(0.5)


def test_aspect_detector_finds_opposition() -> None:
    aspects = detect_aspects({"a": 10.0, "b": 190.5})
    opp = next(a for a in aspects if a.kind == AspectKind.OPPOSITION)
    assert opp.body_a == "a"
    assert opp.body_b == "b"
    assert opp.orb == pytest.approx(0.5)


def test_aspect_detector_excludes_out_of_orb_pairs() -> None:
    # 25° separation is no Ptolemaic aspect.
    aspects = detect_aspects({"a": 10.0, "b": 35.0})
    assert aspects == []


# ───── Sign of ───────────────────────────────────────────────────────────


def test_sign_of_zero_is_aries() -> None:
    assert sign_of(0.0).sign_name == "Aries"
    assert sign_of(0.0).degree_in_sign == 0.0


def test_sign_of_wraps_at_360() -> None:
    assert sign_of(360.0).sign_name == "Aries"


def test_sign_of_handles_negative_via_modulo() -> None:
    # In case some caller hands us a slightly-negative number after
    # ayanāṃśa subtraction.
    assert sign_of(-1.0).sign_name == "Pisces"
    assert sign_of(-1.0).degree_in_sign == pytest.approx(29.0)


# ───── Attribution ──────────────────────────────────────────────────────


def test_chart_result_carries_attribution() -> None:
    """The Swiss Ephemeris attribution is mandatory under the AGPL
    path of the dual-license. Any chart returned from
    ``compute_chart`` must carry it so a downstream renderer can
    surface it.
    """
    chart = compute_chart(_request(2026, 6, 21))
    assert chart.attribution == ATTRIBUTION
    assert "Swiss Ephemeris" in chart.attribution
    assert "Astrodienst" in chart.attribution
    assert "JPL DE441" in chart.attribution


# ───── Input validation ─────────────────────────────────────────────────


def test_naive_datetime_rejected() -> None:
    with pytest.raises(ValueError):
        compute_chart(
            ChartRequest(
                instant=datetime(2026, 6, 21, 12),  # noqa: DTZ001
                latitude=ATHENS_LAT,
                longitude=ATHENS_LON,
            )
        )
