"""Deterministic I Ching cast engine.

A *cast* produces six lines, bottom-up. Each line is one of:

* ``old_yin`` (value 6) — a yin line that **changes** to yang.
* ``young_yang`` (value 7) — a static yang line.
* ``young_yin`` (value 8) — a static yin line.
* ``old_yang`` (value 9) — a yang line that **changes** to yin.

Two casting methods, each with its canonical probability distribution:

**Three-coin method.** Three coins per line, each "heads" = 3, each
"tails" = 2 (or vice versa; the distribution is symmetric). The sum
is one of {6, 7, 8, 9} with probabilities {1/8, 3/8, 3/8, 1/8}.

**Yarrow stalk method.** The traditional 50-stalk division produces
a different distribution: {6, 7, 8, 9} with probabilities
{1/16, 5/16, 7/16, 3/16}. Static yin is the most common outcome; the
two changing lines together appear less often than under coins,
reflecting the tradition that "the yarrow is the harder oracle to
move."

The engine simulates the *outcome distribution* — it doesn't
literally manipulate 50 stalks — using the seeded RNG. Same seed +
same method = same six lines.

The resulting six lines determine the **primary hexagram** (read as
the six lines exactly drawn) and, if any lines are changing, the
**transformation hexagram** (the six lines after flipping every
changing line). Both numbers are returned. Some readings have only a
primary; readings with all-static lines have no transformation.
"""

from __future__ import annotations

import enum
import hashlib
import random
from dataclasses import dataclass
from typing import Final

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


class CastMethod(str, enum.Enum):
    """Which generation method to use for a cast."""

    THREE_COINS = "three_coins"
    YARROW_STALKS = "yarrow_stalks"


class LineKind(str, enum.Enum):
    """One of the four line outcomes."""

    OLD_YIN = "old_yin"  # 6 — changing yin → yang
    YOUNG_YANG = "young_yang"  # 7 — static yang
    YOUNG_YIN = "young_yin"  # 8 — static yin
    OLD_YANG = "old_yang"  # 9 — changing yang → yin

    @property
    def is_yang(self) -> bool:
        return self in {LineKind.YOUNG_YANG, LineKind.OLD_YANG}

    @property
    def is_changing(self) -> bool:
        return self in {LineKind.OLD_YIN, LineKind.OLD_YANG}

    @property
    def value_number(self) -> int:
        return {
            LineKind.OLD_YIN: 6,
            LineKind.YOUNG_YANG: 7,
            LineKind.YOUNG_YIN: 8,
            LineKind.OLD_YANG: 9,
        }[self]


@dataclass(frozen=True, slots=True)
class CastResult:
    """The outcome of a single cast."""

    lines: tuple[LineKind, LineKind, LineKind, LineKind, LineKind, LineKind]
    """Bottom-up — ``lines[0]`` is line 1 (bottom), ``lines[5]`` is line 6 (top)."""

    primary_hexagram: int
    """King Wen number (1-64) of the hexagram exactly drawn."""

    transformation_hexagram: int | None
    """King Wen number of the hexagram after changing lines flip,
    or ``None`` if no lines changed."""

    changing_lines: tuple[int, ...]
    """Indices (1-based, bottom-up) of changing lines. Empty when no
    transformation; convention puts these lines in numerical order."""

    method: CastMethod
    """Which generation method produced this cast."""


# ───── Probability distributions ──────────────────────────────────────


# Each entry is (cumulative_threshold, line_kind). The seeded RNG draws
# a float in [0, 1) and we walk this list to find the first threshold
# the draw is less than.
_COIN_DISTRIBUTION: Final[tuple[tuple[float, LineKind], ...]] = (
    (1 / 8, LineKind.OLD_YIN),         # P=1/8
    (1 / 8 + 3 / 8, LineKind.YOUNG_YANG),  # +3/8 = 1/2
    (1 / 8 + 3 / 8 + 3 / 8, LineKind.YOUNG_YIN),  # +3/8 = 7/8
    (1.0, LineKind.OLD_YANG),          # +1/8 = 1
)

_YARROW_DISTRIBUTION: Final[tuple[tuple[float, LineKind], ...]] = (
    (1 / 16, LineKind.OLD_YIN),                # P=1/16
    (1 / 16 + 5 / 16, LineKind.YOUNG_YANG),    # +5/16 = 6/16
    (1 / 16 + 5 / 16 + 7 / 16, LineKind.YOUNG_YIN),  # +7/16 = 13/16
    (1.0, LineKind.OLD_YANG),                  # +3/16 = 1
)


