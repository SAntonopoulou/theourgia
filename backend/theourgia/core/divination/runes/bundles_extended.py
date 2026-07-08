"""Extended rune sets — bundles beyond Elder Futhark.

b108-2ho · FEATURES §13 (reference plugin: Norse runes extended).

Bundles ship one alphabet at a time so each stays reviewable:

- Younger Futhark (Long Branch) — 16 runes, c. 800-1100 CE
- Anglo-Saxon Futhorc — coming in a follow-up batch (33 runes)
- Armanen — coming in a follow-up batch (18 runes, Guido von List 1902)
- Northumbrian — coming in a follow-up batch (33 runes)

The engine accepts any rune set of any size, so adding a bundle
is purely a data authoring step; no engine changes needed.
"""

from __future__ import annotations

from theourgia.core.divination.runes.bundles import (
    BuiltinRune,
    BuiltinRuneSet,
)
from theourgia.core.divination.runes.engine import RuneSet

__all__ = ["YOUNGER_FUTHARK"]


# ───── Younger Futhark (Long Branch variant) ────────────────────────
#
# The 16-rune Norse alphabet c. 800-1100 CE. Reduced from the 24-rune
# Elder Futhark as Proto-Norse phonology shifted; one rune often carried
# several sounds. There are two dialectal variants: Long Branch
# (Danish) and Short Twig (Norwegian/Swedish). This bundle ships the
# Long Branch forms, which are the most commonly cited in divinatory
# use.

