"""Geomancy engine.

Public surface:

- :class:`Figure` — one of the 16 figures, encoded as a four-line
  pattern (top-down). Each line is "single" (one dot) or "double"
  (two dots).
- :class:`Chart` — the full shield reading: four mothers + four
  daughters + four nieces + two witnesses + judge + reconciler,
  plus the twelve-house mapping.
- :func:`geomancy_cast` — deterministic cast from a seed.
- :func:`figure_for_pattern` / :func:`figure_by_name` — lookups.
- :func:`combine` — line-by-line geomantic addition (single + single
  = double, etc.) used to derive every non-mother figure.

The engine is pure: same seed = same 16 mother bits = same shield.
"""

from __future__ import annotations

from theourgia.core.divination.geomancy.engine import (
    Chart,
    Figure,
    FigureName,
    HouseAssignment,
    combine,
    figure_by_name,
    figure_for_pattern,
    geomancy_cast,
)

__all__ = [
    "Chart",
    "Figure",
    "FigureName",
    "HouseAssignment",
    "combine",
    "figure_by_name",
    "figure_for_pattern",
    "geomancy_cast",
]
