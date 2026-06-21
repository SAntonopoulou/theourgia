"""Deterministic rune draw engine.

The runes share the Tarot draw shape: shuffle the set with a seeded
RNG, take the first N runes off the top, optionally flip each for
reversal. The set is small (24 for Elder Futhark, 16 for Younger,
etc.) so there's no need for fancier sampling.

Orientation is more nuanced than Tarot. Some runes are
**reversible** (read upside-down they have a distinct second
meaning — e.g. Fehu / Uruz / Thurisaz). Others are **symmetric**
(Isa / Hagalaz / etc. look identical upside down — they can't be
reversed in the visual sense). The engine flags symmetric runes via
their ``reversible`` field; orientation for those is forced to
``upright`` regardless of the RNG roll. A third orientation,
**merkstave** ("dark stave"), is sometimes used for runes drawn
upright but in a difficult position — that's a per-spread reading
concern, not an engine concern.
"""

from __future__ import annotations

import enum
import hashlib
import random
from dataclasses import dataclass

__all__ = [
    "DrawnRune",
    "RuneOrientation",
    "RuneSet",
    "draw_runes",
    "runes_cast",
    "shuffle_runes",
]


class RuneSet(str, enum.Enum):
    """Which runic alphabet."""

    ELDER_FUTHARK = "elder_futhark"
    YOUNGER_FUTHARK = "younger_futhark"
    ANGLO_SAXON_FUTHORC = "anglo_saxon_futhorc"
    ARMANEN = "armanen"
    NORTHUMBRIAN = "northumbrian"


class RuneOrientation(str, enum.Enum):
    """How a drawn rune sat in the spread."""

    UPRIGHT = "upright"
    REVERSED = "reversed"


@dataclass(frozen=True, slots=True)
class DrawnRune:
    """One rune drawn at a specific spread position."""

    position_index: int
    """0-based index in the spread."""

    rune_index: int
    """0-based index of the rune within the chosen set."""

    orientation: RuneOrientation
    """Upright / reversed. Forced to upright when the rune is symmetric."""


def _seeded_random(seed: str) -> random.Random:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    seed_int = int.from_bytes(digest[:8], "big", signed=False)
    return random.Random(seed_int)


def shuffle_runes(set_size: int, seed: str) -> list[int]:
    """Deterministic shuffle of indices 0..set_size-1."""
    if set_size <= 0:
        raise ValueError(f"set_size must be positive, got {set_size}")
    indices = list(range(set_size))
    rng = _seeded_random(seed)
    rng.shuffle(indices)
    return indices


def draw_runes(
    set_size: int,
    position_count: int,
    seed: str,
    *,
    reversible_flags: tuple[bool, ...] | None = None,
    allow_reversals: bool = True,
) -> list[DrawnRune]:
    """Draw ``position_count`` runes from a set of ``set_size`` runes.

    ``reversible_flags`` aligns with the set order: ``reversible_flags[i]``
    is ``True`` iff rune at index ``i`` has a meaningful reversed
    reading. When ``None``, every rune is assumed reversible. When
    ``allow_reversals=False``, every drawn rune is upright regardless
    of the per-rune flag.
    """
    if position_count <= 0:
        raise ValueError(f"position_count must be positive, got {position_count}")
    if position_count > set_size:
        raise ValueError(
            f"cannot draw {position_count} runes from a {set_size}-rune set"
        )
    if reversible_flags is not None and len(reversible_flags) != set_size:
        raise ValueError(
            f"reversible_flags has length {len(reversible_flags)}; expected {set_size}",
        )

    rng = _seeded_random(seed)
    indices = list(range(set_size))
    rng.shuffle(indices)

    out: list[DrawnRune] = []
    for i in range(position_count):
        rune_idx = indices[i]
        if not allow_reversals:
            orientation = RuneOrientation.UPRIGHT
        elif reversible_flags is not None and not reversible_flags[rune_idx]:
            # Symmetric rune; can't be flipped visually.
            orientation = RuneOrientation.UPRIGHT
        else:
            orientation = (
                RuneOrientation.REVERSED if rng.random() < 0.5 else RuneOrientation.UPRIGHT
            )
        out.append(
            DrawnRune(
                position_index=i,
                rune_index=rune_idx,
                orientation=orientation,
            )
        )
    return out


def runes_cast(
    *,
    set_size: int,
    position_count: int,
    seed: str,
    reversible_flags: tuple[bool, ...] | None = None,
    allow_reversals: bool = True,
) -> list[DrawnRune]:
    """High-level entry point. Thin wrapper over :func:`draw_runes`."""
    return draw_runes(
        set_size=set_size,
        position_count=position_count,
        seed=seed,
        reversible_flags=reversible_flags,
        allow_reversals=allow_reversals,
    )
