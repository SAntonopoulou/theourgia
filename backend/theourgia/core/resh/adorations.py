"""Liber Resh — computation + adoration registry.

Pure-data this batch. The journal integration lands when Phase 04
wires the entry persistence model.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date as date_cls, datetime, timedelta
from enum import Enum

from theourgia.core.astro.sun_times import compute_sun_times

__all__ = [
    "Adoration",
    "AdorationLog",
    "DailyTransitions",
    "Transition",
    "adoration_for_transition",
    "compute_transitions",
    "streak_at_date",
]


class Transition(str, Enum):
    SUNRISE = "sunrise"
    NOON = "noon"
    SUNSET = "sunset"
    MIDNIGHT = "midnight"


@dataclass(frozen=True, slots=True)
class Adoration:
    """One of the four canonical adorations.

    The text is intentionally minimal in this module — full liturgy
    belongs in the user's chosen prayer book / `Liber CC` plugin.
    The fields here are what the substrate needs to drive
    notifications + log entries.
    """

    transition: Transition
    godform: str  # "Ra Hoor Khuit", "Hadit", "Tum", "Khephra"
    direction: str  # "East", "Centre", "West", "Below"
    short_invocation: str  # opening line of the adoration


_CANONICAL_ADORATIONS: dict[Transition, Adoration] = {
    Transition.SUNRISE: Adoration(
        transition=Transition.SUNRISE,
        godform="Ra Hoor Khuit",
        direction="East",
        short_invocation="Hail unto Thee who art Ra in Thy rising, even unto Thee who art Ra in Thy strength.",
    ),
    Transition.NOON: Adoration(
        transition=Transition.NOON,
        godform="Hadit",
        direction="Centre",
        short_invocation="Hail unto Thee who art Ahathoor in Thy triumphing, even unto Thee who art Ahathoor in Thy beauty.",
    ),
    Transition.SUNSET: Adoration(
        transition=Transition.SUNSET,
        godform="Tum",
        direction="West",
        short_invocation="Hail unto Thee who art Tum in Thy setting, even unto Thee who art Tum in Thy joy.",
    ),
    Transition.MIDNIGHT: Adoration(
        transition=Transition.MIDNIGHT,
        godform="Khephra",
        direction="Below",
        short_invocation="Hail unto Thee who art Khephra in Thy hiding, even unto Thee who art Khephra in Thy silence.",
    ),
}


def adoration_for_transition(transition: Transition) -> Adoration:
    """The canonical Thelemic adoration for a given transition."""
    return _CANONICAL_ADORATIONS[transition]


@dataclass(frozen=True, slots=True)
class DailyTransitions:
    """The four solar transition instants for one civil date + location."""

    civil_date: date_cls
    sunrise: datetime | None
    noon: datetime
    sunset: datetime | None
    midnight: datetime

    def as_pairs(self) -> list[tuple[Transition, datetime]]:
        """Return (transition, instant) pairs in chronological order,
        dropping any transition that's None (polar fallback).
        """
        pairs: list[tuple[Transition, datetime]] = []
        if self.sunrise is not None:
            pairs.append((Transition.SUNRISE, self.sunrise))
        pairs.append((Transition.NOON, self.noon))
        if self.sunset is not None:
            pairs.append((Transition.SUNSET, self.sunset))
        pairs.append((Transition.MIDNIGHT, self.midnight))
        pairs.sort(key=lambda p: p[1])
        return pairs


def compute_transitions(
    civil_date: date_cls, latitude: float, longitude: float,
) -> DailyTransitions:
    """The four solar transitions for the given civil date + location."""
    instant = datetime(civil_date.year, civil_date.month, civil_date.day, 12, tzinfo=UTC)
    times = compute_sun_times(instant, latitude, longitude)
    return DailyTransitions(
        civil_date=civil_date,
        sunrise=times.sunrise,
        noon=times.solar_noon,
        sunset=times.sunset,
        midnight=times.solar_midnight,
    )


# ────────────────────────────────────────────────────────────────────────
# Adoration log + streaks
# ────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class AdorationLog:
    """One entry in the practitioner's Liber Resh log.

    Phase 04 wires this into the journal persistence model; for now
    this is the data shape so the substrate can compose with both
    in-memory test cases and a real backing store.
    """

    civil_date: date_cls
    transition: Transition
    observed_at: datetime  # when the adoration was actually performed
    note: str = ""  # optional reflection


def streak_at_date(
    log: list[AdorationLog],
    target_date: date_cls,
) -> int:
    """How many consecutive days ending at ``target_date`` have all
    four adorations been performed?

    The streak resets on the first day with fewer than four. For days
    where the Sun never rises/sets (polar fallback), only NOON +
    MIDNIGHT are required.
    """
    by_date: dict[date_cls, set[Transition]] = {}
    for entry in log:
        by_date.setdefault(entry.civil_date, set()).add(entry.transition)

    streak = 0
    d = target_date
    while True:
        transitions = by_date.get(d, set())
        # If we don't have all four for this day, streak ends.
        if not {Transition.SUNRISE, Transition.NOON, Transition.SUNSET, Transition.MIDNIGHT} <= transitions:
            # Allow polar-fallback days: noon + midnight is enough.
            # (Sunrise + sunset are None on those days; the user can
            # still observe the meridian transitions.)
            polar_fallback = {Transition.NOON, Transition.MIDNIGHT} <= transitions and (
                Transition.SUNRISE not in transitions and Transition.SUNSET not in transitions
            )
            if not polar_fallback:
                break
        streak += 1
        d = d - timedelta(days=1)
    return streak
