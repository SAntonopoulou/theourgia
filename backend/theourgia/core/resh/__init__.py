"""Liber Resh vel Helios — four daily solar adorations.

Crowley's *Liber Resh vel Helios* (*Liber CC*) prescribes four
adorations of the Sun in his appropriate godform at the four solar
transitions of the day:

* **Sunrise** — Ra Hoor Khuit (the Sun in the East, ascending).
* **Solar noon** — Hadit (the Sun overhead, the point in the center).
* **Sunset** — Tum (the Sun in the West, setting).
* **Solar midnight** — Khephra (the Sun in the under-world, beneath).

This module provides the computational substrate:

* Compute the four daily transitions for a user's location.
* Track which adorations a user has performed.
* Streak calculation (consecutive days with all four observed).
* Tradition variants — the canonical Thelemic forms ship; a plugin
  can register alternate adorations (e.g. the Liber Resh setting in
  Egyptian-revivalist or Gnostic-Christian frames).

The journaling integration (each adoration creates a journal entry)
lands in Phase 04 once the journal schema is real. For now this
module exposes the data shapes and the computation.
"""

from theourgia.core.resh.adorations import (
    Adoration,
    AdorationLog,
    DailyTransitions,
    Transition,
    adoration_for_transition,
    compute_transitions,
    streak_at_date,
)

__all__ = [
    "Adoration",
    "AdorationLog",
    "DailyTransitions",
    "Transition",
    "adoration_for_transition",
    "compute_transitions",
    "streak_at_date",
]
