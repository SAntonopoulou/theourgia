"""Bundled 64 King Wen hexagrams.

Names, trigram structure, and a brief judgment summary for each
hexagram. The judgment summaries are paraphrased from public-domain
sources (Legge 1899; Yi Jing material is also pre-1923 PD); the long
canonical translations and the per-line texts seed in a follow-up
data batch so this file stays scannable.

Each :class:`BuiltinHexagram` carries enough to render a reading at
this batch level: name (pinyin + English), structure (trigram pair +
six-line pattern), and a brief judgment summary. The bundle seeder
upserts these into the ``hexagram`` table at app startup.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from theourgia.core.divination.iching.engine import (
    _KING_WEN_BINARY,  # noqa: PLC2701 — intentional internal use
)
from theourgia.models.iching import Trigram

__all__ = [
    "BUILTIN_HEXAGRAMS",
    "BuiltinHexagram",
    "TRIGRAM_PATTERNS",
    "hexagram_by_number",
    "trigram_for_lines",
]


# ───── Trigram patterns ────────────────────────────────────────────────


# Each trigram is three lines, bottom-up; True = yang.
TRIGRAM_PATTERNS: dict[Trigram, tuple[bool, bool, bool]] = {
    Trigram.QIAN: (True, True, True),     # ☰ heaven
    Trigram.DUI: (True, True, False),     # ☱ lake — yang yang yin bottom-up
    Trigram.LI: (True, False, True),      # ☲ fire — yang yin yang bottom-up
    Trigram.ZHEN: (True, False, False),   # ☳ thunder — yang yin yin bottom-up
    Trigram.XUN: (False, True, True),     # ☴ wind — yin yang yang bottom-up
    Trigram.KAN: (False, True, False),    # ☵ water — yin yang yin bottom-up
    Trigram.GEN: (False, False, True),    # ☶ mountain — yin yin yang bottom-up
    Trigram.KUN: (False, False, False),   # ☷ earth
}


def trigram_for_lines(lines: tuple[bool, bool, bool]) -> Trigram:
    """Look up the trigram name for a three-line bottom-up pattern."""
    for trigram, pattern in TRIGRAM_PATTERNS.items():
        if pattern == lines:
            return trigram
    raise KeyError(lines)


# ───── BuiltinHexagram ────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class BuiltinHexagram:
    number: int
    name_pinyin: str
    name_english: str
    judgment_summary: str
    image_summary: str = ""
    correspondences: dict[str, object] = field(default_factory=dict)

    @property
    def binary_pattern(self) -> str:
        return _KING_WEN_BINARY[self.number - 1]

    @property
    def lines(self) -> tuple[bool, ...]:
        return tuple(c == "1" for c in self.binary_pattern)

    @property
    def lower_trigram(self) -> Trigram:
        # Lines 1-3 are the lower trigram (bottom-up first three).
        return trigram_for_lines(self.lines[0:3])  # type: ignore[arg-type]

    @property
    def upper_trigram(self) -> Trigram:
        # Lines 4-6 are the upper trigram.
        return trigram_for_lines(self.lines[3:6])  # type: ignore[arg-type]


# ───── The 64 ─────────────────────────────────────────────────────────


# Judgment + image summaries are terse paraphrases that match the
# tradition's tone (commanding, image-driven) without copying any
# single translation. Long-form text seeds via a follow-up data batch.
BUILTIN_HEXAGRAMS: tuple[BuiltinHexagram, ...] = (
    BuiltinHexagram(1, "Qián", "The Creative",
        "Sublime success through perseverance; the unbroken light moves.",
        "Heaven moves with strength; the noble one makes themself strong without end."),
    BuiltinHexagram(2, "Kūn", "The Receptive",
        "Sublime success through the perseverance of a mare; following brings benefit.",
        "Earth is wide and receives all; the noble one carries the world with virtue."),
    BuiltinHexagram(3, "Zhūn", "Difficulty at the Beginning",
        "Sprouting through hardship; do not act yet, find helpers.",
        "Clouds and thunder; the noble one orders the threads."),
    BuiltinHexagram(4, "Méng", "Youthful Folly",
        "Teaching the inexperienced; ask once, repeated asking is annoying.",
        "A spring at the foot of a mountain; the noble one fosters character."),
    BuiltinHexagram(5, "Xū", "Waiting",
        "Sincerity brings light and success; perseverance brings good fortune.",
        "Clouds rise to heaven; the noble one eats and drinks, is joyous and of good cheer."),
    BuiltinHexagram(6, "Sòng", "Conflict",
        "Be sincere but cautious; meeting the great is auspicious; crossing the great water is not.",
        "Heaven and water move in opposition; the noble one weighs beginnings."),
    BuiltinHexagram(7, "Shī", "The Army",
        "Perseverance and a strong leader bring fortune.",
        "Water in earth; the noble one nourishes the people."),
    BuiltinHexagram(8, "Bǐ", "Holding Together",
        "Good fortune; inquire of the oracle; the laggard meets misfortune.",
        "Water on earth; the ancient kings established states and bound the lords."),
    BuiltinHexagram(9, "Xiǎo Chù", "Small Taming",
        "Success; dense clouds yet no rain from our western region.",
        "Wind moves in heaven; the noble one refines the outward form of virtue."),
    BuiltinHexagram(10, "Lǚ", "Treading",
        "Treading on a tiger's tail; it does not bite; success.",
        "Heaven above the lake; the noble one distinguishes high from low."),
    BuiltinHexagram(11, "Tài", "Peace",
        "The small goes, the great comes; good fortune.",
        "Heaven and earth unite; the prince accords with heaven and earth."),
    BuiltinHexagram(12, "Pǐ", "Standstill",
        "Standstill stays; furthering not the noble one's perseverance.",
        "Heaven and earth part; the noble one withdraws to avoid difficulty."),
    BuiltinHexagram(13, "Tóng Rén", "Fellowship with Men",
        "Fellowship with men in the open; success; crossing the great water furthers.",
        "Heaven and fire; the noble one orders the clans and discriminates among things."),
    BuiltinHexagram(14, "Dà Yǒu", "Possession in Great Measure",
        "Sublime success.",
        "Fire above heaven; the noble one curbs evil and furthers the good."),
    BuiltinHexagram(15, "Qiān", "Modesty",
        "Success; the noble one carries things through.",
        "Mountain within the earth; the noble one reduces the much and augments the little."),
    BuiltinHexagram(16, "Yù", "Enthusiasm",
        "It furthers one to install helpers and set armies marching.",
        "Thunder bursts forth from the earth; the ancient kings made music to honor merit."),
    BuiltinHexagram(17, "Suí", "Following",
        "Sublime success; perseverance furthers; no blame.",
        "Thunder in the midst of the lake; the noble one goes indoors at the time of evening."),
    BuiltinHexagram(18, "Gǔ", "Work on the Decayed",
        "Sublime success; crossing the great water furthers; three days before, three days after.",
        "Wind beneath the mountain; the noble one stirs people and strengthens their spirit."),
    BuiltinHexagram(19, "Lín", "Approach",
        "Sublime success; perseverance furthers; in the eighth month, misfortune.",
        "Earth above the lake; the noble one is inexhaustible in their will to teach."),
    BuiltinHexagram(20, "Guān", "Contemplation",
        "The ablution has been made but not yet the offering; full of trust they look up.",
        "The wind blows over the earth; the ancient kings visited the regions and contemplated the people."),
    BuiltinHexagram(21, "Shì Hé", "Biting Through",
        "Success; let justice be administered.",
        "Thunder and lightning; the ancient kings made the penalties clear."),
    BuiltinHexagram(22, "Bì", "Grace",
        "Success; in small matters it is favorable to undertake something.",
        "Fire at the foot of the mountain; the noble one is bright in their daily affairs but does not decide cases by force."),
    BuiltinHexagram(23, "Bō", "Splitting Apart",
        "It does not further to go anywhere.",
        "The mountain rests on the earth; those above can ensure their position only by giving generously to those below."),
    BuiltinHexagram(24, "Fù", "Return",
        "Success; coming and going without error; friends come without blame.",
        "Thunder within the earth; the ancient kings closed the passes at the solstice."),
    BuiltinHexagram(25, "Wú Wàng", "Innocence",
        "Sublime success; perseverance furthers; if not as one ought, misfortune.",
        "Thunder under heaven; the ancient kings nourished all beings in accord with the time."),
    BuiltinHexagram(26, "Dà Chù", "Great Taming",
        "Perseverance furthers; not eating at home brings good fortune; crossing the great water furthers.",
        "Heaven within the mountain; the noble one acquaints themself with deeds of the past."),
    BuiltinHexagram(27, "Yí", "The Corners of the Mouth (Nourishment)",
        "Perseverance brings good fortune; pay attention to the providing of nourishment.",
        "Thunder at the foot of the mountain; the noble one is careful with their words and temperate in eating."),
    BuiltinHexagram(28, "Dà Guò", "Preponderance of the Great",
        "The ridgepole sags to the breaking point; it furthers one to have somewhere to go.",
        "The lake rises above the trees; the noble one when alone is unafraid and untroubled."),
    BuiltinHexagram(29, "Kǎn", "The Abysmal (Water)",
        "The Abysmal repeated; sincerity brings success; whatever one does succeeds.",
        "Water flows on uninterruptedly; the noble one practices virtue and the work of teaching."),
    BuiltinHexagram(30, "Lí", "The Clinging (Fire)",
        "Perseverance furthers; brings success; care of the cow brings good fortune.",
        "Brightness rises twice; the great one continues their work by illuminating the four quarters."),
    BuiltinHexagram(31, "Xián", "Influence (Wooing)",
        "Success; perseverance furthers; to take a maiden to wife brings good fortune.",
        "A lake on the mountain; the noble one encourages others to approach by being open."),
    BuiltinHexagram(32, "Héng", "Duration",
        "Success; no blame; perseverance furthers; it furthers one to have somewhere to go.",
        "Thunder and wind; the noble one stands firm and does not change direction."),
    BuiltinHexagram(33, "Dùn", "Retreat",
        "Success; in small matters perseverance furthers.",
        "Mountain beneath heaven; the noble one keeps the inferior at distance without anger."),
    BuiltinHexagram(34, "Dà Zhuàng", "Power of the Great",
        "Perseverance furthers.",
        "Thunder above heaven; the noble one does not tread upon paths that do not accord with rule."),
    BuiltinHexagram(35, "Jìn", "Progress",
        "The powerful prince is honored with horses in large numbers; in a single day they are granted audience three times.",
        "The sun rises over the earth; the noble one brightens their bright virtue."),
    BuiltinHexagram(36, "Míng Yí", "Darkening of the Light",
        "In adversity it furthers one to be persevering.",
        "The light has sunk into the earth; the noble one, when among the multitude, conceals their brightness."),
    BuiltinHexagram(37, "Jiā Rén", "The Family",
        "The perseverance of the woman furthers.",
        "Wind comes forth from fire; the noble one has substance in their words and duration in their way of life."),
    BuiltinHexagram(38, "Kuí", "Opposition",
        "In small matters, good fortune.",
        "Fire above, lake below; the noble one amid all fellowship retains their individuality."),
    BuiltinHexagram(39, "Jiǎn", "Obstruction",
        "The southwest furthers; the northeast does not; it furthers one to see the great one; perseverance brings good fortune.",
        "Water on the mountain; the noble one turns their attention to themself and molds their character."),
    BuiltinHexagram(40, "Jiě", "Deliverance",
        "The southwest furthers; if there is nothing to go after, then return brings good fortune.",
        "Thunder and rain set in; the noble one pardons mistakes and forgives misdeeds."),
    BuiltinHexagram(41, "Sǔn", "Decrease",
        "Decrease combined with sincerity brings supreme good fortune; what is to be used? Two bowls suffice for the sacrifice.",
        "Lake at the foot of the mountain; the noble one controls their anger and restrains their instincts."),
    BuiltinHexagram(42, "Yì", "Increase",
        "It furthers one to undertake something; crossing the great water furthers.",
        "Wind and thunder; the noble one, when seeing what is good, imitates it."),
    BuiltinHexagram(43, "Guài", "Breakthrough (Resoluteness)",
        "Resoluteness, announced at the king's court; sincerely cry out and warn one's own city.",
        "The lake rises up to heaven; the noble one dispenses riches and disdains accumulating wealth."),
    BuiltinHexagram(44, "Gòu", "Coming to Meet",
        "The maiden is powerful; one should not marry such a maiden.",
        "Under heaven, wind; the prince acts to spread their commands and proclaim their will."),
    BuiltinHexagram(45, "Cuì", "Gathering Together (Massing)",
        "Success; the king approaches their temple; it furthers one to see the great one; perseverance furthers.",
        "Over the earth, the lake; the noble one renews their weapons in order to meet the unforeseen."),
    BuiltinHexagram(46, "Shēng", "Pushing Upward",
        "Sublime success; one must see the great one; fear not; departure toward the south brings good fortune.",
        "Wood grows within the earth; the noble one piles up small things to attain the high and great."),
    BuiltinHexagram(47, "Kùn", "Oppression (Exhaustion)",
        "Success; perseverance for the great one brings good fortune without blame; when one has something to say, it is not believed.",
        "There is no water in the lake; the noble one stakes their life on following their will."),
    BuiltinHexagram(48, "Jǐng", "The Well",
        "The town may be changed but the well cannot be changed; nearly to draw the rope and the jug breaks—misfortune.",
        "Water over wood; the noble one encourages the people at their work and exhorts them to help one another."),
    BuiltinHexagram(49, "Gé", "Revolution (Molting)",
        "On your own day you are believed; success through perseverance; remorse disappears.",
        "Fire in the lake; the noble one orders the calendar and clarifies the times."),
    BuiltinHexagram(50, "Dǐng", "The Cauldron",
        "Sublime success.",
        "Fire over wood; the noble one consolidates their fate by setting the will in the right path."),
    BuiltinHexagram(51, "Zhèn", "The Arousing (Thunder)",
        "Shock brings success; shock comes—oh, oh! Laughing words—ha, ha! Shock terrifies for a hundred miles but they do not let fall the sacrificial spoon and chalice.",
        "Thunder repeated; the noble one in fear and trembling sets their life in order and examines themself."),
    BuiltinHexagram(52, "Gèn", "Keeping Still (Mountain)",
        "Keeping the back still so they no longer feel the body; going into the courtyard, they do not see the people.",
        "Mountains standing close together; the noble one does not let their thoughts go beyond their situation."),
    BuiltinHexagram(53, "Jiàn", "Development (Gradual Progress)",
        "The maiden is given in marriage; good fortune; perseverance furthers.",
        "On the mountain, a tree; the noble one abides in dignity and virtue."),
    BuiltinHexagram(54, "Guī Mèi", "The Marrying Maiden",
        "Undertakings bring misfortune; nothing that furthers.",
        "Thunder over the lake; the noble one understands the transitory in light of the eternity of the end."),
    BuiltinHexagram(55, "Fēng", "Abundance",
        "Success; the king attains it; be not sad—be like the sun at midday.",
        "Thunder and lightning come together; the noble one decides lawsuits and carries out punishments."),
    BuiltinHexagram(56, "Lǚ", "The Wanderer",
        "Success through smallness; perseverance brings good fortune to the wanderer.",
        "Fire on the mountain; the noble one is clear-minded and cautious in imposing penalties."),
    BuiltinHexagram(57, "Xùn", "The Gentle (Wind)",
        "Success through what is small; it furthers one to have somewhere to go; it furthers one to see the great one.",
        "Winds following one upon the other; the noble one spreads their commands abroad."),
    BuiltinHexagram(58, "Duì", "The Joyous (Lake)",
        "Success; perseverance furthers.",
        "Lakes resting one on the other; the noble one joins with friends for discussion and practice."),
    BuiltinHexagram(59, "Huàn", "Dispersion (Dissolution)",
        "Success; the king approaches their temple; it furthers one to cross the great water; perseverance furthers.",
        "The wind drives over the water; the ancient kings sacrificed to the Lord and built temples."),
    BuiltinHexagram(60, "Jié", "Limitation",
        "Success; galling limitation must not be persevered in.",
        "Water over lake; the noble one creates number and measure and examines the nature of virtue and right conduct."),
    BuiltinHexagram(61, "Zhōng Fú", "Inner Truth",
        "Pigs and fishes; good fortune; it furthers one to cross the great water; perseverance furthers.",
        "Wind over lake; the noble one discusses criminal cases in order to delay executions."),
    BuiltinHexagram(62, "Xiǎo Guò", "Preponderance of the Small",
        "Success; perseverance furthers; small things may be done, great things should not be done; the flying bird brings the message.",
        "Thunder on the mountain; the noble one gives preponderance to reverence in their conduct."),
    BuiltinHexagram(63, "Jì Jì", "After Completion",
        "Success in small matters; perseverance furthers; at the beginning, good fortune; at the end, disorder.",
        "Water over fire; the noble one takes thought of misfortune and arms themself in advance."),
    BuiltinHexagram(64, "Wèi Jì", "Before Completion",
        "Success; but if the little fox, having nearly completed the crossing, gets its tail in the water, there is nothing that furthers.",
        "Fire over water; the noble one is careful in the differentiation of things, so that each finds its place."),
)


def hexagram_by_number(number: int) -> BuiltinHexagram:
    """Lookup helper. Raises :class:`KeyError` for out-of-range numbers."""
    if not 1 <= number <= 64:
        raise KeyError(number)
    return BUILTIN_HEXAGRAMS[number - 1]
