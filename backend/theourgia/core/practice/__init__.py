"""Practice-domain catalogs.

Phase 06 §§11-13 supporting data:

- :mod:`paths` — 22 Tree of Life paths with Hebrew letter, Tarot
  card, planet, color, name across the major traditions.
"""

from __future__ import annotations

from theourgia.core.practice.paths import (
    TREE_PATHS,
    TreeOfLifePath,
    TreeTradition,
    paths_for_tradition,
)

__all__ = [
    "TREE_PATHS",
    "TreeOfLifePath",
    "TreeTradition",
    "paths_for_tradition",
]
