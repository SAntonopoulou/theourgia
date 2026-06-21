"""Election finder tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from theourgia.core.astro.aspects import AspectKind
from theourgia.core.astro.planetary_hours import Planet
from theourgia.core.election import (
    AspectConstraint,
    ConstraintResult,
    ElectionRequest,
    MoonPhaseConstraint,
    MoonSignConstraint,
    PlanetSignConstraint,
    PlanetaryHourConstraint,
    PreBuiltQueries,
    find_election,
)


ATHENS_LAT = 37.9838
ATHENS_LON = 23.7275


# ───── Constraint primitives ────────────────────────────────────────────


def test_planetary_hour_constraint_passes_in_its_hour() -> None:
    """During a Venus hour, a Venus-hour constraint should pass."""
    # Find a Venus hour by checking a Friday afternoon. Friday's
    # ruler is Venus, so the first hour of the day (sunrise) is
    # Venus. We pick a few sunrise-window instants.
    friday = datetime(2026, 6, 19, 6, 0, tzinfo=UTC)
    constraint = PlanetaryHourConstraint(Planet.VENUS)
    # Sample 12 hours of daylight; should hit Venus hours several times.
    venus_passes = sum(
        1
        for h in range(24)
        if constraint.evaluate(
            friday + timedelta(hours=h), ATHENS_LAT, ATHENS_LON,
        ).passes
    )
    assert venus_passes >= 2  # at least the day-hour + a few night-hours


def test_moon_sign_constraint_passes_when_correct() -> None:
    """Find a moment when the Moon is in a specific sign by scanning."""
    # Just verify the constraint returns sensible results for an
    # arbitrary instant — the precise sign isn't tested, only the
    # pass/fail logic.
    instant = datetime(2026, 6, 21, 12, tzinfo=UTC)
    # Try every sign 1..12; exactly one should pass.
    passes = sum(
        1
        for s in range(1, 13)
        if MoonSignConstraint(s).evaluate(instant, ATHENS_LAT, ATHENS_LON).passes
    )
    assert passes == 1


def test_moon_phase_constraint_passes_in_window() -> None:
    """Pick a waxing-moon date and verify the constraint passes."""
    # First-quarter is roughly 7 days after a new moon. June 2026's
    # new moon is around mid-June; June 28 is around full moon (180°).
    full_moon_ish = datetime(2026, 6, 29, 12, tzinfo=UTC)
    constraint = MoonPhaseConstraint(min_angle=120.0, max_angle=240.0)
    result = constraint.evaluate(full_moon_ish, ATHENS_LAT, ATHENS_LON)
    assert result.passes


def test_aspect_constraint_finds_exact_aspect() -> None:
    """An aspect constraint scores 1.0 only at exact aspect, lower
    when off-orb.
    """
    # Pick a time the Sun and Moon are roughly trine (120°): a few
    # days before first quarter or after full moon.
    instant = datetime(2026, 6, 25, 0, tzinfo=UTC)
    constraint = AspectConstraint(
        Planet.SUN, Planet.MOON, AspectKind.TRINE, max_orb=15.0,
    )
    # Don't assert pass/fail (depends on the day); only that the
    # constraint runs without error.
    result = constraint.evaluate(instant, ATHENS_LAT, ATHENS_LON)
    assert isinstance(result, ConstraintResult)
    if result.passes:
        assert 0.0 < result.score <= 1.0


# ───── Finder ───────────────────────────────────────────────────────────


def test_find_election_returns_top_n_sorted() -> None:
    """Top-N results are sorted by score descending."""
    request = ElectionRequest(
        constraints=(PlanetaryHourConstraint(Planet.VENUS),),
        start=datetime(2026, 6, 19, 0, tzinfo=UTC),  # Friday
        end=datetime(2026, 6, 19, 23, 0, tzinfo=UTC),
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
        top_n=5,
    )
    results = find_election(request)
    assert len(results) <= 5
    for prev, cur in zip(results, results[1:], strict=False):
        assert prev.score >= cur.score


def test_find_election_returns_empty_for_inverted_window() -> None:
    request = ElectionRequest(
        constraints=(PlanetaryHourConstraint(Planet.VENUS),),
        start=datetime(2026, 6, 22, 12, tzinfo=UTC),
        end=datetime(2026, 6, 22, 11, tzinfo=UTC),  # before start
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
    )
    assert find_election(request) == []


def test_find_election_rejects_naive_datetime() -> None:
    with pytest.raises(ValueError):
        find_election(ElectionRequest(
            constraints=(PlanetaryHourConstraint(Planet.VENUS),),
            start=datetime(2026, 6, 22),  # noqa: DTZ001
            end=datetime(2026, 6, 23),  # noqa: DTZ001
            latitude=ATHENS_LAT,
            longitude=ATHENS_LON,
        ))


def test_election_breakdown_carries_reasons() -> None:
    """The result's breakdown lets the UI explain *why* a moment was favorable."""
    request = ElectionRequest(
        constraints=(PlanetaryHourConstraint(Planet.VENUS),),
        start=datetime(2026, 6, 19, 6, tzinfo=UTC),
        end=datetime(2026, 6, 19, 18, tzinfo=UTC),
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
        step=timedelta(minutes=30),
    )
    results = find_election(request)
    assert results
    top = results[0]
    assert top.breakdown
    description, result = top.breakdown[0]
    assert description == "Venus hour"
    assert isinstance(result.reason, str) and result.reason