_YOUNGER_LONG_BRANCH = (
    BuiltinRune(
        index=0,
        name="Fé",
        transliteration="F",
        glyph="ᚠ",
        aett=1,
        element="fire",
        symmetric=False,
        upright_meaning="Cattle; wealth, prosperity, movable resources.",
        reversed_meaning="Loss, poverty, wealth mismanaged or squandered.",
    ),
    BuiltinRune(
        index=1,
        name="Úr",
        transliteration="U",
        glyph="ᚢ",
        aett=1,
        element="water",
        symmetric=False,
        upright_meaning=(
            "Drizzle / iron; vital strength, primal endurance, "
            "the tempering rain."
        ),
        reversed_meaning="Weakness, brute force misapplied, health fading.",
    ),
    BuiltinRune(
        index=2,
        name="Þurs",
        transliteration="Th",
        glyph="ᚦ",
        aett=1,
        element="fire",
        symmetric=False,
        upright_meaning=(
            "Giant / thorn; defensive force, breakthrough by piercing, "
            "chthonic power that guards a threshold."
        ),
        reversed_meaning=(
            "Malice unbound, harm unguarded, giant-force turned inward."
        ),
    ),
    BuiltinRune(
        index=3,
        name="Óss",
        transliteration="Ō",
        glyph="ᚬ",
        aett=1,
        element="air",
        symmetric=False,
        upright_meaning=(
            "Ase (god), especially Odin; speech given by gods, "
            "inspiration, sacred counsel."
        ),
        reversed_meaning=(
            "Deception dressed as revelation, counsel refused or ignored."
        ),
    ),
    BuiltinRune(
        index=4,
        name="Reið",
        transliteration="R",
        glyph="ᚱ",
        aett=1,
        element="air",
        symmetric=False,
        upright_meaning=(
            "Riding; journey undertaken, right order, ritual procession "
            "toward a destination."
        ),
        reversed_meaning="Stagnation, delayed travel, moving without direction.",
    ),
    BuiltinRune(
        index=5,
        name="Kaun",
        transliteration="K",
        glyph="ᚴ",
        aett=1,
        element="fire",
        symmetric=False,
        upright_meaning=(
            "Ulcer / boil; the wound that teaches, purgation, illness "
            "that must run its course before healing."
        ),
        reversed_meaning=(
            "Chronic hurt, sickness untended, resistance to what needs "
            "to be lanced."
        ),
    ),
    BuiltinRune(
        index=6,
        name="Hagall",
        transliteration="H",
        glyph="ᚼ",
        aett=2,
        element="ice",
        symmetric=False,
        upright_meaning=(
            "Hail; sudden disruption arriving from outside, ordeal that "
            "reshapes what stood, the storm that clears the field."
        ),
        reversed_meaning=(
            "Prolonged winter, delayed thaw, resisting the disruption "
            "that would eventually free you."
        ),
    ),
    BuiltinRune(
        index=7,
        name="Nauðr",
        transliteration="N",
        glyph="ᚾ",
        aett=2,
        element="fire",
        symmetric=False,
        upright_meaning=(
            "Need; the fire kindled by necessity, endurance under lack, "
            "constraint that teaches."
        ),
        reversed_meaning=(
            "Wants unmet, want as identity, refusal to bear necessary "
            "constraint."
        ),
    ),
    BuiltinRune(
        index=8,
        name="Ísa",
        transliteration="I",
        glyph="ᛁ",
        aett=2,
        element="ice",
        symmetric=True,
        upright_meaning=(
            "Ice; stillness, the pause that clarifies, held space where "
            "nothing yet moves."
        ),
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=9,
        name="Ár",
        transliteration="A",
        glyph="ᛅ",
        aett=2,
        element="earth",
        symmetric=False,
        upright_meaning=(
            "Year / harvest; the reward of the full turning, patient "
            "yield, cyclical completion."
        ),
        reversed_meaning=(
            "Blighted crop, patience unrewarded, cycle broken by frost."
        ),
    ),
    BuiltinRune(
        index=10,
        name="Sól",
        transliteration="S",
        glyph="ᛋ",
        aett=2,
        element="fire",
        symmetric=False,
        upright_meaning=(
            "Sun; victory, guiding light, the wheel of the sky that "
            "leads travellers home."
        ),
        reversed_meaning="(near-symmetric — reversal reads faintly)",
    ),
    BuiltinRune(
        index=11,
        name="Týr",
        transliteration="T",
        glyph="ᛏ",
        aett=3,
        element="air",
        symmetric=False,
        upright_meaning=(
            "The god Týr; sworn oath kept at cost, honour, the hand "
            "given in binding of the wolf."
        ),
        reversed_meaning=(
            "Oath broken, honour spent, justice miscarried."
        ),
    ),
    BuiltinRune(
        index=12,
        name="Bjarkan",
        transliteration="B",
        glyph="ᛒ",
        aett=3,
        element="earth",
        symmetric=False,
        upright_meaning=(
            "Birch; regeneration, motherhood, the pale bark that heralds "
            "spring's return."
        ),
        reversed_meaning=(
            "Barrenness, growth checked, protection withdrawn."
        ),
    ),
    BuiltinRune(
        index=13,
        name="Maðr",
        transliteration="M",
        glyph="ᛘ",
        aett=3,
        element="air",
        symmetric=False,
        upright_meaning=(
            "Man / humanity; kinship, right relation to others, "
            "acknowledgement of mortality."
        ),
        reversed_meaning=(
            "Isolation, misanthropy, false or fractured community."
        ),
    ),
    BuiltinRune(
        index=14,
        name="Lögr",
        transliteration="L",
        glyph="ᛚ",
        aett=3,
        element="water",
        symmetric=False,
        upright_meaning=(
            "Water / sea; flow, the deep unconscious, currents that "
            "carry when trusted."
        ),
        reversed_meaning=(
            "Drowning, currents opposed, the sea that will not bear you."
        ),
    ),
    BuiltinRune(
        index=15,
        name="Ýr",
        transliteration="R",
        glyph="ᛦ",
        aett=3,
        element="earth",
        symmetric=False,
        upright_meaning=(
            "Yew; ancestral bow, death that guards continuity, the tree "
            "sacred to the transition between worlds."
        ),
        reversed_meaning=(
            "Rot at the root, ancestral tie cut, the guardian gone."
        ),
    ),
)


YOUNGER_FUTHARK: BuiltinRuneSet = BuiltinRuneSet(
    set_id=RuneSet.YOUNGER_FUTHARK,
    name="Younger Futhark (Long Branch)",
    description=(
        "The 16-rune Norse alphabet, c. 800-1100 CE. Reduced from the "
        "24-rune Elder Futhark as Proto-Norse phonology shifted; each "
        "rune often carries several sounds. Long Branch (Danish) forms."
    ),
    runes=_YOUNGER_LONG_BRANCH,
)
