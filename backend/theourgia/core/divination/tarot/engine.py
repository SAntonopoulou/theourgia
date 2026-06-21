"""Deterministic Tarot draw engine.

Same seed + same deck size + same spread positions = same drawn
cards, every time. The engine never imports models — it operates on
card positions (ints) — so it tests in isolation and can serve any
deck shape (78-card RWS, 56-card Marseille-minus-majors, 22-card
majors-only oracle, custom).

The randomness primitive is Python's :class:`random.Random` seeded
from a SHA-256 hash of the input seed string. This gives us:

* Stable seeds across Python builds (the underlying Mersenne
  Twister + the hash digest are both well-defined).
* Enough entropy to feel non-trivial without committing to a
  CSPRNG (this is divination, not key material — but it must be
  reproducible).

Reversal handling: when the deck's ``reversal_convention`` is on,
each card has an independent 50% chance of being reversed. The
``orientation_bias`` parameter is reserved for traditions that
weight reversed cards differently; the default mirrors traditional
RWS convention.
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from typing import Final

__all__ = [
    "DrawnCard",
    "draw_cards",
    "make_seed",
    "shuffle_deck",
    "tarot_cast",
]


REVERSAL_THRESHOLD: Final[float] = 0.5


@dataclass(frozen=True, slots=True)
class DrawnCard:
    """One drawn card in a reading."""

    position_index: int
    """Which spread position this card filled (0-based)."""

    card_position: int
    """The card's position within the deck (0-based)."""

    reversed: bool
    """Whether the card was drawn reversed."""


def make_seed(*parts: str) -> str:
    """Combine free-text parts into a stable seed string.

    Concatenates with a tab separator (won't collide with normal
    question text) and SHA-256 hashes the result. The hex digest is
    the seed downstream callers pass to :func:`tarot_cast`.

    >>> make_seed("2026-06-21T18:00:00Z", "Should I take the offer?")
    '...'  # 64-char hex digest

    The same inputs always produce the same seed; the engine then
    produces the same cards from that seed. This is what makes the
    ``hash_of_question`` draw method reproducible.
    """
    joined = "\t".join(parts).encode("utf-8")
    return hashlib.sha256(joined).hexdigest()


def _seeded_random(seed: str) -> random.Random:
    """Build a :class:`random.Random` from a seed string.

    Hashing to bytes first ensures the RNG state is broadcast across
    the full hash space rather than just the integer interpretation
    of the hex string.
    """
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    # The 64-bit seed is enough for Python's MT19937 to be reachable
    # from any of its states; we don't need the full 32-byte digest.
    seed_int = int.from_bytes(digest[:8], "big", signed=False)
    return random.Random(seed_int)


def shuffle_deck(deck_size: int, seed: str) -> list[int]:
    """Return a deterministic shuffle of card positions 0..deck_size-1.

    Equivalent to :meth:`random.Random.shuffle` with a seeded RNG —
    the same seed always produces the same permutation.
    """
    if deck_size <= 0:
        raise ValueError(f"deck_size must be positive, got {deck_size}")
    positions = list(range(deck_size))
    rng = _seeded_random(seed)
    rng.shuffle(positions)
    return positions


def draw_cards(
    deck_size: int,
    position_count: int,
    seed: str,
    *,
    reversals: bool = True,
    orientation_bias: float = REVERSAL_THRESHOLD,
) -> list[DrawnCard]:
    """Draw ``position_count`` cards from a deck of ``deck_size`` cards.

    The engine shuffles the deck once with the seed and takes the
    first ``position_count`` cards off the top. Reversal flips are
    drawn from the same seeded RNG after the shuffle, so different
    seeds produce different reversals even with the same first card.

    Raises :class:`ValueError` if ``position_count`` exceeds
    ``deck_size`` (you can't draw 10 cards from a 5-card deck).
    """
    if position_count <= 0:
        raise ValueError(f"position_count must be positive, got {position_count}")
    if position_count > deck_size:
        raise ValueError(
            f"cannot draw {position_count} cards from a {deck_size}-card deck"
        )
    if not 0.0 <= orientation_bias <= 1.0:
        raise ValueError(
            f"orientation_bias must be in [0, 1], got {orientation_bias}"
        )

    rng = _seeded_random(seed)
    positions = list(range(deck_size))
    rng.shuffle(positions)

    out: list[DrawnCard] = []
    for i in range(position_count):
        card_pos = positions[i]
        is_reversed = reversals and rng.random() < orientation_bias
        out.append(
            DrawnCard(
                position_index=i,
                card_position=card_pos,
                reversed=is_reversed,
            )
        )
    return out


def tarot_cast(
    *,
    deck_size: int,
    position_count: int,
    seed: str,
    reversals: bool = True,
) -> list[DrawnCard]:
    """High-level entry point: cast a reading.

    Thin wrapper over :func:`draw_cards` so the public API has a
    name that matches the plan's ``*Cast(seed)`` vocabulary.
    """
    return draw_cards(
        deck_size=deck_size,
        position_count=position_count,
        seed=seed,
        reversals=reversals,
    )