def _draw_line(rng: random.Random, distribution: tuple[tuple[float, LineKind], ...]) -> LineKind:
    """Walk the cumulative table; return the line whose interval the
    draw falls in."""
    x = rng.random()
    for threshold, kind in distribution:
        if x < threshold:
            return kind
    return distribution[-1][1]  # defensive; shouldn't reach


def _seeded_random(seed: str) -> random.Random:
    """Same primitive as the Tarot engine — SHA-256 → 64-bit int → RNG."""
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    seed_int = int.from_bytes(digest[:8], "big", signed=False)
    return random.Random(seed_int)


# ───── Cast primitives ────────────────────────────────────────────────


def cast_three_coins(seed: str) -> tuple[LineKind, ...]:
    """Six-line cast using the three-coin probability table."""
    rng = _seeded_random(seed)
    return tuple(_draw_line(rng, _COIN_DISTRIBUTION) for _ in range(6))


def cast_yarrow_stalks(seed: str) -> tuple[LineKind, ...]:
    """Six-line cast using the yarrow-stalk probability table."""
    rng = _seeded_random(seed)
    return tuple(_draw_line(rng, _YARROW_DISTRIBUTION) for _ in range(6))


# ───── King Wen hexagram lookup ──────────────────────────────────────


# Bottom-up binary representation → King Wen number. Each line is 1
# for yang, 0 for yin; line 1 (bottom) is the least-significant bit
# in the string but the leftmost in our tuple ordering. We build a
# tuple-keyed lookup table for cleanest call-sites.
_KING_WEN_BINARY: Final[tuple[str, ...]] = (
    "111111",  # 1  Qián — the Creative
    "000000",  # 2  Kūn — the Receptive
    "100010",  # 3  Zhūn — Difficulty at the Beginning
    "010001",  # 4  Méng — Youthful Folly
    "111010",  # 5  Xū — Waiting
    "010111",  # 6  Sòng — Conflict
    "010000",  # 7  Shī — the Army
    "000010",  # 8  Bǐ — Holding Together
    "111011",  # 9  Xiǎo Chù — Small Taming
    "110111",  # 10 Lǚ — Treading
    "111000",  # 11 Tài — Peace
    "000111",  # 12 Pǐ — Standstill
    "101111",  # 13 Tóng Rén — Fellowship with Men
    "111101",  # 14 Dà Yǒu — Possession in Great Measure
    "001000",  # 15 Qiān — Modesty
    "000100",  # 16 Yù — Enthusiasm
    "100110",  # 17 Suí — Following
    "011001",  # 18 Gǔ — Work on the Decayed
    "110000",  # 19 Lín — Approach
    "000011",  # 20 Guān — Contemplation
    "100101",  # 21 Shì Hé — Biting Through
    "101001",  # 22 Bì — Grace
    "000001",  # 23 Bō — Splitting Apart
    "100000",  # 24 Fù — Return
    "100111",  # 25 Wú Wàng — Innocence
    "111001",  # 26 Dà Chù — Great Taming
    "100001",  # 27 Yí — the Corners of the Mouth
    "011110",  # 28 Dà Guò — Preponderance of the Great
    "010010",  # 29 Kǎn — the Abysmal (Water)
    "101101",  # 30 Lí — the Clinging (Fire)
    "001110",  # 31 Xián — Influence (Wooing)
    "011100",  # 32 Héng — Duration
    "001111",  # 33 Dùn — Retreat
    "111100",  # 34 Dà Zhuàng — Power of the Great
    "000101",  # 35 Jìn — Progress
    "101000",  # 36 Míng Yí — Darkening of the Light
    "101011",  # 37 Jiā Rén — the Family
    "110101",  # 38 Kuí — Opposition
    "001010",  # 39 Jiǎn — Obstruction
    "010100",  # 40 Jiě — Deliverance
    "110001",  # 41 Sǔn — Decrease
    "100011",  # 42 Yì — Increase
    "111110",  # 43 Guài — Breakthrough
    "011111",  # 44 Gòu — Coming to Meet
    "000110",  # 45 Cuì — Gathering Together
    "011000",  # 46 Shēng — Pushing Upward
    "010110",  # 47 Kùn — Oppression
    "011010",  # 48 Jǐng — the Well
    "101110",  # 49 Gé — Revolution
    "011101",  # 50 Dǐng — the Cauldron
    "100100",  # 51 Zhèn — the Arousing (Thunder)
    "001001",  # 52 Gèn — Keeping Still (Mountain)
    "001011",  # 53 Jiàn — Development
    "110100",  # 54 Guī Mèi — the Marrying Maiden
    "101100",  # 55 Fēng — Abundance
    "001101",  # 56 Lǚ — the Wanderer
    "011011",  # 57 Xùn — the Gentle (Wind)
    "110110",  # 58 Duì — the Joyous (Lake)
    "010011",  # 59 Huàn — Dispersion
    "110010",  # 60 Jié — Limitation
    "110011",  # 61 Zhōng Fú — Inner Truth
    "001100",  # 62 Xiǎo Guò — Preponderance of the Small
    "101010",  # 63 Jì Jì — After Completion
    "010101",  # 64 Wèi Jì — Before Completion
)


