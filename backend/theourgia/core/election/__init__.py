"""Election finder — find a magickally favorable time for a working.

An *election* is the practice of choosing the most favorable moment
for a magickal or worldly act based on astrological conditions:
"consecrate a Venus talisman when Venus is dignified, in a friendly
aspect to Jupiter, in her own day and hour, the Moon waxing in a
fertile sign, and out of via combusta."

The finder takes a list of :class:`Constraint`, a time window, and a
location, then grid-searches the ephemeris and ranks windows by
total score. Three pre-built queries ship with the substrate; the
plugin SDK exposes the constraint primitives so a practitioner can
define their own.

Multi-tradition: the same constraint engine, with different
*scorers* (or rather different constraints) implements modern
symbolic, Hellenistic essential-dignity, and Vedic strength-based
electional logic. The first cut ships modern symbolic; Hellenistic
+ Vedic land as plugin scoring functions in a follow-up.
"""

from theourgia.core.election.constraints import (
    AspectConstraint,
    Constraint,
    ConstraintResult,
    MoonPhaseConstraint,
    MoonSignConstraint,
    PlanetaryHourConstraint,
    PlanetSignConstraint,
)
from theourgia.core.election.finder import (
    Election,
    ElectionRequest,
    PreBuiltQueries,
    find_election,
)

__all__ = [
    "AspectConstraint",
    "Constraint",
    "ConstraintResult",
    "Election",
    "ElectionRequest",
    "MoonPhaseConstraint",
    "MoonSignConstraint",
    "PlanetaryHourConstraint",
    "PlanetSignConstraint",
    "PreBuiltQueries",
    "find_election",
]
