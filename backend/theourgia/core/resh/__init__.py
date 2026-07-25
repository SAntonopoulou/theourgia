"""The four-station daily rite (né Liber Resh vel Helios).

Four adorations at the four solar transitions of the day — sunrise,
solar noon, sunset, solar midnight. Which deity is honored at each
station is a per-user preset:

* **hellenic** (default — the operator's practice):
  Dawn — Hekate Phosphoros (the Return) · Noon — Apollo (the Good /
  the Augoeides) · Dusk — Hekate Enodia, Kleidouchos (the Descent) ·
  Night — Persephone (the Journey).
* **thelemic** — Crowley's *Liber Resh vel Helios* (*Liber CC*):
  Ra Hoor Khuit · Hadit/Ahathoor · Tum · Khephra.

This module provides the computational substrate:

* Compute the four daily transitions for a user's location.
* Track which adorations a user has performed.
* Streak calculation under the minimum-viable-station rule: one
  configurable anchor station (default: dusk) counts the day; the
  others are kept or not without penalty.
* Preset registry — the two shipped presets; a plugin can register
  alternates (e.g. Egyptian-revivalist or Gnostic-Christian frames).

The journaling integration (each adoration creates a journal entry)
lands in Phase 04 once the journal schema is real. For now this
module exposes the data shapes and the computation.
"""

from theourgia.core.resh.adorations import (
    DEFAULT_MINIMUM_VIABLE_STATION,
    DEFAULT_MODE,
    DEFAULT_PRESET,
    PRESETS,
    Adoration,
    AdorationLog,
    DailyTransitions,
    Invocation,
    Transition,
    adoration_for_transition,
    compute_transitions,
    invocation_for_mode,
    invocation_forms,
    station_for_transition,
    stations_for_preset,
    streak_at_date,
)
from theourgia.core.resh.user_config import (
    MIN_STATION_KEY,
    PRESET_KEY,
    STATIONS_KEY,
    ResolvedRiteConfig,
    apply_station_overrides,
    resolve_rite_config,
)

__all__ = [
    "Adoration",
    "AdorationLog",
    "DEFAULT_MINIMUM_VIABLE_STATION",
    "DEFAULT_MODE",
    "DEFAULT_PRESET",
    "DailyTransitions",
    "Invocation",
    "MIN_STATION_KEY",
    "PRESET_KEY",
    "PRESETS",
    "ResolvedRiteConfig",
    "STATIONS_KEY",
    "Transition",
    "adoration_for_transition",
    "apply_station_overrides",
    "compute_transitions",
    "invocation_for_mode",
    "invocation_forms",
    "resolve_rite_config",
    "station_for_transition",
    "stations_for_preset",
    "streak_at_date",
]
