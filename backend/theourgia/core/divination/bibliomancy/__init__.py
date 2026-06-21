"""Bibliomancy engine — pick a random passage from a text.

Public surface:

- :class:`PassageKind` — granularity of selection: ``line`` /
  ``sentence`` / ``paragraph``.
- :class:`Passage` — the result: text + start offset within the
  source.
- :func:`bibliomancy_cast` — deterministic selection from a source
  text given a seed.

The engine never touches the database — callers pass the source
text in directly. The API router loads it from a Book / Quote /
inline string and hands it over.
"""

from __future__ import annotations

from theourgia.core.divination.bibliomancy.engine import (
    Passage,
    PassageKind,
    bibliomancy_cast,
    split_text,
)

__all__ = [
    "Passage",
    "PassageKind",
    "bibliomancy_cast",
    "split_text",
]
