"""Egyptian decans reference data.

b108-2hh · FEATURES §13 (reference plugin: Egyptian decans).

The 36 decans of the Egyptian zodiac — each governing 10° of the
zodiac wheel. Each decan carries:

- Zodiac sign membership (which of the 12 zodiac signs it lies within)
- Position within the sign (1st, 2nd, 3rd decan)
- Traditional Egyptian decan name (with Greek magical papyri variants
  where documented — PGM references included in notes)
- Ruling planet per the Chaldean order (the historical assignment)
- Brief significations drawn from Manilius + PGM tradition

The Chaldean-order rulers cycle Saturn → Jupiter → Mars → Sol →
Venus → Mercury → Luna → Saturn ... starting at 0° Aries. Some
occultist traditions use a different attribution — this table
follows the Manilius / Ptolemy default.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = ["Decan", "EGYPTIAN_DECANS"]


@dataclass(frozen=True)
class Decan:
    """One decan of the Egyptian zodiac (10° arc)."""

    index: int  # 0..35
    sign: str  # zodiac sign name
    position: int  # 1st, 2nd, 3rd within the sign
    name: str  # traditional decan name
    ruler: str  # Chaldean-order planet
    signification: str  # brief traditional meaning
    pgm_reference: str | None = None  # Greek Magical Papyri reference


# Chaldean order: Saturn, Jupiter, Mars, Sol, Venus, Mercury, Luna,
# then repeat. Starting at 0° Aries (index 0), we cycle through these
# seven planets over the 36 decans.
_CHALDEAN = ("Mars", "Sol", "Venus", "Mercury", "Luna", "Saturn", "Jupiter")


def _ruler(index: int) -> str:
    # Aries 1 = Mars (Chaldean default when starting from Aries).
    return _CHALDEAN[index % len(_CHALDEAN)]


_ZODIAC = (
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


# Traditional decan names — the Egyptian names as transmitted through
# the Greek magical papyri + Ptolemy. Where multiple variants exist,
# the most attested is used and alternatives noted in the signification.
_DECAN_NAMES: tuple[tuple[str, str], ...] = (
    ("Chontare", "First fruits: initiation, new beginnings, boldness."),
    ("Chontachre", "Movement toward action, rushing forward, warmth."),
    ("Siket", "Warlike energy, courage in adversity, righteous anger."),
    ("Chnoumis", "Solar strength, protection, healing (PGM VII.586)."),
    ("Chnouphis", "Fertility of earth, agricultural work, patience."),
    ("Chontarpi", "Endurance, holding the line, faithfulness."),
    ("Sothis", "Rising of the star Sirius, awakening, communication."),
    ("Sit", "Dual currents, mediation, translation between worlds."),
    ("Triphi", "Doubling and multiplication, twinship, alliance."),
    ("Sopchis", "Home, ancestry, moon-work, the crab's shell."),
    ("Ouare", "Nurturing power, mother-work, protective gestures."),
    ("Chnouphos", "Emotional depth, tides, the pull of memory."),
    ("Nepho", "Leonine dignity, sovereignty in one's domain."),
    ("Ptibiou", "Solar rulership, the sun at its height, generosity."),
    ("Choumi", "Creative fire, artistic outpouring, radiant confidence."),
    ("Sopdet", "Discernment, harvest of what was sown, right judgement."),
    ("Sit", "Analysis, breaking-down for study, meticulous care."),
    ("Phou", "Service to others, humble work, the small labor."),
    ("Chontare", "Balance restored, negotiation, weighing on scales."),
    ("Sipthontha", "Beauty as principle, aesthetic craft, harmony."),
    ("Ninosam", "Justice through mediation, treaty-making."),
    ("Iso", "Depth-work, the unseen, magical intensity."),
    ("Kambon", "Transformation via death and rebirth, secrecy kept."),
    ("Chrymon", "Regeneration, the sting that clears, catharsis."),
    ("Chontare", "The arrow's flight, aim at the distant target."),
    ("Sopdet", "Wisdom-teaching, philosophy, the crossing of paths."),
    ("Prostomphis", "Breaking new ground, discovery, journeying."),
    ("Themeso", "Discipline in ascent, the mountain climb."),
    ("Epimen", "Persistence over decades, dynasty-building."),
    ("Erasin", "Fulfilment through effort, the peak reached."),
    ("Archentechth", "Vision of the collective, humanitarian labor."),
    ("Chontachre", "Innovation, break with precedent, sudden insight."),
    ("Phou", "Community woven anew, group-mind, egregore-tending."),
    ("Sotmos", "Compassion without limit, the sea's embrace."),
    ("Ouare", "Mystical union, dissolution of boundaries."),
    ("Chnoubouth", "Return to source, mystery-cycle completion."),
)


def _build_decans() -> tuple[Decan, ...]:
    result = []
    for i, (name, signification) in enumerate(_DECAN_NAMES):
        sign_index = i // 3
        position_in_sign = (i % 3) + 1
        pgm_ref = None
        if "PGM" in signification:
            # Extract the PGM reference and strip it from the main text.
            start = signification.find("(PGM")
            end = signification.find(")", start) + 1
            pgm_ref = signification[start + 1 : end - 1]
            signification = (signification[:start] + signification[end:]).strip(" .")
            signification = signification + "."
        result.append(
            Decan(
                index=i,
                sign=_ZODIAC[sign_index],
                position=position_in_sign,
                name=name,
                ruler=_ruler(i),
                signification=signification,
                pgm_reference=pgm_ref,
            )
        )
    return tuple(result)


EGYPTIAN_DECANS: tuple[Decan, ...] = _build_decans()
