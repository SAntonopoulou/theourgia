"""Celestial bodies — the canonical set this batch supports.

The Swiss Ephemeris exposes hundreds of objects (planets, ~3,000
asteroids, fixed stars, Uranian hypotheticals, etc.). For Theourgia
v0.x we ship the practitioner-essential set: classical seven, modern
outers, Mean Lunar Node + Apogee, and four major asteroids (Chiron +
the four "feminine" asteroids minus Juno, which lands in Batch 24).

Plugins can register additional bodies via :func:`register_body` (the
plugin author passes a Swiss Ephemeris body ID and a display name);
the chart computation walks the registered set.
"""

from __future__ import annotations

from dataclasses import dataclass

import swisseph as swe

__all__ = ["Body", "BODIES", "register_body", "registered_bodies"]


@dataclass(frozen=True, slots=True)
class Body:
    """A celestial body the chart computer knows how to ask the
    ephemeris about.
    """

    id: str  # stable, kebab-case (e.g. "sun", "mean-node", "chiron")
    name: str  # English display label
    swe_id: int  # Swiss Ephemeris body code
    glyph: str  # Single-character astrological glyph
    category: str  # "luminary" | "personal" | "social" | "outer" | "asteroid" | "node" | "apogee"


# Order matters — UI surfaces follow this sequence by default.
_BODIES: list[Body] = [
    Body("sun", "Sun", swe.SUN, "☉", "luminary"),
    Body("moon", "Moon", swe.MOON, "☽", "luminary"),
    Body("mercury", "Mercury", swe.MERCURY, "☿", "personal"),
    Body("venus", "Venus", swe.VENUS, "♀", "personal"),
    Body("mars", "Mars", swe.MARS, "♂", "personal"),
    Body("jupiter", "Jupiter", swe.JUPITER, "♃", "social"),
    Body("saturn", "Saturn", swe.SATURN, "♄", "social"),
    Body("uranus", "Uranus", swe.URANUS, "♅", "outer"),
    Body("neptune", "Neptune", swe.NEPTUNE, "♆", "outer"),
    Body("pluto", "Pluto", swe.PLUTO, "♇", "outer"),
    Body("mean-node", "Mean Lunar Node", swe.MEAN_NODE, "☊", "node"),
    Body("mean-apogee", "Mean Lunar Apogee (Lilith)", swe.MEAN_APOG, "⚸", "apogee"),
    Body("chiron", "Chiron", swe.CHIRON, "⚷", "asteroid"),
    Body("ceres", "Ceres", swe.CERES, "⚳", "asteroid"),
    Body("pallas", "Pallas", swe.PALLAS, "⚴", "asteroid"),
    Body("vesta", "Vesta", swe.VESTA, "⚶", "asteroid"),
]

BODIES: tuple[Body, ...] = tuple(_BODIES)


def register_body(body: Body) -> None:
    """Add a body to the canonical set (plugin extension point)."""
    global BODIES  # noqa: PLW0603 — module-level registry mutation
    if any(b.id == body.id for b in BODIES):
        return  # idempotent on id
    _BODIES.append(body)
    BODIES = tuple(_BODIES)


def registered_bodies() -> tuple[Body, ...]:
    """All registered bodies, in canonical display order."""
    return BODIES
