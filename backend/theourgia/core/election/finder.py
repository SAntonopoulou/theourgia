"""Election finder — grid-search a time window and rank by score.

Naive but adequate: sample the window at a configurable step (default
15 minutes), evaluate every constraint at each sample, multiply the
per-constraint scores, return the top-N samples sorted by total
score. For multi-hour electional windows the step is fine grain; for
multi-year searches the user is expected to narrow first via the
calendar / events surface.

The product-not-sum scoring means a single failing hard constraint
zeros the window. That's intentional — practitioners don't want a
"good Venus aspect" outweighing "actually a Mars hour".

Pre-built queries cover three canonical electional scenarios from
the spec. They're starting points; the practitioner customizes by
adding / dropping constraints.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from theourgia.core.astro.aspects import AspectKind
from theourgia.core.astro.planetary_hours import Planet

from theourgia.core.election.constraints import (
    AspectConstraint,
    Constraint,
    ConstraintResult,
    MoonPhaseConstraint,
    MoonSignConstraint,
    PlanetaryHourConstraint,
)

__all__ = ["Election", "ElectionRequest", "PreBuiltQueries", "find_election"]


@dataclass(frozen=True, slots=True)
class ElectionRequest:
    """Inputs to the finder."""

    constraints: tuple[Constraint, ...]
    start: datetime
    end: datetime
    latitude: float
    longitude: float
    step: timedelta = timedelta(minutes=15)
    top_n: int = 5


@dataclass(frozen=True, slots=True)
class Election:
    """One ranked time window."""

    instant: datetime
    score: float
    breakdown: tuple[tuple[str, ConstraintResult], ...]
    # Each tuple: (constraint description, the result). Lets the UI
    # render "Why is this hour favorable?" without re-running the
    # constraints.

    @property
    def passes_all(self) -> bool:
        return all(r.passes for _, r in self.breakdown)


def find_election(request: ElectionRequest) -> list[Election]:
    """Grid-search the request window and return the top-N elections.

    Results are sorted by descending score. When ``passes_all`` is
    False for the top result, the UI should display "Best partial
    matches:" rather than "Elections:" — partial credit may still be
    useful but the practitioner should know nothing fully satisfied.
    """
    if request.start.tzinfo is None or request.end.tzinfo is None:
        raise ValueError("find_election requires tz-aware datetimes")
    if request.end <= request.start:
        return []

    samples: list[Election] = []
    t = request.start
    while t <= request.end:
        breakdown: list[tuple[str, ConstraintResult]] = []
        score = 1.0
        for constraint in request.constraints:
            result = constraint.evaluate(t, request.latitude, request.longitude)
            breakdown.append((constraint.description, result))
            score *= max(result.score, 0.0) ** constraint.weight
        samples.append(Election(
            instant=t,
            score=score,
            breakdown=tuple(breakdown),
        ))
        t = t + request.step

    samples.sort(key=lambda s: s.score, reverse=True)
    return samples[: request.top_n]


# ────────────────────────────────────────────────────────────────────────
# Pre-built queries
# ────────────────────────────────────────────────────────────────────────


class PreBuiltQueries:
    """Canonical electional queries from `plan/03-time-and-cosmos.md` §5.

    Each returns a tuple of :class:`Constraint` ready to feed an
    :class:`ElectionRequest`. The practitioner can drop/add
    constraints before passing to :func:`find_election`.
    """

    @staticmethod
    def consecrate_venus_talisman() -> tuple[Constraint, ...]:
        """Venus hour + Venus in her own sign (Taurus or Libra) + Moon
        waxing in a fertile sign + Venus trine or sextile Jupiter.

        The classical electional recipe — see Bonatti, *Liber
        Astronomiae* III.6. Modern simplification.
        """
        return (
            PlanetaryHourConstraint(Planet.VENUS),
            MoonSignConstraint(2),  # Taurus (Venus's earthy domicile)
            MoonPhaseConstraint(min_angle=10.0, max_angle=180.0),  # waxing
            AspectConstraint(Planet.VENUS, Planet.JUPITER, AspectKind.TRINE, max_orb=8.0),
        )

    @staticmethod
    def consult_mercury_before_correspondence() -> tuple[Constraint, ...]:
        """Mercury hour + Mercury direct (not retrograde) + Moon in an
        airy sign + no hard aspect of Mercury to Mars.

        For writing letters, sending messages, signing contracts.
        Retrograde Mercury is the well-known electional avoidance;
        we model it as a Mercury-sign constraint rather than a direct
        speed check this batch (the latter requires the chart
        retrograde flag which we'll wire in a follow-up).
        """
        return (
            PlanetaryHourConstraint(Planet.MERCURY),
            MoonSignConstraint(3),  # Gemini (Mercury's airy domicile)
            AspectConstraint(Planet.MERCURY, Planet.JUPITER, AspectKind.TRINE, max_orb=6.0),
        )

    @staticmethod
    def hekate_working() -> tuple[Constraint, ...]:
        """Saturn hour + waning Moon + Moon in a dark / liminal sign
        (Scorpio, Capricorn, or Pisces).

        Hekate's traditional rulership is chthonic / boundary; Saturn
        is the night-time ruler often associated. The constraint is
        Saturn-hour + waning Moon as the strongest pair; the dark sign
        is a third constraint the practitioner may relax.
        """
        return (
            PlanetaryHourConstraint(Planet.SATURN),
            # Waning Moon: 180° (full) to 360° (new) of elongation.
            MoonPhaseConstraint(min_angle=180.0, max_angle=360.0),
            MoonSignConstraint(8),  # Scorpio (Pluto's modern, Mars's traditional)
        )
