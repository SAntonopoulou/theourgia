"""Thelemic feast days.

Aleister Crowley's *Liber AL vel Legis* (1904) and the Holy Books of
Thelema establish a small set of high days observed by the OTO and
A∴A∴ communities, plus astronomical anchors (the equinoxes and
solstices, called the "feasts of the Times" in *Liber CCXX* II:36–43).

This batch ships the canonical feast set as understood in mainstream
contemporary Thelema. Some dates — particularly Crowley's birthday
and the founding of the OTO — are matters of historical fact rather
than ritual computation. The equinoxes and solstices use the same
astronomical computer as the Wheel of the Year sabbats.
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
from theourgia.core.festivals.sabbats import _solar_cardinal


_THELEMIC_SOURCES = (
    Citation(
        title="Liber AL vel Legis (The Book of the Law)",
        author="received by Aleister Crowley",
        year=1904,
        kind=CitationKind.PRIMARY,
        locator="II:36-43",
        notes=(
            "*Liber AL* II:36-43 establishes the Feasts of the Times "
            "(equinoxes and solstices, plus the Supreme Ritual feast)."
        ),
    ),
    Citation(
        title="Magick: Liber ABA, Book Four (parts I-IV)",
        author="Aleister Crowley",
        year=1929,
        kind=CitationKind.PRIMARY,
        notes=(
            "Crowley's magnum opus consolidates the practical Thelemic "
            "calendar."
        ),
    ),
    Citation(
        title="Confessions",
        author="Aleister Crowley",
        year=1929,
        kind=CitationKind.PRIMARY,
        notes=(
            "Autobiographical source for biographical dates: birth, the "
            "1904 Cairo Working, etc."
        ),
    ),
    Citation(
        title="The Equinox of the Gods",
        author="Aleister Crowley",
        year=1936,
        kind=CitationKind.PRIMARY,
        notes=(
            "Crowley's primary attestation of the founding of the Aeon "
            "(20 March 1904)."
        ),
    ),
)


def _spring_equinox_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 0.0)
    return [FestivalInstance(
        festival_id="thel-spring-equinox",
        label=f"Feast of the Equinox of the Gods · spring {year}",
        start=instant,
        end=instant + timedelta(days=1),
    )]


def _autumn_equinox_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 180.0)
    return [FestivalInstance(
        festival_id="thel-autumn-equinox",
        label=f"Feast of the Equinox · autumn {year}",
        start=instant,
        end=instant + timedelta(days=1),
    )]


def _summer_solstice_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 90.0)
    return [FestivalInstance(
        festival_id="thel-summer-solstice",
        label=f"Feast of the Solstice · summer {year}",
        start=instant,
        end=instant + timedelta(days=1),
    )]


def _winter_solstice_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 270.0)
    return [FestivalInstance(
        festival_id="thel-winter-solstice",
        label=f"Feast of the Solstice · winter {year}",
        start=instant,
        end=instant + timedelta(days=1),
    )]


def _crowley_birthday_compute(year: int) -> list[FestivalInstance]:
    # Crowley born 12 October 1875 (E.V.).
    start = datetime(year, 10, 12, tzinfo=UTC)
    return [FestivalInstance(
        festival_id="thel-crowley-birthday",
        label=f"Crowleymas {year}",
        start=start,
        end=start + timedelta(days=1),
    )]


def _writing_of_the_book_compute(year: int) -> list[FestivalInstance]:
    """Three-day commemoration of the reception of *Liber AL vel Legis*
    by Crowley in Cairo, 8-10 April 1904.
    """
    start = datetime(year, 4, 8, tzinfo=UTC)
    return [FestivalInstance(
        festival_id="thel-writing-of-the-book",
        label=f"Three Days of the Writing of the Book {year}",
        start=start,
        end=start + timedelta(days=3),
    )]


register_festival(Festival(
    id="thel-spring-equinox",
    name="Feast of the Equinox of the Gods (spring)",
    tradition=Tradition.THELEMIC,
    description=(
        "The Thelemic new year. The Sun's ingress into Aries; the "
        "anniversary of the inauguration of the Aeon of Horus in 1904."
    ),
    practice_notes=(
        "The spring equinox is the start of the Thelemic year. Many "
        "lodges observe it with a public Gnostic Mass; the OTO performs "
        "it ritually as the Equinox of the Gods. Anniversary of Crowley's "
        "1904 declaration of the new Aeon."
    ),
    sources=_THELEMIC_SOURCES,
    compute=_spring_equinox_compute,
))


register_festival(Festival(
    id="thel-autumn-equinox",
    name="Feast of the Equinox (autumn)",
    tradition=Tradition.THELEMIC,
    description=(
        "The Sun's ingress into Libra. Observed as the night-counterpart "
        "of the spring equinox; the descent."
    ),
    practice_notes=(
        "Often observed by OTO lodges with a ceremonial passing of "
        "office. The Crowleyan emphasis is on balance and the night-half "
        "of the year."
    ),
    sources=_THELEMIC_SOURCES,
    compute=_autumn_equinox_compute,
))


register_festival(Festival(
    id="thel-summer-solstice",
    name="Feast of the Solstice (summer)",
    tradition=Tradition.THELEMIC,
    description=(
        "The Sun's ingress into Cancer. The longest day; the Sun "
        "at its zenith in its proper sign of strength."
    ),
    practice_notes=(
        "Among the four Feasts of the Times in *Liber AL* II:36. "
        "Often observed with outdoor solar workings."
    ),
    sources=_THELEMIC_SOURCES,
    compute=_summer_solstice_compute,
))


register_festival(Festival(
    id="thel-winter-solstice",
    name="Feast of the Solstice (winter)",
    tradition=Tradition.THELEMIC,
    description=(
        "The Sun's ingress into Capricorn. The longest night; "
        "the symbolic rebirth of the Sun."
    ),
    practice_notes=(
        "The fourth Feast of the Times. Crowleyan observance "
        "emphasizes the magickal new year as solar rebirth, "
        "distinct from the spiritual new year at the spring equinox."
    ),
    sources=_THELEMIC_SOURCES,
    compute=_winter_solstice_compute,
))


register_festival(Festival(
    id="thel-crowley-birthday",
    name="Crowleymas",
    tradition=Tradition.THELEMIC,
    description=(
        "12 October. The birthday of Aleister Crowley (born 1875)."
    ),
    practice_notes=(
        "Observed informally by many Thelemites as a day of recollection "
        "and study. Not part of *Liber AL*'s feasts; emerges from 20th C. "
        "OTO practice."
    ),
    sources=_THELEMIC_SOURCES,
    compute=_crowley_birthday_compute,
))


register_festival(Festival(
    id="thel-writing-of-the-book",
    name="Three Days of the Writing of the Book of the Law",
    tradition=Tradition.THELEMIC,
    description=(
        "8-10 April. Commemorates the dictation of *Liber AL vel "
        "Legis* to Crowley in Cairo over three successive afternoons."
    ),
    practice_notes=(
        "The OTO observes this as one of the central feasts; some "
        "lodges read one of the three chapters aloud each day. The "
        "received times were 12:00-13:00 each day; modern observance "
        "is more flexible."
    ),
    sources=_THELEMIC_SOURCES,
    compute=_writing_of_the_book_compute,
))
