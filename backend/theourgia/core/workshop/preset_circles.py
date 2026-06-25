"""Preset magical circles — public-domain templates.

Per `plan/07-batches-backend.md` § B105 + the H05 designer handoff
(Magical Circles): the surface ships with a small set of circles drawn
from PD sources so the practitioner has something to fork on day one.

These are **templates** — loading one creates a fresh ``Circle`` row
**without** a ``parent_circle_id`` (presets are not parents; they're
starting points). The ``citation`` field preserves provenance.

Sources (all PD):
  · LBRP / Lesser Banishing Ritual of the Pentagram — Golden Dawn 1888
    (Regardie *The Golden Dawn* 1937 reprints out of copyright)
  · Heptameron — pseudo-Peter of Abano, c. 1496 (Latin printed 1559)
  · Lemegeton / Ars Goetia — 17th c. compilations, PD
  · Picatrix (*Ghāyat al-Ḥakīm*) — 11th c. Arabic; Latin trans. 13th c., PD
  · Greek defixio / katadesmos circles — antiquity, no copyright

The bundle ships five entries (one per source); practitioners customise
via fork.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

__all__ = ["PRESET_CIRCLES", "PresetCircle"]


@dataclass(frozen=True)
class PresetCircle:
    """An immutable preset template. Maps 1:1 to the POST /circles
    body fields."""

    slug: str
    name: str
    purpose: str
    diameter_m: float
    rings: list[dict[str, Any]]
    compass_tradition: str
    compass_points: dict[str, str]
    centre_element: dict[str, Any]
    citation: str


PRESET_CIRCLES: tuple[PresetCircle, ...] = (
    PresetCircle(
        slug="lbrp_classic",
        name="LBRP — Lesser Banishing Ritual of the Pentagram",
        purpose=(
            "Daily banishing, clearing the sphere, and establishing the "
            "elemental quarters before further work."
        ),
        diameter_m=2.5,
        rings=[
            {
                "kind": "inscription",
                "content": "ATEH MALKUTH VE-GEBURAH VE-GEDULAH LE-OLAHM AMEN",
                "direction": "clockwise",
                "rotation_deg": 0,
            },
            {
                "kind": "glyph_row",
                "content": "pentagram",
                "direction": "quarters",
                "rotation_deg": 0,
            },
        ],
        compass_tradition="archangels",
        compass_points={
            "E": "Raphael",
            "S": "Michael",
            "W": "Gabriel",
            "N": "Uriel",
        },
        centre_element={"kind": "hexagram"},
        citation=(
            "Israel Regardie, *The Golden Dawn* (1937–40), PD per first-"
            "publication; ritual attested in Mathers' cipher manuscripts "
            "of 1888."
        ),
    ),
    PresetCircle(
        slug="heptameron_solar",
        name="Heptameron Solar Operation Circle",
        purpose=(
            "Solar-day operations per the Heptameron — invocations of the "
            "angel of the Sun within a properly consecrated boundary."
        ),
        diameter_m=2.7,
        rings=[
            {
                "kind": "inscription",
                "content": "MICHAEL  RAPHAEL  GABRIEL  URIEL",
                "direction": "clockwise",
                "rotation_deg": 0,
            },
            {
                "kind": "inscription",
                "content": "Adonai · Tetragrammaton · Saday · Eheieh",
                "direction": "clockwise",
                "rotation_deg": 0,
            },
            {
                "kind": "multi_glyph",
                "content": "solar_seals",
                "direction": "quarters",
                "rotation_deg": 45,
            },
        ],
        compass_tradition="archangels",
        compass_points={
            "E": "Raphael",
            "S": "Michael",
            "W": "Gabriel",
            "N": "Uriel",
        },
        centre_element={
            "kind": "kamea_trace",
            "square_id": "sun",
        },
        citation=(
            "Pseudo-Peter of Abano, *Heptameron, seu Elementa Magica* "
            "(printed Venice 1559); composed c. 1496. Public domain."
        ),
    ),
    PresetCircle(
        slug="goetia_solomonic",
        name="Goetic Triangle & Solomonic Circle",
        purpose=(
            "Evocation of a spirit of the Ars Goetia: practitioner stands "
            "inside the outer Solomonic circle; the spirit appears within "
            "the triangle outside the circle."
        ),
        diameter_m=2.7,
        rings=[
            {
                "kind": "inscription",
                "content": (
                    "Ehyeh · Yod He Vav He · Elohim · El · Eloah · "
                    "Adonai · Shaddai"
                ),
                "direction": "clockwise",
                "rotation_deg": 0,
            },
            {
                "kind": "inscription",
                "content": "Tetragrammaton · Anaphaxeton · Primeumaton",
                "direction": "clockwise",
                "rotation_deg": 0,
            },
            {
                "kind": "glyph_row",
                "content": "cross_quartered",
                "direction": "quarters",
                "rotation_deg": 0,
            },
        ],
        compass_tradition="archangels",
        compass_points={
            "E": "Raphael",
            "S": "Michael",
            "W": "Gabriel",
            "N": "Uriel",
        },
        centre_element={"kind": "solomonic_seal"},
        citation=(
            "*Lemegeton Clavicula Salomonis* — 17th-century compilation "
            "(Sloane MS 2731 et al.). Public domain."
        ),
    ),
    PresetCircle(
        slug="picatrix_venus",
        name="Picatrix Venusian Operation Circle",
        purpose=(
            "Planetary operation under Venus per the Picatrix: image-making, "
            "concord, and unions undertaken with electional timing."
        ),
        diameter_m=2.2,
        rings=[
            {
                "kind": "inscription",
                "content": "Anael · Hagiel · Bne Seraphim",
                "direction": "clockwise",
                "rotation_deg": 0,
            },
            {
                "kind": "multi_glyph",
                "content": "venus_kamea_perimeter",
                "direction": "clockwise",
                "rotation_deg": 0,
            },
        ],
        compass_tradition="archangels",
        compass_points={
            "E": "Anael (E)",
            "S": "Anael (S)",
            "W": "Anael (W)",
            "N": "Anael (N)",
        },
        centre_element={
            "kind": "kamea_trace",
            "square_id": "venus",
        },
        citation=(
            "*Ghāyat al-Ḥakīm* (Picatrix), Latin trans. for Alfonso X, "
            "13th c.; original Arabic 11th c. Public domain."
        ),
    ),
    PresetCircle(
        slug="greek_defixio",
        name="Greek Defixio Circle",
        purpose=(
            "Antique chthonic working — petition to the underworld powers "
            "with a tablet (lamella) deposited at the centre."
        ),
        diameter_m=1.6,
        rings=[
            {
                "kind": "inscription",
                "content": (
                    "ΕΡΕΣΧΙΓΑΛ · ΦΕΡΣΕΦΟΝΗ · ΕΚΑΤΗ · ΕΡΜΗΣ ΧΘΟΝΙΟΣ"
                ),
                "direction": "counter_clockwise",
                "rotation_deg": 0,
            },
            {
                "kind": "glyph_row",
                "content": "voces_magicae",
                "direction": "quarters",
                "rotation_deg": 0,
            },
        ],
        compass_tradition="greek_winds",
        compass_points={
            "E": "Euros",
            "S": "Notos",
            "W": "Zephyros",
            "N": "Boreas",
        },
        centre_element={"kind": "blank"},
        citation=(
            "Greek Magical Papyri (PGM) — Hellenistic to Late Antique. "
            "Public domain. See Betz, *The Greek Magical Papyri in "
            "Translation*, 1986 (compilation; underlying texts PD)."
        ),
    ),
)


def preset_by_slug(slug: str) -> PresetCircle | None:
    """Return the preset with the given slug or ``None``."""
    for circle in PRESET_CIRCLES:
        if circle.slug == slug:
            return circle
    return None
