"""The dignities - the five ways a sign or a degree belongs to a planet.

A faithful port of ``astropractise/lib/domain/astrology/dignities.dart`` (the
canonical engine), which is itself sourced from ``CANON-01_reference-tables.md``
sections 2-6. Four of the five are the Hellenistic essential dignities proper -
domicile (*oikos*), exaltation (*hupsoma*), triplicity (*trigonon*) and bounds
(*horia*); the fifth subdivision here, the decans, is deliberately NOT one of
them (the Medieval tradition promoted it, and modern software inherited that).

Everything here is a table plus a lookup. No ephemeris, no judgment: positions
are injected, and the condition engine consumes these - it does not live here.

TWO OPPOSITE BOUNDARY CONVENTIONS LIVE IN THIS FILE, AND THIS IS CORRECT. The
Egyptian bounds use George's *ordinal* rule - 6 deg 00 min Aries is the sixth
degree, and belongs to Jupiter. The decans use the ordinary *half-open* rule -
[0,10) / [10,20) / [20,30). The inconsistency is in the sources themselves,
printed a dozen pages apart in the same book. Do not harmonise them.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum

from .bodies import Planet
from .sect import Sect
from .zodiac import Triplicity, ZodiacSign, degree_in_sign, sign_of_longitude

# ═══════════════════════════════════════════════════════════════════════════
# section 2 - DOMICILE (oikos)
# ═══════════════════════════════════════════════════════════════════════════

# Sign -> its domicile lord. Every sign has exactly one; there are no gaps.
# Complete agreement between George (Table 14) and Brennan (p. 232). No
# outer-planet rulerships, in any mode.
DOMICILE_LORDS: dict[ZodiacSign, Planet] = {
    ZodiacSign.ARIES: Planet.MARS,
    ZodiacSign.TAURUS: Planet.VENUS,
    ZodiacSign.GEMINI: Planet.MERCURY,
    ZodiacSign.CANCER: Planet.MOON,
    ZodiacSign.LEO: Planet.SUN,
    ZodiacSign.VIRGO: Planet.MERCURY,
    ZodiacSign.LIBRA: Planet.VENUS,
    ZodiacSign.SCORPIO: Planet.MARS,
    ZodiacSign.SAGITTARIUS: Planet.JUPITER,
    ZodiacSign.CAPRICORN: Planet.SATURN,
    ZodiacSign.AQUARIUS: Planet.SATURN,
    ZodiacSign.PISCES: Planet.JUPITER,
}


def domicile_lord_of(sign: ZodiacSign) -> Planet:
    """The domicile lord of a sign. Never None - the twelve signs are covered."""
    return DOMICILE_LORDS[sign]


def domicile_lord_of_longitude(ecliptic_longitude: float) -> Planet:
    return domicile_lord_of(sign_of_longitude(ecliptic_longitude))


@dataclass(frozen=True, slots=True)
class Domiciles:
    """A planet's domiciles, split by sect. Each luminary holds one sign; each
    of the other five holds two - one masculine (the diurnal domicile) and one
    feminine (the nocturnal one). The day/night split is derived from the sign
    genders, not transcribed."""

    planet: Planet
    # The masculine-sign domicile. None for the Moon, which holds only Cancer.
    diurnal: ZodiacSign | None = None
    # The feminine-sign domicile. None for the Sun, which holds only Leo.
    nocturnal: ZodiacSign | None = None

    @property
    def all(self) -> list[ZodiacSign]:
        """Both domiciles in zodiacal order; one entry for the luminaries."""
        signs = [s for s in (self.diurnal, self.nocturnal) if s is not None]
        return sorted(signs, key=lambda s: s.index)

    @property
    def is_sole_domicile(self) -> bool:
        """True for the Sun and Moon, which hold a single sign each."""
        return self.diurnal is None or self.nocturnal is None


# Planet -> its domiciles. Only the seven; the nodes rule nothing.
DOMICILES_BY_PLANET: dict[Planet, Domiciles] = {
    Planet.SUN: Domiciles(planet=Planet.SUN, diurnal=ZodiacSign.LEO),
    Planet.MOON: Domiciles(planet=Planet.MOON, nocturnal=ZodiacSign.CANCER),
    Planet.MERCURY: Domiciles(
        planet=Planet.MERCURY, diurnal=ZodiacSign.GEMINI, nocturnal=ZodiacSign.VIRGO
    ),
    Planet.VENUS: Domiciles(
        planet=Planet.VENUS, diurnal=ZodiacSign.LIBRA, nocturnal=ZodiacSign.TAURUS
    ),
    Planet.MARS: Domiciles(
        planet=Planet.MARS, diurnal=ZodiacSign.ARIES, nocturnal=ZodiacSign.SCORPIO
    ),
    Planet.JUPITER: Domiciles(
        planet=Planet.JUPITER, diurnal=ZodiacSign.SAGITTARIUS, nocturnal=ZodiacSign.PISCES
    ),
    Planet.SATURN: Domiciles(
        planet=Planet.SATURN, diurnal=ZodiacSign.AQUARIUS, nocturnal=ZodiacSign.CAPRICORN
    ),
}


def domiciles_of(planet: Planet) -> Domiciles | None:
    """The domiciles of a planet, or None for a body that rules nothing (nodes)."""
    return DOMICILES_BY_PLANET.get(planet)


# Sign -> the planet in *adversity* there. This app says `adversity`, not
# "detriment" (Brennan, Greek enantioma): the early tradition did not define it
# alongside domicile and exaltation, so in any dignity score it is off by
# default or weighted separately. Stored as printed; the identity
# adversity_lord_of(s) == domicile_lord_of(s.opposite) holds for all twelve and
# is asserted in the tests.
ADVERSITY_LORDS: dict[ZodiacSign, Planet] = {
    ZodiacSign.ARIES: Planet.VENUS,
    ZodiacSign.TAURUS: Planet.MARS,
    ZodiacSign.GEMINI: Planet.JUPITER,
    ZodiacSign.CANCER: Planet.SATURN,
    ZodiacSign.LEO: Planet.SATURN,
    ZodiacSign.VIRGO: Planet.JUPITER,
    ZodiacSign.LIBRA: Planet.MARS,
    ZodiacSign.SCORPIO: Planet.VENUS,
    ZodiacSign.SAGITTARIUS: Planet.MERCURY,
    ZodiacSign.CAPRICORN: Planet.MOON,
    ZodiacSign.AQUARIUS: Planet.SUN,
    ZodiacSign.PISCES: Planet.MERCURY,
}

# Greek for adversity, on Brennan's authority (Rhetorius Compendium 8).
ADVERSITY_GREEK = "ἐναντίωμα"
ADVERSITY_TRANSLITERATION = "enantiōma"


def adversity_lord_of(sign: ZodiacSign) -> Planet:
    """The planet in adversity in this sign. NOT "detriment" for scoring."""
    return ADVERSITY_LORDS[sign]


def signs_of_adversity_for(planet: Planet) -> list[ZodiacSign]:
    """The signs in which a planet is in adversity - opposite its domiciles."""
    return [s for s in ZodiacSign if ADVERSITY_LORDS.get(s) is planet]


# ═══════════════════════════════════════════════════════════════════════════
# section 3 - EXALTATION (hupsoma) AND FALL / DEPRESSION (tapeinoma)
# ═══════════════════════════════════════════════════════════════════════════


class VariantStatus(Enum):
    """How much weight an attested degree variant carries."""

    # A real reading in a real source. Selectable; show it in the UI.
    ATTESTED = "attested"
    # A scanning artefact of the source notes. Recorded so nobody
    # "rediscovers" it as doctrine. Never offer it as an option.
    REJECTED_OCR_ARTEFACT = "rejected-ocr-artefact"


@dataclass(frozen=True, slots=True)
class DegreeVariant:
    """One attested (or rejected) alternative for an exaltation degree."""

    degree: int
    attribution: str
    note: str
    status: VariantStatus = VariantStatus.ATTESTED

    @property
    def is_selectable(self) -> bool:
        return self.status is VariantStatus.ATTESTED


@dataclass(frozen=True, slots=True)
class Exaltation:
    """A planet's exaltation, its fall, and every degree the sources attest.

    The exaltation SIGNS have total agreement across both authors; the degrees
    are where the conflict is, confined to Saturn and (weakly) Venus. Model
    exaltation as sign-level by default - the degree is an optional refinement,
    and the controlling metaphor is rank and office (throne / prison), not
    energy. Fall is always exactly opposite the exaltation, at the same degree,
    so both are derived rather than stored.
    """

    planet: Planet
    sign: ZodiacSign
    degree: int
    degree_variants: tuple[DegreeVariant, ...] = ()

    @property
    def fall_sign(self) -> ZodiacSign:
        return self.sign.opposite

    @property
    def fall_degree(self) -> int:
        return self.degree

    @property
    def selectable_variants(self) -> list[DegreeVariant]:
        return [v for v in self.degree_variants if v.is_selectable]


# The seven exaltations, in Chaldean order. Degrees follow Valens, Anthology
# 3,4 - "the standard set of exaltation degrees" (Brennan p. 242).
EXALTATIONS: tuple[Exaltation, ...] = (
    # SATURN - a genuine three-way conflict. Default 21 deg Libra (the majority
    # of Hellenistic sources per Brennan, and George's own Teucer quotation);
    # 20 deg attested (Paulus, George's Table 10); 19 deg is an ABBYY scanning
    # artefact of George's Table 15, to be discarded.
    Exaltation(
        planet=Planet.SATURN,
        sign=ZodiacSign.LIBRA,
        degree=21,
        degree_variants=(
            DegreeVariant(
                degree=20,
                attribution=(
                    "Paulus of Alexandria, via George (G pp. 169, 139, Table 10); "
                    "also in Pingree's variant list, B p. 242 fn. 76"
                ),
                note=(
                    "George's operative value. Attested, selectable - but she names no "
                    "source beyond the one Paulus epigraph, and Brennan reports the "
                    "majority of Hellenistic sources at 21 deg."
                ),
            ),
            DegreeVariant(
                degree=19,
                attribution="George Table 15, G p. 190, as scanned",
                note=(
                    "Not a reading of any source. The ABBYY scan renders 19 deg as 190; "
                    "CANON-01 3.2 says to discard it outright. Recorded only so it is "
                    "recognised if met again."
                ),
                status=VariantStatus.REJECTED_OCR_ARTEFACT,
            ),
        ),
    ),
    Exaltation(planet=Planet.JUPITER, sign=ZodiacSign.CANCER, degree=15),
    Exaltation(planet=Planet.MARS, sign=ZodiacSign.CAPRICORN, degree=28),
    Exaltation(planet=Planet.SUN, sign=ZodiacSign.ARIES, degree=19),
    # VENUS - 27 vs 26 deg Pisces. Both authors agree on 27; Porphyry is the
    # lone dissent, and Brennan suspects a textual error.
    Exaltation(
        planet=Planet.VENUS,
        sign=ZodiacSign.PISCES,
        degree=27,
        degree_variants=(
            DegreeVariant(
                degree=26,
                attribution="Porphyry, Introduction 6, via B p. 242 fn. 76",
                note=(
                    "The lone dissent against an otherwise unanimous 27 deg; Brennan "
                    "suspects a textual error. Recorded, not recommended."
                ),
            ),
        ),
    ),
    Exaltation(planet=Planet.MERCURY, sign=ZodiacSign.VIRGO, degree=15),
    Exaltation(planet=Planet.MOON, sign=ZodiacSign.TAURUS, degree=3),
)


def exaltation_of(planet: Planet) -> Exaltation | None:
    """A planet's exaltation, or None for a body that has none (the nodes).

    Do NOT add the Arabic node exaltations (North Node in Gemini, South Node in
    Sagittarius) - George flags them as an Arabic/Indian addition, not
    Hellenistic, and Brennan does not mention them.
    """
    for e in EXALTATIONS:
        if e.planet is planet:
            return e
    return None


# The five signs in which no planet is exalted. Scorpio's absence is doctrine,
# not missing data (Rhetorius Compendium 7 - the Moon as "fortune of all"):
# exaltation_ruler_of returns None here and must never fall back to the
# domicile lord.
SIGNS_WITHOUT_EXALTATION_RULER: frozenset[ZodiacSign] = frozenset(
    {
        ZodiacSign.GEMINI,
        ZodiacSign.LEO,
        ZodiacSign.SCORPIO,
        ZodiacSign.SAGITTARIUS,
        ZodiacSign.AQUARIUS,
    }
)

# The five signs in which no planet falls. Note the asymmetry - Taurus has an
# exaltation (the Moon) but no fall; Scorpio has a fall but no exaltation.
SIGNS_WITHOUT_FALL_RULER: frozenset[ZodiacSign] = frozenset(
    {
        ZodiacSign.TAURUS,
        ZodiacSign.GEMINI,
        ZodiacSign.LEO,
        ZodiacSign.SAGITTARIUS,
        ZodiacSign.AQUARIUS,
    }
)


def exaltation_ruler_of(sign: ZodiacSign) -> Planet | None:
    """The planet exalted in a sign, or None where none is. None is a real
    answer for Gemini, Leo, Scorpio, Sagittarius and Aquarius - render a dash,
    never a fallback."""
    for e in EXALTATIONS:
        if e.sign is sign:
            return e.planet
    return None


def fall_ruler_of(sign: ZodiacSign) -> Planet | None:
    """The planet in fall (depression) in a sign, or None where none is."""
    for e in EXALTATIONS:
        if e.fall_sign is sign:
            return e.planet
    return None


# ═══════════════════════════════════════════════════════════════════════════
# section 4 - TRIPLICITY (trigonon) - BOTH SCHEMES
# ═══════════════════════════════════════════════════════════════════════════


class TriplicityScheme(Enum):
    """Which set of triplicity rulers to use."""

    # THE APP DEFAULT. Three lords per trigon; the first two swap by sect and
    # the cooperating lord never changes. The older, standard scheme.
    DOROTHEAN = "dorothean"
    # Ptolemy's modification (Tetrabiblos 1,19). Two lords per trigon, no
    # cooperating lord, an irregular water row. Reaches modern practice via
    # William Lilly. Always label it as alternate.
    PTOLEMAIC = "ptolemaic"


@dataclass(frozen=True, slots=True)
class TriplicityRulers:
    """The lords of one trigon.

    "Day ruler" is NOT "first ruler". The table is sect-neutral data; the sect
    of the *chart* decides which column supplies the first lord. Use
    primary_for / ordered_for rather than reading `diurnal` directly.
    """

    diurnal: Planet
    nocturnal: Planet
    # The cooperating (participating) lord - the same in both sects. None in
    # Ptolemy's scheme, which abolished it.
    cooperating: Planet | None = None
    # Ptolemy's parenthesised co-rulers. Water only.
    diurnal_co_ruler: Planet | None = None
    nocturnal_co_ruler: Planet | None = None
    # Set where a row's provenance is weaker than the rest of the table.
    provenance_note: str | None = None

    def primary_for(self, chart_sect: Sect) -> Planet:
        """The first (sect-appropriate) lord for a chart of this sect."""
        return self.diurnal if chart_sect is Sect.DIURNAL else self.nocturnal

    def secondary_for(self, chart_sect: Sect) -> Planet:
        """The second lord for a chart of this sect - the other main lord."""
        return self.nocturnal if chart_sect is Sect.DIURNAL else self.diurnal

    def co_ruler_for(self, chart_sect: Sect) -> Planet | None:
        """Ptolemy's co-ruler for this sect, if the row has one."""
        return self.diurnal_co_ruler if chart_sect is Sect.DIURNAL else self.nocturnal_co_ruler

    def ordered_for(self, chart_sect: Sect) -> list[Planet]:
        """First, second, and the cooperating lord if the scheme has one."""
        lords = [self.primary_for(chart_sect), self.secondary_for(chart_sect)]
        if self.cooperating is not None:
            lords.append(self.cooperating)
        return lords


