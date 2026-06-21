"""Aspects — Ptolemaic only, this batch.

Aspects measure the angular relationship between two bodies on the
ecliptic. The five Ptolemaic aspects (conjunction, sextile, square,
trine, opposition) plus a configurable orb table are enough for the
default chart view; harmonics and midpoints land in a later batch.

Orbs vary by tradition. We ship modern moderate orbs as the default;
plugins can replace the orb table to reflect Hellenistic (smaller) or
Cosmobiological (very small) conventions.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

__all__ = ["AspectKind", "Aspect", "DEFAULT_ORBS", "detect_aspects"]


class AspectKind(str, Enum):
    CONJUNCTION = "conjunction"
    SEXTILE = "sextile"
    SQUARE = "square"
    TRINE = "trine"
    OPPOSITION = "opposition"


_ASPECT_ANGLE: dict[AspectKind, float] = {
    AspectKind.CONJUNCTION: 0.0,
    AspectKind.SEXTILE: 60.0,
    AspectKind.SQUARE: 90.0,
    AspectKind.TRINE: 120.0,
    AspectKind.OPPOSITION: 180.0,
}


# Moderate orbs for Sun/Moon vs everything else; tighter orbs for
# outer planets vs each other. Plugins can shadow this table.
DEFAULT_ORBS: dict[AspectKind, float] = {
    AspectKind.CONJUNCTION: 8.0,
    AspectKind.SEXTILE: 6.0,
    AspectKind.SQUARE: 7.0,
    AspectKind.TRINE: 7.0,
    AspectKind.OPPOSITION: 8.0,
}


@dataclass(frozen=True, slots=True)
class Aspect:
    body_a: str
    body_b: str
    kind: AspectKind
    angle: float  # actual angular separation
    orb: float  # |actual - exact|


def detect_aspects(
    placements: dict[str, float],
    *,
    orbs: dict[AspectKind, float] | None = None,
) -> list[Aspect]:
    """Detect all Ptolemaic aspects in ``placements`` (body id → longitude).

    Returns aspects sorted by tightness (smallest orb first). Each
    body pair is reported at most once — the (a, b) pair with a < b
    convention avoids double-reporting. ``orbs`` may declare only a
    subset of :class:`AspectKind`; unlisted kinds are skipped (handy
    for callers that want to detect a single aspect type).
    """
    table = orbs or DEFAULT_ORBS
    aspects: list[Aspect] = []
    body_ids = sorted(placements.keys())
    for i, a in enumerate(body_ids):
        for b in body_ids[i + 1 :]:
            sep = abs(placements[a] - placements[b]) % 360
            if sep > 180:
                sep = 360 - sep
            for kind, exact in _ASPECT_ANGLE.items():
                if kind not in table:
                    continue
                orb = abs(sep - exact)
                if orb <= table[kind]:
                    aspects.append(Aspect(a, b, kind, sep, orb))
                    break  # one aspect per pair
    aspects.sort(key=lambda x: x.orb)
    return aspects
