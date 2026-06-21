"""Electional constraints — each one scores an instant from 0..1.

A `Constraint.evaluate(instant, latitude, longitude)` call returns a
`ConstraintResult` with:

* `passes` — boolean: did the constraint hold at all?
* `score` — float in [0, 1]: how strongly did it hold? (1.0 = perfect
  match; lower values for partial / less-tight matches such as a
  wide-orb aspect or a planetary hour that's about to expire.)
* `reason` — human-readable explanation for the UI to surface.

The finder's overall score for a window is the weighted product
(or sum) of these constraint scores. The product penalizes any
single failing constraint heavily; the sum allows partial credit.
The default :func:`finder.find_election` uses the product so a
single hard requirement (e.g. "must be a Venus hour") can't be
overridden by many weak boosters.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

from theourgia.core.astro.aspects import AspectKind, detect_aspects
from theourgia.core.astro.planetary_hours import Planet, current_planetary_hour
from theourgia.core.astro.zodiac import SIGNS

import swisseph as swe

__all__ = [
    "Constraint",
    "ConstraintResult",
    "PlanetaryHourConstraint",
    "MoonSignConstraint",
    "PlanetSignConstraint",
    "MoonPhaseConstraint",
    "AspectConstraint",
]


@dataclass(frozen=True, slots=True)
class ConstraintResult:
    """Outcome of evaluating a single constraint at a single instant."""

    passes: bool
    score: float  # 0..1; 1.0 is perfect.
    reason: str  # human-readable; the UI surfaces this.


class Constraint(ABC):
    """A single electional rule. Override :meth:`evaluate`."""

    weight: float = 1.0  # multiplier in the overall score.

    @abstractmethod
    def evaluate(
        self,
        instant: datetime,
        latitude: float,
        longitude: float,
    ) -> ConstraintResult:
        """Score the constraint at the given moment."""

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable describing the constraint, e.g. "Venus hour"."""


# ────────────────────────────────────────────────────────────────────────
# Planetary hour
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class PlanetaryHourConstraint(Constraint):
    planet: Planet
    weight: float = 1.0

    @property
    def description(self) -> str:
        return f"{self.planet.value.capitalize()} hour"

    def evaluate(
        self, instant: datetime, latitude: float, longitude: float,
    ) -> ConstraintResult:
        hour = current_planetary_hour(instant, latitude, longitude)
        if hour.ruler == self.planet:
            # Tighter score the further from hour-end (gives the
            # finder a preference for early-in-the-hour windows).
            seconds_remaining = (hour.end - instant).total_seconds()
            hour_length = (hour.end - hour.start).total_seconds()
            score = max(0.5, min(1.0, seconds_remaining / hour_length))
            return ConstraintResult(
                passes=True,
                score=score,
                reason=f"In a {self.planet.value} hour ({hour.start.strftime('%H:%M')}-{hour.end.strftime('%H:%M')}).",
            )
        return ConstraintResult(
            passes=False,
            score=0.0,
            reason=f"Current hour is {hour.ruler.value}, not {self.planet.value}.",
        )


# ────────────────────────────────────────────────────────────────────────
# Moon sign + sign of any planet
# ────────────────────────────────────────────────────────────────────────


def _body_longitude(jd: float, body_id: int) -> float:
    pos, _ = swe.calc_ut(jd, body_id, swe.FLG_MOSEPH)
    return pos[0] % 360


def _to_jd(d: datetime) -> float:
    h = d.hour + d.minute / 60 + (d.second + d.microsecond / 1_000_000) / 3600
    return swe.julday(d.year, d.month, d.day, h)


_PLANET_TO_SWE: dict[Planet, int] = {
    Planet.SUN: swe.SUN,
    Planet.MOON: swe.MOON,
    Planet.MERCURY: swe.MERCURY,
    Planet.VENUS: swe.VENUS,
    Planet.MARS: swe.MARS,
    Planet.JUPITER: swe.JUPITER,
    Planet.SATURN: swe.SATURN,
}