# Scheme A - Dorothean / standard. THE APP DEFAULT. Zero differences across four
# tables in two books. Venus is the diurnal lord of BOTH earth and water, so a
# planet->element lookup collides: this map must never be inverted.
DOROTHEAN_TRIPLICITY_RULERS: dict[Triplicity, TriplicityRulers] = {
    Triplicity.FIRE: TriplicityRulers(
        diurnal=Planet.SUN, nocturnal=Planet.JUPITER, cooperating=Planet.SATURN
    ),
    Triplicity.EARTH: TriplicityRulers(
        diurnal=Planet.VENUS, nocturnal=Planet.MOON, cooperating=Planet.MARS
    ),
    Triplicity.AIR: TriplicityRulers(
        diurnal=Planet.SATURN, nocturnal=Planet.MERCURY, cooperating=Planet.JUPITER
    ),
    Triplicity.WATER: TriplicityRulers(
        diurnal=Planet.VENUS, nocturnal=Planet.MARS, cooperating=Planet.MOON
    ),
}

# Scheme B - Ptolemy's (ALTERNATE). Reconstructed by Brennan; George confirms
# only that Ptolemy altered the water row and dropped the cooperating lord. The
# water assignments rest on Brennan alone - see the water row's provenance_note.
PTOLEMAIC_TRIPLICITY_RULERS: dict[Triplicity, TriplicityRulers] = {
    Triplicity.FIRE: TriplicityRulers(diurnal=Planet.SUN, nocturnal=Planet.JUPITER),
    Triplicity.EARTH: TriplicityRulers(diurnal=Planet.VENUS, nocturnal=Planet.MOON),
    Triplicity.AIR: TriplicityRulers(diurnal=Planet.SATURN, nocturnal=Planet.MERCURY),
    Triplicity.WATER: TriplicityRulers(
        diurnal=Planet.MARS,
        nocturnal=Planet.MARS,
        diurnal_co_ruler=Planet.VENUS,
        nocturnal_co_ruler=Planet.MOON,
        provenance_note=(
            "SINGLE-SOURCED (Brennan, reconstructed). George confirms only that "
            "Ptolemy altered the water row and dropped the cooperating lord "
            "(G p. 204 fn. 6); the individual assignments rest on Brennan alone."
        ),
    ),
}


