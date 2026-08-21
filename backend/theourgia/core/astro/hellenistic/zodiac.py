"""The sign frame the dignities index into.

A faithful port of the parts of ``astropractise/lib/domain/astrology/zodiac.dart``
the Hellenistic judgment layer needs: the twelve signs in zodiacal order, their
trigons, opposition, and the sign↔longitude conversions. The wider web already
has a ``core/astro/zodiac`` for tropical/sidereal presentation; this is the
domain enum the canon's tables are keyed by, kept 0-indexed to match the Dart
source field-for-field so the golden vectors line up.

⚠ The declaration order *is* the data: ``ZodiacSign.ARIES.index == 0`` through
``ZodiacSign.PISCES.index == 11``. Use :pyattr:`ZodiacSign.ordinal` for the 1-12
form the ancient arithmetic counts in (the bounds' ordinal-degree rule, the
sign-sympathy schemes).
"""

from __future__ import annotations

from enum import Enum


class Triplicity(Enum):
    """The four trigons (*trigōna*). The Stoic single quality is George's, B p. 262."""

    FIRE = ("fire", "hot")
    EARTH = ("earth", "dry")
    AIR = ("air", "cold")
    WATER = ("water", "wet")

    def __init__(self, label: str, stoic_quality: str) -> None:
        self.label = label
        self.stoic_quality = stoic_quality

    @property
    def signs(self) -> tuple[ZodiacSign, ...]:
        """The three signs of this trigon, in zodiacal order."""
        return tuple(s for s in ZodiacSign if s.triplicity is self)


class SignGender(Enum):
    """A sign's gender — masculine signs are diurnal, feminine nocturnal.

    Derived from the index (aries masculine, alternating), not stored per sign;
    it carries the sect used to split each planet's two domiciles into a
    diurnal/nocturnal pair.
    """

    MASCULINE = "masculine"
    FEMININE = "feminine"


class ZodiacSign(Enum):
    """The twelve signs, in zodiacal order from 0° Aries. ``index`` is 0-based."""

    ARIES = (0, "Aries", "♈", Triplicity.FIRE)
    TAURUS = (1, "Taurus", "♉", Triplicity.EARTH)
    GEMINI = (2, "Gemini", "♊", Triplicity.AIR)
    CANCER = (3, "Cancer", "♋", Triplicity.WATER)
    LEO = (4, "Leo", "♌", Triplicity.FIRE)
    VIRGO = (5, "Virgo", "♍", Triplicity.EARTH)
    LIBRA = (6, "Libra", "♎", Triplicity.AIR)
    SCORPIO = (7, "Scorpio", "♏", Triplicity.WATER)
    SAGITTARIUS = (8, "Sagittarius", "♐", Triplicity.FIRE)
    CAPRICORN = (9, "Capricorn", "♑", Triplicity.EARTH)
    AQUARIUS = (10, "Aquarius", "♒", Triplicity.AIR)
    PISCES = (11, "Pisces", "♓", Triplicity.WATER)

    def __init__(self, index: int, label: str, glyph: str, triplicity: Triplicity) -> None:
        self.index = index
        self.label = label
        self.glyph = glyph
        self.triplicity = triplicity

    @property
    def ordinal(self) -> int:
        """The 1-12 form the ancient arithmetic counts in."""
        return self.index + 1

    @property
    def gender(self) -> SignGender:
        return SignGender.MASCULINE if self.index % 2 == 0 else SignGender.FEMININE

    @property
    def start_longitude(self) -> float:
        return float(self.index * 30)

    @property
    def opposite(self) -> ZodiacSign:
        """Six signs away — the sign of adversity and of fall."""
        return _ORDER[(self.index + 6) % 12]

    @classmethod
    def from_index(cls, index: int) -> ZodiacSign:
        """The sign at a 0-based index, 0-11. Raises for anything outside."""
        if not 0 <= index < 12:
            raise IndexError(f"zodiac index {index} out of range 0-11")
        return _ORDER[index]


# Signs by index, so opposite/from_index are O(1) and index-driven.
_ORDER: tuple[ZodiacSign, ...] = tuple(sorted(ZodiacSign, key=lambda s: s.index))


def sign_of_longitude(ecliptic_longitude: float) -> ZodiacSign:
    """The sign containing an ecliptic longitude. Longitudes produced by
    arithmetic can leave [0, 360); this normalises first."""
    norm = ecliptic_longitude % 360.0
    return _ORDER[int(norm // 30.0)]


def degree_in_sign(ecliptic_longitude: float) -> float:
    """How far into its sign a longitude falls, 0 ≤ d < 30."""
    norm = ecliptic_longitude % 360.0
    return norm - (int(norm // 30.0) * 30.0)
