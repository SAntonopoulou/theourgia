"""Deterministic geomantic shield engine.

Each of the 16 figures is four lines, top-down. Each line is either
``single`` (one dot) or ``double`` (two dots). With single=1 and
double=0, geomantic addition is exactly XOR by line:

* single + single = double   (1 ⊕ 1 = 0)
* single + double = single   (1 ⊕ 0 = 1)
* double + single = single   (0 ⊕ 1 = 1)
* double + double = double   (0 ⊕ 0 = 0)

A full shield is generated from four "mothers" (4 figures × 4 lines
= 16 random bits). Every other figure is derived:

* **Daughters** D1..D4 = the transpose of the mothers. D_i line j =
  M_j line i. Both M and D blocks are 4×4, and the daughters are
  literally the rows of the mothers read as columns.
* **Nieces** N1 = M1+M2, N2 = M3+M4, N3 = D1+D2, N4 = D3+D4 (add
  line by line; XOR with single=1 / double=0).
* **Witnesses** W_right = N1+N2 (right witness), W_left = N3+N4
  (left witness).
* **Judge** = W_right + W_left.
* **Reconciler** (the "Sentence") = M1 + Judge.

The 12-house chart uses houses 1..4 = mothers, 5..8 = daughters,
9..12 = nieces. Witnesses and judge sit outside the houses.

This module never imports models — it operates on tuples of bools.
The persistence layer translates between :class:`Chart` and JSON.
"""

from __future__ import annotations

import enum
import hashlib
import random
from dataclasses import dataclass
from typing import Final

__all__ = [
    "Chart",
    "Figure",
    "FigureName",
    "HouseAssignment",
    "combine",
    "figure_by_name",
    "figure_for_pattern",
    "geomancy_cast",
    "lines_for_pattern",
    "pattern_for_lines",
]


class FigureName(str, enum.Enum):
    """The 16 geomantic figures by Latin name (the most stable label
    across traditions). English translations live in the bundle."""

    VIA = "via"
    CAUDA_DRACONIS = "cauda_draconis"
    PUER = "puer"
    FORTUNA_MINOR = "fortuna_minor"
    PUELLA = "puella"
    AMISSIO = "amissio"
    CARCER = "carcer"
    LAETITIA = "laetitia"
    CAPUT_DRACONIS = "caput_draconis"
    CONJUNCTIO = "conjunctio"
    ACQUISITIO = "acquisitio"
    RUBEUS = "rubeus"
    FORTUNA_MAJOR = "fortuna_major"
    ALBUS = "albus"
    TRISTITIA = "tristitia"
    POPULUS = "populus"


# ───── Patterns ──────────────────────────────────────────────────────


# Top-down four-line pattern as a 4-tuple of bools. True = single
# (one dot, "yang"-like, value 1); False = double (two dots, value 0).
# The figure_for_pattern lookup is built from this table.
_FIGURE_PATTERNS: Final[dict[FigureName, tuple[bool, bool, bool, bool]]] = {
    FigureName.VIA: (True, True, True, True),
    FigureName.CAUDA_DRACONIS: (True, True, True, False),
    FigureName.PUER: (True, True, False, True),
    FigureName.FORTUNA_MINOR: (True, True, False, False),
    FigureName.PUELLA: (True, False, True, True),
    FigureName.AMISSIO: (True, False, True, False),
    FigureName.CARCER: (True, False, False, True),
    FigureName.LAETITIA: (True, False, False, False),
    FigureName.CAPUT_DRACONIS: (False, True, True, True),
    FigureName.CONJUNCTIO: (False, True, True, False),
    FigureName.ACQUISITIO: (False, True, False, True),
    FigureName.RUBEUS: (False, True, False, False),
    FigureName.FORTUNA_MAJOR: (False, False, True, True),
    FigureName.ALBUS: (False, False, True, False),
    FigureName.TRISTITIA: (False, False, False, True),
    FigureName.POPULUS: (False, False, False, False),
}

_PATTERN_TO_NAME: Final[dict[tuple[bool, bool, bool, bool], FigureName]] = {
    pattern: name for name, pattern in _FIGURE_PATTERNS.items()
}


def lines_for_pattern(name: FigureName) -> tuple[bool, bool, bool, bool]:
    """Look up the four-line pattern for a figure name."""
    return _FIGURE_PATTERNS[name]


def pattern_for_lines(
    lines: tuple[bool, bool, bool, bool],
) -> FigureName:
    """Look up the figure name for a four-line pattern."""
    return _PATTERN_TO_NAME[lines]


@dataclass(frozen=True, slots=True)
class Figure:
    """One of the 16 figures, instantiated as a value with its name +
    lines + integer index 0..15."""

    name: FigureName
    """Canonical Latin name."""

    lines: tuple[bool, bool, bool, bool]
    """Top-down lines. ``True`` = single, ``False`` = double."""

    index: int
    """0..15; index in the canonical figure ordering (see
    :data:`FIGURE_ORDER`)."""


# Canonical ordering: 0..15 in the binary-numeric order of their
# patterns (treating the top line as the MSB, single=1).
FIGURE_ORDER: Final[tuple[FigureName, ...]] = (
    FigureName.POPULUS,         # 0000
    FigureName.TRISTITIA,       # 0001
    FigureName.ALBUS,           # 0010
    FigureName.FORTUNA_MAJOR,   # 0011
    FigureName.RUBEUS,          # 0100
    FigureName.ACQUISITIO,      # 0101
    FigureName.CONJUNCTIO,      # 0110
    FigureName.CAPUT_DRACONIS,  # 0111
    FigureName.LAETITIA,        # 1000
    FigureName.CARCER,          # 1001
    FigureName.AMISSIO,         # 1010
    FigureName.PUELLA,          # 1011
    FigureName.FORTUNA_MINOR,   # 1100
    FigureName.PUER,            # 1101
    FigureName.CAUDA_DRACONIS,  # 1110
    FigureName.VIA,             # 1111
)