def triplicity_rulers_of_trigon(
    trigon: Triplicity, scheme: TriplicityScheme = TriplicityScheme.DOROTHEAN
) -> TriplicityRulers:
    if scheme is TriplicityScheme.DOROTHEAN:
        return DOROTHEAN_TRIPLICITY_RULERS[trigon]
    return PTOLEMAIC_TRIPLICITY_RULERS[trigon]


def triplicity_rulers_of(
    sign: ZodiacSign, scheme: TriplicityScheme = TriplicityScheme.DOROTHEAN
) -> TriplicityRulers:
    return triplicity_rulers_of_trigon(sign.triplicity, scheme=scheme)


def triplicity_lord_of(
    sign: ZodiacSign,
    chart_sect: Sect,
    scheme: TriplicityScheme = TriplicityScheme.DOROTHEAN,
) -> Planet:
    """The SINGLE triplicity lord to enter in a per-planet condition table - the
    sect-appropriate primary lord. The cooperating lord is NOT entered here; it
    appears only in the technique engines (use ordered_for for those)."""
    return triplicity_rulers_of(sign, scheme=scheme).primary_for(chart_sect)


# ═══════════════════════════════════════════════════════════════════════════
# section 5 - THE EGYPTIAN BOUNDS (horia)
# ═══════════════════════════════════════════════════════════════════════════


