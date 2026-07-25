"""The four-station daily rite — computation + station registry.

Historically shipped as Liber Resh (the Thelemic solar adorations);
generalized into a configurable four-station daily rite. The four
solar *transitions* (sunrise / noon / sunset / midnight) are the
structural skeleton; the *stations* — which deity is honored at each
transition, with what invocation — come from a preset:

* ``"hellenic"`` (the default preset) — the operator's set: Hekate
  Phosphoros at dawn, Apollo at noon, Hekate Enodia Kleidouchos at
  dusk, Persephone at night.
* ``"thelemic"`` — the classical Liber Resh godforms (Ra, Ahathoor,
  Tum, Khephra).

Streaks follow the *minimum-viable-station* rule: one station of the
four (default: dusk) anchors the practice; the streak counts any day
that station is observed, and the other three are kept or not
without penalty.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date as date_cls, datetime, timedelta
from enum import Enum

from theourgia.core.astro.sun_times import compute_sun_times

__all__ = [
    "Adoration",
    "AdorationLog",
    "DEFAULT_MINIMUM_VIABLE_STATION",
    "DEFAULT_PRESET",
    "DailyTransitions",
    "PRESETS",
    "Transition",
    "adoration_for_transition",
    "compute_transitions",
    "station_for_transition",
    "stations_for_preset",
    "streak_at_date",
]


class Transition(str, Enum):
    SUNRISE = "sunrise"
    NOON = "noon"
    SUNSET = "sunset"
    MIDNIGHT = "midnight"


@dataclass(frozen=True, slots=True)
class Adoration:
    """One of the four stations of the daily rite.

    The text is intentionally minimal in this module — full liturgy
    belongs in the user's chosen prayer book / `Liber CC` plugin.
    The fields here are what the substrate needs to drive
    notifications + log entries.
    """

    transition: Transition
    godform: str  # "Hekate Phosphoros — the Return", "Ra Hoor Khuit", …
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


_HELLENIC_ADORATIONS: dict[Transition, Adoration] = {
    Transition.SUNRISE: Adoration(
        transition=Transition.SUNRISE,
        godform="Hekate Phosphoros — the Return",
        direction="East",
        short_invocation=(
            "Hail Hekate Phosphoros, torch-bearer, who leads the soul "
            "back into the light."
        ),
    ),
    Transition.NOON: Adoration(
        transition=Transition.NOON,
        godform="Apollo — the Good / the Augoeides",
        direction="Centre",
        short_invocation=(
            "Hail Apollo, the Good, the shining Augoeides at the "
            "height of day."
        ),
    ),
    Transition.SUNSET: Adoration(
        transition=Transition.SUNSET,
        godform="Hekate Enodia, Kleidouchos — the Descent",
        direction="West",
        short_invocation=(
            "Hail Hekate Enodia, Kleidouchos, keeper of the keys at "
            "the road's turning; guide the descent."
        ),
    ),
    Transition.MIDNIGHT: Adoration(
        transition=Transition.MIDNIGHT,
        godform="Persephone — the Journey",
        direction="Below",
        short_invocation=(
            "Hail Persephone, queen below, companion of the journey "
            "through the dark."
        ),
    ),
}


# Named presets. ``"hellenic"`` ships as the default (the operator's
# practice); ``"thelemic"`` remains available for Liber Resh proper.
PRESETS: dict[str, dict[Transition, Adoration]] = {
    "hellenic": _HELLENIC_ADORATIONS,
    "thelemic": _CANONICAL_ADORATIONS,
}

DEFAULT_PRESET = "hellenic"

# The streak-anchoring station (see :func:`streak_at_date`).
DEFAULT_MINIMUM_VIABLE_STATION = Transition.SUNSET


def adoration_for_transition(transition: Transition) -> Adoration:
    """The canonical Thelemic adoration for a given transition.

    Kept for the Thelemic preset + backward compatibility; preset-aware
    callers use :func:`station_for_transition`.
    """
    return _CANONICAL_ADORATIONS[transition]


def stations_for_preset(preset: str = DEFAULT_PRESET) -> dict[Transition, Adoration]:
    """The four stations of a named preset. ``KeyError`` if unknown."""
    if preset not in PRESETS:
        raise KeyError(
            f"No rite preset named {preset!r}. Known: {sorted(PRESETS)}."
        )
    return dict(PRESETS[preset])


def station_for_transition(
    transition: Transition, *, preset: str = DEFAULT_PRESET,
) -> Adoration:
    """The station a given preset assigns to a transition."""
    return stations_for_preset(preset)[transition]


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
    *,
    minimum_viable_station: Transition = DEFAULT_MINIMUM_VIABLE_STATION,
) -> int:
    """How many consecutive days ending at ``target_date`` was the
    minimum-viable station observed?

    The minimum-viable-station rule: one of the four stations
    (default: dusk / sunset) anchors the practice. A day counts
    toward the streak when THAT station was observed; the other three
    are kept or not without penalty. The streak resets on the first
    day the anchor station is missing.

    Polar fallback: when the anchor is sunrise or sunset and the day
    has neither horizon observation (the Sun never rose/set — those
    transitions don't exist that day), observing NOON + MIDNIGHT
    keeps the streak.
    """
    by_date: dict[date_cls, set[Transition]] = {}
    for entry in log:
        by_date.setdefault(entry.civil_date, set()).add(entry.transition)

    horizon_anchor = minimum_viable_station in (
        Transition.SUNRISE, Transition.SUNSET,
    )

    streak = 0
    d = target_date
    while True:
        transitions = by_date.get(d, set())
        if minimum_viable_station not in transitions:
            # Polar-fallback days: no horizon transitions exist, so a
            # horizon anchor can't be observed — noon + midnight (the
            # meridian pair) is enough.
            polar_fallback = (
                horizon_anchor
                and {Transition.NOON, Transition.MIDNIGHT} <= transitions
                and Transition.SUNRISE not in transitions
                and Transition.SUNSET not in transitions
            )
            if not polar_fallback:
                break
        streak += 1
        d = d - timedelta(days=1)
    return streak
