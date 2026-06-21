"""I Ching engine.

Public surface:

- :class:`LineKind` — one of four line types produced by a cast:
  ``old_yin`` (6, changing), ``young_yang`` (7, static),
  ``young_yin`` (8, static), ``old_yang`` (9, changing).
- :class:`CastResult` — the six lines, the primary hexagram number,
  the transformation hexagram number (if changing lines), and the
  list of changing-line indices.
- :func:`iching_cast` — deterministic cast given a seed and a method.
- :func:`cast_three_coins` / :func:`cast_yarrow_stalks` — primitives.
- :func:`hexagram_for_lines` — map a six-line pattern (bottom-up) to
  the King Wen hexagram number.

The engine is pure: same seed + same method = same hexagram, every
time. Text rendering is the bundle's job; the engine only deals in
lines and numbers.
"""

from __future__ import annotations

from theourgia.core.divination.iching.engine import (
    CastMethod,
    CastResult,
    LineKind,
    cast_three_coins,
    cast_yarrow_stalks,
    hexagram_for_lines,
    iching_cast,
    lines_for_hexagram,
)

__all__ = [
    "CastMethod",
    "CastResult",
    "LineKind",
    "cast_three_coins",
    "cast_yarrow_stalks",
    "hexagram_for_lines",
    "iching_cast",
    "lines_for_hexagram",
]