@dataclass(frozen=True, slots=True)
class Bound:
    """One bound: a lord and how many degrees of the sign it holds (2-12).
    Widths are stored, endpoints derived - so sum(widths)==30 and the per-planet
    Greater-Years totals stay assertable in tests."""

    lord: Planet
    width: int


@dataclass(frozen=True, slots=True)
class BoundSpan:
    """A bound with its position in the sign resolved, in both conventions.

    George (ordinal) and Brennan (zero-based) describe the same five sectors and
    differ only in what they call the boundary degree: 6 deg 00 min Aries is
    Jupiter (ordinal) or Venus (zero-based).
    """

    sign: ZodiacSign
    lord: Planet
    width: int
    # Inclusive lower edge in Brennan's zero-based degrees-of-sign.
    start_zero_based: int

    @property
    def end_zero_based(self) -> int:
        """Exclusive upper edge in Brennan's zero-based degrees-of-sign."""
        return self.start_zero_based + self.width

    @property
    def first_ordinal_degree(self) -> int:
        """George's first ordinal degree - "the seventh degree", 1-indexed."""
        return self.start_zero_based + 1

    @property
    def last_ordinal_degree(self) -> int:
        """George's last ordinal degree, and the cumulative end of the table."""
        return self.end_zero_based


# The Egyptian bounds, 12 signs x 5 bounds, stored as widths. RECONSTRUCTED, not
# transcribed - flag it wherever it is shown. Every sign sums to 30 deg and each
# planet's total across the zodiac equals its Greater Years (Saturn 57,
# Jupiter 79, Mars 66, Venus 82, Mercury 76); both are asserted in the tests.
# Cancer follows George's Table 17 (Jupiter 7, Saturn 4), not her Table 10
# misprint - only Table 17 satisfies the Greater-Years check.
EGYPTIAN_BOUNDS: dict[ZodiacSign, tuple[Bound, ...]] = {
    ZodiacSign.ARIES: (
        Bound(Planet.JUPITER, 6),
        Bound(Planet.VENUS, 6),
        Bound(Planet.MERCURY, 8),
        Bound(Planet.MARS, 5),
        Bound(Planet.SATURN, 5),
    ),
    ZodiacSign.TAURUS: (
        Bound(Planet.VENUS, 8),
        Bound(Planet.MERCURY, 6),
        Bound(Planet.JUPITER, 8),
        Bound(Planet.SATURN, 5),
        Bound(Planet.MARS, 3),
    ),
    ZodiacSign.GEMINI: (
        Bound(Planet.MERCURY, 6),
        Bound(Planet.JUPITER, 6),
        Bound(Planet.VENUS, 5),
        Bound(Planet.MARS, 7),
        Bound(Planet.SATURN, 6),
    ),
    ZodiacSign.CANCER: (
        Bound(Planet.MARS, 7),
        Bound(Planet.VENUS, 6),
        Bound(Planet.MERCURY, 6),
        Bound(Planet.JUPITER, 7),  # Table 17, not Table 10's 6.
        Bound(Planet.SATURN, 4),  # Table 17, not Table 10's 5.
    ),
    ZodiacSign.LEO: (
        Bound(Planet.JUPITER, 6),
        Bound(Planet.VENUS, 5),
        Bound(Planet.SATURN, 7),
        Bound(Planet.MERCURY, 6),
        Bound(Planet.MARS, 6),
    ),
    ZodiacSign.VIRGO: (
        Bound(Planet.MERCURY, 7),
        Bound(Planet.VENUS, 10),
        Bound(Planet.JUPITER, 4),
        Bound(Planet.MARS, 7),
        Bound(Planet.SATURN, 2),
    ),
    ZodiacSign.LIBRA: (
        Bound(Planet.SATURN, 6),
        Bound(Planet.MERCURY, 8),
        Bound(Planet.JUPITER, 7),
        Bound(Planet.VENUS, 7),
        Bound(Planet.MARS, 2),
    ),
    ZodiacSign.SCORPIO: (
        Bound(Planet.MARS, 7),
        Bound(Planet.VENUS, 4),
        Bound(Planet.MERCURY, 8),
        Bound(Planet.JUPITER, 5),
        Bound(Planet.SATURN, 6),
    ),
    ZodiacSign.SAGITTARIUS: (
        Bound(Planet.JUPITER, 12),
        Bound(Planet.VENUS, 5),
        Bound(Planet.MERCURY, 4),
        Bound(Planet.SATURN, 5),
        Bound(Planet.MARS, 4),
    ),
    ZodiacSign.CAPRICORN: (
        Bound(Planet.MERCURY, 7),
        Bound(Planet.JUPITER, 7),
        Bound(Planet.VENUS, 8),
        Bound(Planet.SATURN, 4),
        Bound(Planet.MARS, 4),
    ),
    ZodiacSign.AQUARIUS: (
        Bound(Planet.MERCURY, 7),
        Bound(Planet.VENUS, 6),
        Bound(Planet.JUPITER, 7),
        Bound(Planet.MARS, 5),
        Bound(Planet.SATURN, 5),
    ),
    ZodiacSign.PISCES: (
        Bound(Planet.VENUS, 12),
        Bound(Planet.JUPITER, 4),
        Bound(Planet.MERCURY, 3),
        Bound(Planet.MARS, 9),
        Bound(Planet.SATURN, 2),
    ),
}


