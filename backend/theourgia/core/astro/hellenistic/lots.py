"""The Lots (*klēroi*) - derived points.

A faithful port of ``astropractise/lib/domain/astrology/lots.dart`` (the
canonical engine), sourced from CANON-01 section 8, where the seven Hermetic
lots were cross-validated against two independent witnesses with zero
divergences.

A lot is an *arc laid off from a point*, not a body. Measure the arc from one
planet to another *in zodiacal order*, then lay that same arc off from the
Ascendant, again in zodiacal order.

The direction of counting is the whole point. George works it numerically: Sun
at 15 deg Virgo, Moon at 15 deg Scorpio - the distance *from the Sun to the
Moon* is 60 deg, while the distance *from the Moon to the Sun*, counting in the
order of the signs, is 300 deg. That asymmetry is precisely why the day and
night formulas differ.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .sect import Sect


class HermeticLot(Enum):
    """The seven Hermetic lots, from the lost *Panaretos*.

    The set is attested only through Paulus ch. 23 and Olympiodorus ch. 22 (4th
    to 6th century) plus one documentary chart of 319 CE - thinner ground than
    it usually looks.
    """

    FORTUNE = ("κλῆρος τύχης", "klēros tuchēs", "Fortune", True)
    SPIRIT = ("κλῆρος δαίμονος", "klēros daimonos", "Spirit", True)
    EROS = ("κλῆρος ἔρωτος", "klēros erōtos", "Eros", True)
    NECESSITY = ("κλῆρος ἀνάγκης", "klēros anankēs", "Necessity", True)
    COURAGE = ("κλῆρος τόλμης", "klēros tolmēs", "Courage", True)
    VICTORY = ("κλῆρος νίκης", "klēros nikēs", "Victory", True)
    NEMESIS = ("κλῆρος νεμέσεως", "klēros nemeseōs", "Nemesis", True)

    def __init__(self, greek: str, transliteration: str, english: str, reverses_by_sect: bool):
        self.greek = greek
        self.transliteration = transliteration
        self.english = english
        # A per-lot property, deliberately NOT a global rule. All seven Hermetic
        # lots reverse, but George states it as a *tendency* and Brennan's wider
        # survey has non-Hermetic lots that do not reverse (Siblings, Children,
        # Livelihood, Death). Do not hard-code "all lots reverse".
        self.reverses_by_sect = reverses_by_sect


@dataclass(frozen=True, slots=True)
class LotInputs:
    """The longitudes a lot calculation needs.

    Sect is load-bearing and it cascades: five of the seven lots derive from
    Fortune or Spirit, so flipping the sect moves almost the whole set - and a
    chart whose sect is borderline has a borderline lot table.
    """

    ascendant: float
    sun: float
    moon: float
    mercury: float
    venus: float
    mars: float
    jupiter: float
    saturn: float
    sect: Sect


def _norm(d: float) -> float:
    return ((d % 360.0) + 360.0) % 360.0


def project(*, origin: float, from_: float, to: float) -> float:
    """The universal lot formula. Measure the arc from -> to in zodiacal order,
    then lay it off from ``origin``, again in zodiacal order. Always zodiacal
    order, for both the measurement and the projection."""
    return _norm(origin + to - from_)


def fortune(i: LotInputs) -> float:
    """The Lot of Fortune. Day: Asc + Moon - Sun. Night: Asc + Sun - Moon.

    Ptolemy alone does not reverse it (he uses the diurnal formula for both
    sects), and his non-reversing version is the one that entered modern
    practice - so most software today follows the ancient minority position.
    Rhetorius: Ptolemy's night "Fortune" is everyone else's Spirit.
    """
    if i.sect is Sect.DIURNAL:
        return project(origin=i.ascendant, from_=i.sun, to=i.moon)
    return project(origin=i.ascendant, from_=i.moon, to=i.sun)


def spirit(i: LotInputs) -> float:
    """The Lot of Spirit - Fortune's mirror. Day: Asc + Sun - Moon. Night: Asc +
    Moon - Sun. Fortune runs from the sect light toward the other luminary (the
    body and what befalls it); Spirit is the reverse (mind, action, what the
    native does)."""
    if i.sect is Sect.DIURNAL:
        return project(origin=i.ascendant, from_=i.moon, to=i.sun)
    return project(origin=i.ascendant, from_=i.sun, to=i.moon)


def all_lots(i: LotInputs) -> dict[HermeticLot, float]:
    """All seven, computed in dependency order.

    Order matters: Eros and Victory are measured from Spirit; Necessity, Courage
    and Nemesis from Fortune. Those two must exist first - which is also why a
    wrong sect does not move one lot but five.
    """
    f = fortune(i)
    s = spirit(i)
    day = i.sect is Sect.DIURNAL

    return {
        HermeticLot.FORTUNE: f,
        HermeticLot.SPIRIT: s,
        # Venus and Spirit.
        HermeticLot.EROS: (
            project(origin=i.ascendant, from_=s, to=i.venus)
            if day
            else project(origin=i.ascendant, from_=i.venus, to=s)
        ),
        # Mercury and Fortune.
        HermeticLot.NECESSITY: (
            project(origin=i.ascendant, from_=i.mercury, to=f)
            if day
            else project(origin=i.ascendant, from_=f, to=i.mercury)
        ),
        # Mars and Fortune.
        HermeticLot.COURAGE: (
            project(origin=i.ascendant, from_=i.mars, to=f)
            if day
            else project(origin=i.ascendant, from_=f, to=i.mars)
        ),
        # Jupiter and Spirit.
        HermeticLot.VICTORY: (
            project(origin=i.ascendant, from_=s, to=i.jupiter)
            if day
            else project(origin=i.ascendant, from_=i.jupiter, to=s)
        ),
        # Saturn and Fortune.
        HermeticLot.NEMESIS: (
            project(origin=i.ascendant, from_=i.saturn, to=f)
            if day
            else project(origin=i.ascendant, from_=f, to=i.saturn)
        ),
    }


def place_from_fortune(*, longitude: float, fortune_longitude: float) -> int:
    """Fortune as an alternate Ascendant: a second whole-sign wheel with
    Fortune's sign as its first place. Which place a planet occupies relative to
    Fortune is a distinct reading from its place in the nativity. Returns 1..12."""
    sign_of_body = int(_norm(longitude) // 30) % 12
    sign_of_fortune = int(_norm(fortune_longitude) // 30) % 12
    return ((sign_of_body - sign_of_fortune) % 12) + 1