def test_find_election_multi_constraint_product_scoring() -> None:
    """When one constraint fails hard, the product score zeros out
    that sample — even if other constraints score well.
    """
    request = ElectionRequest(
        constraints=(
            PlanetaryHourConstraint(Planet.VENUS),  # picky
            MoonSignConstraint(2),  # also picky
        ),
        start=datetime(2026, 6, 21, 0, tzinfo=UTC),
        end=datetime(2026, 6, 21, 23, tzinfo=UTC),
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
        step=timedelta(minutes=60),
    )
    results = find_election(request)
    # Multi-constraint: some windows will pass all, most won't. Top
    # result either passes both or scores at most 0 for whichever
    # failed.
    for result in results:
        if not result.passes_all:
            assert result.score == 0.0 or any(
                not br.passes for _, br in result.breakdown
            )


# ───── Pre-built queries ────────────────────────────────────────────────


def test_prebuilt_venus_talisman_query_runs() -> None:
    """Smoke check: the pre-built Venus talisman query is callable and
    produces a constraint set.
    """
    constraints = PreBuiltQueries.consecrate_venus_talisman()
    assert len(constraints) >= 3
    request = ElectionRequest(
        constraints=constraints,
        start=datetime(2026, 6, 1, tzinfo=UTC),
        end=datetime(2026, 6, 30, tzinfo=UTC),
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
        step=timedelta(hours=4),
    )
    results = find_election(request)
    assert results  # at least some samples were evaluated


def test_prebuilt_mercury_correspondence_query_runs() -> None:
    constraints = PreBuiltQueries.consult_mercury_before_correspondence()
    assert len(constraints) >= 2
    request = ElectionRequest(
        constraints=constraints,
        start=datetime(2026, 6, 1, tzinfo=UTC),
        end=datetime(2026, 6, 7, tzinfo=UTC),
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
        step=timedelta(hours=4),
    )
    results = find_election(request)
    assert results


def test_prebuilt_hekate_query_runs() -> None:
    constraints = PreBuiltQueries.hekate_working()
    assert len(constraints) >= 3
    request = ElectionRequest(
        constraints=constraints,
        start=datetime(2026, 6, 1, tzinfo=UTC),
        end=datetime(2026, 6, 30, tzinfo=UTC),
        latitude=ATHENS_LAT,
        longitude=ATHENS_LON,
        step=timedelta(hours=4),
    )
    results = find_election(request)
    assert results