def bound_spans_of(sign: ZodiacSign) -> list[BoundSpan]:
    """The bounds of a sign with their endpoints resolved in both conventions."""
    spans: list[BoundSpan] = []
    start = 0
    for bound in EGYPTIAN_BOUNDS[sign]:
        spans.append(
            BoundSpan(sign=sign, lord=bound.lord, width=bound.width, start_zero_based=start)
        )
        start += bound.width
    return spans


def ordinal_degree(degree_in_sign_value: float) -> int:
    """George's ordinal degree: which *numbered* degree of the sign a position
    is in. 0.0 -> 1, 6.0 -> 6, 6.0001 -> 7, 20.33 -> 21, 29.99 -> 30.

    The highest-risk conversion in the whole reference layer: the Greeks had no
    zero, so each sign begins with its first degree. Any value strictly greater
    than the whole integer rounds up (an editorial extension of George's
    arc-minute rule - use is_near_bound_boundary to warn rather than pretend the
    precision is real).
    """
    d = degree_in_sign_value % 30
    if d == 0.0:
        return 1  # 0 deg 00 min is in the FIRST degree.
    return int(d) if d == math.floor(d) else math.ceil(d)


def bound_lord_of(sign: ZodiacSign, degree_in_sign_value: float) -> Planet:
    """The bound lord of a position - George's ordinal convention, the app
    default. 6 deg 00 min Aries returns JUPITER, not Venus. This is not a bug:
    it disagrees with half-open interval code at every one of the 48 internal
    boundaries, and that disagreement is the ancient convention, not an error."""
    n = ordinal_degree(degree_in_sign_value)
    for span in bound_spans_of(sign):
        if n <= span.last_ordinal_degree:
            return span.lord
    raise AssertionError(
        f"unreachable: the bounds of {sign.label} must sum to 30 deg - "
        f"ordinal degree {n} fell past the last bound"
    )


