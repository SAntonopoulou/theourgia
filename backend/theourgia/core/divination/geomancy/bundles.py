"""Bundled metadata for the 16 geomantic figures.

Per ``plan/06-divination-and-practice.md`` §3. Each figure carries:

* Latin name (canonical) + English translation.
* Planet / zodiac sign / element / quality — Agrippa's standard
  attributions (1531, public domain).
* Brief glyph (the four-line pattern as a unicode-friendly two-line
  ASCII summary for log rendering).
* One-sentence traditional meaning.
* "Mobility": ``mobile`` figures shift swiftly; ``stable`` figures
  represent slow, fixed conditions. Used in classical perfection
  analysis. We follow the Agrippa list — disagreements between
  traditions are unavoidable; the bundle picks one and a follow-up
  batch can ship per-tradition overrides via plugin data.

Long-form per-house interpretation tables seed in a follow-up data
batch; the engine + API are usable now.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from theourgia.core.divination.geomancy.engine import (
    FIGURE_ORDER,
    FigureName,
    lines_for_pattern,
)

__all__ = [
    "BUILTIN_FIGURES",
    "BuiltinFigure",
    "Mobility",
    "figure_metadata",
]


class Mobility:
    MOBILE = "mobile"
    STABLE = "stable"


@dataclass(frozen=True, slots=True)
class BuiltinFigure:
    name: FigureName
    name_english: str
    planet: str
    zodiac: str
    element: str
    mobility: str
    meaning: str
    correspondences: dict[str, object] = field(default_factory=dict)

    @property
    def lines(self) -> tuple[bool, bool, bool, bool]:
        return lines_for_pattern(self.name)

    @property
    def index(self) -> int:
        return FIGURE_ORDER.index(self.name)


# Standard Agrippan attributions.
BUILTIN_FIGURES: tuple[BuiltinFigure, ...] = (
    BuiltinFigure(
        name=FigureName.VIA,
        name_english="The Way",
        planet="Moon",
        zodiac="Cancer",
        element="water",
        mobility=Mobility.MOBILE,
        meaning="Travel, change, motion forward; the road open.",
    ),
    BuiltinFigure(
        name=FigureName.CAUDA_DRACONIS,
        name_english="Dragon's Tail",
        planet="South Node",
        zodiac="Sagittarius",
        element="fire",
        mobility=Mobility.MOBILE,
        meaning="Endings, exit, release from the past; favourable to losses, ill to gains.",
    ),
    BuiltinFigure(
        name=FigureName.PUER,
        name_english="The Boy",
        planet="Mars",
        zodiac="Aries",
        element="fire",
        mobility=Mobility.MOBILE,
        meaning="Impulse, courage, contention; favourable for violent or martial matters.",
    ),
    BuiltinFigure(
        name=FigureName.FORTUNA_MINOR,
        name_english="Lesser Fortune",
        planet="Sun",
        zodiac="Leo",
        element="fire",
        mobility=Mobility.MOBILE,
        meaning="Outward success swiftly attained; favourable to depart, ill to stay.",
    ),
    BuiltinFigure(
        name=FigureName.PUELLA,
        name_english="The Girl",
        planet="Venus",
        zodiac="Libra",
        element="air",
        mobility=Mobility.STABLE,
        meaning="Charm, harmony, beauty; favourable in love and short-term matters.",
    ),
    BuiltinFigure(
        name=FigureName.AMISSIO,
        name_english="Loss",
        planet="Venus",
        zodiac="Taurus",
        element="earth",
        mobility=Mobility.MOBILE,
        meaning="Loss of possession or person; favourable when loss is desired, otherwise ill.",
    ),
    BuiltinFigure(
        name=FigureName.CARCER,
        name_english="Prison",
        planet="Saturn",
        zodiac="Pisces",
        element="earth",
        mobility=Mobility.STABLE,
        meaning="Confinement, delay, restriction; bondage, but bindings hold.",
    ),
    BuiltinFigure(
        name=FigureName.LAETITIA,
        name_english="Joy",
        planet="Jupiter",
        zodiac="Pisces",
        element="water",
        mobility=Mobility.MOBILE,
        meaning="Joy, health, optimism; favourable for most undertakings.",
    ),
    BuiltinFigure(
        name=FigureName.CAPUT_DRACONIS,
        name_english="Dragon's Head",
        planet="North Node",
        zodiac="Virgo",
        element="earth",
        mobility=Mobility.MOBILE,
        meaning="Beginnings, entrance, threshold; favourable to gains, ill to losses.",
    ),
    BuiltinFigure(
        name=FigureName.CONJUNCTIO,
        name_english="Conjunction",
        planet="Mercury",
        zodiac="Virgo",
        element="earth",
        mobility=Mobility.MOBILE,
        meaning="Meeting, joining, recovery of lost things; favourable for unions.",
    ),
    BuiltinFigure(
        name=FigureName.ACQUISITIO,
        name_english="Gain",
        planet="Jupiter",
        zodiac="Sagittarius",
        element="air",
        mobility=Mobility.STABLE,
        meaning="Gain, profit, increase; favourable for everything except letting go.",
    ),
    BuiltinFigure(
        name=FigureName.RUBEUS,
        name_english="Red",
        planet="Mars",
        zodiac="Scorpio",
        element="water",
        mobility=Mobility.MOBILE,
        meaning="Anger, passion, violence; favourable only for matters of war or destruction.",
    ),
    BuiltinFigure(
        name=FigureName.FORTUNA_MAJOR,
        name_english="Greater Fortune",
        planet="Sun",
        zodiac="Leo",
        element="fire",
        mobility=Mobility.STABLE,
        meaning="Lasting success through patience; favourable to remain, ill to depart.",
    ),
    BuiltinFigure(
        name=FigureName.ALBUS,
        name_english="White",
        planet="Mercury",
        zodiac="Gemini",
        element="water",
        mobility=Mobility.STABLE,
        meaning="Wisdom, peace, calm counsel; favourable in matters requiring deliberation.",
    ),
    BuiltinFigure(
        name=FigureName.TRISTITIA,
        name_english="Sorrow",
        planet="Saturn",
        zodiac="Aquarius",
        element="earth",
        mobility=Mobility.STABLE,
        meaning="Sorrow, melancholy, fixed grief; favourable only for sturdy foundations and burials.",
    ),
    BuiltinFigure(
        name=FigureName.POPULUS,
        name_english="The People",
        planet="Moon",
        zodiac="Cancer",
        element="water",
        mobility=Mobility.STABLE,
        meaning="The crowd; takes on the quality of nearby figures; favourable to passive matters.",
    ),
)


_BY_NAME: dict[FigureName, BuiltinFigure] = {f.name: f for f in BUILTIN_FIGURES}


def figure_metadata(name: FigureName | str) -> BuiltinFigure:
    name_enum = name if isinstance(name, FigureName) else FigureName(name)
    return _BY_NAME[name_enum]
