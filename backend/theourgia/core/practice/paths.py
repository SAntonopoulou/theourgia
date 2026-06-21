"""Tree of Life paths catalog.

The 22 paths of the Tree of Life — one per Hebrew letter — with the
attributions traditions agree on (Hebrew letter, ordinal number) and
the tradition-specific attributions (Tarot card, planet, sphere
connection) that vary.

Three traditions are bundled at this batch:

* **Lurianic** (Kabbalistic, 16th c.) — paths 11..32 corresponding
  to the 22 Hebrew letters in spelling order.
* **Golden Dawn** (late 19th c.) — the Hermetic Order of the Golden
  Dawn's Tarot-path correspondence.
* **Thelemic** — Crowley's 777 system; differs from Golden Dawn on
  a few paths (Aleph / Heh / Tzaddi swap).

Practitioners pick the tradition they walk; the same path number
maps to different Tarot cards across traditions, which is exactly
the catalog's job to make legible.

This file is static data; no DB persistence needed.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field

__all__ = [
    "TREE_PATHS",
    "TreeOfLifePath",
    "TreeTradition",
    "paths_for_tradition",
]


class TreeTradition(str, enum.Enum):
    LURIANIC = "lurianic"
    GOLDEN_DAWN = "golden_dawn"
    THELEMIC = "thelemic"


@dataclass(frozen=True, slots=True)
class TreeOfLifePath:
    """One path on the Tree.

    Path numbers run 11..32 (Hebrew letters; the ten Sephiroth take
    numbers 1..10). The ``connects`` field is a tuple of (lower,
    upper) Sephirah numbers — e.g. (1, 2) for the path from Kether
    to Chokmah.
    """

    number: int  # 11..32
    hebrew_letter: str
    letter_name: str  # transliteration ("Aleph", "Beth", ...)
    connects: tuple[int, int]  # (lower, upper) sephirah numbers
    name: str  # English path name (e.g. "Fool's Path")
    tradition: TreeTradition
    tarot_card: str | None  # slug from the bundled Tarot deck
    planet: str | None
    element: str | None
    color: str | None  # most-traditional descriptor
    deity_associations: tuple[str, ...] = field(default_factory=tuple)
    notes: str = ""


# Golden Dawn attributions (the most widely-used in English-language
# magic since 1888). Paths 11..32, Aleph through Tau. Tarot
# correspondences follow GD: Aleph = The Fool, Beth = The Magician,
# etc.
_GD_PATHS: tuple[TreeOfLifePath, ...] = (
    TreeOfLifePath(11, "א", "Aleph", (1, 2), "Path of the Fool",
                   TreeTradition.GOLDEN_DAWN, "the-fool", None, "air",
                   "pale yellow",
                   ("Zeus", "Vayu")),
    TreeOfLifePath(12, "ב", "Beth", (1, 3), "Path of the Magician",
                   TreeTradition.GOLDEN_DAWN, "the-magician", "Mercury", None,
                   "yellow",
                   ("Hermes", "Thoth", "Anubis")),
    TreeOfLifePath(13, "ג", "Gimel", (1, 6), "Path of the High Priestess",
                   TreeTradition.GOLDEN_DAWN, "the-high-priestess", "Moon", None,
                   "blue",
                   ("Artemis", "Hekate", "Selene", "Diana")),
    TreeOfLifePath(14, "ד", "Daleth", (2, 3), "Path of the Empress",
                   TreeTradition.GOLDEN_DAWN, "the-empress", "Venus", None,
                   "emerald",
                   ("Aphrodite", "Demeter", "Isis")),
    TreeOfLifePath(15, "ה", "Heh", (2, 6), "Path of the Emperor",
                   TreeTradition.GOLDEN_DAWN, "the-emperor", None, None,
                   "scarlet",
                   ("Ares", "Mars-Hera-Hercules cluster"),
                   notes="In Golden Dawn, Heh = The Emperor + Aries."),
    TreeOfLifePath(16, "ו", "Vau", (2, 4), "Path of the Hierophant",
                   TreeTradition.GOLDEN_DAWN, "the-hierophant", None, None,
                   "red-orange",
                   ("Dionysus", "Taurus cluster"),
                   notes="Vau = The Hierophant + Taurus."),
    TreeOfLifePath(17, "ז", "Zayin", (3, 6), "Path of the Lovers",
                   TreeTradition.GOLDEN_DAWN, "the-lovers", None, None,
                   "orange",
                   ("Apollo", "Gemini cluster")),
    TreeOfLifePath(18, "ח", "Cheth", (3, 5), "Path of the Chariot",
                   TreeTradition.GOLDEN_DAWN, "the-chariot", None, None,
                   "amber",
                   ("Khepera", "Cancer cluster")),
    TreeOfLifePath(19, "ט", "Teth", (4, 5), "Path of Strength",
                   TreeTradition.GOLDEN_DAWN, "strength", None, None,
                   "yellow-green",
                   ("Sekhmet", "Leo cluster")),
    TreeOfLifePath(20, "י", "Yod", (4, 6), "Path of the Hermit",
                   TreeTradition.GOLDEN_DAWN, "the-hermit", None, None,
                   "green",
                   ("Hermes Senex", "Virgo cluster")),
    TreeOfLifePath(21, "כ", "Kaph", (4, 7), "Path of the Wheel of Fortune",
                   TreeTradition.GOLDEN_DAWN, "wheel-of-fortune", "Jupiter", None,
                   "violet",
                   ("Zeus", "Jupiter", "Tyche")),
    TreeOfLifePath(22, "ל", "Lamed", (5, 6), "Path of Justice",
                   TreeTradition.GOLDEN_DAWN, "justice", None, None,
                   "emerald-green",
                   ("Themis", "Maat", "Libra cluster")),
    TreeOfLifePath(23, "מ", "Mem", (5, 8), "Path of the Hanged Man",
                   TreeTradition.GOLDEN_DAWN, "the-hanged-man", None, "water",
                   "deep blue",
                   ("Poseidon", "water deities")),
    TreeOfLifePath(24, "נ", "Nun", (6, 7), "Path of Death",
                   TreeTradition.GOLDEN_DAWN, "death", None, None,
                   "blue-green",
                   ("Persephone", "Hekate-Soteira", "Scorpio cluster")),
    TreeOfLifePath(25, "ס", "Samekh", (6, 9), "Path of Temperance",
                   TreeTradition.GOLDEN_DAWN, "temperance", None, None,
                   "blue",
                   ("Iris", "Sagittarius cluster")),
    TreeOfLifePath(26, "ע", "Ayin", (6, 8), "Path of the Devil",
                   TreeTradition.GOLDEN_DAWN, "the-devil", None, None,
                   "indigo",
                   ("Pan", "Capricorn cluster")),
    TreeOfLifePath(27, "פ", "Peh", (7, 8), "Path of the Tower",
                   TreeTradition.GOLDEN_DAWN, "the-tower", "Mars", None,
                   "red",
                   ("Ares", "Mars", "Sekhmet")),
    TreeOfLifePath(28, "צ", "Tzaddi", (7, 9), "Path of the Star",
                   TreeTradition.GOLDEN_DAWN, "the-star", None, None,
                   "violet",
                   ("Aquarius cluster",)),
    TreeOfLifePath(29, "ק", "Qoph", (7, 10), "Path of the Moon",
                   TreeTradition.GOLDEN_DAWN, "the-moon", None, None,
                   "crimson",
                   ("Selene", "Pisces cluster")),
    TreeOfLifePath(30, "ר", "Resh", (8, 9), "Path of the Sun",
                   TreeTradition.GOLDEN_DAWN, "the-sun", "Sun", None,
                   "orange",
                   ("Helios", "Apollo", "Ra")),
    TreeOfLifePath(31, "ש", "Shin", (8, 10), "Path of Judgement",
                   TreeTradition.GOLDEN_DAWN, "judgement", None, "fire",
                   "scarlet",
                   ("Pyromantic deities",)),
    TreeOfLifePath(32, "ת", "Tau", (9, 10), "Path of the World",
                   TreeTradition.GOLDEN_DAWN, "the-world", "Saturn", "earth",
                   "indigo",
                   ("Kronos", "Saturn", "Demeter")),
)


# Thelemic adjustments (Crowley's 777). Two well-known swaps:
# * Heh (15) ↔ Tzaddi (28) Tarot correspondence is famously
#   "swapped" per Liber AL: The Star → Tzaddi instead of Heh, and
#   The Emperor moves accordingly. ("Tzaddi is not the Star.")
# Other paths align with Golden Dawn at this granularity.
def _thelemic_paths() -> tuple[TreeOfLifePath, ...]:
    overrides = {
        15: dict(
            tarot_card="the-star",
            name="Path of the Star (Thelemic)",
            notes=(
                "Per Liber AL II:24 'Tzaddi is not the Star': the Star "
                "Tarot trump attaches to Heh, not Tzaddi, in Thelemic "
                "tradition. Some practitioners further swap to align "
                "Aries with The Star."
            ),
        ),
        28: dict(
            tarot_card="the-emperor",
            name="Path of the Emperor (Thelemic)",
            notes=(
                "Per Thelemic redress of Liber AL II:24: The Emperor "
                "moves to Tzaddi, balancing the Star's shift."
            ),
        ),
    }
    result: list[TreeOfLifePath] = []
    for gd_path in _GD_PATHS:
        override = overrides.get(gd_path.number)
        if override is None:
            result.append(
                TreeOfLifePath(
                    number=gd_path.number,
                    hebrew_letter=gd_path.hebrew_letter,
                    letter_name=gd_path.letter_name,
                    connects=gd_path.connects,
                    name=gd_path.name,
                    tradition=TreeTradition.THELEMIC,
                    tarot_card=gd_path.tarot_card,
                    planet=gd_path.planet,
                    element=gd_path.element,
                    color=gd_path.color,
                    deity_associations=gd_path.deity_associations,
                    notes=gd_path.notes,
                )
            )
        else:
            result.append(
                TreeOfLifePath(
                    number=gd_path.number,
                    hebrew_letter=gd_path.hebrew_letter,
                    letter_name=gd_path.letter_name,
                    connects=gd_path.connects,
                    name=override["name"],
                    tradition=TreeTradition.THELEMIC,
                    tarot_card=override["tarot_card"],
                    planet=gd_path.planet,
                    element=gd_path.element,
                    color=gd_path.color,
                    deity_associations=gd_path.deity_associations,
                    notes=override["notes"],
                )
            )
    return tuple(result)


# Lurianic — purely the Hebrew letter + ordinal + sephirah
# connections, without Tarot attribution (Tarot is a later Western
# overlay; Lurianic Kabbalah doesn't use it). The fields the GD
# tradition fills are sparser here.
def _lurianic_paths() -> tuple[TreeOfLifePath, ...]:
    return tuple(
        TreeOfLifePath(
            number=gd.number,
            hebrew_letter=gd.hebrew_letter,
            letter_name=gd.letter_name,
            connects=gd.connects,
            name=f"Path of {gd.letter_name}",
            tradition=TreeTradition.LURIANIC,
            tarot_card=None,  # Tarot is not Lurianic
            planet=None,
            element=None,
            color=None,
            deity_associations=(),
            notes="",
        )
        for gd in _GD_PATHS
    )


TREE_PATHS: tuple[TreeOfLifePath, ...] = (
    *_lurianic_paths(),
    *_GD_PATHS,
    *_thelemic_paths(),
)


def paths_for_tradition(tradition: TreeTradition | str) -> tuple[TreeOfLifePath, ...]:
    target = tradition if isinstance(tradition, TreeTradition) else TreeTradition(tradition)
    return tuple(p for p in TREE_PATHS if p.tradition == target)
