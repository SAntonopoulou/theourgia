"""Roman religious calendar — selected major observances.

The Calendar of Numa (codified in the late Republic, well attested
by Ovid's *Fasti* and by the inscribed Fasti Antiates Maiores) gave
the Romans a year of pre-Christian religious dates. Many survive
in altered form in the Christian calendar (e.g. Lupercalia → St
Valentine, Saturnalia → Christmas).

This batch ships the five widest-observed festivals in current
Religio Romana / cultor practice: Lupercalia, Floralia, Vestalia,
Saturnalia, and Compitalia. Additional dates (Lemuria, Liberalia,
Robigalia, etc.) drop into the same shape.

All dates are *fixed civil* dates from the Calendar of Numa
(Gregorian rendering). Ovid's *Fasti* gives the canonical day-by-day
attestations.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from theourgia.core.festivals.base import (
    Citation,
    CitationKind,
    Festival,
    FestivalInstance,
    Tradition,
    register_festival,
)


_ROMAN_SOURCES = (
    Citation(
        title="Fasti",
        author="Ovid",
        year=8,
        kind=CitationKind.PRIMARY,
        notes=(
            "Ovid's six-book poem on the Roman religious calendar is "
            "the canonical primary source for the public festivals "
            "of January through June; book by book, day by day."
        ),
    ),
    Citation(
        title="Religions of Rome (2 vols)",
        author="Mary Beard, John North, & Simon Price",
        year=1998,
        kind=CitationKind.SCHOLARLY,
        notes=(
            "Beard/North/Price is the standard modern English-language "
            "synthesis. Volume 2 is the sourcebook."
        ),
    ),
    Citation(
        title="Fasti Antiates Maiores",
        author="anonymous",
        year=-60,
        kind=CitationKind.PRIMARY,
        notes=(
            "Pre-Julian inscribed wall-calendar from Antium; the only "
            "surviving complete republican fasti, indispensable for "
            "the festival roster."
        ),
    ),
)


def _at(year: int, month: int, day: int, duration_days: int = 1) -> tuple[datetime, datetime]:
    start = datetime(year, month, day, tzinfo=UTC)
    return start, start + timedelta(days=duration_days)


def _lupercalia_compute(year: int) -> list[FestivalInstance]:
    start, end = _at(year, 2, 15)
    return [FestivalInstance(
        festival_id="lupercalia",
        label=f"Lupercalia {year}",
        start=start,
        end=end,
    )]


def _floralia_compute(year: int) -> list[FestivalInstance]:
    # 28 April – 3 May (six days).
    start, end = _at(year, 4, 28, duration_days=6)
    return [FestivalInstance(
        festival_id="floralia",
        label=f"Floralia {year}",
        start=start,
        end=end,
    )]


def _vestalia_compute(year: int) -> list[FestivalInstance]:
    # 7-15 June; the inner sanctum of the Vestal Temple was opened only on these days.
    start, end = _at(year, 6, 7, duration_days=9)
    return [FestivalInstance(
        festival_id="vestalia",
        label=f"Vestalia {year}",
        start=start,
        end=end,
    )]


def _saturnalia_compute(year: int) -> list[FestivalInstance]:
    # Originally one day (17 Dec) but extended through 23 Dec by the
    # Imperial period — seven days of feasting, gift-giving, and the
    # ritual social inversion.
    start, end = _at(year, 12, 17, duration_days=7)
    return [FestivalInstance(
        festival_id="saturnalia",
        label=f"Saturnalia {year}",
        start=start,
        end=end,
    )]


def _compitalia_compute(year: int) -> list[FestivalInstance]:
    # Moveable feast announced by the praetor; in practice celebrated
    # 3-5 January. Crossroads festival of the Lares Compitales.
    start, end = _at(year, 1, 3, duration_days=3)
    return [FestivalInstance(
        festival_id="compitalia",
        label=f"Compitalia {year}",
        start=start,
        end=end,
    )]


register_festival(Festival(
    id="lupercalia",
    name="Lupercalia",
    tradition=Tradition.ROMAN,
    description=(
        "February 15. Purification and fertility festival of Lupercus / "
        "Faunus, with the famous luperci running through the streets "
        "striking onlookers with thongs of goat-hide."
    ),
    practice_notes=(
        "Performed at the Lupercal cave (the legendary site of Romulus "
        "& Remus's nursing by the she-wolf) on the Palatine. Married "
        "women presented themselves to the strikers to receive a "
        "fertility blessing. Survived until 494 AD when Pope Gelasius "
        "abolished it."
    ),
    sources=_ROMAN_SOURCES + (
        Citation(
            title="Fasti",
            author="Ovid",
            year=8,
            kind=CitationKind.PRIMARY,
            locator="Book II, lines 267-452",
            notes="Ovid's extended treatment of Lupercalia, with two etymologies.",
        ),
    ),
    compute=_lupercalia_compute,
))


register_festival(Festival(
    id="floralia",
    name="Floralia",
    tradition=Tradition.ROMAN,
    description=(
        "Six-day festival of Flora (28 April – 3 May). The goddess of "
        "flowering plants — agricultural fertility expressed in "
        "garlands, hare and goat sacrifices, theatrical games."
    ),
    practice_notes=(
        "Notable for its theatrical license: the mimes performed "
        "rituals of stripping (nudatio mimarum) that the elder Cato "
        "famously walked out of. The games (Ludi Florales) were among "
        "the most popular in the Roman calendar."
    ),
    sources=_ROMAN_SOURCES + (
        Citation(
            title="Fasti",
            author="Ovid",
            year=8,
            kind=CitationKind.PRIMARY,
            locator="Book V, lines 183-378",
        ),
    ),
    compute=_floralia_compute,
))


register_festival(Festival(
    id="vestalia",
    name="Vestalia",
    tradition=Tradition.ROMAN,
    description=(
        "Nine-day festival of Vesta (7-15 June). The inner sanctum of "
        "the Vestal Temple, normally closed, was opened to barefoot "
        "Roman matrons making offerings of food."
    ),
    practice_notes=(
        "The festival proper was 9 June, when matrons walked barefoot "
        "to the temple. The days 7-15 framed the opening and closing "
        "of the sanctum; on the 15th the temple was ritually swept "
        "and the rubbish carried away (Quando Stercus Delatum Fas — "
        "the formula in the calendar)."
    ),
    sources=_ROMAN_SOURCES + (
        Citation(
            title="Fasti",
            author="Ovid",
            year=8,
            kind=CitationKind.PRIMARY,
            locator="Book VI, lines 249-460",
        ),
    ),
    compute=_vestalia_compute,
))


register_festival(Festival(
    id="saturnalia",
    name="Saturnalia",
    tradition=Tradition.ROMAN,
    description=(
        "Seven-day winter festival of Saturn (17-23 December). Feasting, "
        "gift-giving, social inversion — masters served slaves, "
        "courts were closed, schools dismissed."
    ),
    practice_notes=(
        "Originally a single day (the dies festus at the dedication of "
        "the Temple of Saturn). Extended over the late Republic and "
        "Empire. The pileus (freedman's cap) was worn by all classes. "
        "Many of its features (feasting, gifts, candles, social "
        "inversion) were absorbed into Christmas."
    ),
    sources=_ROMAN_SOURCES + (
        Citation(
            title="Saturnalia",
            author="Macrobius",
            year=400,
            kind=CitationKind.PRIMARY,
            notes=(
                "Macrobius's *Saturnalia* is the late-antique "
                "exposition of the festival, framed as a series of "
                "dinner-table conversations across the seven days."
            ),
        ),
    ),
    compute=_saturnalia_compute,
))


register_festival(Festival(
    id="compitalia",
    name="Compitalia",
    tradition=Tradition.ROMAN,
    description=(
        "Crossroads festival of the Lares Compitales (the household "
        "and neighborhood spirits). Three-day observance after the "
        "Kalends of January — small shrines at crossroads, offerings "
        "for the genii loci."
    ),
    practice_notes=(
        "Moveable feast (feriae conceptivae): the praetor announced "
        "the date each year, typically the first weekend after the "
        "Kalends. Augustus reorganized the cult in 7 BC, adding the "
        "emperor's Lares Augusti to the crossroads shrines — a fact "
        "that explains the festival's survival into late antiquity."
    ),
    sources=_ROMAN_SOURCES + (
        Citation(
            title="Roman Festivals of the Period of the Republic",
            author="W. Warde Fowler",
            year=1899,
            kind=CitationKind.SCHOLARLY,
            notes="Fowler's republican-festival study; dated but still cited.",
        ),
    ),
    compute=_compitalia_compute,
))