def bound_lord_of_longitude(ecliptic_longitude: float) -> Planet:
    """The bound lord of an absolute ecliptic longitude, ordinal convention."""
    return bound_lord_of(sign_of_longitude(ecliptic_longitude), degree_in_sign(ecliptic_longitude))


def bound_lord_half_open(sign: ZodiacSign, degree_in_sign_value: float) -> Planet:
    """The bound lord under Brennan's half-open [start, end) convention. NOT the
    app default - provided only so a student can see where the two conventions
    disagree. Anything that computes a chart must use bound_lord_of."""
    d = degree_in_sign_value % 30
    for span in bound_spans_of(sign):
        if d < span.end_zero_based:
            return span.lord
    raise AssertionError(f"unreachable: the bounds of {sign.label} must sum to 30 deg")


def is_near_bound_boundary(
    sign: ZodiacSign, degree_in_sign_value: float, arc_minutes: float = 1.0
) -> bool:
    """Is a position close enough to a bound boundary that the answer is not
    safe? A flagging helper only - nothing downstream should branch on it to
    pick a lord."""
    d = degree_in_sign_value % 30
    tolerance = arc_minutes / 60.0
    for span in bound_spans_of(sign):
        if abs(d - span.start_zero_based) <= tolerance:
            return True
        if abs(d - span.end_zero_based) <= tolerance:
            return True
    return False


