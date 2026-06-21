"""Tarot engine.

Public surface:

- :class:`DrawnCard` — one card in a reading (position in deck +
  orientation).
- :func:`tarot_cast` — deterministic draw from a deck for a spread,
  given a seed.
- :func:`make_seed` — derive a seed string from human inputs
  (timestamp / question / user-supplied label) for the
  ``hash_of_question`` draw method.
- :func:`shuffle_deck` / :func:`draw_cards` — lower-level primitives
  for tests / callers that want fine-grained control.

The engine is pure: it never reads from the DB. Callers provide the
deck size + spread position count; the persistence layer translates
between :class:`DrawnCard` results and the Reading row's
``drawn_cards`` JSONB.
"""

from __future__ import annotations

from theourgia.core.divination.tarot.engine import (
    DrawnCard,
    draw_cards,
    make_seed,
    shuffle_deck,
    tarot_cast,
)

__all__ = [
    "DrawnCard",
    "draw_cards",
    "make_seed",
    "shuffle_deck",
    "tarot_cast",
]
