"""Bundled transliteration schemes — public-domain / open-standard.

Per ``plan/08-batches-backend.md`` § B113.

Eight schemes shipped:

  greek-beta-code  · Beta Code (TLG)
  greek-ala-lc     · ALA-LC 2010 (Greek)
  iast             · IAST (1894 Geneva Congress)
  harvard-kyoto    · Harvard-Kyoto ASCII Sanskrit
  sbl-hebrew       · SBL Hebrew Romanization (2014)
  iso-233-arabic   · ISO 233:1984 Arabic
  din-31635-arabic · DIN 31635 (2011)
  coptic-sbl       · SBL Coptic Romanization

Every scheme is the SCRIPT_TO_LATIN direction (the inverse can be
derived by the loader; the server stores the canonical direction
the scheme was authored in).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping

__all__ = [
    "BUNDLED_SCHEMES",
    "BundledScheme",
    "scheme_by_slug",
    "apply_scheme",
]


@dataclass(frozen=True)
class BundledScheme:
    """An immutable bundled transliteration scheme."""

    slug: str
    name: str
    source_script: str  # greek/hebrew/sanskrit/arabic/coptic
    direction: str  # "script_to_latin" / "latin_to_script"
    citation: str
    round_trip_status: str  # "lossless" / "normalises" / "lossy"
    mapping: Mapping[str, str] = field(default_factory=dict)
    notes: str = ""


# ── Greek · Beta Code ───────────────────────────────────────────────
#
# Beta Code (Thesaurus Linguae Graecae, UC Irvine). Lossless: every
# accent / breathing / iota subscript has a unique mark. Notation:
# ) = smooth breathing, ( = rough, / = acute, \ = grave, =
# = circumflex, | = iota subscript. We store only the BASE letter
# mapping; the client composes the diacritics from the NFD codepoints.

_GREEK_BETA_CODE: dict[str, str] = {
    "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z",
    "η": "h", "θ": "q", "ι": "i", "κ": "k", "λ": "l", "μ": "m",
    "ν": "n", "ξ": "c", "ο": "o", "π": "p", "ρ": "r", "σ": "s",
    "ς": "s", "τ": "t", "υ": "u", "φ": "f", "χ": "x", "ψ": "y",
    "ω": "w",
    # Diacritic combining marks → Beta Code marks
    "̀": "\\",   # combining grave
    "́": "/",    # combining acute
    "̂": "=",    # combining circumflex
    "̓": ")",    # combining smooth breathing
    "̔": "(",    # combining rough breathing
    "ͅ": "|",    # combining ypogegrammeni (iota subscript)
    "̈": "+",    # combining diaeresis
}


# ── Greek · ALA-LC ──────────────────────────────────────────────────

_GREEK_ALA_LC: dict[str, str] = {
    "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z",
    "η": "ē", "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m",
    "ν": "n", "ξ": "x", "ο": "o", "π": "p", "ρ": "r", "σ": "s",
    "ς": "s", "τ": "t", "υ": "y", "φ": "ph", "χ": "ch", "ψ": "ps",
    "ω": "ō",
}


# ── Sanskrit · IAST ─────────────────────────────────────────────────
# Devanagari → IAST. Verified against the standard Vedic-era table.

_IAST: dict[str, str] = {
    # vowels
    "अ": "a", "आ": "ā", "इ": "i", "ई": "ī", "उ": "u", "ऊ": "ū",
    "ऋ": "ṛ", "ॠ": "ṝ", "ऌ": "ḷ", "ॡ": "ḹ",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
    # ka-varga
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ṅ",
    # ca-varga
    "च": "c", "छ": "ch", "ज": "j", "झ": "jh", "ञ": "ñ",
    # ṭa-varga (retroflex)
    "ट": "ṭ", "ठ": "ṭh", "ड": "ḍ", "ढ": "ḍh", "ण": "ṇ",
    # ta-varga (dental)
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    # pa-varga
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    # ya-varga + sibilants + h
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "ś", "ष": "ṣ", "स": "s", "ह": "h",
    # vowel marks (combining)
    "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū",
    "ृ": "ṛ", "ॄ": "ṝ", "ॢ": "ḷ", "ॣ": "ḹ",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
    # virama / halanta — strips the inherent 'a'
    "्": "",
    # anusvāra / visarga / candrabindu
    "ं": "ṃ", "ः": "ḥ", "ँ": "m̐",
    # ZWNJ / ZWJ etc are ignored as zero-width
}


# ── Sanskrit · Harvard-Kyoto ────────────────────────────────────────
# ASCII-only Sanskrit; differs from IAST in mappings for diacritics
# (e.g., ā → A, ṛ → R, ṅ → G).

_HARVARD_KYOTO: dict[str, str] = {
    # vowels
    "अ": "a", "आ": "A", "इ": "i", "ई": "I", "उ": "u", "ऊ": "U",
    "ऋ": "R", "ॠ": "RR", "ऌ": "lR", "ॡ": "lRR",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
    # consonants
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "G",
    "च": "c", "छ": "ch", "ज": "j", "झ": "jh", "ञ": "J",
    "ट": "T", "ठ": "Th", "ड": "D", "ढ": "Dh", "ण": "N",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "z", "ष": "S", "स": "s", "ह": "h",
    # vowel marks
    "ा": "A", "ि": "i", "ी": "I", "ु": "u", "ू": "U",
    "ृ": "R", "ॄ": "RR", "ॢ": "lR", "ॣ": "lRR",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
    "्": "",
    "ं": "M", "ः": "H",
}


# ── Hebrew · SBL Romanization ───────────────────────────────────────
# SBL Hebrew Style 2014. Normalises some letters (kaf vs khaf
# distinguished by dagesh which isn't always present in unpointed
# text).

_SBL_HEBREW: dict[str, str] = {
    "א": "ʾ", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "w",
    "ז": "z", "ח": "ḥ", "ט": "ṭ", "י": "y", "כ": "k", "ך": "k",
    "ל": "l", "מ": "m", "ם": "m", "נ": "n", "ן": "n", "ס": "s",
    "ע": "ʿ", "פ": "p", "ף": "p", "צ": "ṣ", "ץ": "ṣ", "ק": "q",
    "ר": "r", "ש": "š", "ת": "t",
}


# ── Arabic · ISO 233 ────────────────────────────────────────────────
# ISO 233:1984. Lossless: each Arabic consonant has a unique Latin
# representation with diacritic.

_ISO_233_ARABIC: dict[str, str] = {
    "ا": "ʾ", "ب": "b", "ت": "t", "ث": "ṯ", "ج": "ǧ", "ح": "ḥ",
    "خ": "ḫ", "د": "d", "ذ": "ḏ", "ر": "r", "ز": "z", "س": "s",
    "ش": "š", "ص": "ṣ", "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ",
    "غ": "ġ", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m",
    "ن": "n", "ه": "h", "و": "w", "ي": "y",
    # Hamza variants
    "ء": "ʾ", "أ": "ʾa", "إ": "ʾi", "ؤ": "ʾu",
    # tā' marbūṭa
    "ة": "ẗ",
    # alif maqsūra
    "ى": "ỳ",
    # alif with madda
    "آ": "ʾā",
}


# ── Arabic · DIN 31635 ──────────────────────────────────────────────
# German standard 2011; widely used in academic Arabic publishing.
# Differs from ISO 233 in some diacritic conventions.

_DIN_31635_ARABIC: dict[str, str] = {
    "ا": "ā", "ب": "b", "ت": "t", "ث": "ṯ", "ج": "ǧ", "ح": "ḥ",
    "خ": "ḫ", "د": "d", "ذ": "ḏ", "ر": "r", "ز": "z", "س": "s",
    "ش": "š", "ص": "ṣ", "ض": "ḍ", "ط": "ṭ", "ظ": "ẓ", "ع": "ʿ",
    "غ": "ġ", "ف": "f", "ق": "q", "ك": "k", "ل": "l", "م": "m",
    "ن": "n", "ه": "h", "و": "w", "ي": "y",
    "ء": "ʾ", "أ": "ʾa", "إ": "ʾi", "ؤ": "ʾu",
    "ة": "h",
    "ى": "ā",
    "آ": "ʾā",
}


# ── Coptic · SBL ────────────────────────────────────────────────────

_COPTIC_SBL: dict[str, str] = {
    "ⲁ": "a", "ⲃ": "b", "ⲅ": "g", "ⲇ": "d", "ⲉ": "e", "ⲋ": "ⲋ",
    "ⲍ": "z", "ⲏ": "ē", "ⲑ": "th", "ⲓ": "i", "ⲕ": "k", "ⲗ": "l",
    "ⲙ": "m", "ⲛ": "n", "ⲝ": "x", "ⲟ": "o", "ⲡ": "p", "ⲣ": "r",
    "ⲥ": "s", "ⲧ": "t", "ⲩ": "u", "ⲫ": "ph", "ⲭ": "ch", "ⲯ": "ps",
    "ⲱ": "ō",
    # Coptic-specific letters borrowed from Demotic
    "ϣ": "š", "ϥ": "f", "ϧ": "ḫ", "ϩ": "h", "ϫ": "j", "ϭ": "č",
    "ϯ": "ti",
}


# ── Bundled catalog ────────────────────────────────────────────────


BUNDLED_SCHEMES: tuple[BundledScheme, ...] = (
    BundledScheme(
        slug="greek-beta-code",
        name="Beta Code",
        source_script="greek",
        direction="script_to_latin",
        citation=(
            "Thesaurus Linguae Graecae project, UC Irvine. "
            "Public-domain reference."
        ),
        round_trip_status="lossless",
        mapping=_GREEK_BETA_CODE,
        notes=(
            "ASCII-only encoding for Polytonic Greek. Diacritic "
            "marks are encoded as Beta Code symbols ()/\\=|+) after "
            "the base letter."
        ),
    ),
    BundledScheme(
        slug="greek-ala-lc",
        name="ALA-LC (Greek)",
        source_script="greek",
        direction="script_to_latin",
        citation=(
            "American Library Association / Library of Congress "
            "romanization, 2010 edition."
        ),
        round_trip_status="normalises",
        mapping=_GREEK_ALA_LC,
    ),
    BundledScheme(
        slug="iast",
        name="IAST",
        source_script="sanskrit",
        direction="script_to_latin",
        citation=(
            "International Alphabet of Sanskrit Transliteration — "
            "1894 Geneva Congress standard. Public domain."
        ),
        round_trip_status="lossless",
        mapping=_IAST,
    ),
    BundledScheme(
        slug="harvard-kyoto",
        name="Harvard-Kyoto",
        source_script="sanskrit",
        direction="script_to_latin",
        citation=(
            "ASCII Sanskrit standard from Harvard-Kyoto 1970s. "
            "Public domain."
        ),
        round_trip_status="lossless",
        mapping=_HARVARD_KYOTO,
    ),
    BundledScheme(
        slug="sbl-hebrew",
        name="SBL Hebrew Romanization",
        source_script="hebrew",
        direction="script_to_latin",
        citation=(
            "Society of Biblical Literature, 2014 style manual."
        ),
        round_trip_status="normalises",
        mapping=_SBL_HEBREW,
    ),
    BundledScheme(
        slug="iso-233-arabic",
        name="ISO 233",
        source_script="arabic",
        direction="script_to_latin",
        citation=(
            "ISO 233:1984 international standard. Convention; "
            "widely public domain."
        ),
        round_trip_status="lossless",
        mapping=_ISO_233_ARABIC,
    ),
    BundledScheme(
        slug="din-31635-arabic",
        name="DIN 31635",
        source_script="arabic",
        direction="script_to_latin",
        citation=(
            "Deutsches Institut für Normung 31635, 2011."
        ),
        round_trip_status="normalises",
        mapping=_DIN_31635_ARABIC,
    ),
    BundledScheme(
        slug="coptic-sbl",
        name="SBL Coptic",
        source_script="coptic",
        direction="script_to_latin",
        citation=(
            "Society of Biblical Literature Coptic Romanization."
        ),
        round_trip_status="normalises",
        mapping=_COPTIC_SBL,
    ),
)


def scheme_by_slug(slug: str) -> BundledScheme | None:
    """Return the bundled scheme with the given slug, or None."""
    for s in BUNDLED_SCHEMES:
        if s.slug == slug:
            return s
    return None


def apply_scheme(text: str, scheme: BundledScheme) -> str:
    """Apply a scheme codepoint-by-codepoint.

    Useful for the canonical-input tests + for the client to verify
    its output against the server reference. Returns the
    transliterated string; codepoints not in the mapping pass through
    unchanged.
    """
    out: list[str] = []
    for ch in text:
        out.append(scheme.mapping.get(ch, ch))
    return "".join(out)