# ═══════════════════════════════════════════════════════════════════════════
# section 6 - THE 36 DECANS (dekanoi) / FACES (prosopa)
# ═══════════════════════════════════════════════════════════════════════════
#
# The decan is NOT a condition rulership in Hellenistic astrology (both authors
# agree): compute and display the decan ruler, flag "own decan" as a note, but
# EXCLUDE it from the own-rulerships count and the condition grade. A Medieval
# "face = 1 point" overlay is fine only if labelled Medieval.


class DecanScheme(Enum):
    """Which decan ruler scheme to use."""

    # THE DEFAULT. The Chaldean-order scheme (Teucer of Babylon), descending
    # from the sign's first face through the planetary week order.
    CHALDEAN = "chaldean"
    # System 2 - triplicity order ("decanates"). OFF BY DEFAULT: single-sourced
    # (George), recorded by Abu Ma'shar from the Indian astrologers, and so NOT
    # Hellenistic. Do not let it reach a Hellenistic judgment.
    TRIPLICITY_ORDER = "triplicity-order"


# Chaldean-order decan rulers, 12 signs x 3 faces. The flat sequence is 36
# planets in unbroken descending Chaldean order (Saturn, Jupiter, Mars, Sun,
# Venus, Mercury, Moon), starting from Mars at Aries I; 36 = 7x5 + 1, so the
# cycle does not close on itself.
CHALDEAN_DECAN_RULERS: dict[ZodiacSign, tuple[Planet, Planet, Planet]] = {
    ZodiacSign.ARIES: (Planet.MARS, Planet.SUN, Planet.VENUS),
    ZodiacSign.TAURUS: (Planet.MERCURY, Planet.MOON, Planet.SATURN),
    ZodiacSign.GEMINI: (Planet.JUPITER, Planet.MARS, Planet.SUN),
    ZodiacSign.CANCER: (Planet.VENUS, Planet.MERCURY, Planet.MOON),
    ZodiacSign.LEO: (Planet.SATURN, Planet.JUPITER, Planet.MARS),
    ZodiacSign.VIRGO: (Planet.SUN, Planet.VENUS, Planet.MERCURY),
    ZodiacSign.LIBRA: (Planet.MOON, Planet.SATURN, Planet.JUPITER),
    ZodiacSign.SCORPIO: (Planet.MARS, Planet.SUN, Planet.VENUS),
    ZodiacSign.SAGITTARIUS: (Planet.MERCURY, Planet.MOON, Planet.SATURN),
    ZodiacSign.CAPRICORN: (Planet.JUPITER, Planet.MARS, Planet.SUN),
    ZodiacSign.AQUARIUS: (Planet.VENUS, Planet.MERCURY, Planet.MOON),
    ZodiacSign.PISCES: (Planet.SATURN, Planet.JUPITER, Planet.MARS),
}

