"""Hekatean lunar observances.

Two monthly observances tied to the lunar cycle:

* **Deipnon (Δεῖπνον)** — Hekate's supper. The day before the new
  moon (i.e. when the moon is dark), supper offerings are left at the
  crossroads or the household shrine for Hekate and the restless dead.
  Attested in Plutarch, Aristophanes (Plutus 594), and the
  Pseudo-Demosthenic *Erotic Essay*.
* **Noumenia (Νουμηνία)** — the first sighting of the crescent moon.
  The Hellenic month begins; offerings to the gods of the household
  hearth (Hestia, Apollo Agyieus, Hermes Propylaios). Attested
  throughout Plato and the *Iliad*.

These observances were household, not civic; the documentary record
is patchier than for the Athenian state festivals. Where modern
Hellenist practice extends or systematizes the ancient sources, this
is noted in `practice_notes`.

For dating purposes we use the astronomical new moon: Deipnon is the
24-hour window ending at the new moon instant; Noumenia is the
24-hour window beginning at sunset of the day after the new moon
(when the first crescent is typically visible). The actual visibility
date varies by latitude + atmospherics; practitioners often observe
on the first day they personally see the crescent.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import swisseph as swe

from theourgia.core.festivals.base import (
    Citation,
    CitationKind,
    Festival,
    FestivalInstance,
    Tradition,
    register_festival,
)


# Reuse the events binary search for new-moon detection.
from theourgia.core.astro.events import _moon_phase_angle, _to_jd, _from_jd


_HEKATEAN_SOURCES = (
    Citation(
        title="Lives, 'Apophthegmata Laconica'",
        author="Plutarch",
        year=120,
        kind=CitationKind.PRIMARY,
        notes=(
            "Plutarch attests Hekate's monthly suppers and the practice "
            "of leaving them at crossroads."
        ),
    ),
    Citation(
        title="Plutus / Wealth",
        author="Aristophanes",
        year=-388,
        kind=CitationKind.PRIMARY,
        locator="line 594-597",
        notes=(
            "Aristophanes references the food left for Hekate at the "
            "month's end — comic context, but documents the practice."
        ),
    ),
    Citation(
        title="Polytheistic Monasticism",
        author="Sara Mastros",
        year=2022,
        kind=CitationKind.COMMUNITY,
        notes=(
            "Contemporary Hellenist monastic systematization of "
            "Deipnon and Noumenia in a modern household-practice "
            "context."
        ),
    ),
    Citation(
        title="Greek Religion",
        author="Walter Burkert",
        year=1985,
        kind=CitationKind.SCHOLARLY,
        locator="Section II.7 'The Gods'",
        notes=(
            "Burkert's account of Hekate's chthonic association and her "
            "place in household rite."
        ),
    ),
)


def _find_new_moons_in_year(year: int) -> list[datetime]:
    """All exact new-moon instants (elongation = 0°) in the given year."""
    t = datetime(year, 1, 1, tzinfo=UTC)
    step = timedelta(hours=6)
    new_moons: list[datetime] = []
    prev_angle = _moon_phase_angle(_to_jd(t))
    while t < datetime(year + 1, 1, 1, tzinfo=UTC):
        t_next = t + step
        cur_angle = _moon_phase_angle(_to_jd(t_next))
        # New moon = elongation crosses 0°. Bracket it:
        delta_prev = ((prev_angle - 0.0) + 180) % 360 - 180
        delta_cur = ((cur_angle - 0.0) + 180) % 360 - 180
        if delta_prev < 0 <= delta_cur:
            jd_lo, jd_hi = _to_jd(t), _to_jd(t_next)
            for _ in range(40):
                jd_mid = (jd_lo + jd_hi) / 2
                a = _moon_phase_angle(jd_mid)
                d = ((a - 0.0) + 180) % 360 - 180
                if d < 0:
                    jd_lo = jd_mid
                else:
                    jd_hi = jd_mid
            new_moons.append(_from_jd((jd_lo + jd_hi) / 2))
        prev_angle = cur_angle
        t = t_next
    return new_moons


def _deipnon_compute(year: int) -> list[FestivalInstance]:
    """Deipnon: 24-hour window ending at the new moon instant."""
    return [
        FestivalInstance(
            festival_id="deipnon",
            label=f"Deipnon · {nm.strftime('%B %Y')} dark moon",
            start=nm - timedelta(days=1),
            end=nm,
        )
        for nm in _find_new_moons_in_year(year)
    ]


def _noumenia_compute(year: int) -> list[FestivalInstance]:
    """Noumenia: 24-hour window beginning ~1 day after the new moon
    (when the first crescent typically becomes visible).
    """
    return [
        FestivalInstance(
            festival_id="noumenia",
            label=f"Noumenia · {(nm + timedelta(days=1)).strftime('%B %Y')} new month",
            start=nm + timedelta(days=1),
            end=nm + timedelta(days=2),
        )
        for nm in _find_new_moons_in_year(year)
    ]


register_festival(Festival(
    id="deipnon",
    name="Deipnon",
    tradition=Tradition.HEKATEAN,
    description=(
        "Hekate's supper. Monthly chthonic offering at the dark of the "
        "moon — leftovers, sweepings, eggs left at the household shrine "
        "or the nearest crossroads."
    ),
    practice_notes=(
        "Ancient practice: at sunset of the day before the new moon, "
        "the household was swept clean and the offerings carried out "
        "to a crossroads or boundary place. The dead were honored "
        "alongside Hekate; the offering was not to be looked back at "
        "after leaving (Plutarch). Modern Hellenists commonly observe "
        "Deipnon on the calendar date of the astronomical new moon, "
        "though the ancients would have observed at the last visible "
        "moon before darkness."
    ),
    sources=_HEKATEAN_SOURCES,
    compute=_deipnon_compute,
))


register_festival(Festival(
    id="noumenia",
    name="Noumenia",
    tradition=Tradition.HEKATEAN,
    description=(
        "The first crescent of the new lunar month. Offerings to the "
        "household gods — Hestia at the hearth, Apollo Agyieus at the "
        "doorway, Hermes Propylaios at the gate."
    ),
    practice_notes=(
        "The Athenian month began with Noumenia. Plato's *Laws* "
        "(4.717c-d) describes it as 'sacred among all the days'; "
        "Plutarch records household offerings of incense, bread, and "
        "first-fruits. Modern Hellenist practice extends this to "
        "general household blessing and the lighting of a new lamp."
    ),
    sources=_HEKATEAN_SOURCES + (
        Citation(
            title="Laws",
            author="Plato",
            year=-360,
            kind=CitationKind.PRIMARY,
            locator="4.717c-d",
        ),
    ),
    compute=_noumenia_compute,
))
