"""Bundled rune sets.

Currently bundled:

* **Elder Futhark** (24 runes) — the oldest attested Germanic runic
  alphabet, c. 150-800 CE. The names + meanings here follow the
  reconstructed Proto-Germanic forms.

Additional sets (Younger Futhark, Anglo-Saxon Futhorc, Armanen,
Northumbrian) ship in :mod:`bundles_extended` — the engine handles
any rune list of any size.

Each rune carries:

* Unicode glyph (when present in Unicode's Runic block U+16A0–U+16FF).
* Proto-Germanic name + transliteration.
* Element / aett (the three Germanic groupings of 8 runes each;
  Elder Futhark has Freyr's, Heimdall's, and Tyr's aetts).
* Symmetric flag — True if the rune looks identical when flipped
  vertically (in which case reversed orientation isn't meaningful).
* Upright + reversed meaning glosses.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from theourgia.core.divination.runes.engine import RuneSet

__all__ = [
    "BUILTIN_RUNE_SETS",
    "BuiltinRune",
    "BuiltinRuneSet",
    "ELDER_FUTHARK",
    "runeset_by_value",
]


@dataclass(frozen=True, slots=True)
class BuiltinRune:
    index: int  # position within the set
    name: str  # Proto-Germanic reconstructed name
    transliteration: str  # Latin transliteration of the sound
    glyph: str  # Unicode runic character
    aett: int  # 1, 2, or 3 (Freyr's / Heimdall's / Tyr's aett)
    element: str  # fire / water / air / earth / spirit
    symmetric: bool  # If True, reversed orientation is not meaningful
    upright_meaning: str
    reversed_meaning: str
    correspondences: dict[str, object] = field(default_factory=dict)

    @property
    def reversible(self) -> bool:
        """Symmetric runes are non-reversible by the engine."""
        return not self.symmetric


@dataclass(frozen=True, slots=True)
class BuiltinRuneSet:
    set_id: RuneSet
    name: str
    description: str
    runes: tuple[BuiltinRune, ...]

    @property
    def size(self) -> int:
        return len(self.runes)

    @property
    def reversible_flags(self) -> tuple[bool, ...]:
        return tuple(r.reversible for r in self.runes)


# ───── Elder Futhark ──────────────────────────────────────────────────

# Aett 1 — Freyr's aett (Fehu through Wunjo).
_AETT_1 = (
    BuiltinRune(
        index=0,
        name="Fehu",
        transliteration="F",
        glyph="ᚠ",
        aett=1,
        element="fire",
        symmetric=False,
        upright_meaning="Cattle; wealth, prosperity, mobile resources.",
        reversed_meaning="Loss of resources; greed unchecked; squandered gain.",
    ),
    BuiltinRune(
        index=1,
        name="Uruz",
        transliteration="U",
        glyph="ᚢ",
        aett=1,
        element="earth",
        symmetric=False,
        upright_meaning="Aurochs; primal strength, vitality, untamed power.",
        reversed_meaning="Weakness, missed opportunity, brute force misapplied.",
    ),
    BuiltinRune(
        index=2,
        name="Thurisaz",
        transliteration="Th",
        glyph="ᚦ",
        aett=1,
        element="fire",
        symmetric=False,
        upright_meaning="Thorn; defensive force, breakthrough by piercing.",
        reversed_meaning="Defence breached; harmful action; danger unguarded.",
    ),
    BuiltinRune(
        index=3,
        name="Ansuz",
        transliteration="A",
        glyph="ᚨ",
        aett=1,
        element="air",
        symmetric=False,
        upright_meaning="Mouth / god (Odin); speech, inspiration, divine message.",
        reversed_meaning="Deception, miscommunication, missed counsel.",
    ),
    BuiltinRune(
        index=4,
        name="Raidho",
        transliteration="R",
        glyph="ᚱ",
        aett=1,
        element="air",
        symmetric=False,
        upright_meaning="Wagon / journey; movement, right order, ritual procession.",
        reversed_meaning="Stagnation, disrupted travel, off the path.",
    ),
    BuiltinRune(
        index=5,
        name="Kenaz",
        transliteration="K",
        glyph="ᚲ",
        aett=1,
        element="fire",
        symmetric=False,
        upright_meaning="Torch; illumination, knowledge revealed, creative fire.",
        reversed_meaning="Light withdrawn, confusion, false knowledge.",
    ),
    BuiltinRune(
        index=6,
        name="Gebo",
        transliteration="G",
        glyph="ᚷ",
        aett=1,
        element="air",
        symmetric=True,
        upright_meaning="Gift; exchange, partnership, sacred reciprocity.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=7,
        name="Wunjo",
        transliteration="W",
        glyph="ᚹ",
        aett=1,
        element="earth",
        symmetric=False,
        upright_meaning="Joy; harmony, kinship, contentment realised.",
        reversed_meaning="Sorrow, alienation, fellowship denied.",
    ),
)

# Aett 2 — Heimdall's / Hagal's aett (Hagalaz through Sowilo).
_AETT_2 = (
    BuiltinRune(
        index=8,
        name="Hagalaz",
        transliteration="H",
        glyph="ᚺ",
        aett=2,
        element="water",
        symmetric=True,
        upright_meaning="Hail; disruptive force from beyond control; necessary crisis.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=9,
        name="Nauthiz",
        transliteration="N",
        glyph="ᚾ",
        aett=2,
        element="fire",
        symmetric=False,
        upright_meaning="Need; constraint, hardship that forges, friction of fire from sticks.",
        reversed_meaning="Constraint unrecognised; need denied at one's peril.",
    ),
    BuiltinRune(
        index=10,
        name="Isa",
        transliteration="I",
        glyph="ᛁ",
        aett=2,
        element="water",
        symmetric=True,
        upright_meaning="Ice; stasis, holding pattern, frozen clarity.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=11,
        name="Jera",
        transliteration="J",
        glyph="ᛃ",
        aett=2,
        element="earth",
        symmetric=True,
        upright_meaning="Year / harvest; cycle complete, fruits of labour, just timing.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=12,
        name="Eihwaz",
        transliteration="Ei",
        glyph="ᛇ",
        aett=2,
        element="fire",
        symmetric=False,
        upright_meaning="Yew; the world-tree, endurance, axis between worlds.",
        reversed_meaning="Loss of axis; uprooted; trial unborne.",
    ),
    BuiltinRune(
        index=13,
        name="Perthro",
        transliteration="P",
        glyph="ᛈ",
        aett=2,
        element="water",
        symmetric=False,
        upright_meaning="Lot-cup / wyrd; hidden destiny revealed; chance discloses pattern.",
        reversed_meaning="Hidden things stay hidden; wyrd resisted.",
    ),
    BuiltinRune(
        index=14,
        name="Algiz",
        transliteration="Z",
        glyph="ᛉ",
        aett=2,
        element="air",
        symmetric=False,
        upright_meaning="Elk / protection; sacred guard, raised hands, divine sanctuary.",
        reversed_meaning="Vulnerable; protection lapses; warning ignored.",
    ),
    BuiltinRune(
        index=15,
        name="Sowilo",
        transliteration="S",
        glyph="ᛋ",
        aett=2,
        element="fire",
        symmetric=False,
        upright_meaning="Sun; victory, vital force, the guiding light.",
        reversed_meaning="Light obstructed; misdirected force; victory deferred.",
    ),
)

# Aett 3 — Tyr's aett (Tiwaz through Dagaz, then Othala).
_AETT_3 = (
    BuiltinRune(
        index=16,
        name="Tiwaz",
        transliteration="T",
        glyph="ᛏ",
        aett=3,
        element="air",
        symmetric=False,
        upright_meaning="Tyr; lawful justice, sacrifice for the right, sworn victory.",
        reversed_meaning="Injustice, broken oath, sacrifice without honour.",
    ),
    BuiltinRune(
        index=17,
        name="Berkano",
        transliteration="B",
        glyph="ᛒ",
        aett=3,
        element="earth",
        symmetric=False,
        upright_meaning="Birch; nurturing growth, motherhood, the green awakening.",
        reversed_meaning="Stunted growth; nurture withheld; family fractured.",
    ),
    BuiltinRune(
        index=18,
        name="Ehwaz",
        transliteration="E",
        glyph="ᛖ",
        aett=3,
        element="earth",
        symmetric=False,
        upright_meaning="Horse; partnership in motion, trust between bonded beings.",
        reversed_meaning="Untrustworthy ally; partnership stalls; mutual mismatch.",
    ),
    BuiltinRune(
        index=19,
        name="Mannaz",
        transliteration="M",
        glyph="ᛗ",
        aett=3,
        element="air",
        symmetric=False,
        upright_meaning="Human; mortal nature, kinship, the social self.",
        reversed_meaning="Isolation; self-deception; humanity disregarded.",
    ),
    BuiltinRune(
        index=20,
        name="Laguz",
        transliteration="L",
        glyph="ᛚ",
        aett=3,
        element="water",
        symmetric=False,
        upright_meaning="Water; the unconscious, dream, lunar flow.",
        reversed_meaning="Currents that pull under; intuition mistrusted; flooding.",
    ),
    BuiltinRune(
        index=21,
        name="Ingwaz",
        transliteration="Ng",
        glyph="ᛜ",
        aett=3,
        element="earth",
        symmetric=True,
        upright_meaning="Ing / hearth-god; gestation complete, internal seed quickening.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=22,
        name="Dagaz",
        transliteration="D",
        glyph="ᛞ",
        aett=3,
        element="fire",
        symmetric=True,
        upright_meaning="Day; breakthrough, transformation, the threshold crossed at dawn.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=23,
        name="Othala",
        transliteration="O",
        glyph="ᛟ",
        aett=3,
        element="earth",
        symmetric=False,
        upright_meaning="Inherited estate; ancestral property, sacred homeland, lineage held.",
        reversed_meaning="Lineage cut; ancestral disinheritance; loss of belonging.",
    ),
)


ELDER_FUTHARK: BuiltinRuneSet = BuiltinRuneSet(
    set_id=RuneSet.ELDER_FUTHARK,
    name="Elder Futhark",
    description=(
        "The 24-rune Proto-Germanic alphabet, c. 150-800 CE. Three "
        "aetts (groupings of eight): Freyr's, Heimdall's, and Tyr's."
    ),
    runes=_AETT_1 + _AETT_2 + _AETT_3,
)


def _extended_sets() -> tuple[BuiltinRuneSet, ...]:
    """Late import so ``bundles_extended`` can depend on this module
    without creating a circular import."""
    from theourgia.core.divination.runes import bundles_extended as _e

    return (
        _e.YOUNGER_FUTHARK,
        _e.ANGLO_SAXON_FUTHORC,
        _e.ARMANEN_RUNES,
        _e.NORTHUMBRIAN_RUNES,
    )


BUILTIN_RUNE_SETS: tuple[BuiltinRuneSet, ...] = (
    ELDER_FUTHARK,
) + _extended_sets()


def runeset_by_value(value: RuneSet | str) -> BuiltinRuneSet:
    """Lookup helper. Raises :class:`KeyError` for unknown sets."""
    target = value if isinstance(value, RuneSet) else RuneSet(value)
    for s in BUILTIN_RUNE_SETS:
        if s.set_id == target:
            return s
    raise KeyError(target)
