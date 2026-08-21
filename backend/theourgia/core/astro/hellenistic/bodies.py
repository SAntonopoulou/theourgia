"""The bodies a Hellenistic chart reads — seven visible planets and the nodes.

A faithful port of ``astropractise/lib/domain/astrology/celestial_body.dart``.
Seven planets and nothing else in the judgment: sect has two teams of three
around two lights, domicile assigns twelve signs to seven bodies, the bounds
distribute 360° across five non-luminaries. An eighth body does not extend the
system — it breaks the arithmetic it is built from. The nodes are points, not
bodies: they rule nothing and belong to no sect.
"""

from __future__ import annotations

from enum import Enum


class Planet(Enum):
    """A body a Hellenistic chart reads. The value is the stable id, matching
    the ephemeris layer's :class:`~theourgia.core.astro.bodies.Body` ids so a
    computed position maps straight onto a judgment."""

    SUN = ("sun", "☉", "Sun", "Ἥλιος", "Hēlios")
    MOON = ("moon", "☽", "Moon", "Σελήνη", "Selēnē")
    MERCURY = ("mercury", "☿", "Mercury", "Ἑρμῆς", "Hermēs")
    VENUS = ("venus", "♀", "Venus", "Ἀφροδίτη", "Aphroditē")
    MARS = ("mars", "♂", "Mars", "Ἄρης", "Arēs")
    JUPITER = ("jupiter", "♃", "Jupiter", "Ζεύς", "Zeus")
    SATURN = ("saturn", "♄", "Saturn", "Κρόνος", "Kronos")
    NORTH_NODE = ("north-node", "☊", "North Node", "Ἀναβιβάζων", "Anabibazōn")
    SOUTH_NODE = ("south-node", "☋", "South Node", "Καταβιβάζων", "Katabibazōn")

    def __init__(
        self,
        body_id: str,
        glyph: str,
        label: str,
        greek: str,
        transliteration: str,
    ) -> None:
        self.id = body_id
        self.glyph = glyph
        self.label = label
        self.greek = greek
        self.transliteration = transliteration

    @property
    def is_luminary(self) -> bool:
        """The two lights. Sect is organised around them; one is the sect light
        of any chart."""
        return self in (Planet.SUN, Planet.MOON)

    @property
    def is_node(self) -> bool:
        """A node computes and can be aspected, but rules nothing and belongs to
        no sect."""
        return self in (Planet.NORTH_NODE, Planet.SOUTH_NODE)

    @property
    def in_sentence(self) -> str:
        """English gives the two lights a definite article and the five planets
        none: *the Moon is at 6 Sagittarius*, but *Mars is at 6 Aries*."""
        return f"the {self.label}" if self.is_luminary else self.label


# The seven, luminaries first — the order most tables print.
SEVEN: tuple[Planet, ...] = (
    Planet.SUN,
    Planet.MOON,
    Planet.MERCURY,
    Planet.VENUS,
    Planet.MARS,
    Planet.JUPITER,
    Planet.SATURN,
)

# The seven in Chaldean order — slowest to fastest. Not arbitrary: it generates
# the decan faces and the planetary hours, and is the order the sources list.
SEVEN_CHALDEAN: tuple[Planet, ...] = (
    Planet.SATURN,
    Planet.JUPITER,
    Planet.MARS,
    Planet.SUN,
    Planet.VENUS,
    Planet.MERCURY,
    Planet.MOON,
)

# The seven plus both nodes — ask for this whenever a chart may be judged as an
# election (the node prohibition is the cheapest, best-attested electional rule).
SEVEN_WITH_NODES: tuple[Planet, ...] = (*SEVEN, Planet.NORTH_NODE, Planet.SOUTH_NODE)
