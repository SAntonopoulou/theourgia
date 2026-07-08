"""777 Correspondences reference data.

b108-2hh · FEATURES §13 (reference plugin: 777 correspondences importer).

Aleister Crowley's *Liber 777 vel Prolegomena Symbolica ad
Systemam Sceptico-Mysticae Viae Explicandae, Fundamentum
Hieroglyphicum Sanctissimorum Scientiae Summae* — the canonical
correspondence table of the Golden Dawn / Thelemic tradition,
first published 1909 and expanded in the 1955 edition.

The full 777 has hundreds of columns keyed to the 32 rows (10
sephiroth + 22 paths of the Tree of Life). Here we ship the most
practically-cited columns: sephira/path number, Hebrew letter (for
paths), key scale, Divine name, archangel, order of angels,
planetary/elemental attribution, and color.

Copyright note: Crowley died in 1947; *Liber 777* is public domain
in the UK + US (life+70). The data ships bundled with Theourgia
under AGPL-3.0 for the code + PD for the data.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = ["Correspondence777Row", "CORRESPONDENCES_777"]


@dataclass(frozen=True)
class Correspondence777Row:
    """One row of the 777 table.

    Rows 1-10 are the sephiroth (Kether to Malkuth). Rows 11-32 are
    the 22 paths (11 = Aleph → 32 = Tau). The key_scale is the
    numerical index used in Crowley's Column I.
    """

    key_scale: int
    row_kind: str  # "sephira" or "path"
    hebrew_letter: str | None
    name: str  # sephira name or path name
    attribution: str  # element / planet / zodiac sign
    divine_name: str  # column II
    archangel: str  # column III
    order_of_angels: str  # column IV
    color_king_scale: str  # column XV (King scale)


# ── Sephiroth (rows 1-10) ─────────────────────────────────────────

_SEPHIROTH: tuple[Correspondence777Row, ...] = (
    Correspondence777Row(
        key_scale=1, row_kind="sephira", hebrew_letter=None,
        name="Kether", attribution="Primum Mobile",
        divine_name="Eheieh",
        archangel="Metatron",
        order_of_angels="Chaioth ha-Qadesh",
        color_king_scale="Brilliance",
    ),
    Correspondence777Row(
        key_scale=2, row_kind="sephira", hebrew_letter=None,
        name="Chokmah", attribution="Zodiac / Fixed Stars",
        divine_name="Yah",
        archangel="Ratziel",
        order_of_angels="Auphanim",
        color_king_scale="Pure soft blue",
    ),
    Correspondence777Row(
        key_scale=3, row_kind="sephira", hebrew_letter=None,
        name="Binah", attribution="Saturn",
        divine_name="YHVH Elohim",
        archangel="Tzaphqiel",
        order_of_angels="Aralim",
        color_king_scale="Crimson",
    ),
    Correspondence777Row(
        key_scale=4, row_kind="sephira", hebrew_letter=None,
        name="Chesed", attribution="Jupiter",
        divine_name="El",
        archangel="Tzadqiel",
        order_of_angels="Chasmalim",
        color_king_scale="Deep violet",
    ),
    Correspondence777Row(
        key_scale=5, row_kind="sephira", hebrew_letter=None,
        name="Geburah", attribution="Mars",
        divine_name="Elohim Gibor",
        archangel="Khamael",
        order_of_angels="Seraphim",
        color_king_scale="Orange",
    ),
    Correspondence777Row(
        key_scale=6, row_kind="sephira", hebrew_letter=None,
        name="Tiphareth", attribution="Sol",
        divine_name="YHVH Eloah va-Daath",
        archangel="Raphael",
        order_of_angels="Malachim",
        color_king_scale="Clear pink rose",
    ),
    Correspondence777Row(
        key_scale=7, row_kind="sephira", hebrew_letter=None,
        name="Netzach", attribution="Venus",
        divine_name="YHVH Tzabaoth",
        archangel="Haniel",
        order_of_angels="Elohim",
        color_king_scale="Amber",
    ),
    Correspondence777Row(
        key_scale=8, row_kind="sephira", hebrew_letter=None,
        name="Hod", attribution="Mercury",
        divine_name="Elohim Tzabaoth",
        archangel="Michael",
        order_of_angels="Beni Elohim",
        color_king_scale="Violet purple",
    ),
    Correspondence777Row(
        key_scale=9, row_kind="sephira", hebrew_letter=None,
        name="Yesod", attribution="Luna",
        divine_name="Shaddai el Chai",
        archangel="Gabriel",
        order_of_angels="Cherubim",
        color_king_scale="Indigo",
    ),
    Correspondence777Row(
        key_scale=10, row_kind="sephira", hebrew_letter=None,
        name="Malkuth", attribution="Earth / Four Elements",
        divine_name="Adonai ha-Aretz",
        archangel="Sandalphon",
        order_of_angels="Ashim",
        color_king_scale="Yellow",
    ),
)


# ── Paths (rows 11-32) ────────────────────────────────────────────
# The 22 paths of the Tree of Life, keyed by Hebrew letter and Tarot
# trump correspondence per the Golden Dawn attribution.

_PATHS: tuple[Correspondence777Row, ...] = (
    Correspondence777Row(
        key_scale=11, row_kind="path", hebrew_letter="Aleph",
        name="The Fool", attribution="Air",
        divine_name="YHVH", archangel="Raphael",
        order_of_angels="Sylphs", color_king_scale="Bright pale yellow",
    ),
    Correspondence777Row(
        key_scale=12, row_kind="path", hebrew_letter="Beth",
        name="The Magus", attribution="Mercury",
        divine_name="Elohim Tzabaoth", archangel="Michael",
        order_of_angels="Beni Elohim", color_king_scale="Yellow",
    ),
    Correspondence777Row(
        key_scale=13, row_kind="path", hebrew_letter="Gimel",
        name="The High Priestess", attribution="Luna",
        divine_name="Shaddai el Chai", archangel="Gabriel",
        order_of_angels="Cherubim", color_king_scale="Blue",
    ),
    Correspondence777Row(
        key_scale=14, row_kind="path", hebrew_letter="Daleth",
        name="The Empress", attribution="Venus",
        divine_name="YHVH Tzabaoth", archangel="Haniel",
        order_of_angels="Elohim", color_king_scale="Emerald green",
    ),
    Correspondence777Row(
        key_scale=15, row_kind="path", hebrew_letter="He",
        name="The Emperor", attribution="Aries",
        divine_name="YHVH", archangel="Melchidael",
        order_of_angels="Bene Seraphim", color_king_scale="Scarlet",
    ),
    Correspondence777Row(
        key_scale=16, row_kind="path", hebrew_letter="Vau",
        name="The Hierophant", attribution="Taurus",
        divine_name="YHVH", archangel="Asmodel",
        order_of_angels="Cherubim", color_king_scale="Red orange",
    ),
    Correspondence777Row(
        key_scale=17, row_kind="path", hebrew_letter="Zain",
        name="The Lovers", attribution="Gemini",
        divine_name="YHVH", archangel="Ambriel",
        order_of_angels="Elohim", color_king_scale="Orange",
    ),
    Correspondence777Row(
        key_scale=18, row_kind="path", hebrew_letter="Cheth",
        name="The Chariot", attribution="Cancer",
        divine_name="YHVH", archangel="Muriel",
        order_of_angels="Beni Elohim", color_king_scale="Amber",
    ),
    Correspondence777Row(
        key_scale=19, row_kind="path", hebrew_letter="Teth",
        name="Lust / Strength", attribution="Leo",
        divine_name="YHVH", archangel="Verchiel",
        order_of_angels="Malachim", color_king_scale="Yellow greenish",
    ),
    Correspondence777Row(
        key_scale=20, row_kind="path", hebrew_letter="Yod",
        name="The Hermit", attribution="Virgo",
        divine_name="YHVH", archangel="Hamaliel",
        order_of_angels="Aralim", color_king_scale="Green yellowish",
    ),
    Correspondence777Row(
        key_scale=21, row_kind="path", hebrew_letter="Kaph",
        name="Fortune / Wheel of Fortune", attribution="Jupiter",
        divine_name="El", archangel="Tzadqiel",
        order_of_angels="Chasmalim", color_king_scale="Violet",
    ),
    Correspondence777Row(
        key_scale=22, row_kind="path", hebrew_letter="Lamed",
        name="Adjustment / Justice", attribution="Libra",
        divine_name="YHVH", archangel="Zuriel",
        order_of_angels="Malachim", color_king_scale="Emerald green",
    ),
    Correspondence777Row(
        key_scale=23, row_kind="path", hebrew_letter="Mem",
        name="The Hanged Man", attribution="Water",
        divine_name="El", archangel="Gabriel",
        order_of_angels="Undines", color_king_scale="Deep blue",
    ),
    Correspondence777Row(
        key_scale=24, row_kind="path", hebrew_letter="Nun",
        name="Death", attribution="Scorpio",
        divine_name="YHVH", archangel="Barchiel",
        order_of_angels="Seraphim", color_king_scale="Green blue",
    ),
    Correspondence777Row(
        key_scale=25, row_kind="path", hebrew_letter="Samech",
        name="Art / Temperance", attribution="Sagittarius",
        divine_name="YHVH", archangel="Adnachiel",
        order_of_angels="Malachim", color_king_scale="Blue",
    ),
    Correspondence777Row(
        key_scale=26, row_kind="path", hebrew_letter="Ayin",
        name="The Devil", attribution="Capricorn",
        divine_name="YHVH", archangel="Haniel",
        order_of_angels="Elohim", color_king_scale="Indigo",
    ),
    Correspondence777Row(
        key_scale=27, row_kind="path", hebrew_letter="Peh",
        name="The Tower", attribution="Mars",
        divine_name="Elohim Gibor", archangel="Khamael",
        order_of_angels="Seraphim", color_king_scale="Scarlet",
    ),
    Correspondence777Row(
        key_scale=28, row_kind="path", hebrew_letter="Tzaddi",
        name="The Star", attribution="Aquarius",
        divine_name="YHVH", archangel="Cambriel",
        order_of_angels="Auphanim", color_king_scale="Violet",
    ),
    Correspondence777Row(
        key_scale=29, row_kind="path", hebrew_letter="Qoph",
        name="The Moon", attribution="Pisces",
        divine_name="YHVH", archangel="Amnitziel",
        order_of_angels="Beni Elohim", color_king_scale="Crimson",
    ),
    Correspondence777Row(
        key_scale=30, row_kind="path", hebrew_letter="Resh",
        name="The Sun", attribution="Sol",
        divine_name="YHVH Eloah va-Daath", archangel="Raphael",
        order_of_angels="Malachim", color_king_scale="Orange",
    ),
    Correspondence777Row(
        key_scale=31, row_kind="path", hebrew_letter="Shin",
        name="The Aeon / Judgement", attribution="Fire / Spirit",
        divine_name="YHVH", archangel="Michael",
        order_of_angels="Salamanders", color_king_scale="Glowing orange scarlet",
    ),
    Correspondence777Row(
        key_scale=32, row_kind="path", hebrew_letter="Tau",
        name="The Universe / World", attribution="Saturn / Earth",
        divine_name="YHVH Elohim", archangel="Tzaphqiel",
        order_of_angels="Aralim", color_king_scale="Indigo",
    ),
)


CORRESPONDENCES_777: tuple[Correspondence777Row, ...] = _SEPHIROTH + _PATHS