_NAME_TO_INDEX: Final[dict[FigureName, int]] = {
    name: i for i, name in enumerate(FIGURE_ORDER)
}


def figure_by_name(name: FigureName | str) -> Figure:
    """Construct a :class:`Figure` from its name. Accepts the enum or
    the lowercase string."""
    name_enum = name if isinstance(name, FigureName) else FigureName(name)
    return Figure(
        name=name_enum,
        lines=_FIGURE_PATTERNS[name_enum],
        index=_NAME_TO_INDEX[name_enum],
    )


def figure_for_pattern(
    lines: tuple[bool, bool, bool, bool],
) -> Figure:
    """Construct a :class:`Figure` from its four-line pattern."""
    name = pattern_for_lines(lines)
    return Figure(
        name=name,
        lines=lines,
        index=_NAME_TO_INDEX[name],
    )


# ───── Combine (geomantic addition) ─────────────────────────────────


def combine(a: Figure, b: Figure) -> Figure:
    """Add two figures line by line.

    With single=True and double=False, geomantic addition is XOR.
    The result is :data:`FigureName.POPULUS` (all doubles) when the
    two figures are identical.
    """
    combined = tuple(x ^ y for x, y in zip(a.lines, b.lines, strict=True))
    return figure_for_pattern(combined)  # type: ignore[arg-type]


# ───── Chart ────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class HouseAssignment:
    """One house in the 12-house chart."""

    house: int  # 1..12
    figure_name: FigureName
    figure_lines: tuple[bool, bool, bool, bool]


HOUSE_MEANINGS: Final[tuple[str, ...]] = (
    "querent — self, body, life-context",                # 1
    "movable goods — money, possessions, resources",     # 2
    "siblings, short journeys, neighbours",              # 3
    "home, parents, foundations, hidden ends",           # 4
    "children, pleasure, creative work",                 # 5
    "servants, illness, daily labour",                   # 6
    "marriage, partners, opponents in open conflict",    # 7
    "death, legacies, transformation, shared resources", # 8
    "long journeys, religion, philosophy",               # 9
    "career, public reputation, authority",              # 10
    "friends, hopes, allies",                            # 11
    "self-undoing, hidden enemies, sorrow",              # 12
)


@dataclass(frozen=True, slots=True)
class Chart:
    """The full shield reading."""

    mothers: tuple[Figure, Figure, Figure, Figure]
    daughters: tuple[Figure, Figure, Figure, Figure]
    nieces: tuple[Figure, Figure, Figure, Figure]
    right_witness: Figure
    left_witness: Figure
    judge: Figure
    reconciler: Figure
    houses: tuple[
        HouseAssignment, HouseAssignment, HouseAssignment, HouseAssignment,
        HouseAssignment, HouseAssignment, HouseAssignment, HouseAssignment,
        HouseAssignment, HouseAssignment, HouseAssignment, HouseAssignment,
    ]


# ───── Seeded mother generation ─────────────────────────────────────


def _seeded_random(seed: str) -> random.Random:
    """Same primitive as Tarot + I Ching: SHA-256 → 64-bit int → RNG."""
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    seed_int = int.from_bytes(digest[:8], "big", signed=False)
    return random.Random(seed_int)


def _make_mother(rng: random.Random) -> Figure:
    """Draw four random lines for one mother figure."""
    lines = tuple(rng.choice([True, False]) for _ in range(4))
    return figure_for_pattern(lines)  # type: ignore[arg-type]


def _daughters_from_mothers(
    mothers: tuple[Figure, Figure, Figure, Figure],
) -> tuple[Figure, Figure, Figure, Figure]:
    """Transpose the four mothers row-by-row into the four daughters.

    Daughter D_i has its j-th line equal to the i-th line of mother
    M_j. In tuple form: the daughters are the transpose of the 4×4
    matrix of mothers.
    """
    result: list[Figure] = []
    for i in range(4):
        lines = (
            mothers[0].lines[i],
            mothers[1].lines[i],
            mothers[2].lines[i],
            mothers[3].lines[i],
        )
        result.append(figure_for_pattern(lines))
    return tuple(result)  # type: ignore[return-value]


def _build_chart(
    mothers: tuple[Figure, Figure, Figure, Figure],
) -> Chart:
    """Derive every figure in the shield from the four mothers."""
    daughters = _daughters_from_mothers(mothers)

    nieces = (
        combine(mothers[0], mothers[1]),
        combine(mothers[2], mothers[3]),
        combine(daughters[0], daughters[1]),
        combine(daughters[2], daughters[3]),
    )

    right_witness = combine(nieces[0], nieces[1])
    left_witness = combine(nieces[2], nieces[3])
    judge = combine(right_witness, left_witness)
    reconciler = combine(mothers[0], judge)

    house_figures: list[Figure] = list(mothers) + list(daughters) + list(nieces)
    houses = tuple(
        HouseAssignment(
            house=i + 1,
            figure_name=fig.name,
            figure_lines=fig.lines,
        )
        for i, fig in enumerate(house_figures)
    )

    return Chart(
        mothers=mothers,
        daughters=daughters,
        nieces=nieces,
        right_witness=right_witness,
        left_witness=left_witness,
        judge=judge,
        reconciler=reconciler,
        houses=houses,  # type: ignore[arg-type]
    )


def geomancy_cast(seed: str) -> Chart:
    """Cast a complete shield deterministically from a seed."""
    rng = _seeded_random(seed)
    mothers = tuple(_make_mother(rng) for _ in range(4))
    return _build_chart(mothers)  # type: ignore[arg-type]
