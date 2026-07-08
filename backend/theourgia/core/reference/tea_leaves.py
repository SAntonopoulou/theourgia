"""Tasseography / tea-leaf reading symbol reference.

b108-2hj · FEATURES §13 (reference plugin: tea-leaf reading log).

A curated dictionary of tasseography symbols and their traditional
significations. Sources span the Anglo-Irish + Continental
tea-reading tradition — Highland Mary, Cicely Kent, and the
19th-century almanac tradition.

Tasseography is a **non-mechanical** divination — the reader
identifies shapes that emerge in the settled leaves and interprets
them via a combination of dictionary and intuition. This is exactly
the FEATURES §13 use-case: a reference plugin that demonstrates a
divination system that isn't purely index-based (like tarot).

Each symbol carries:

- ``key``: stable slug for the symbol
- ``name``: display name
- ``upright_meaning``: traditional signification when clearly visible
- ``inverted_meaning``: if seen upside-down at the cup rim,
  optional reversal reading (leaves may present either orientation)
- ``position_notes``: where in the cup matters — rim = imminent,
  bottom = distant future or unresolved
- ``glyph_hint``: a short shape description to help identification
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = ["TeaLeafSymbol", "TEA_LEAF_SYMBOLS", "symbol_by_key"]


@dataclass(frozen=True)
class TeaLeafSymbol:
    key: str
    name: str
    upright_meaning: str
    inverted_meaning: str | None
    position_notes: str
    glyph_hint: str


TEA_LEAF_SYMBOLS: tuple[TeaLeafSymbol, ...] = (
    TeaLeafSymbol(
        key="acorn",
        name="Acorn",
        upright_meaning="Improved health or success from small beginnings; steady growth.",
        inverted_meaning="Setback in a growing venture; something halted.",
        position_notes="Rim → imminent; bottom → long-term outcome.",
        glyph_hint="Small oval with a small cap or curl at the top.",
    ),
    TeaLeafSymbol(
        key="anchor",
        name="Anchor",
        upright_meaning="Stability, safe harbour, a return home. Success reached.",
        inverted_meaning="Held back, dragged down; a burden hard to release.",
        position_notes="Near the handle → stability in family / hearth.",
        glyph_hint="Curved crossbar with a stem ending in two hooks.",
    ),
    TeaLeafSymbol(
        key="angel",
        name="Angel",
        upright_meaning="Good tidings; protection; unexpected help.",
        inverted_meaning=None,
        position_notes="Near the rim → news arriving soon.",
        glyph_hint="Roughly a body with two upward-fanning shapes as wings.",
    ),
    TeaLeafSymbol(
        key="axe",
        name="Axe",
        upright_meaning="Overcoming difficulties by decisive action; cutting away.",
        inverted_meaning="Trouble endured or self-inflicted; hasty separation.",
        position_notes="Near the handle → decision affects home life.",
        glyph_hint="Wedge shape on a straight line.",
    ),
    TeaLeafSymbol(
        key="bell",
        name="Bell",
        upright_meaning="A message; often marriage or celebration announcement.",
        inverted_meaning="Sad news; a warning tolled.",
        position_notes="Two bells → double announcement.",
        glyph_hint="Rounded triangle with a small dot below.",
    ),
    TeaLeafSymbol(
        key="bird",
        name="Bird (flying)",
        upright_meaning="Good news arriving swiftly; a hopeful message.",
        inverted_meaning="Delayed news; a message that missed its moment.",
        position_notes="Direction of flight matters — toward the querent = arriving.",
        glyph_hint="Two shallow curves forming a wide 'M' or 'W'.",
    ),
    TeaLeafSymbol(
        key="book_open",
        name="Book (open)",
        upright_meaning="Discovery; a secret revealed; formal learning.",
        inverted_meaning="Concealment; something the reader is not ready to know.",
        position_notes="Near the rim → discovery is close.",
        glyph_hint="Two adjacent rectangles with an outer curve.",
    ),
    TeaLeafSymbol(
        key="candle",
        name="Candle",
        upright_meaning="Illumination, guidance, help from a mentor.",
        inverted_meaning="Guidance withdrawn; the light gone out.",
        position_notes="Central → guidance central to the question.",
        glyph_hint="Tall thin shape with a smaller flame-like tip.",
    ),
    TeaLeafSymbol(
        key="cat",
        name="Cat",
        upright_meaning="A friend disguised; caution needed with an ally.",
        inverted_meaning="Deceit or betrayal by someone close.",
        position_notes="Near the querent's position → immediate circle.",
        glyph_hint="Roughly triangular head with two upward ears.",
    ),
    TeaLeafSymbol(
        key="chain",
        name="Chain",
        upright_meaning="Marriage or partnership; sequential events; alliance.",
        inverted_meaning="Restriction; bondage; broken commitments.",
        position_notes="Long chain → prolonged partnership arc.",
        glyph_hint="A series of connected loops or ovals.",
    ),
    TeaLeafSymbol(
        key="circle",
        name="Circle",
        upright_meaning="Completion, wholeness, a cycle brought to close.",
        inverted_meaning="A cycle that has closed too soon; premature ending.",
        position_notes="With a dot inside → conception; new beginning.",
        glyph_hint="A ring shape, roughly closed.",
    ),
    TeaLeafSymbol(
        key="clover",
        name="Clover / Shamrock",
        upright_meaning="Good fortune; blessing; a stroke of luck.",
        inverted_meaning="Missed fortune; a lucky break declined.",
        position_notes="Near the rim → luck is imminent.",
        glyph_hint="Three or four small rounded lobes on a short stem.",
    ),
    TeaLeafSymbol(
        key="cross",
        name="Cross",
        upright_meaning="A trial or burden to be borne; endurance rewarded.",
        inverted_meaning="Suffering deepening; a burden hard to release.",
        position_notes="Bottom of cup → distant hardship yet to arrive.",
        glyph_hint="Two intersecting lines forming a plus.",
    ),
    TeaLeafSymbol(
        key="crown",
        name="Crown",
        upright_meaning="Honour, achievement, promotion, recognition.",
        inverted_meaning="Honour lost or refused; abdication.",
        position_notes="Near handle → recognition from family.",
        glyph_hint="Curved base with three or five upward points.",
    ),
    TeaLeafSymbol(
        key="cup",
        name="Cup",
        upright_meaning="Love offered, generosity, an emotional gift.",
        inverted_meaning="Love withheld; emotional overflow, spilled feelings.",
        position_notes="Cup emptying downward → giving away.",
        glyph_hint="Rounded U-shape with a small handle to one side.",
    ),
    TeaLeafSymbol(
        key="dagger",
        name="Dagger",
        upright_meaning="Warning of sudden trouble; a swift decision needed.",
        inverted_meaning="A wound already given; regret.",
        position_notes="Pointing at querent → threat directed at them.",
        glyph_hint="Straight line with a small crossguard near one end.",
    ),
    TeaLeafSymbol(
        key="dog",
        name="Dog",
        upright_meaning="A loyal friend; steadfast affection.",
        inverted_meaning="A friend faltering; misunderstanding.",
        position_notes="Two dogs → mutual loyalty in a partnership.",
        glyph_hint="Four small dots as legs with an oval body and small tail.",
    ),
    TeaLeafSymbol(
        key="dove",
        name="Dove",
        upright_meaning="Peace, reconciliation, good tidings from afar.",
        inverted_meaning=None,
        position_notes="Rim → arrival of peace soon.",
        glyph_hint="Small oval body with a fanned tail.",
    ),
    TeaLeafSymbol(
        key="eye",
        name="Eye",
        upright_meaning="Awakening; being watched over; discernment.",
        inverted_meaning="Being observed by a hostile presence; jealousy.",
        position_notes="Two eyes → mutual recognition; witness.",
        glyph_hint="Oval with a small dot inside.",
    ),
    TeaLeafSymbol(
        key="feather",
        name="Feather",
        upright_meaning="Inconstancy of thought; a matter still uncertain.",
        inverted_meaning="Fickleness in another; unreliability.",
        position_notes="Multiple feathers → many possibilities open.",
        glyph_hint="Long thin shape with small hair-like divisions.",
    ),
    TeaLeafSymbol(
        key="fish",
        name="Fish",
        upright_meaning="Prosperity, especially from unexpected sources; gain from abroad.",
        inverted_meaning="Loss connected to water or travel.",
        position_notes="Two fish → doubled gain.",
        glyph_hint="A pointed oval body with a small fanned tail.",
    ),
    TeaLeafSymbol(
        key="flag",
        name="Flag",
        upright_meaning="A cause taken up; a public declaration; loyalty.",
        inverted_meaning="A cause abandoned; loyalty tested.",
        position_notes="Direction the flag flies → toward whom loyalty flows.",
        glyph_hint="A pole with a rectangular shape at one end.",
    ),
    TeaLeafSymbol(
        key="fountain",
        name="Fountain",
        upright_meaning="Great success; abundant blessings; unexpected inheritance.",
        inverted_meaning="Blessing diverted or delayed.",
        position_notes="Rare and always significant when seen clearly.",
        glyph_hint="Vertical shape with smaller dots or streaks radiating up.",
    ),
    TeaLeafSymbol(
        key="hand",
        name="Hand",
        upright_meaning="Friendship offered or received; a helping gesture.",
        inverted_meaning="Hand withdrawn; refusal.",
        position_notes="Open palm up → generosity; closed → held back.",
        glyph_hint="Small oval with four or five short lines extending upward.",
    ),
    TeaLeafSymbol(
        key="heart",
        name="Heart",
        upright_meaning="Love; genuine affection; deep emotional bond forming.",
        inverted_meaning="Heartbreak; love denied or ended.",
        position_notes="Near another symbol → the heart is directed there.",
        glyph_hint="A rough V with two rounded upper bumps.",
    ),
    TeaLeafSymbol(
        key="horseshoe",
        name="Horseshoe",
        upright_meaning="Good luck, protection, a lucky journey.",
        inverted_meaning="Luck spilled out; protection lost.",
        position_notes="Open end up → luck retained; open end down → draining.",
        glyph_hint="A curved U-shape.",
    ),
    TeaLeafSymbol(
        key="key",
        name="Key",
        upright_meaning="A door about to open; solution to a problem; access granted.",
        inverted_meaning="A door closing; opportunity missed.",
        position_notes="Two keys → double opportunity; near handle → home matters.",
        glyph_hint="A long stem with a bulge or teeth at one end.",
    ),
    TeaLeafSymbol(
        key="knife",
        name="Knife",
        upright_meaning="A quarrel or severance; sharp words expected.",
        inverted_meaning="Grief from a broken relationship.",
        position_notes="Pointing away from querent → they cause the rift.",
        glyph_hint="Long straight line ending in a point.",
    ),
    TeaLeafSymbol(
        key="ladder",
        name="Ladder",
        upright_meaning="Advancement; steady climb to a goal; promotion.",
        inverted_meaning="Descent; return to an earlier stage.",
        position_notes="Number of rungs may reflect steps required.",
        glyph_hint="Two parallel lines with short crossbars.",
    ),
    TeaLeafSymbol(
        key="moon_crescent",
        name="Crescent Moon",
        upright_meaning="A romantic beginning; imagination stirred; secret work.",
        inverted_meaning="A romance fading; illusion collapsing.",
        position_notes="Waxing crescent → new; waning → ending.",
        glyph_hint="A thin curved sickle shape.",
    ),
    TeaLeafSymbol(
        key="mountain",
        name="Mountain",
        upright_meaning="An obstacle overcome; visible achievement.",
        inverted_meaning="Obstacle looming; goal still distant.",
        position_notes="Several peaks → multiple sequential challenges.",
        glyph_hint="Triangular peak, sometimes with adjacent smaller peaks.",
    ),
    TeaLeafSymbol(
        key="ring",
        name="Ring",
        upright_meaning="Union, marriage, contract; completion of an agreement.",
        inverted_meaning="A broken engagement; contract dissolved.",
        position_notes="With a dot inside → engagement announcement.",
        glyph_hint="A closed circle, usually smaller than the 'Circle' symbol.",
    ),
    TeaLeafSymbol(
        key="scales",
        name="Scales",
        upright_meaning="Justice, balance, a legal matter resolved fairly.",
        inverted_meaning="Injustice; imbalance in a matter.",
        position_notes="Tilted → toward whom the outcome leans.",
        glyph_hint="Horizontal line with two small circles suspended below.",
    ),
    TeaLeafSymbol(
        key="ship",
        name="Ship",
        upright_meaning="A journey; success from travel; commerce.",
        inverted_meaning="A journey delayed or diverted.",
        position_notes="Direction of prow → destination.",
        glyph_hint="A curved base with vertical lines rising as masts.",
    ),
    TeaLeafSymbol(
        key="snake",
        name="Snake",
        upright_meaning="Wisdom, transformation; also a hidden enemy.",
        inverted_meaning="Betrayal by someone thought trusted.",
        position_notes="Coiled → contained threat; uncoiled → active.",
        glyph_hint="A long wavy line.",
    ),
    TeaLeafSymbol(
        key="star",
        name="Star",
        upright_meaning="Hope, guidance, a wish coming true, blessing from above.",
        inverted_meaning="Hope deferred; a guiding light hidden.",
        position_notes="Number of points may echo a specific tradition.",
        glyph_hint="Central dot with several radiating short lines.",
    ),
    TeaLeafSymbol(
        key="sun",
        name="Sun",
        upright_meaning="Great success, joy, prosperity, health.",
        inverted_meaning="Success clouded; joy tempered.",
        position_notes="Central sun → the querent's whole outlook brightening.",
        glyph_hint="Round centre with radiating lines all around.",
    ),
    TeaLeafSymbol(
        key="sword",
        name="Sword",
        upright_meaning="Conflict resolved by principle; justice sought.",
        inverted_meaning="A prolonged quarrel; wounds from words.",
        position_notes="Broken sword → a fight given up.",
        glyph_hint="A long line with a small crossguard near the hilt.",
    ),
    TeaLeafSymbol(
        key="tree",
        name="Tree",
        upright_meaning="Growth over time; ambition realised; long-term success.",
        inverted_meaning="Growth stunted; ambitions unrealised.",
        position_notes="Two trees → parallel growth in two areas.",
        glyph_hint="A vertical trunk with an oval or branching crown.",
    ),
    TeaLeafSymbol(
        key="triangle",
        name="Triangle",
        upright_meaning="Unexpected inheritance; sudden good fortune.",
        inverted_meaning="A plan gone awry; disappointment.",
        position_notes="Pointing up → success; pointing down → reversal.",
        glyph_hint="Three lines meeting at points.",
    ),
    TeaLeafSymbol(
        key="wheel",
        name="Wheel",
        upright_meaning="Progress; cycles turning in one's favour.",
        inverted_meaning="A halt; the cycle stuck.",
        position_notes="Broken wheel → progress interrupted.",
        glyph_hint="A circle with lines crossing through the centre.",
    ),
)


def symbol_by_key(key: str) -> TeaLeafSymbol | None:
    for s in TEA_LEAF_SYMBOLS:
        if s.key == key:
            return s
    return None
