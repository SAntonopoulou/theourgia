"""Mayan calendar — Long Count + Tzolkin + Haab. v1-016.

Three interlocking cycles, following Reingold & Dershowitz,
*Calendrical Calculations* 4th ed., Ch. 11:

* **Long Count** — a pure day tally in mixed-radix notation
  ``baktun.katun.tun.uinal.kin`` (144000 / 7200 / 360 / 20 / 1 days).
* **Tzolkin** — the 260-day sacred round: a number 1-13 paired with
  one of 20 day names.
* **Haab** — the 365-day vague year: 18 months of 20 days (numbered
  0-19) plus the five nameless days of Wayeb.

Correlation: **GMT (Goodman-Martinez-Thompson), JDN 584283** — the
standard correlation, under which the current era's epoch
0.0.0.0.0 · 4 Ajaw · 8 Kumku = 11 August 3114 BC proleptic Gregorian
(R.D. -1137142) and 13.0.0.0.0 · 4 Ajaw · 3 Kankin = 21 December
2012. Day names use a plain-ASCII modern orthography ("Ajaw",
"Manik", "Kumku").

The Long Count doesn't fit the year/month/day protocol shape — per
base.py's note, ``raw`` carries the full three-cycle breakdown; the
integer fields hold baktun (year) and the Haab month/day so the
generic protocol consumers still get monotonic values.
"""

from __future__ import annotations

from datetime import UTC, datetime

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)
from theourgia.core.calendars.rd import gregorian_to_rd, rd_to_gregorian


MAYAN_CORRELATION_JDN = 584283  # GMT correlation.
MAYAN_EPOCH = MAYAN_CORRELATION_JDN - 1721425  # R.D. -1137142.


TZOLKIN_NAMES = (
    "Imix", "Ik", "Akbal", "Kan", "Chikchan", "Kimi", "Manik",
    "Lamat", "Muluk", "Ok", "Chuwen", "Eb", "Ben", "Ix", "Men",
    "Kib", "Kaban", "Etznab", "Kawak", "Ajaw",
)

HAAB_MONTH_NAMES = (
    "Pop", "Wo", "Sip", "Sotz", "Sek", "Xul", "Yaxkin", "Mol",
    "Chen", "Yax", "Sak", "Keh", "Mak", "Kankin", "Muwan", "Pax",
    "Kayab", "Kumku", "Wayeb",
)

# Haab position of the epoch: 8 Kumku = month 18, day 8 → ordinal 348.
_HAAB_EPOCH_ORDINAL = 348


def _amod(a: int, b: int) -> int:
    """1-based modulus: amod(a, b) ∈ 1..b (R&D's adjusted mod)."""
    return b if a % b == 0 else a % b


def _long_count(days: int) -> tuple[int, int, int, int, int]:
    baktun, rem = divmod(days, 144_000)
    katun, rem = divmod(rem, 7_200)
    tun, rem = divmod(rem, 360)
    uinal, kin = divmod(rem, 20)
    return baktun, katun, tun, uinal, kin


def _tzolkin(days: int) -> tuple[int, str]:
    """Epoch day is 4 Ajaw: number cycles 1-13, name cycles the 20."""
    number = _amod(days + 4, 13)
    name = TZOLKIN_NAMES[_amod(days + 20, 20) - 1]
    return number, name


def _haab(days: int) -> tuple[int, int]:
    """Epoch day is 8 Kumku. Returns (day 0-19, month 1-19)."""
    position = (days + _HAAB_EPOCH_ORDINAL) % 365
    return position % 20, position // 20 + 1


class MayanCalendar:
    id: str = "mayan"
    name: str = "Mayan"
    family: str = "ritual"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Mayan.from_instant requires a tz-aware datetime")
        d = instant.astimezone(UTC).date()
        rd = gregorian_to_rd(d.year, d.month, d.day)
        days = rd - MAYAN_EPOCH

        baktun, katun, tun, uinal, kin = _long_count(days)
        tz_number, tz_name = _tzolkin(days)
        haab_day, haab_month = _haab(days)
        haab_month_name = HAAB_MONTH_NAMES[haab_month - 1]

        lc_str = f"{baktun}.{katun}.{tun}.{uinal}.{kin}"
        tzolkin_str = f"{tz_number} {tz_name}"
        haab_str = f"{haab_day} {haab_month_name}"
        long_str = f"{lc_str} · {tzolkin_str} · {haab_str}"
        short_str = f"{tzolkin_str} · {haab_str}"

        return CalendarDate(
            calendar_id=self.id,
            # The protocol wants ints; the Long Count itself lives in
            # ``numeric`` + ``raw``. Baktun is the most year-like unit;
            # month/day carry the Haab position.
            year=baktun,
            month=haab_month,
            day=haab_day,
            long=long_str,
            short=short_str,
            numeric=lc_str,
            # The tzolkin IS the ritual day name.
            with_day_name=long_str,
            locale=locale,
            raw={
                "month_name": haab_month_name,
                "long_count": {
                    "baktun": baktun,
                    "katun": katun,
                    "tun": tun,
                    "uinal": uinal,
                    "kin": kin,
                },
                "tzolkin": {"number": tz_number, "name": tz_name},
                "haab": {
                    "day": haab_day,
                    "month": haab_month,
                    "month_name": haab_month_name,
                },
                "days_since_epoch": days,
                "correlation_jdn": MAYAN_CORRELATION_JDN,
                "rd": rd,
            },
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Mayan.",
            )
        # The Haab-shaped (year, month, day) triple repeats within a
        # baktun, so the inverse goes through the Long Count: prefer
        # the raw day tally, else parse the ``numeric`` long-count
        # string every from_instant populates.
        days = date.raw.get("days_since_epoch") if isinstance(date.raw, dict) else None
        if not isinstance(days, int):
            parts = [int(p) for p in date.numeric.split(".")]
            if len(parts) != 5:
                raise ValueError(
                    "Mayan.to_instant needs raw['days_since_epoch'] or a "
                    f"baktun.katun.tun.uinal.kin numeric; got {date.numeric!r}",
                )
            baktun, katun, tun, uinal, kin = parts
            days = (
                baktun * 144_000 + katun * 7_200 + tun * 360 + uinal * 20 + kin
            )
        gy, gm, gd = rd_to_gregorian(MAYAN_EPOCH + days)
        return datetime(gy, gm, gd, tzinfo=UTC)


register_calendar(MayanCalendar())
