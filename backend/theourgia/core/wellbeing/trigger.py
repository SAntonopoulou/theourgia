"""Crisis-aware nudge — trigger evaluation (pure logic).

Part of the opt-in wellbeing feature (plan/15-hardening-and-launch.md
§15; FEATURES §15 "crisis-aware nudge"). The feature is OFF by default
and every user-visible string belongs to the designer
(``frontend/shared/src/AccessibilityAndMotion/copy.ts`` and the
Wellbeing settings surface) — this module is server-side arithmetic
only and renders nothing.

Sustained-severe-distress rule
------------------------------

A *reading* is one mood scalar attributed to one calendar day. Mood is
recorded on journal entries as an integer on a 1..10 scale (see
``EntryCreate.mood`` / ``EntryUpdate.mood`` — ``ge=1, le=10`` — in
:mod:`theourgia.api.routers.v1.entries`); 1 is the lowest, most
distressed end of the scale.

Considering only readings from the last :data:`WINDOW_DAYS` (14) days,
the nudge triggers **only** when BOTH of these hold:

* readings exist on at least :data:`MIN_DISTINCT_DAYS` (3) distinct
  days, AND
* at least :data:`SEVERE_FRACTION` (60%) of the readings in the window
  sit at the severe end of the scale.

*Severe* means the bottom fifth of the scale, computed from the actual
scale bounds rather than hard-coded::

    mood <= MOOD_SCALE_MIN + (MOOD_SCALE_MAX - MOOD_SCALE_MIN) / 5

With the 1..10 scale that is ``mood <= 2.8`` — readings of 1 or 2.

Corollaries (both regression-tested in
``backend/tests/test_wellbeing_nudge.py``):

* Fewer than three days with mood data NEVER triggers, no matter how
  severe the readings are.
* A one-off severe reading NEVER triggers: alone it fails the
  distinct-days floor, and among healthier readings it is diluted
  below the 60% line.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Final

__all__ = [
    "MIN_DISTINCT_DAYS",
    "MOOD_SCALE_MAX",
    "MOOD_SCALE_MIN",
    "SEVERE_FRACTION",
    "SEVERE_MOOD_CEILING",
    "WINDOW_DAYS",
    "MoodReading",
    "evaluate_sustained_distress",
    "is_severe_mood",
]


# ── Scale bounds ─────────────────────────────────────────────────────
# Source of truth for the mood scale is the entries API contract
# (``EntryCreate.mood: Field(ge=1, le=10)``). A regression test
# cross-checks these constants against that schema so the two cannot
# drift apart silently.
MOOD_SCALE_MIN: Final[int] = 1
MOOD_SCALE_MAX: Final[int] = 10

#: "Severe" is the bottom fifth of the scale, from the actual bounds.
SEVERE_MOOD_CEILING: Final[float] = (
    MOOD_SCALE_MIN + (MOOD_SCALE_MAX - MOOD_SCALE_MIN) / 5
)

# ── Rule parameters ──────────────────────────────────────────────────
WINDOW_DAYS: Final[int] = 14
MIN_DISTINCT_DAYS: Final[int] = 3
SEVERE_FRACTION: Final[float] = 0.6


@dataclass(frozen=True, slots=True)
class MoodReading:
    """One mood scalar attributed to one calendar day."""

    day: date
    mood: int


def is_severe_mood(mood: int) -> bool:
    """True when ``mood`` sits in the bottom fifth of the scale."""
    return mood <= SEVERE_MOOD_CEILING


def evaluate_sustained_distress(
    readings: list[MoodReading] | tuple[MoodReading, ...],
    *,
    as_of: date,
) -> bool:
    """Apply the sustained-severe-distress rule (module docstring).

    Pure function: takes the readings list and the evaluation date,
    returns whether the nudge condition is met. Readings outside the
    trailing :data:`WINDOW_DAYS`-day window (or dated in the future)
    are ignored, so callers may pass an over-fetched list.
    """
    window_floor = as_of - timedelta(days=WINDOW_DAYS)
    window = [r for r in readings if window_floor < r.day <= as_of]
    if not window:
        return False

    distinct_days = {r.day for r in window}
    if len(distinct_days) < MIN_DISTINCT_DAYS:
        # Fewer than three data days never triggers.
        return False

    severe_count = sum(1 for r in window if is_severe_mood(r.mood))
    return severe_count / len(window) >= SEVERE_FRACTION
