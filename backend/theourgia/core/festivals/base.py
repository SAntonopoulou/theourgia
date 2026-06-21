"""Festival data model.

A :class:`Festival` is a recurring date with **provenance**.

The provenance bar matters because:

* Festival reconstructions (especially pre-Christian European, Greek
  Attic, Roman religious) are scholarly artifacts assembled from
  fragmentary sources. Practitioners deserve to know what's a primary
  attestation, what's a 19th-century reconstruction, what's a modern
  re-revival.
* Cultural appropriation concerns. Cite the source so a Hindu, an
  Egyptian, an Indigenous practitioner reading our calendar can
  evaluate whether *we* understood what *they* gave us before we
  shipped it.

Every entry MUST have at least one :class:`Citation`. The festival
registry refuses to register an entry that lacks sources.

Citation model is intentionally minimal:

* ``title`` — bibliographic title
* ``author`` — author or editor
* ``year`` — publication year (book) or AD year (primary source)
* ``kind`` — ``primary`` (an ancient or medieval source: Hesiod,
  Plutarch, Ovid, the Mishnah, the *Liber AL*), ``scholarly`` (a
  modern academic source: Burkert, Parker, Beard/North/Price), or
  ``community`` (a contemporary practitioner publication or
  established practice). Helps the UI distinguish "well-attested
  ancient practice" from "modern reconstruction" from "current
  community usage."
* ``locator`` — chapter / page / line citation
* ``notes`` — optional editorial note (e.g. "the date is contested;
  Burkert places it in Boedromion 19, Parker in Boedromion 16").
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

__all__ = [
    "Citation",
    "CitationKind",
    "Festival",
    "FestivalInstance",
    "Tradition",
    "register_festival",
    "registered_festivals",
    "get_festival",
    "festivals_for_year",
    "festivals_by_tradition",
]


class Tradition(str, Enum):
    """Cultural / religious tradition the festival comes from."""

    WHEEL_OF_THE_YEAR = "wheel-of-the-year"  # Neo-pagan Sabbats
    GREEK = "greek"  # Athenian / Hellenic
    ROMAN = "roman"  # Roman religious calendar
    HEKATEAN = "hekatean"  # Hekate Deipnon / Noumenia (lunar)
    THELEMIC = "thelemic"  # Crowleyan Thelema
    HINDU = "hindu"  # Hindu / Vedic
    EGYPTIAN = "egyptian"  # Ancient Egyptian decanal / temple
    CUSTOM = "custom"  # User-defined


class CitationKind(str, Enum):
    PRIMARY = "primary"  # ancient / medieval primary source
    SCHOLARLY = "scholarly"  # modern academic
    COMMUNITY = "community"  # contemporary practitioner publication


@dataclass(frozen=True, slots=True)
class Citation:
    """Bibliographic citation for a festival entry."""

    title: str
    author: str
    year: int | None
    kind: CitationKind
    locator: str = ""
    notes: str = ""


# A date computer takes a Gregorian year and returns one or more
# instances. Some festivals fall on a fixed civil date; some are
# tied to the lunar cycle (Deipnon = dark moon, so it occurs every
# month); some are tied to an astronomical instant (solstice).
DateComputer = Callable[[int], list["FestivalInstance"]]


@dataclass(frozen=True, slots=True)
class FestivalInstance:
    """A single occurrence of a festival in a given year.

    ``start`` and ``end`` are tz-aware UTC. For multi-day festivals
    (Eleusinia, Thesmophoria) the range covers the whole observance.
    For single-day festivals ``end`` equals ``start + 1 day``.

    ``label`` is the festival's English name plus any
    occurrence-specific qualifier (e.g. "Deipnon — June 2026 dark moon").
    """

    festival_id: str
    label: str
    start: datetime
    end: datetime


@dataclass(frozen=True, slots=True)
class Festival:
    """A recurring observance with provenance."""

    id: str  # stable kebab-case (e.g. "imbolc", "anthesteria")
    name: str  # English display label
    tradition: Tradition
    description: str  # one or two sentences
    practice_notes: str  # optional, ~paragraph; can be empty
    sources: tuple[Citation, ...]
    compute: DateComputer = field(repr=False)

    def __post_init__(self) -> None:
        if not self.sources:
            raise ValueError(
                f"Festival {self.id!r} must declare at least one Citation "
                "(provenance is non-negotiable).",
            )


# ────────────────────────────────────────────────────────────────────────
# Registry
# ────────────────────────────────────────────────────────────────────────


_REGISTRY: dict[str, Festival] = {}


def register_festival(festival: Festival) -> None:
    """Add a festival to the registry. Idempotent on id."""
    _REGISTRY[festival.id] = festival


def registered_festivals() -> list[Festival]:
    """All festivals currently registered, in insertion order."""
    return list(_REGISTRY.values())


def get_festival(festival_id: str) -> Festival:
    """Look up by id; ``KeyError`` if missing."""
    if festival_id not in _REGISTRY:
        raise KeyError(f"No festival registered with id {festival_id!r}.")
    return _REGISTRY[festival_id]


def festivals_by_tradition(tradition: Tradition) -> list[Festival]:
    """Every festival from the given tradition."""
    return [f for f in _REGISTRY.values() if f.tradition == tradition]


def festivals_for_year(year: int) -> list[FestivalInstance]:
    """Every instance across every tradition for the given Gregorian year,
    sorted by start instant.
    """
    instances: list[FestivalInstance] = []
    for festival in _REGISTRY.values():
        instances.extend(festival.compute(year))
    instances.sort(key=lambda i: i.start)
    return instances
