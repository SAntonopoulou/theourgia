"""Runes engine.

Public surface:

- :class:`RuneSet` — Elder Futhark / Younger Futhark / Anglo-Saxon
  Futhorc / Armanen / Northumbrian. Each set has its own rune list;
  the engine treats them identically — a "deck" of N runes.
- :class:`DrawnRune` — one drawn rune in a reading: index into the
  set, orientation (upright / reversed / merkstave for non-reversible
  symmetric runes).
- :func:`runes_cast` — deterministic draw from a rune set for a
  spread, given a seed.
"""

from __future__ import annotations

from theourgia.core.divination.runes.engine import (
    DrawnRune,
    RuneOrientation,
    RuneSet,
    draw_runes,
    runes_cast,
    shuffle_runes,
)

__all__ = [
    "DrawnRune",
    "RuneOrientation",
    "RuneSet",
    "draw_runes",
    "runes_cast",
    "shuffle_runes",
]
