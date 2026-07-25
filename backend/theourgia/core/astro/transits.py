"""Transits to natal — current sky vs a birth chart.

Compares transiting ecliptic longitudes against natal positions and
reports the classical (Ptolemaic) aspects — conjunction (0°),
sextile (60°), square (90°), trine (120°), opposition (180°) — inside
a configurable orb (default 3°, the tighter orb conventional for
transit work; natal aspect detection in
:mod:`theourgia.core.astro.aspects` keeps its wider moderate orbs).

Pure functions: the caller supplies ``{body_id: longitude}`` maps
(natal from a stored/computed chart, transiting from
:func:`theourgia.core.astro.chart.compute_chart` at "now").
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from theourgia.core.astro.aspects import AspectKind

__all__ = [
    "DEFAULT_TRANSIT_ORB",
    "TransitAspect",
    "transits_to_natal",
]


DEFAULT_TRANSIT_ORB: Final[float] = 3.0

_ASPECT_ANGLE: Final[dict[AspectKind, float]] = {
    AspectKind.CONJUNCTION: 0.0,
    AspectKind.SEXTILE: 60.0,
    AspectKind.SQUARE: 90.0,
    AspectKind.TRINE: 120.0,
    AspectKind.OPPOSITION: 180.0,
}


@dataclass(frozen=True, slots=True)
class TransitAspect:
    """A transiting body aspecting a natal position."""

    transiting_body: str
    natal_body: str
    kind: AspectKind
    angle: float  # actual angular separation (0..180)
    orb: float  # |actual - exact|


def transits_to_natal(
    natal: dict[str, float],
    transiting: dict[str, float],
    *,
    orb: float = DEFAULT_TRANSIT_ORB,
) -> list[TransitAspect]:
    """Every classical aspect a transiting body makes to a natal one.

    ``natal`` and ``transiting`` map body id → ecliptic longitude
    (degrees, 0..360). Unlike natal aspect detection, *every*
    transiting × natal pair is examined — including a body against
    its own natal position (the conjunction there is the "return").
    Results sort by tightness (smallest orb first).
    """
    if orb <= 0:
        raise ValueError(f"orb must be positive; got {orb}.")
    hits: list[TransitAspect] = []
    for t_body, t_lon in transiting.items():
        for n_body, n_lon in natal.items():
            sep = abs(t_lon - n_lon) % 360
            if sep > 180:
                sep = 360 - sep
            for kind, exact in _ASPECT_ANGLE.items():
                delta = abs(sep - exact)
                if delta <= orb:
                    hits.append(TransitAspect(
                        transiting_body=t_body,
                        natal_body=n_body,
                        kind=kind,
                        angle=sep,
                        orb=delta,
                    ))
                    break  # one aspect per pair
    hits.sort(key=lambda h: h.orb)
    return hits