def _lines_to_binary(lines: tuple[bool, ...]) -> str:
    """Convert a bottom-up boolean tuple to the bit-string used by
    :data:`_KING_WEN_BINARY` (line 1 first)."""
    return "".join("1" if y else "0" for y in lines)


def _bool_lines(lines: tuple[LineKind, ...]) -> tuple[bool, ...]:
    return tuple(line.is_yang for line in lines)


def _bool_lines_after_change(lines: tuple[LineKind, ...]) -> tuple[bool, ...]:
    """Apply changing-line flips: old_yin → yang, old_yang → yin.
    Static lines keep their polarity."""
    out: list[bool] = []
    for line in lines:
        if line == LineKind.OLD_YIN:
            out.append(True)
        elif line == LineKind.OLD_YANG:
            out.append(False)
        else:
            out.append(line.is_yang)
    return tuple(out)


# Reverse lookup, populated at import time.
_BINARY_TO_NUMBER: Final[dict[str, int]] = {
    pattern: i + 1 for i, pattern in enumerate(_KING_WEN_BINARY)
}


def hexagram_for_lines(lines: tuple[bool, ...] | tuple[LineKind, ...]) -> int:
    """Return the King Wen number for a six-line pattern.

    Accepts either six booleans (True = yang) or six :class:`LineKind`
    values (interpreted by current polarity, *not* post-change). The
    bottom line comes first.
    """
    if len(lines) != 6:
        raise ValueError(f"expected 6 lines, got {len(lines)}")
    if all(isinstance(line, LineKind) for line in lines):
        bools = _bool_lines(lines)  # type: ignore[arg-type]
    else:
        bools = tuple(bool(line) for line in lines)
    return _BINARY_TO_NUMBER[_lines_to_binary(bools)]


def lines_for_hexagram(number: int) -> tuple[bool, ...]:
    """Inverse of :func:`hexagram_for_lines`. Returns the six-line
    bottom-up boolean pattern for King Wen ``number`` (1..64)."""
    if not 1 <= number <= 64:
        raise ValueError(f"King Wen number must be in [1, 64], got {number}")
    pattern = _KING_WEN_BINARY[number - 1]
    return tuple(c == "1" for c in pattern)


# ───── High-level cast ───────────────────────────────────────────────


def iching_cast(
    seed: str,
    method: CastMethod | str = CastMethod.THREE_COINS,
) -> CastResult:
    """Cast a reading deterministically.

    Returns the six lines, the primary hexagram number, the
    transformation hexagram number (if any lines change), and the
    1-based indices of changing lines.
    """
    method_enum = method if isinstance(method, CastMethod) else CastMethod(method)
    if method_enum == CastMethod.THREE_COINS:
        lines = cast_three_coins(seed)
    elif method_enum == CastMethod.YARROW_STALKS:
        lines = cast_yarrow_stalks(seed)
    else:  # pragma: no cover — enum exhaustive
        raise ValueError(f"unknown cast method: {method_enum!r}")

    primary = hexagram_for_lines(lines)

    changing_indices = tuple(
        i + 1 for i, line in enumerate(lines) if line.is_changing
    )
    if changing_indices:
        after = _bool_lines_after_change(lines)
        transformation: int | None = _BINARY_TO_NUMBER[_lines_to_binary(after)]
    else:
        transformation = None

    return CastResult(
        lines=lines,  # type: ignore[arg-type]
        primary_hexagram=primary,
        transformation_hexagram=transformation,
        changing_lines=changing_indices,
        method=method_enum,
    )
