"""Bundled built-in Tarot decks + spreads.

These are loaded into the database at application startup (an
upsert-by-slug pattern matching :mod:`theourgia.core.templates.builtins`
for entry templates). User decks coexist with built-ins; built-ins
are immutable.

Currently bundled:

* **Rider-Waite-Smith** — 78-card deck, 1909, by A. E. Waite + Pamela
  Colman Smith. Public domain in jurisdictions following the
  life+70 standard (Smith died 1951; public domain since 2022).
  Card meanings here are paraphrased from Waite's 1910 *Pictorial
  Key to the Tarot* (also public domain).

Reversed-meaning text intentionally stays terse — long-form
interpretation is the user's, not the bundle's. The ``upright_meaning``
columns carry traditional one-line summaries so the engine has
something to ship; users override per card via the personal-notes
table (Phase 06 follow-up batch).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from theourgia.models.tarot import DeckTradition, Suit

__all__ = [
    "BuiltinCard",
    "BuiltinDeck",
    "BuiltinSpread",
    "BUILTIN_DECKS",
    "BUILTIN_SPREADS",
    "RIDER_WAITE_SMITH",
]


@dataclass(frozen=True, slots=True)
class BuiltinCard:
    position: int
    slug: str
    name: str
    suit: Suit
    arcana_number: int | None
    upright_meaning: str
    reversed_meaning: str
    correspondences: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class BuiltinDeck:
    slug: str
    name: str
    creator: str
    license: str
    language: str
    tradition: DeckTradition
    reversal_convention: bool
    art_set: str
    description: str
    cards: tuple[BuiltinCard, ...]


@dataclass(frozen=True, slots=True)
class BuiltinSpread:
    slug: str
    name: str
    kind: str  # SpreadKind value
    description: str
    positions: tuple[dict[str, object], ...]


# ───── Rider-Waite-Smith ──────────────────────────────────────────────


def _rws_majors() -> tuple[BuiltinCard, ...]:
    """22 major arcana, 0 through 21."""
    majors = [
        ("the-fool", "The Fool", "Beginnings, innocence, leap of faith, spontaneity.",
         "Recklessness, hesitation, naivete.",
         {"hebrew_letter": "Aleph", "element": "air", "tree_of_life_path": "11"}),
        ("the-magician", "The Magician", "Will, focus, manifestation, skill.",
         "Manipulation, untapped potential, blocked will.",
         {"hebrew_letter": "Beth", "planet": "Mercury", "tree_of_life_path": "12"}),
        ("the-high-priestess", "The High Priestess",
         "Intuition, sacred knowledge, subconscious, mystery.",
         "Secrets withheld, disconnection from intuition.",
         {"hebrew_letter": "Gimel", "planet": "Moon", "tree_of_life_path": "13"}),
        ("the-empress", "The Empress",
         "Abundance, fertility, nurturing, the natural world.",
         "Smothering, stagnation, neglect of self.",
         {"hebrew_letter": "Daleth", "planet": "Venus", "tree_of_life_path": "14"}),
        ("the-emperor", "The Emperor",
         "Authority, structure, established order, fatherhood.",
         "Tyranny, rigidity, abuse of power.",
         {"hebrew_letter": "Heh", "zodiac": "Aries", "tree_of_life_path": "15"}),
        ("the-hierophant", "The Hierophant",
         "Tradition, teaching, institutional wisdom, faith.",
         "Dogma, broken vows, challenging the status quo.",
         {"hebrew_letter": "Vau", "zodiac": "Taurus", "tree_of_life_path": "16"}),
        ("the-lovers", "The Lovers",
         "Union, choice, harmony, alignment of values.",
         "Disharmony, misalignment, choice deferred.",
         {"hebrew_letter": "Zain", "zodiac": "Gemini", "tree_of_life_path": "17"}),
        ("the-chariot", "The Chariot",
         "Willed motion, victory, discipline, control.",
         "Loss of direction, scattered force.",
         {"hebrew_letter": "Cheth", "zodiac": "Cancer", "tree_of_life_path": "18"}),
        ("strength", "Strength",
         "Inner strength, courage, compassion, soft mastery.",
         "Self-doubt, weakness, force without restraint.",
         {"hebrew_letter": "Teth", "zodiac": "Leo", "tree_of_life_path": "19"}),
        ("the-hermit", "The Hermit",
         "Withdrawal, introspection, inner light, the guide.",
         "Isolation, loneliness, refusing counsel.",
         {"hebrew_letter": "Yod", "zodiac": "Virgo", "tree_of_life_path": "20"}),
        ("wheel-of-fortune", "Wheel of Fortune",
         "Cycles, turning points, fate, destiny.",
         "Resistance to change, bad luck, broken cycle.",
         {"hebrew_letter": "Kaph", "planet": "Jupiter", "tree_of_life_path": "21"}),
        ("justice", "Justice",
         "Balance, cause and effect, truth, lawful judgement.",
         "Imbalance, bias, evasion of consequence.",
         {"hebrew_letter": "Lamed", "zodiac": "Libra", "tree_of_life_path": "22"}),
        ("the-hanged-man", "The Hanged Man",
         "Surrender, pause, new perspective, sacrifice.",
         "Stagnation, indecision, sacrifice without insight.",
         {"hebrew_letter": "Mem", "element": "water", "tree_of_life_path": "23"}),
        ("death", "Death",
         "Endings, transformation, transitions, release.",
         "Resistance to change, prolonged endings.",
         {"hebrew_letter": "Nun", "zodiac": "Scorpio", "tree_of_life_path": "24"}),
        ("temperance", "Temperance",
         "Moderation, blending, alchemy, patience.",
         "Excess, imbalance, impatience.",
         {"hebrew_letter": "Samekh", "zodiac": "Sagittarius", "tree_of_life_path": "25"}),
        ("the-devil", "The Devil",
         "Bondage, materialism, addiction, shadow contracts.",
         "Releasing limitation, breaking patterns.",
         {"hebrew_letter": "Ayin", "zodiac": "Capricorn", "tree_of_life_path": "26"}),
        ("the-tower", "The Tower",
         "Sudden upheaval, revelation, false structures falling.",
         "Averted disaster, fear of change, internal collapse.",
         {"hebrew_letter": "Peh", "planet": "Mars", "tree_of_life_path": "27"}),
        ("the-star", "The Star",
         "Hope, renewal, calm, guidance.",
         "Despair, disconnection, hope deferred.",
         {"hebrew_letter": "Tzaddi", "zodiac": "Aquarius", "tree_of_life_path": "28"}),
        ("the-moon", "The Moon",
         "Dreams, illusion, intuition, the unconscious surfacing.",
         "Confusion lifting, hidden things revealed.",
         {"hebrew_letter": "Qoph", "zodiac": "Pisces", "tree_of_life_path": "29"}),
        ("the-sun", "The Sun",
         "Joy, success, vitality, the visible good.",
         "Temporary clouds, ego inflation.",
         {"hebrew_letter": "Resh", "planet": "Sun", "tree_of_life_path": "30"}),
        ("judgement", "Judgement",
         "Awakening, reckoning, calling, second chances.",
         "Self-doubt, refusal of the call.",
         {"hebrew_letter": "Shin", "element": "fire", "tree_of_life_path": "31"}),
        ("the-world", "The World",
         "Completion, integration, accomplishment.",
         "Loose ends, incomplete cycle.",
         {"hebrew_letter": "Tau", "planet": "Saturn", "tree_of_life_path": "32"}),
    ]
    return tuple(
        BuiltinCard(
            position=i,
            slug=slug,
            name=name,
            suit=Suit.MAJOR,
            arcana_number=i,
            upright_meaning=upright,
            reversed_meaning=reversed_m,
            correspondences=corr,
        )
        for i, (slug, name, upright, reversed_m, corr) in enumerate(majors)
    )


_RANKS: tuple[tuple[int, str, str], ...] = (
    (1, "ace", "Ace"),
    (2, "two", "Two"),
    (3, "three", "Three"),
    (4, "four", "Four"),
    (5, "five", "Five"),
    (6, "six", "Six"),
    (7, "seven", "Seven"),
    (8, "eight", "Eight"),
    (9, "nine", "Nine"),
    (10, "ten", "Ten"),
    (11, "page", "Page"),
    (12, "knight", "Knight"),
    (13, "queen", "Queen"),
    (14, "king", "King"),
)

_SUIT_META: dict[Suit, dict[str, str]] = {
    Suit.WANDS: {"element": "fire", "label": "Wands"},
    Suit.CUPS: {"element": "water", "label": "Cups"},
    Suit.SWORDS: {"element": "air", "label": "Swords"},
    Suit.PENTACLES: {"element": "earth", "label": "Pentacles"},
}

# Brief upright / reversed pairs per rank, used as fallbacks where
# per-card text is not customised. Long-form interpretation is the
# user's via the personal-notes overlay (follow-up batch).
_RANK_GLOSS: dict[int, tuple[str, str]] = {
    1: ("Seed, initiation, pure essence of the suit.",
        "Delayed start, blocked spark."),
    2: ("Balance, partnership, first choice.",
        "Imbalance, indecision."),
    3: ("First flowering, collaboration, growth.",
        "Stalled growth, broken trio."),
    4: ("Stability, foundation, rest.",
        "Stagnation, complacency, breach."),
    5: ("Conflict, change, friction.",
        "Conflict releasing, lesson integrated."),
    6: ("Harmony restored, generosity, passage.",
        "Hollow harmony, missed crossing."),
    7: ("Choice under pressure, deception or vision.",
        "Clarity returning, choice made."),
    8: ("Movement, swift change, mastery building.",
        "Slowed movement, blocked craft."),
    9: ("Refinement, near-completion, vigil.",
        "Refinement deferred, broken vigil."),
    10: ("Culmination, burden of completion.",
         "Cycle ending in collapse, release."),
    11: ("Curiosity, message, beginner's grace.",
         "Immaturity, rumor, broken message."),
    12: ("Pursuit, focused action.",
         "Recklessness or paralysis."),
    13: ("Mature feeling, inward sovereignty.",
         "Withdrawn, inverted authority."),
    14: ("Outward sovereignty, command of the suit's element.",
         "Tyranny, abdication."),
}


def _rws_minors() -> tuple[BuiltinCard, ...]:
    minors: list[BuiltinCard] = []
    position = 22  # majors are 0..21
    for suit in (Suit.WANDS, Suit.CUPS, Suit.SWORDS, Suit.PENTACLES):
        meta = _SUIT_META[suit]
        for rank, rank_slug, rank_name in _RANKS:
            upright_base, reversed_base = _RANK_GLOSS[rank]
            slug = f"{rank_slug}-of-{meta['label'].lower()}"
            name = f"{rank_name} of {meta['label']}"
            minors.append(
                BuiltinCard(
                    position=position,
                    slug=slug,
                    name=name,
                    suit=suit,
                    arcana_number=rank,
                    upright_meaning=f"{upright_base} (Suit of {meta['label']}, element of {meta['element']}.)",
                    reversed_meaning=reversed_base,
                    correspondences={
                        "element": meta["element"],
                        "suit": meta["label"].lower(),
                        "rank": rank,
                    },
                )
            )
            position += 1
    return tuple(minors)


def _rws_full() -> tuple[BuiltinCard, ...]:
    return _rws_majors() + _rws_minors()


RIDER_WAITE_SMITH: BuiltinDeck = BuiltinDeck(
    slug="rider-waite-smith",
    name="Rider-Waite-Smith",
    creator="A. E. Waite & Pamela Colman Smith",
    license="public-domain",
    language="en",
    tradition=DeckTradition.RIDER_WAITE,
    reversal_convention=True,
    art_set="rwsmith-1909",
    description=(
        "The classic 1909 Rider-Waite-Smith deck. Card meanings here are "
        "summarised from Waite's *Pictorial Key to the Tarot* (1910). "
        "Both the deck and the key are in the public domain in "
        "life+70 jurisdictions (Pamela Colman Smith died 1951)."
    ),
    cards=_rws_full(),
)


BUILTIN_DECKS: tuple[BuiltinDeck, ...] = (RIDER_WAITE_SMITH,)


# ───── Built-in spreads ───────────────────────────────────────────────


BUILTIN_SPREADS: tuple[BuiltinSpread, ...] = (
    BuiltinSpread(
        slug="single-card",
        name="Single Card",
        kind="single",
        description="One card. Quick check-in / daily draw.",
        positions=(
            {"index": 0, "name": "The Card", "meaning": "Today / the question at hand."},
        ),
    ),
    BuiltinSpread(
        slug="three-card-past-present-future",
        name="Three Card — Past · Present · Future",
        kind="three_card",
        description="Three cards arranged left to right. Classic time-axis spread.",
        positions=(
            {"index": 0, "name": "Past", "meaning": "What has been; the root."},
            {"index": 1, "name": "Present", "meaning": "What is now; the present situation."},
            {"index": 2, "name": "Future", "meaning": "What is forming; the direction."},
        ),
    ),
    BuiltinSpread(
        slug="three-card-situation-action-outcome",
        name="Three Card — Situation · Action · Outcome",
        kind="three_card",
        description="Three cards focused on decision-making.",
        positions=(
            {"index": 0, "name": "Situation", "meaning": "Where you are."},
            {"index": 1, "name": "Action", "meaning": "What to do."},
            {"index": 2, "name": "Outcome", "meaning": "Where the action leads."},
        ),
    ),
    BuiltinSpread(
        slug="celtic-cross",
        name="Celtic Cross",
        kind="celtic_cross",
        description="Ten-card classic spread.",
        positions=(
            {"index": 0, "name": "The Significator", "meaning": "The querent's present state."},
            {"index": 1, "name": "The Crossing Card", "meaning": "What crosses you — challenge or aid."},
            {"index": 2, "name": "The Crown", "meaning": "Conscious thought / goal."},
            {"index": 3, "name": "The Root", "meaning": "Unconscious foundation / past."},
            {"index": 4, "name": "Recent Past", "meaning": "What has just passed."},
            {"index": 5, "name": "Near Future", "meaning": "What is about to happen."},
            {"index": 6, "name": "The Self", "meaning": "How you see yourself."},
            {"index": 7, "name": "The Environment", "meaning": "What surrounds you."},
            {"index": 8, "name": "Hopes & Fears", "meaning": "What you hope for or fear."},
            {"index": 9, "name": "Outcome", "meaning": "The likely outcome on present course."},
        ),
    ),
    BuiltinSpread(
        slug="year-ahead",
        name="Year Ahead",
        kind="year_ahead",
        description="Twelve cards, one per month of the year ahead.",
        positions=tuple(
            {
                "index": i,
                "name": f"Month {i + 1}",
                "meaning": f"Theme for month {i + 1} of the year ahead.",
            }
            for i in range(12)
        ),
    ),
)


def builtin_deck_by_slug(slug: str) -> BuiltinDeck:
    """Lookup helper. Raises :class:`KeyError` for unknown slugs."""
    for d in BUILTIN_DECKS:
        if d.slug == slug:
            return d
    raise KeyError(slug)


def builtin_spread_by_slug(slug: str) -> BuiltinSpread:
    """Lookup helper. Raises :class:`KeyError` for unknown slugs."""
    for s in BUILTIN_SPREADS:
        if s.slug == slug:
            return s
    raise KeyError(slug)