# System 2 - triplicity order. Each row is the cyclic rotation of its
# triplicity's domicile lords, in zodiacal order, starting at the sign's own
# lord. Off by default; Indian/Arabic, not Hellenistic.
TRIPLICITY_ORDER_DECAN_RULERS: dict[ZodiacSign, tuple[Planet, Planet, Planet]] = {
    ZodiacSign.ARIES: (Planet.MARS, Planet.SUN, Planet.JUPITER),
    ZodiacSign.TAURUS: (Planet.VENUS, Planet.MERCURY, Planet.SATURN),
    ZodiacSign.GEMINI: (Planet.MERCURY, Planet.VENUS, Planet.SATURN),
    ZodiacSign.CANCER: (Planet.MOON, Planet.MARS, Planet.JUPITER),
    ZodiacSign.LEO: (Planet.SUN, Planet.JUPITER, Planet.MARS),
    ZodiacSign.VIRGO: (Planet.MERCURY, Planet.SATURN, Planet.VENUS),
    ZodiacSign.LIBRA: (Planet.VENUS, Planet.SATURN, Planet.MERCURY),
    ZodiacSign.SCORPIO: (Planet.MARS, Planet.JUPITER, Planet.MOON),
    ZodiacSign.SAGITTARIUS: (Planet.JUPITER, Planet.MARS, Planet.SUN),
    ZodiacSign.CAPRICORN: (Planet.SATURN, Planet.VENUS, Planet.MERCURY),
    ZodiacSign.AQUARIUS: (Planet.SATURN, Planet.MERCURY, Planet.VENUS),
    ZodiacSign.PISCES: (Planet.JUPITER, Planet.MOON, Planet.MARS),
}


@dataclass(frozen=True, slots=True)
class Decan:
    """One 10-degree face of a sign, with its ruler under the chosen scheme."""

    sign: ZodiacSign
    index_in_sign: int  # 0, 1 or 2
    ruler: Planet

    @property
    def number_in_zodiac(self) -> int:
        """1-36, counting from Aries I."""
        return self.sign.index * 3 + self.index_in_sign + 1


def _decan_rulers(sign: ZodiacSign, scheme: DecanScheme) -> tuple[Planet, Planet, Planet]:
    if scheme is DecanScheme.CHALDEAN:
        return CHALDEAN_DECAN_RULERS[sign]
    return TRIPLICITY_ORDER_DECAN_RULERS[sign]


def decan_index_of(degree_in_sign_value: float) -> int:
    """Which decan of the sign a position falls in: 0, 1 or 2. Half-open -
    [0,10) / [10,20) / [20,30) - so 10 deg 00 min is in the SECOND decan,
    whereas 6 deg 00 min Aries is still in Jupiter's FIRST bound. Do not
    harmonise the two."""
    d = degree_in_sign_value % 30
    i = int(d // 10)
    return min(i, 2)


def decans_of(sign: ZodiacSign, scheme: DecanScheme = DecanScheme.CHALDEAN) -> list[Decan]:
    """The three decans of a sign under the chosen scheme."""
    rulers = _decan_rulers(sign, scheme)
    return [Decan(sign=sign, index_in_sign=i, ruler=rulers[i]) for i in range(3)]


def decan_ruler_of(
    sign: ZodiacSign, degree_in_sign_value: float, scheme: DecanScheme = DecanScheme.CHALDEAN
) -> Planet:
    """The decan ruler of a position in a sign."""
    return _decan_rulers(sign, scheme)[decan_index_of(degree_in_sign_value)]


def decan_ruler_of_longitude(
    ecliptic_longitude: float, scheme: DecanScheme = DecanScheme.CHALDEAN
) -> Planet:
    """The decan ruler of an absolute ecliptic longitude."""
    return decan_ruler_of(
        sign_of_longitude(ecliptic_longitude),
        degree_in_sign(ecliptic_longitude),
        scheme=scheme,
    )
