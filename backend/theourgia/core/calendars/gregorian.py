"""Gregorian calendar — the civil baseline.

Locale-aware formatting via Babel (``babel.dates.format_date``).
Babel ships CLDR data for every locale we'd plausibly want; this
calendar is the one place we lean on it.
"""

from __future__ import annotations

from datetime import UTC, date as date_cls, datetime

from babel.dates import format_date

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    register_calendar,
)


class GregorianCalendar:
    id: str = "gregorian"
    name: str = "Gregorian"
    family: str = "solar"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        if instant.tzinfo is None:
            raise ValueError("Gregorian.from_instant requires a tz-aware datetime")
        # Translate to the locale's civil date. The instant arrives in
        # UTC; for civil display we use the locale's wall time. The
        # caller's locale alone doesn't carry a timezone — that lives
        # on the user profile and is threaded by the API edge. For the
        # backend protocol we present the UTC date and let the API
        # layer apply the user's zone when it matters.
        d = instant.astimezone(UTC).date()

        return CalendarDate(
            calendar_id=self.id,
            year=d.year,
            month=d.month,
            day=d.day,
            long=format_date(d, format="long", locale=locale),
            short=format_date(d, format="short", locale=locale),
            numeric=d.isoformat(),
            with_day_name=format_date(d, format="full", locale=locale),
            locale=locale,
            raw={"weekday": d.isoweekday()},
        )

    def to_instant(self, date: CalendarDate) -> datetime:
        if date.calendar_id != self.id:
            raise ValueError(
                f"Date is for calendar {date.calendar_id!r}, not Gregorian.",
            )
        return datetime(date.year, date.month, date.day, tzinfo=UTC)


register_calendar(GregorianCalendar())
