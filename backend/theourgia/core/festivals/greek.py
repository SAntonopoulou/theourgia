"""Greek (Athenian) festival calendar.

The Attic civic year is lunisolar and lunar-keyed: the months begin
with Noumenia (first crescent), and festivals fall on specified days
of specified months. Mapping these to Gregorian dates requires
identifying the Hellenic month each Gregorian year. For the v0.x
release we adopt the simplified convention used by most modern
Hellenist practitioners: each Attic month is the lunar month whose
new moon falls in the corresponding Gregorian period.

Attic month order (begins after the summer solstice):

  1. Hekatombaion   ~ July / August
  2. Metageitnion   ~ August / September
  3. Boedromion     ~ September / October
  4. Pyanepsion     ~ October / November
  5. Maimakterion   ~ November / December
  6. Poseideon      ~ December / January
  7. Gamelion       ~ January / February
  8. Anthesterion   ~ February / March
  9. Elaphebolion   ~ March / April
  10. Mounichion    ~ April / May
  11. Thargelion    ~ May / June
  12. Skirophorion  ~ June / July

This batch ships five well-attested festivals — the ones most
practiced today — with strong scholarly provenance: Anthesteria,
Thesmophoria, Eleusinia, Panathenaia, Pyanepsia. Additional Attic
festivals (Bouphonia, Plynteria, Skira, etc.) land in follow-ups as
the maintainer can attend to each citation.

**Caveat.** The dates here are *approximate* — modern Hellenist
practice varies on whether to follow the astronomical new moon
(simplest) or the Athenian observed-crescent calendar (more
authentic, location-dependent). This module follows the astronomical
convention; the UI can flag the difference and a future plugin can
offer location-keyed observations.
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
from theourgia.core.festivals.hekatean import _find_new_moons_in_year


_GREEK_SOURCES = (
    Citation(
        title="Athenian Religion: A History",
        author="Robert Parker",
        year=1996,
        kind=CitationKind.SCHOLARLY,
        notes=(
            "Parker's chronological account of Athenian religion is "
            "the standard modern scholarly reference."
        ),
    ),
    Citation(
        title="Polytheism and Society at Athens",
        author="Robert Parker",
        year=2005,
        kind=CitationKind.SCHOLARLY,
        notes="Parker's companion volume; the festival calendar in detail.",
    ),
    Citation(
        title="Greek Religion",
        author="Walter Burkert",
        year=1985,
        kind=CitationKind.SCHOLARLY,
        notes=(
            "Burkert's *Greek Religion* — the canonical English-language "
            "synthesis."
        ),
    ),
)


def _find_attic_month_start(year: int, month_index: int) -> datetime:
    """Find the Gregorian start of the given Attic month (1..12)
    within the Gregorian year that contains it.

    Hekatombaion (month 1) begins with the first new moon AFTER the
    summer solstice. We pick the new moon nearest the start of each
    canonical Gregorian window.
    """
    # Approximate Gregorian-month bracket per Attic month index.
    # We look up the new moon nearest the middle of the bracket.
    brackets: dict[int, tuple[int, int]] = {
        1: (7, 1),     # Hekatombaion: ~Jul
        2: (8, 1),     # Metageitnion: ~Aug
        3: (9, 1),     # Boedromion: ~Sep
        4: (10, 1),    # Pyanepsion: ~Oct
        5: (11, 1),    # Maimakterion: ~Nov
        6: (12, 1),    # Poseideon: ~Dec
        7: (1, 1),     # Gamelion: ~Jan
        8: (2, 1),     # Anthesterion: ~Feb
        9: (3, 1),     # Elaphebolion: ~Mar
        10: (4, 1),    # Mounichion: ~Apr
        11: (5, 1),    # Thargelion: ~May
        12: (6, 1),    # Skirophorion: ~Jun
    }
    bracket_month, bracket_day = brackets[month_index]
    target = datetime(year, bracket_month, bracket_day, tzinfo=UTC)
    # Pick the new moon nearest the target (within ± 35 days).
    new_moons = _find_new_moons_in_year(year)
    # New moons in adjacent years cover wrap cases.
    if month_index <= 5:
        new_moons = new_moons + _find_new_moons_in_year(year + 1)[:1]
    elif month_index >= 7:
        new_moons = _find_new_moons_in_year(year - 1)[-1:] + new_moons
    return min(new_moons, key=lambda nm: abs(nm - target))


def _attic_day(year: int, attic_month_index: int, day_of_month: int) -> datetime:
    """The Gregorian date for the given (Attic month, day-of-month)."""
    month_start = _find_attic_month_start(year, attic_month_index)
    return (month_start + timedelta(days=day_of_month - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC,
    )


# ────────────────────────────────────────────────────────────────────────


def _anthesteria_compute(year: int) -> list[FestivalInstance]:
    """Anthesteria: 11-13 Anthesterion (the wine festival, three days)."""
    start = _attic_day(year, 8, 11)
    return [FestivalInstance(
        festival_id="anthesteria",
        label=f"Anthesteria {year}",
        start=start,
        end=start + timedelta(days=3),
    )]


def _thesmophoria_compute(year: int) -> list[FestivalInstance]:
    """Thesmophoria: 11-13 Pyanepsion (women's festival for Demeter)."""
    start = _attic_day(year, 4, 11)
    return [FestivalInstance(
        festival_id="thesmophoria",
        label=f"Thesmophoria {year}",
        start=start,
        end=start + timedelta(days=3),
    )]


def _eleusinia_compute(year: int) -> list[FestivalInstance]:
    """Greater Eleusinia: 15-21 Boedromion (the Mystery initiations)."""
    start = _attic_day(year, 3, 15)
    return [FestivalInstance(
        festival_id="eleusinia",
        label=f"Greater Eleusinian Mysteries {year}",
        start=start,
        end=start + timedelta(days=7),
    )]


def _panathenaia_compute(year: int) -> list[FestivalInstance]:
    """Panathenaia: 23-30 Hekatombaion (Athena's birthday festival).
    The Greater Panathenaia (every 4 years) ran longer; this is the
    annual Lesser observance.
    """
    start = _attic_day(year, 1, 23)
    return [FestivalInstance(
        festival_id="panathenaia",
        label=f"Panathenaia {year}",
        start=start,
        end=start + timedelta(days=5),
    )]


def _pyanepsia_compute(year: int) -> list[FestivalInstance]:
    """Pyanepsia: 7 Pyanepsion (Apollo's bean-stew festival)."""
    start = _attic_day(year, 4, 7)
    return [FestivalInstance(
        festival_id="pyanepsia",
        label=f"Pyanepsia {year}",
        start=start,
        end=start + timedelta(days=1),
    )]


register_festival(Festival(
    id="anthesteria",
    name="Anthesteria",
    tradition=Tradition.GREEK,
    description=(
        "Three-day Dionysian wine festival in Anthesterion: the "
        "opening of the new wine, the marriage of Dionysos to the "
        "Basilinna, and the propitiation of the ancestral dead."
    ),
    practice_notes=(
        "Days: Pithoigia (jar-opening) · Choes (wine-mixing) · Chytroi "
        "(pots-of-grain for the dead). Of the three the Choes was the "
        "drinking contest in silence and the Chytroi the closure of "
        "the ghosts: 'Out you go, Keres! Anthesteria's over.' Among "
        "the oldest attested Athenian festivals (mentioned in "
        "Thucydides as ἀρχαιότατα)."
    ),
    sources=_GREEK_SOURCES + (
        Citation(
            title="History of the Peloponnesian War",
            author="Thucydides",
            year=-400,
            kind=CitationKind.PRIMARY,
            locator="2.15.4",
            notes=(
                "Thucydides identifies Anthesteria as one of the older "
                "festivals of Athens, attested before the Ionian "
                "migrations."
            ),
        ),
    ),
    compute=_anthesteria_compute,
))


register_festival(Festival(
    id="thesmophoria",
    name="Thesmophoria",
    tradition=Tradition.GREEK,
    description=(
        "Three-day women's festival of Demeter and Persephone in "
        "Pyanepsion. The mysteries of agricultural and human "
        "fertility, observed exclusively by married Athenian women."
    ),
    practice_notes=(
        "Days: Kathodos (descent) · Nesteia (fast) · Kalligeneia "
        "(beautiful birth). Documented by Aristophanes' *Thesmophoriazusae* "
        "and by the Plutus passages on women's ritual. The rite of the "
        "megara (sacred pits where piglets were thrown and retrieved) "
        "is well attested by the scholia."
    ),
    sources=_GREEK_SOURCES + (
        Citation(
            title="Thesmophoriazusae",
            author="Aristophanes",
            year=-411,
            kind=CitationKind.PRIMARY,
            notes="The earliest detailed primary witness to the festival's structure.",
        ),
    ),
    compute=_thesmophoria_compute,
))


register_festival(Festival(
    id="eleusinia",
    name="Greater Eleusinian Mysteries",
    tradition=Tradition.GREEK,
    description=(
        "Seven-day festival in Boedromion. The most famous of the "
        "Greek mysteries: initiation into the rites of Demeter and "
        "Kore. Open to any Greek-speaker free of blood-guilt."
    ),
    practice_notes=(
        "From the procession to Eleusis on 19 Boedromion to the "
        "Plemochoai libations on 22. The Telesterion epopteia (highest "
        "initiation) remained secret on pain of death — content known "
        "only from cryptic references in Plato's *Phaedrus*, Clement "
        "of Alexandria, and the Christian apologists. The festival "
        "ended in the 4th C. AD with the closure of Eleusis under "
        "Theodosius."
    ),
    sources=_GREEK_SOURCES + (
        Citation(
            title="Homeric Hymn to Demeter",
            author="anonymous",
            year=-650,
            kind=CitationKind.PRIMARY,
            notes="The mythic charter for the Mysteries.",
        ),
        Citation(
            title="Eleusis and the Eleusinian Mysteries",
            author="George Mylonas",
            year=1961,
            kind=CitationKind.SCHOLARLY,
            notes="The classic archaeological and ritual reconstruction.",
        ),
    ),
    compute=_eleusinia_compute,
))


register_festival(Festival(
    id="panathenaia",
    name="Panathenaia (Lesser)",
    tradition=Tradition.GREEK,
    description=(
        "Athena's birthday. The Lesser Panathenaia ran annually "
        "23-30 Hekatombaion; the Greater (every fourth year) was a "
        "grander state event with the famous peplos procession."
    ),
    practice_notes=(
        "The peplos — a woven robe for Athena's statue — was the "
        "centerpiece of the Greater festival. The procession is "
        "carved into the Parthenon frieze (now mostly in the British "
        "Museum, contested). The Lesser observance was the annual "
        "celebration of the city's patron without the extravagance."
    ),
    sources=_GREEK_SOURCES,
    compute=_panathenaia_compute,
))


register_festival(Festival(
    id="pyanepsia",
    name="Pyanepsia",
    tradition=Tradition.GREEK,
    description=(
        "Apollo's bean-and-grain stew festival in Pyanepsion. The "
        "eiresione (olive bough hung with bread and fruit) was the "
        "distinctive offering."
    ),
    practice_notes=(
        "Boys carried the eiresione door to door singing the eiresione "
        "song, then hung it on the doorframe for a year as protection. "
        "Bean-stew (pyanon) for Apollo Pythios. The festival commemorates "
        "Theseus's promised offering on his return from Crete."
    ),
    sources=_GREEK_SOURCES + (
        Citation(
            title="Plutarch, Life of Theseus",
            author="Plutarch",
            year=100,
            kind=CitationKind.PRIMARY,
            locator="22.4-5",
        ),
    ),
    compute=_pyanepsia_compute,
))
