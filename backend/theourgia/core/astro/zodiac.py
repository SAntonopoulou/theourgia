"""Zodiac — tropical and sidereal.

Tropical zodiac aligns Aries 0° with the vernal equinox; sidereal
aligns it with a fixed stellar reference (Spica for Lahiri, etc.).
Conversion is a single offset (the ayanāṃśa) applied to a tropical
longitude.

Vedic practitioners use sidereal; Western moderns use tropical;
Hellenistic was tropical but the question of which to use today is
a tradition choice. We support both at the data layer; the
presentation layer picks one (or shows both side by side, which is
honestly the most informative).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Final

__all__ = ["Zodiac", "Ayanamsa", "SIGNS", "ZODIAC_GLYPHS", "sign_of"]


class Zodiac(str, Enum):
    """Which zodiac to apply to ecliptic longitudes."""

    TROPICAL = "tropical"
    SIDEREAL = "sidereal"


class Ayanamsa(str, Enum):
    """Sidereal-zodiac offset systems.

    The numeric values mirror Swiss Ephemeris constants so callers
    can pass them straight through. Lahiri is the official Indian
    government ayanāṃśa; the rest are well-known alternatives used
    by different schools.
    """

    LAHIRI = "lahiri"
    KRISHNAMURTI = "krishnamurti"
    FAGAN_BRADLEY = "fagan_bradley"
    RAMAN = "raman"
    YUKTESHWAR = "yukteshwar"


# 1-indexed for human-friendliness (Aries = sign 1, not 0). The data
# layer indexes from 1; the rendering layer uses the glyph table.
SIGNS: Final[tuple[str, ...]] = (
    "",  # placeholder so SIGNS[1] == "Aries"
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
)

ZODIAC_GLYPHS: Final[tuple[str, ...]] = (
    "",
    "♈", "♉", "♊", "♋", "♌", "♍",
    "♎", "♏", "♐", "♑", "♒", "♓",
)


@dataclass(frozen=True, slots=True)
class SignPosition:
    """A zodiacal longitude expressed as (sign, degrees-in-sign).

    For human-readable output: 37.3° tropical = 7.3° in Taurus.
    """

    sign: int  # 1..12 (1 = Aries)
    sign_name: str
    glyph: str
    degree_in_sign: float
    longitude: float  # full 0..360


def sign_of(longitude: float) -> SignPosition:
    """Translate an ecliptic longitude into (sign, degrees-in-sign)."""
    if not (0 <= longitude < 360):
        longitude = longitude % 360
    sign_index = int(longitude // 30) + 1
    degree_in_sign = longitude - (sign_index - 1) * 30
    return SignPosition(
        sign=sign_index,
        sign_name=SIGNS[sign_index],
        glyph=ZODIAC_GLYPHS[sign_index],
        degree_in_sign=degree_in_sign,
        longitude=longitude,
    )
