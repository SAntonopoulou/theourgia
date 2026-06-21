"""Divination engines (Phase 06).

Each system ships a ``*Cast(seed, ...)`` function that deterministically
produces a reading from a seed string. Same seed + same deck/spread +
same input = same result, which is what makes readings auditable and
testable.

Subpackages:

- :mod:`theourgia.core.divination.tarot` — Tarot shuffle + draw +
  interpretation skeleton.

Phase 06 follow-up batches add: I Ching, Geomancy, Runes, Pendulum,
Bibliomancy, Horary (composes Phase 03), Scrying.
"""

from __future__ import annotations

__all__: list[str] = []
