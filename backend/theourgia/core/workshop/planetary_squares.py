"""The seven Agrippa planetary magic squares (Saturn → Moon).

Cornelius Agrippa, *De Occulta Philosophia* book II chapter XXII (1531).
Public-domain source; cells verified against the standard scholarly
editions (Tyson 1993, Llewellyn).

The order is **sacred** — Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon
(slowest planet to fastest, per the classical celestial ordering).
**Never re-sort by size or alphabetically** — the order encodes the
tradition.

These ship as Python constants, not DB rows, so they cannot be
soft-deleted, edited, or audited. The Magic Square router exposes
them via ``GET /api/v1/magic-squares/planetary``.

Each entry is a list-of-lists of ints; every row + column + both
main diagonals sum to the planet's *magic constant*
(``n × (n² + 1) / 2`` for an n × n square).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

__all__ = [
    "PLANETARY_SQUARES",
    "PlanetarySquare",
    "magic_constant",
    "is_valid_magic_square",
]


@dataclass(frozen=True, slots=True)
class PlanetarySquare:
    """One Agrippa planetary square.

    The ``planet`` slug matches the lowercase planet name; the
    ``order`` is ``len(cells)``; ``magic_constant`` is the row/col sum.
    """

    planet: str
    name: str
    order: int
    magic_constant: int
    cells: tuple[tuple[int, ...], ...]
    citation: str = (
        "Cornelius Agrippa, De Occulta Philosophia book II chapter XXII (1531)."
    )


def magic_constant(order: int) -> int:
    """Return the row / column sum for an n × n magic square: n(n² + 1)/2."""
    return order * (order * order + 1) // 2


def is_valid_magic_square(cells: list[list[int]] | tuple[tuple[int, ...], ...]) -> bool:
    """True iff every row + column + both main diagonals sum to ``magic_constant``."""
    n = len(cells)
    if n < 3:
        return False
    if any(len(row) != n for row in cells):
        return False
    target = magic_constant(n)
    # Rows
    if any(sum(row) != target for row in cells):
        return False
    # Columns
    if any(sum(cells[r][c] for r in range(n)) != target for c in range(n)):
        return False
    # Main diagonals
    if sum(cells[i][i] for i in range(n)) != target:
        return False
    if sum(cells[i][n - 1 - i] for i in range(n)) != target:
        return False
    return True


# ── The seven squares ────────────────────────────────────────────────


SATURN_3X3: Final = PlanetarySquare(
    planet="saturn",
    name="Saturn — 3×3",
    order=3,
    magic_constant=15,
    cells=(
        (4, 9, 2),
        (3, 5, 7),
        (8, 1, 6),
    ),
)


JUPITER_4X4: Final = PlanetarySquare(
    planet="jupiter",
    name="Jupiter — 4×4",
    order=4,
    magic_constant=34,
    cells=(
        (4, 14, 15, 1),
        (9, 7, 6, 12),
        (5, 11, 10, 8),
        (16, 2, 3, 13),
    ),
)


MARS_5X5: Final = PlanetarySquare(
    planet="mars",
    name="Mars — 5×5",
    order=5,
    magic_constant=65,
    cells=(
        (11, 24, 7, 20, 3),
        (4, 12, 25, 8, 16),
        (17, 5, 13, 21, 9),
        (10, 18, 1, 14, 22),
        (23, 6, 19, 2, 15),
    ),
)


SUN_6X6: Final = PlanetarySquare(
    planet="sun",
    name="Sun — 6×6",
    order=6,
    magic_constant=111,
    cells=(
        (6, 32, 3, 34, 35, 1),
        (7, 11, 27, 28, 8, 30),
        (19, 14, 16, 15, 23, 24),
        (18, 20, 22, 21, 17, 13),
        (25, 29, 10, 9, 26, 12),
        (36, 5, 33, 4, 2, 31),
    ),
)


VENUS_7X7: Final = PlanetarySquare(
    planet="venus",
    name="Venus — 7×7",
    order=7,
    magic_constant=175,
    cells=(
        (22, 47, 16, 41, 10, 35, 4),
        (5, 23, 48, 17, 42, 11, 29),
        (30, 6, 24, 49, 18, 36, 12),
        (13, 31, 7, 25, 43, 19, 37),
        (38, 14, 32, 1, 26, 44, 20),
        (21, 39, 8, 33, 2, 27, 45),
        (46, 15, 40, 9, 34, 3, 28),
    ),
)


MERCURY_8X8: Final = PlanetarySquare(
    planet="mercury",
    name="Mercury — 8×8",
    order=8,
    magic_constant=260,
    cells=(
        (8, 58, 59, 5, 4, 62, 63, 1),
        (49, 15, 14, 52, 53, 11, 10, 56),
        (41, 23, 22, 44, 45, 19, 18, 48),
        (32, 34, 35, 29, 28, 38, 39, 25),
        (40, 26, 27, 37, 36, 30, 31, 33),
        (17, 47, 46, 20, 21, 43, 42, 24),
        (9, 55, 54, 12, 13, 51, 50, 16),
        (64, 2, 3, 61, 60, 6, 7, 57),
    ),
)


MOON_9X9: Final = PlanetarySquare(
    planet="moon",
    name="Moon — 9×9",
    order=9,
    magic_constant=369,
    cells=(
        (37, 78, 29, 70, 21, 62, 13, 54, 5),
        (6, 38, 79, 30, 71, 22, 63, 14, 46),
        (47, 7, 39, 80, 31, 72, 23, 55, 15),
        (16, 48, 8, 40, 81, 32, 64, 24, 56),
        (57, 17, 49, 9, 41, 73, 33, 65, 25),
        (26, 58, 18, 50, 1, 42, 74, 34, 66),
        (67, 27, 59, 10, 51, 2, 43, 75, 35),
        (36, 68, 19, 60, 11, 52, 3, 44, 76),
        (77, 28, 69, 20, 61, 12, 53, 4, 45),
    ),
)


PLANETARY_SQUARES: Final[tuple[PlanetarySquare, ...]] = (
    SATURN_3X3,
    JUPITER_4X4,
    MARS_5X5,
    SUN_6X6,
    VENUS_7X7,
    MERCURY_8X8,
    MOON_9X9,
)
