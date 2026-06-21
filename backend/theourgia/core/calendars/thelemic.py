"""Thelemic calendar — Anno IVxxxv / Era Vulgaris.

Aleister Crowley's 22-year cycle of "Anni" runs from the vernal
equinox of 1904 (the receipt of *Liber AL vel Legis*). Within each
22-year docosaeteris, the year is given as a small Roman numeral
following the docosaeteris number — so Mar 20 2026 EV is in the
"5 docosaeteris" period, year 18 thereof, written **An Vxviii**
("Year five of cycle eighteen" in the Year-of-the-Aeon counting).

Two conventions are used in practice, and we present both:
* **Anni-yyy** (the count of years since 1904 itself, e.g. *An 122*)
* **Docosaeteris** notation (Roman cycle + Roman year, e.g. *V xviii*)

The Thelemic "new year" is the **Sun's ingress into Aries** (the
vernal equinox in the Northern Hemisphere). The exact astronomical
moment shifts year-to-year by ~6 hours; we use a fixed 20 March 00:00
UTC as the boundary in this batch and refine to the true astronomical
moment when Batch 23 wires the Swiss Ephemeris.

This is a *ritual* calendar — the family tag carries that intent, so
UI treatments can separate the civil calendars (Gregorian, Hebrew)
from purely magickal ones (Thelemic, later Mayan tzolkin).
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)


THELEMIC_EPOCH_YEAR = 1904
DOCOSAETERIS_LENGTH = 22


def _roman(n: int) -> str:
    """Lowercase Roman numeral for 1..3999."""
    if n <= 0:
        raise ValueError("Roman numerals require a positive integer.")
    table = [
        (1000, "m"), (900, "cm"), (500, "d"), (400, "cd"),
        (100, "c"), (90, "xc"), (50, "l"), (40, "xl"),
        (10, "x"), (9, "ix"), (5, "v"), (4, "iv"),
        (1, "i"),
    ]
    out: list[str] = []
    for value, glyph in table:
        while n >= value:
            out.append(glyph)
            n -= value
    return "".join(out)


def _thelemic_year_boundary(year_ev: int) -> date_cls:
    """Vernal-equinox boundary for the Thelemic year that *starts* in `year_ev`.

    Placeholder for the true astronomical equinox — refined in Batch 23.
    """
    return date_cls(year_ev, 3, 20)


def _is_before_vernal_equinox(d: date_cls) -> bool:
    return d < _thelemic_year_boundary(d.year)


class ThelemicCalendar:
    id: str = "thelemic"
    name: str = "Thelemic"
    family: str = "ritual"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Thelemic.from_instant requires a tz-aware datetime")
        d = instant.astimezone(UTC).date()
        # An EV-year before the vernal equinox is the *previous* Thelemic year.
        year_ev = d.year - 1 if _is_before_vernal_equinox(d) else d.year
        anno = year_ev - THELEMIC_EPOCH_YEAR  # 0-indexed from 1904
        docosaeteris = anno // DOCOSAETERIS_LENGTH  # 0-indexed cycle (0..)
        year_in_cycle = anno % DOCOSAETERIS_LENGTH  # 0..21
        # Crowley wrote "Year x of cycle y" with both as Roman numerals;
        # the cycle is typically capital, the within-cycle year lowercase.
        cycle_roman = _roman(docosaeteris + 1).upper()  # 1-indexed
        year_roman = _roman(year_in_cycle + 1)  # 1-indexed
        anni = anno + 1  # 1-indexed "Anno"

        long_str = f"An {cycle_roman}{year_roman} · EV {d.year}"
        short_str = f"An {cycle_roman}{year_roman}"
        numeric = f"{anni:03d}"
        with_day_name = f"{d.strftime('%A')}, An {cycle_roman}{year_roman} (EV {d.isoformat()})"

        return CalendarDate(
            calendar_id=self.id,
            # The integer year is "Anni since 1904" — useful for sorting
            # and for the API. The display strings carry the Roman form.
            year=anni,
            month=d.month,
            day=d.day,
            long=long_str,
            short=short_str,
            numeric=numeric,
            with_day_name=with_day_name,
            locale=locale,
            raw={
                "anni": anni,
                "docosaeteris": docosaeteris + 1,
                "year_in_cycle": year_in_cycle + 1,
                "cycle_roman": cycle_roman,
                "year_roman": year_roman,
                "era_vulgaris": d.year,
            },
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Thelemic.",
            )
        # Same Gregorian month + day; only the year is renumbered.
        ev_year = THELEMIC_EPOCH_YEAR + (date.year - 1)
        # If the (month, day) fall before the vernal equinox of `ev_year`,
        # the EV calendar year is actually `ev_year + 1` (since the
        # Thelemic year straddles two EV years).
        if date.month < 3 or (date.month == 3 and date.day < 20):
            ev_year += 1
        return datetime(ev_year, date.month, date.day, tzinfo=UTC)


register_calendar(ThelemicCalendar())
