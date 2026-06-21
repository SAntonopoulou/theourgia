"""Wheel of the Year — eight Sabbats.

The modern Neo-pagan eightfold sabbat cycle was synthesized by
Ross Nichols (Druid revival) and Gerald Gardner (Wicca) in the
mid-20th century from older Celtic, Germanic, and rural-European
agricultural festivals. The cycle interleaves:

* **Quarter days** (astronomical): Yule (winter solstice), Ostara
  (spring equinox), Litha (summer solstice), Mabon (autumn equinox).
* **Cross-quarter days** (fire festivals): Imbolc (Feb 1–2),
  Beltane (May 1), Lammas / Lughnasadh (Aug 1), Samhain (Oct 31–Nov 1).

Quarter days here are computed from the true astronomical instants
via Swiss Ephemeris; cross-quarter days are fixed civil dates per
the modern consensus. The cross-quarter dates ARE modern fixings —
historic Celtic dates were lunar or tied to local agricultural
timing. The notes per festival document this honestly.
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


# ────────────────────────────────────────────────────────────────────────
# Astronomical helpers — solstice / equinox instants
# ────────────────────────────────────────────────────────────────────────


def _to_jd(d: datetime) -> float:
    h = d.hour + d.minute / 60 + (d.second + d.microsecond / 1_000_000) / 3600
    return swe.julday(d.year, d.month, d.day, h)


def _from_jd(jd: float) -> datetime:
    year, month, day, hour = swe.revjul(jd, swe.GREG_CAL)
    h = int(hour)
    m_frac = (hour - h) * 60
    m = int(m_frac)
    s_frac = (m_frac - m) * 60
    s = int(s_frac)
    return datetime(year, month, day, h, m, s, tzinfo=UTC)


def _sun_longitude(jd: float) -> float:
    pos, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_MOSEPH)
    return pos[0] % 360


def _solar_cardinal(year: int, target_longitude: float) -> datetime:
    """Find the UTC instant when the Sun's tropical longitude hits
    ``target_longitude`` (0° = vernal equinox, 90° = summer solstice,
    180° = autumnal equinox, 270° = winter solstice) within the
    given Gregorian ``year``.

    Bisects from a daily-step bracketing.
    """
    t = datetime(year, 1, 1, tzinfo=UTC)
    step = timedelta(days=1)
    prev_lon = _sun_longitude(_to_jd(t))
    while t < datetime(year + 1, 1, 1, tzinfo=UTC):
        t_next = t + step
        cur_lon = _sun_longitude(_to_jd(t_next))
        # Did we cross ``target_longitude``? (Handles wrap at 360→0.)
        delta_prev = ((prev_lon - target_longitude) + 180) % 360 - 180
        delta_cur = ((cur_lon - target_longitude) + 180) % 360 - 180
        if delta_prev < 0 <= delta_cur:
            # Bisect for the exact instant.
            jd_lo = _to_jd(t)
            jd_hi = _to_jd(t_next)
            for _ in range(40):
                jd_mid = (jd_lo + jd_hi) / 2
                lon = _sun_longitude(jd_mid)
                d = ((lon - target_longitude) + 180) % 360 - 180
                if d < 0:
                    jd_lo = jd_mid
                else:
                    jd_hi = jd_mid
            return _from_jd((jd_lo + jd_hi) / 2)
        prev_lon = cur_lon
        t = t_next
    raise RuntimeError(f"Solar longitude {target_longitude}° not reached in {year}")


def _at_midnight_utc(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day, 0, 0, tzinfo=UTC)


# ────────────────────────────────────────────────────────────────────────
# Quarter days (astronomical)
# ────────────────────────────────────────────────────────────────────────


_QUARTER_SOURCES = (
    Citation(
        title="The Witch's God",
        author="Janet Farrar & Stewart Farrar",
        year=1989,
        kind=CitationKind.COMMUNITY,
        locator="Ch. 6 'The Eight Festivals'",
        notes=(
            "The Farrars systematize the eightfold cycle from Gardner / "
            "Nichols, retaining astronomical quarter days and fixed-date "
            "cross-quarters."
        ),
    ),
    Citation(
        title="The Stations of the Sun",
        author="Ronald Hutton",
        year=1996,
        kind=CitationKind.SCHOLARLY,
        notes=(
            "Hutton traces the modern Sabbat cycle to early 20th-century "
            "Druidic and Wiccan synthesis from older folk practice; "
            "indispensable for distinguishing reconstruction from "
            "documented historical observance."
        ),
    ),
)


def _yule_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 270.0)
    return [
        FestivalInstance(
            festival_id="yule",
            label=f"Yule · winter solstice {year}",
            start=instant,
            end=instant + timedelta(days=1),
        )
    ]


def _ostara_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 0.0)
    return [
        FestivalInstance(
            festival_id="ostara",
            label=f"Ostara · vernal equinox {year}",
            start=instant,
            end=instant + timedelta(days=1),
        )
    ]


def _litha_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 90.0)
    return [
        FestivalInstance(
            festival_id="litha",
            label=f"Litha · summer solstice {year}",
            start=instant,
            end=instant + timedelta(days=1),
        )
    ]


def _mabon_compute(year: int) -> list[FestivalInstance]:
    instant = _solar_cardinal(year, 180.0)
    return [
        FestivalInstance(
            festival_id="mabon",
            label=f"Mabon · autumn equinox {year}",
            start=instant,
            end=instant + timedelta(days=1),
        )
    ]


register_festival(Festival(
    id="yule",
    name="Yule",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description=(
        "The winter solstice. The longest night and the symbolic rebirth "
        "of the sun."
    ),
    practice_notes=(
        "Vigil through the longest night; greenery, candles, and the "
        "Yule log. The pre-Christian Germanic and Anglo-Saxon Geola / "
        "Jól was a multi-day midwinter feast attested in Bede; the "
        "modern Wiccan / Druidic observance is reconstructed from "
        "folk practice and Eddic references."
    ),
    sources=_QUARTER_SOURCES + (
        Citation(
            title="De temporum ratione (The Reckoning of Time)",
            author="Bede",
            year=725,
            kind=CitationKind.PRIMARY,
            locator="Ch. XV 'De mensibus Anglorum'",
            notes="Bede attests the Anglo-Saxon midwinter feast of Modra niht / Geola.",
        ),
    ),
    compute=_yule_compute,
))


register_festival(Festival(
    id="ostara",
    name="Ostara",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description="The vernal (spring) equinox. The return of balance, of light, of growth.",
    practice_notes=(
        "The name 'Ostara' is reconstructed from Bede's reference to "
        "the Anglo-Saxon goddess Ēostre; no further primary attestation "
        "survives. Modern observance: planting, eggs, dawn rites at the "
        "moment of equinox."
    ),
    sources=_QUARTER_SOURCES + (
        Citation(
            title="De temporum ratione (The Reckoning of Time)",
            author="Bede",
            year=725,
            kind=CitationKind.PRIMARY,
            locator="Ch. XV",
            notes="The sole primary reference to Ēostre as the namesake of the spring month.",
        ),
    ),
    compute=_ostara_compute,
))


register_festival(Festival(
    id="litha",
    name="Litha",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description="The summer solstice. The longest day; the sun at its apex.",
    practice_notes=(
        "Bede gives 'Lida' / 'Liða' as the Anglo-Saxon name for June. "
        "The modern Sabbat name was adopted by Tolkien-influenced "
        "20th-century revivalists; bonfires and herb-gathering are the "
        "documented folk customs."
    ),
    sources=_QUARTER_SOURCES,
    compute=_litha_compute,
))


register_festival(Festival(
    id="mabon",
    name="Mabon",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description="The autumn equinox. The second harvest; balance turning toward dark.",
    practice_notes=(
        "The name 'Mabon' (from the Welsh Mabon ap Modron) was attached "
        "to the autumn equinox by Aidan Kelly in 1973 — explicitly a "
        "modern coinage. The festival itself parallels harvest "
        "thanksgivings across many cultures."
    ),
    sources=_QUARTER_SOURCES,
    compute=_mabon_compute,
))


# ────────────────────────────────────────────────────────────────────────
# Cross-quarter days (fixed civil dates per modern consensus)
# ────────────────────────────────────────────────────────────────────────


_CROSS_QUARTER_SOURCES = (
    Citation(
        title="The Stations of the Sun",
        author="Ronald Hutton",
        year=1996,
        kind=CitationKind.SCHOLARLY,
        notes=(
            "Hutton documents the historic Celtic fire festivals — "
            "Imbolc, Beltane, Lughnasadh, Samhain — and their fixing "
            "to civil dates in the modern Sabbat cycle."
        ),
    ),
    Citation(
        title="The Festival of Lughnasa",
        author="Máire Mac Néill",
        year=1962,
        kind=CitationKind.SCHOLARLY,
        notes="The definitive folkloric study of Lughnasadh observance in Ireland.",
    ),
)


def _imbolc_compute(year: int) -> list[FestivalInstance]:
    start = _at_midnight_utc(year, 2, 1)
    return [FestivalInstance(
        festival_id="imbolc",
        label=f"Imbolc {year}",
        start=start,
        end=start + timedelta(days=2),
    )]


def _beltane_compute(year: int) -> list[FestivalInstance]:
    start = _at_midnight_utc(year, 5, 1)
    return [FestivalInstance(
        festival_id="beltane",
        label=f"Beltane {year}",
        start=start,
        end=start + timedelta(days=1),
    )]


def _lammas_compute(year: int) -> list[FestivalInstance]:
    start = _at_midnight_utc(year, 8, 1)
    return [FestivalInstance(
        festival_id="lammas",
        label=f"Lammas / Lughnasadh {year}",
        start=start,
        end=start + timedelta(days=1),
    )]


def _samhain_compute(year: int) -> list[FestivalInstance]:
    start = _at_midnight_utc(year, 10, 31)
    return [FestivalInstance(
        festival_id="samhain",
        label=f"Samhain {year}",
        start=start,
        end=start + timedelta(days=2),
    )]


register_festival(Festival(
    id="imbolc",
    name="Imbolc",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description="The lambing-season cross-quarter. Associated with Brigid; the first stirrings of light.",
    practice_notes=(
        "From Old Irish 'i mbolg' (in the belly — i.e. ewes pregnant). "
        "Attested in early Irish literature (Tochmarc Emire) and "
        "Christianized as the feast of St Brigid on Feb 1."
    ),
    sources=_CROSS_QUARTER_SOURCES,
    compute=_imbolc_compute,
))


register_festival(Festival(
    id="beltane",
    name="Beltane",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description="The summer-onset cross-quarter. Fire festival; cattle-driven between fires for blessing.",
    practice_notes=(
        "Sanas Cormaic (Cormac's Glossary, 9th C.) gives Beltane as "
        "the festival of the god Bel, with twin bonfires through which "
        "cattle were driven. Fixed civil date is modern."
    ),
    sources=_CROSS_QUARTER_SOURCES + (
        Citation(
            title="Sanas Cormaic",
            author="Cormac mac Cuilennáin",
            year=900,
            kind=CitationKind.PRIMARY,
            locator="s.v. 'Belltaine'",
        ),
    ),
    compute=_beltane_compute,
))


register_festival(Festival(
    id="lammas",
    name="Lammas / Lughnasadh",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description="The first-harvest cross-quarter. Lugh's festival; the first grain milled to bread.",
    practice_notes=(
        "Anglo-Saxon 'hlaf-mæsse' (loaf-mass) — the blessing of the "
        "first bread baked from the new harvest. The Irish Lughnasadh "
        "is the older parallel festival, with mountain gatherings, "
        "horse-racing, and contests. Both well attested."
    ),
    sources=_CROSS_QUARTER_SOURCES,
    compute=_lammas_compute,
))


register_festival(Festival(
    id="samhain",
    name="Samhain",
    tradition=Tradition.WHEEL_OF_THE_YEAR,
    description="The winter-onset cross-quarter. The veil between worlds is thin; honor the dead.",
    practice_notes=(
        "From Old Irish 'sam-fuin' (summer's end). Pre-Christian Irish "
        "samuin was the start of the year; attested in Tochmarc Emire "
        "and the Coligny calendar fragment. Christianized as All Saints'."
    ),
    sources=_CROSS_QUARTER_SOURCES,
    compute=_samhain_compute,
))
