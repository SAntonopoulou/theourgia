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

__all__ = ["ANGLO_SAXON_FUTHORC", "ARMANEN_RUNES", "YOUNGER_FUTHARK"]


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


# ───── Anglo-Saxon Futhorc ──────────────────────────────────────────
#
# The 33-rune Anglo-Saxon alphabet, c. 5th-11th centuries. Extends
# Elder Futhark with runes for Old English phonology (Ac, Æsc, Yr,
# Ior, Ear) and later adds regional variants for the Northumbrian
# expansion (Cweorð, Calc, Stan, Gar) — those latter four also
# appear in the separate NORTHUMBRIAN bundle when it lands.
#
# Meanings for the first 24 track Elder Futhark closely but with
# Old English names and specifically Anglo-Saxon associations
# recorded in the *Rune Poem* (c. 8th-10th c.).

_FUTHORC = (
    BuiltinRune(
        index=0, name="Feoh", transliteration="F", glyph="ᚠ", aett=1,
        element="fire", symmetric=False,
        upright_meaning="Wealth / cattle; prosperity is a comfort to all — but must be shared with kin.",
        reversed_meaning="Wealth hoarded, prosperity that isolates, gain that corrupts.",
    ),
    BuiltinRune(
        index=1, name="Ur", transliteration="U", glyph="ᚢ", aett=1,
        element="earth", symmetric=False,
        upright_meaning="Aurochs; primal strength, wild endurance, the untamed vitality.",
        reversed_meaning="Brute force misapplied, wildness turning against itself.",
    ),
    BuiltinRune(
        index=2, name="Þorn", transliteration="Th", glyph="ᚦ", aett=1,
        element="fire", symmetric=False,
        upright_meaning="Thorn; defensive force, breakthrough by piercing, the chthonic guardian.",
        reversed_meaning="Malice unbound, harm unguarded, defence turned against the self.",
    ),
    BuiltinRune(
        index=3, name="Os", transliteration="O", glyph="ᚩ", aett=1,
        element="air", symmetric=False,
        upright_meaning="Mouth / god; sacred speech, wisdom given by the gods, oration.",
        reversed_meaning="False counsel, silence at the moment for speech, oaths broken.",
    ),
    BuiltinRune(
        index=4, name="Rad", transliteration="R", glyph="ᚱ", aett=1,
        element="air", symmetric=False,
        upright_meaning="Riding / journey; movement toward a destination, right procession.",
        reversed_meaning="Stagnation, missed departure, journey without direction.",
    ),
    BuiltinRune(
        index=5, name="Cen", transliteration="C", glyph="ᚳ", aett=1,
        element="fire", symmetric=False,
        upright_meaning="Torch; illumination, knowledge revealed, warmth kept alight.",
        reversed_meaning="Light withdrawn, confusion, teachings forgotten.",
    ),
    BuiltinRune(
        index=6, name="Gyfu", transliteration="G", glyph="ᚷ", aett=1,
        element="air", symmetric=True,
        upright_meaning="Gift; exchange, sacred reciprocity, partnership sealed by giving.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=7, name="Wynn", transliteration="W", glyph="ᚹ", aett=1,
        element="air", symmetric=False,
        upright_meaning="Joy; contentment, kinship-happiness, the settled hearth.",
        reversed_meaning="Discontent, isolation from kin, joy withheld.",
    ),
    BuiltinRune(
        index=8, name="Hægl", transliteration="H", glyph="ᚻ", aett=2,
        element="ice", symmetric=True,
        upright_meaning="Hail; sudden disruption, ordeal that reshapes, the storm that clears.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=9, name="Nyd", transliteration="N", glyph="ᚾ", aett=2,
        element="fire", symmetric=False,
        upright_meaning="Need; the fire kindled by necessity, endurance under constraint.",
        reversed_meaning="Wants unmet, want as identity, refusal of constraint.",
    ),
    BuiltinRune(
        index=10, name="Is", transliteration="I", glyph="ᛁ", aett=2,
        element="ice", symmetric=True,
        upright_meaning="Ice; stillness, the pause that clarifies, held space.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=11, name="Ger", transliteration="J", glyph="ᛄ", aett=2,
        element="earth", symmetric=False,
        upright_meaning="Year / harvest; cyclical completion, patient yield, the wheel turning.",
        reversed_meaning="Blighted crop, patience unrewarded, cycle broken.",
    ),
    BuiltinRune(
        index=12, name="Eoh", transliteration="Ï", glyph="ᛇ", aett=2,
        element="water", symmetric=False,
        upright_meaning="Yew; endurance, ancestral bow, the tree that guards the threshold between worlds.",
        reversed_meaning="Rot at the root, the guardian gone, ancestral tie cut.",
    ),
    BuiltinRune(
        index=13, name="Peorð", transliteration="P", glyph="ᛈ", aett=2,
        element="water", symmetric=False,
        upright_meaning="Dice-cup / mystery; hidden knowledge, chance revealed, the game of fate.",
        reversed_meaning="Hidden knowledge that stays hidden, chance turned against you.",
    ),
    BuiltinRune(
        index=14, name="Eolh", transliteration="X", glyph="ᛉ", aett=2,
        element="air", symmetric=False,
        upright_meaning="Elk-sedge; protection, the warding hand, divine defence.",
        reversed_meaning="Protection withdrawn, defence breached, exposure to harm.",
    ),
    BuiltinRune(
        index=15, name="Sigel", transliteration="S", glyph="ᛋ", aett=2,
        element="fire", symmetric=False,
        upright_meaning="Sun; victory, guiding light, the wheel of the sky.",
        reversed_meaning="Sun clouded, victory delayed, guidance lost.",
    ),
    BuiltinRune(
        index=16, name="Tir", transliteration="T", glyph="ᛏ", aett=3,
        element="air", symmetric=False,
        upright_meaning="Tir (Týr); sworn oath kept at cost, honour, sacrifice for justice.",
        reversed_meaning="Oath broken, honour spent, justice miscarried.",
    ),
    BuiltinRune(
        index=17, name="Beorc", transliteration="B", glyph="ᛒ", aett=3,
        element="earth", symmetric=False,
        upright_meaning="Birch; regeneration, motherhood, the return of spring.",
        reversed_meaning="Barrenness, growth checked, protection withdrawn.",
    ),
    BuiltinRune(
        index=18, name="Eh", transliteration="E", glyph="ᛖ", aett=3,
        element="earth", symmetric=False,
        upright_meaning="Horse; loyal partnership, the sworn companion, teamwork.",
        reversed_meaning="Trust broken, the partner failing, isolation.",
    ),
    BuiltinRune(
        index=19, name="Mann", transliteration="M", glyph="ᛗ", aett=3,
        element="air", symmetric=True,
        upright_meaning="Man / humanity; kinship, right relation to others, acknowledgement of mortality.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=20, name="Lagu", transliteration="L", glyph="ᛚ", aett=3,
        element="water", symmetric=False,
        upright_meaning="Water / lake; flow, the deep unconscious, currents that carry when trusted.",
        reversed_meaning="Drowning, currents opposed, the water that will not bear you.",
    ),
    BuiltinRune(
        index=21, name="Ing", transliteration="Ng", glyph="ᛝ", aett=3,
        element="earth", symmetric=True,
        upright_meaning="Ing (Ing-Frey); fertility, generative completion, the sacred marriage.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=22, name="Eðel", transliteration="Œ", glyph="ᛟ", aett=3,
        element="earth", symmetric=False,
        upright_meaning="Inherited estate; ancestral land, sacred homeland, lineage held.",
        reversed_meaning="Lineage cut, ancestral disinheritance, loss of belonging.",
    ),
    BuiltinRune(
        index=23, name="Dæg", transliteration="D", glyph="ᛞ", aett=3,
        element="fire", symmetric=True,
        upright_meaning="Day; breakthrough, transformation, the threshold crossed at dawn.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    # ── Anglo-Saxon additions (aett 4) ─────────────────────────────
    BuiltinRune(
        index=24, name="Ac", transliteration="A", glyph="ᚪ", aett=4,
        element="earth", symmetric=False,
        upright_meaning="Oak; deep-rooted strength, the boat-timber, endurance across generations.",
        reversed_meaning="Rigidity that breaks; strength ossified into stubbornness.",
    ),
    BuiltinRune(
        index=25, name="Æsc", transliteration="Æ", glyph="ᚫ", aett=4,
        element="air", symmetric=False,
        upright_meaning="Ash; the world-tree, spear-shaft, sacred connection between realms.",
        reversed_meaning="Connection severed, the tree fallen, isolation between worlds.",
    ),
    BuiltinRune(
        index=26, name="Yr", transliteration="Y", glyph="ᚣ", aett=4,
        element="air", symmetric=False,
        upright_meaning="Bow; skilled aim, practised craft, weapon that follows will.",
        reversed_meaning="Aim gone wide, craft neglected, weapon that misfires.",
    ),
    BuiltinRune(
        index=27, name="Ior", transliteration="Io", glyph="ᛡ", aett=4,
        element="water", symmetric=False,
        upright_meaning="Beaver / serpent-of-waters; adaptability between elements, dual-realm dweller.",
        reversed_meaning="Refusing the water OR refusing the land — stuck at neither shore.",
    ),
    BuiltinRune(
        index=28, name="Ear", transliteration="Ea", glyph="ᛠ", aett=4,
        element="earth", symmetric=False,
        upright_meaning="Earth / grave; endings that fertilise beginnings, the compost of memory.",
        reversed_meaning="Refusing endings, decomposition denied, ancestors ignored.",
    ),
    BuiltinRune(
        index=29, name="Cweorð", transliteration="Cw", glyph="ᛢ", aett=4,
        element="fire", symmetric=False,
        upright_meaning="Fire-drill; kindling by friction, ceremonial ignition, effortful beginnings.",
        reversed_meaning="Friction without spark; ceremony that fails to light.",
    ),
    BuiltinRune(
        index=30, name="Calc", transliteration="K", glyph="ᛣ", aett=4,
        element="water", symmetric=False,
        upright_meaning="Chalice / sacred vessel; ritual offering, the cup that catches.",
        reversed_meaning="Cup spilled, offering refused, sacred vessel broken.",
    ),
    BuiltinRune(
        index=31, name="Stan", transliteration="St", glyph="ᛥ", aett=4,
        element="earth", symmetric=False,
        upright_meaning="Stone; foundation, boundary marker, the immovable witness.",
        reversed_meaning="Foundation cracked, boundary crossed, the witness turned away.",
    ),
    BuiltinRune(
        index=32, name="Gar", transliteration="G", glyph="ᚸ", aett=4,
        element="air", symmetric=False,
        upright_meaning="Spear (Odin's / Gungnir); decisive strike, sworn commitment, the point that never turns aside.",
        reversed_meaning="Commitment withdrawn, the strike deflected, sworn purpose lost.",
    ),
)


ANGLO_SAXON_FUTHORC: BuiltinRuneSet = BuiltinRuneSet(
    set_id=RuneSet.ANGLO_SAXON_FUTHORC,
    name="Anglo-Saxon Futhorc",
    description=(
        "The 33-rune Anglo-Saxon alphabet, c. 5th-11th centuries. "
        "Extends Elder Futhark with runes for Old English phonology "
        "(Ac, Æsc, Yr, Ior, Ear) and later Northumbrian additions "
        "(Cweorð, Calc, Stan, Gar). Meanings track the Anglo-Saxon "
        "Rune Poem (c. 8th-10th c.)."
    ),
    runes=_FUTHORC,
)


# ───── Armanen ──────────────────────────────────────────────────────
#
# Guido von List's 1902 modern reconstruction, published in *Das
# Geheimnis der Runen* ("The Secret of the Runes"). Eighteen runes
# corresponding to the eighteen charms of Odin in the *Hávamál*
# (Rúnatal stanzas 138-145).
#
# HONESTY NOTE (important): the Armanen system is a **modern
# reconstruction**, not a historical alphabet. It draws on Old Norse
# and Germanic material but sequences and glyph associations were
# invented by von List. It has significant use in modern esoteric
# practice — particularly the Odinist / Ariosophic currents — and
# is bundled here as a reference system that users may choose. The
# description below flags its provenance so practitioners aren't
# misled about historicity.
#
# The Ariosophic and later Armanen-adjacent traditions were also
# exploited by 20th-century racialist movements. The bundle ships
# the alphabet as a reference tool; use of any tradition remains at
# the practitioner's discretion and responsibility.

_ARMANEN = (
    BuiltinRune(
        index=0, name="Fa", transliteration="F", glyph="ᚠ", aett=1,
        element="fire", symmetric=False,
        upright_meaning="Primal fire; the first movement, wealth as generative energy, creative impulse.",
        reversed_meaning="Fire that consumes rather than kindles; wealth as end rather than means.",
    ),
    BuiltinRune(
        index=1, name="Ur", transliteration="U", glyph="ᚢ", aett=1,
        element="earth", symmetric=False,
        upright_meaning="Primordial cause; the ancient root, essential health, that which stands before all.",
        reversed_meaning="Origin forgotten, root cut, health that cannot be recovered.",
    ),
    BuiltinRune(
        index=2, name="Thurs", transliteration="Th", glyph="ᚦ", aett=1,
        element="fire", symmetric=False,
        upright_meaning="Directed force; the pointed thrust that pierces obstacle, defensive intelligence.",
        reversed_meaning="Force turned inward; the thrust that wounds the wielder.",
    ),
    BuiltinRune(
        index=3, name="Os", transliteration="O", glyph="ᚬ", aett=1,
        element="air", symmetric=False,
        upright_meaning="Divine mouth; oath-sworn word, the god's speech that binds reality.",
        reversed_meaning="Word broken, divine channel closed, silence where speech was owed.",
    ),
    BuiltinRune(
        index=4, name="Rit", transliteration="R", glyph="ᚱ", aett=1,
        element="air", symmetric=False,
        upright_meaning="Right / rite / rhythm; the correct procession, cosmic order, ritual movement.",
        reversed_meaning="Order broken, ritual disrupted, motion without rhythm.",
    ),
    BuiltinRune(
        index=5, name="Ka", transliteration="K", glyph="ᚴ", aett=1,
        element="fire", symmetric=False,
        upright_meaning="Ancestral fire; sacred lineage, the burning that continues in the blood.",
        reversed_meaning="Lineage cut, ancestral fire extinguished, inheritance refused.",
    ),
    BuiltinRune(
        index=6, name="Hagal", transliteration="H", glyph="ᚼ", aett=2,
        element="ice", symmetric=True,
        upright_meaning="World-crystal; the seed of all-form, the hexagon that maps every possibility, cosmic pattern.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=7, name="Not", transliteration="N", glyph="ᚾ", aett=2,
        element="fire", symmetric=False,
        upright_meaning="Necessity; that which cannot be avoided, the fated path acknowledged, endurance under compulsion.",
        reversed_meaning="Resistance to what must be, refusal of the fated path, endurance failing.",
    ),
    BuiltinRune(
        index=8, name="Is", transliteration="I", glyph="ᛁ", aett=2,
        element="ice", symmetric=True,
        upright_meaning="Ego; the still I, individuation held against the flux, the crystallised self.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=9, name="Ar", transliteration="A", glyph="ᚨ", aett=2,
        element="fire", symmetric=False,
        upright_meaning="Solar year; the sun's course, harvest completed, honoured completion of the cycle.",
        reversed_meaning="Sun that will not rise; cycle broken before harvest.",
    ),
    BuiltinRune(
        index=10, name="Sig", transliteration="S", glyph="ᛋ", aett=2,
        element="fire", symmetric=False,
        upright_meaning="Victory; solar power actualised, the will's decisive stroke, brilliance made manifest.",
        reversed_meaning="Victory hollowed by its cost; power that consumes what it saved.",
    ),
    BuiltinRune(
        index=11, name="Tyr", transliteration="T", glyph="ᛏ", aett=3,
        element="air", symmetric=False,
        upright_meaning="The sworn hand; oath kept at cost, the judge who does not turn aside.",
        reversed_meaning="Oath broken; judgement withdrawn; the hand that would not sacrifice.",
    ),
    BuiltinRune(
        index=12, name="Bar", transliteration="B", glyph="ᛒ", aett=3,
        element="earth", symmetric=False,
        upright_meaning="Birth-giver; the returning mother, spring's promise, the cradle held.",
        reversed_meaning="Birth denied; spring's promise revoked; the cradle empty.",
    ),
    BuiltinRune(
        index=13, name="Laf", transliteration="L", glyph="ᛚ", aett=3,
        element="water", symmetric=False,
        upright_meaning="Primal law; the water that follows its own current, cosmic ordering by flow.",
        reversed_meaning="Law flouted; flow diverted; the current that fights itself.",
    ),
    BuiltinRune(
        index=14, name="Man", transliteration="M", glyph="ᛗ", aett=3,
        element="air", symmetric=True,
        upright_meaning="Humanity awake; the seeker's ascent, hands raised in acknowledgement of the higher.",
        reversed_meaning="(symmetric rune — no reversed reading)",
    ),
    BuiltinRune(
        index=15, name="Yr", transliteration="Y", glyph="ᛦ", aett=3,
        element="earth", symmetric=False,
        upright_meaning="Death-humanity; hands lowered in acknowledgement of the lower, mortality faced.",
        reversed_meaning="Death denied; the lower refused; mortality unfaced.",
    ),
    BuiltinRune(
        index=16, name="Eh", transliteration="E", glyph="ᛖ", aett=3,
        element="earth", symmetric=False,
        upright_meaning="Sacred marriage; two joined into one, the alchemical union, partnership as work.",
        reversed_meaning="Union broken; the alchemy failed; partnership as burden.",
    ),
    BuiltinRune(
        index=17, name="Gibor", transliteration="G", glyph="ᚸ", aett=3,
        element="fire", symmetric=False,
        upright_meaning="The great gift; cosmic reciprocity, the divine exchange, the offering that returns transformed.",
        reversed_meaning="Gift refused; reciprocity broken; offering that vanishes without return.",
    ),
)


ARMANEN_RUNES: BuiltinRuneSet = BuiltinRuneSet(
    set_id=RuneSet.ARMANEN,
    name="Armanen Runes",
    description=(
        "The 18-rune modern reconstruction of Guido von List (1902, "
        "*Das Geheimnis der Runen*), one rune per stanza of the "
        "Hávamál's Rúnatal (138-145). This is NOT a historical "
        "alphabet — von List invented the sequence and many "
        "associations. Bundled here as a reference for practitioners "
        "who work in the Armanen tradition. Its later associations "
        "with 20th-century racialist movements are documented; the "
        "runes ship without endorsement of that use."
    ),
    runes=_ARMANEN,
)