@dataclass(frozen=True, slots=True)
class PlanetSignConstraint(Constraint):
    """Require a given planet to be in a given sign (1..12)."""

    planet: Planet
    sign: int  # 1..12, 1 = Aries
    weight: float = 1.0

    @property
    def description(self) -> str:
        return f"{self.planet.value.capitalize()} in {SIGNS[self.sign]}"

    def evaluate(
        self, instant: datetime, latitude: float, longitude: float,
    ) -> ConstraintResult:
        lon = _body_longitude(_to_jd(instant), _PLANET_TO_SWE[self.planet])
        cur_sign = int(lon // 30) + 1
        if cur_sign == self.sign:
            degree = lon - (cur_sign - 1) * 30
            # Score by how settled in the sign (penalize the last
            # degree, where the planet is about to ingress out).
            score = 1.0 if 1.0 < degree < 29.0 else 0.7
            return ConstraintResult(
                passes=True,
                score=score,
                reason=f"{self.planet.value.capitalize()} at {degree:.1f}° {SIGNS[cur_sign]}.",
            )
        return ConstraintResult(
            passes=False,
            score=0.0,
            reason=f"{self.planet.value.capitalize()} in {SIGNS[cur_sign]}, not {SIGNS[self.sign]}.",
        )


@dataclass(frozen=True, slots=True)
class MoonSignConstraint(Constraint):
    """Convenience wrapper for the Moon-in-sign case (the most common)."""

    sign: int
    weight: float = 1.0

    @property
    def description(self) -> str:
        return f"Moon in {SIGNS[self.sign]}"

    def evaluate(
        self, instant: datetime, latitude: float, longitude: float,
    ) -> ConstraintResult:
        return PlanetSignConstraint(Planet.MOON, self.sign, self.weight).evaluate(
            instant, latitude, longitude,
        )


# ────────────────────────────────────────────────────────────────────────
# Moon phase
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class MoonPhaseConstraint(Constraint):
    """Require the Moon to be within a given phase-angle window.

    `min_angle` and `max_angle` are in degrees, 0 = new moon,
    180 = full moon, 360 = back to new. Wraps cleanly.
    """

    min_angle: float
    max_angle: float
    weight: float = 1.0

    @property
    def description(self) -> str:
        return f"Moon phase angle in [{self.min_angle:.0f}°, {self.max_angle:.0f}°]"

    def evaluate(
        self, instant: datetime, latitude: float, longitude: float,
    ) -> ConstraintResult:
        jd = _to_jd(instant)
        sun_lon = _body_longitude(jd, swe.SUN)
        moon_lon = _body_longitude(jd, swe.MOON)
        angle = (moon_lon - sun_lon) % 360
        if self.min_angle <= self.max_angle:
            passes = self.min_angle <= angle <= self.max_angle
        else:
            # Wrap window (e.g. [350°, 10°]).
            passes = angle >= self.min_angle or angle <= self.max_angle
        if passes:
            return ConstraintResult(
                passes=True,
                score=1.0,
                reason=f"Moon phase angle {angle:.0f}° (waxing/full as required).",
            )
        return ConstraintResult(
            passes=False,
            score=0.0,
            reason=f"Moon phase angle {angle:.0f}° outside required window.",
        )


# ────────────────────────────────────────────────────────────────────────
# Aspect requirement
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class AspectConstraint(Constraint):
    """Require two planets to be in a specific Ptolemaic aspect.

    `max_orb` is the maximum allowed orb in degrees. Score scales
    linearly from 1.0 at exact to 0.0 at max-orb.
    """

    body_a: Planet
    body_b: Planet
    kind: AspectKind
    max_orb: float = 6.0
    weight: float = 1.0

    @property
    def description(self) -> str:
        return f"{self.body_a.value.capitalize()} {self.kind.value} {self.body_b.value.capitalize()}"

    def evaluate(
        self, instant: datetime, latitude: float, longitude: float,
    ) -> ConstraintResult:
        jd = _to_jd(instant)
        lon_a = _body_longitude(jd, _PLANET_TO_SWE[self.body_a])
        lon_b = _body_longitude(jd, _PLANET_TO_SWE[self.body_b])
        aspects = detect_aspects(
            {self.body_a.value: lon_a, self.body_b.value: lon_b},
            orbs={self.kind: self.max_orb},
        )
        match = next(
            (a for a in aspects if a.kind == self.kind),
            None,
        )
        if match is not None:
            score = 1.0 - (match.orb / self.max_orb)
            return ConstraintResult(
                passes=True,
                score=score,
                reason=(
                    f"{self.body_a.value.capitalize()} "
                    f"{self.kind.value} {self.body_b.value.capitalize()} "
                    f"(orb {match.orb:.2f}°)."
                ),
            )
        return ConstraintResult(
            passes=False,
            score=0.0,
            reason=(
                f"No {self.kind.value} between {self.body_a.value} and "
                f"{self.body_b.value} within {self.max_orb}° orb."
            ),
        )
