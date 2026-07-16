"""Calendar substrate — multi-tradition civil + ritual calendars.

Theourgia is multi-tradition by design: a Hellenistic practitioner
wants to see the Greek archon year + the lunar month name + the day's
nyx daimon alongside the Gregorian date; a Thelemite wants Anno
IVxxxv; a Hindu astrologer wants Vikram Samvat alongside the
nakshatra. The substrate makes adding a new calendar a localized
exercise: implement the :class:`Calendar` protocol, register it.

Canonical call points::

    from theourgia.core.calendars import get_calendar, registered_calendars

    gregorian = get_calendar("gregorian")
    today_at_athens = gregorian.from_instant(utcnow(), locale="el-GR")
    print(today_at_athens.long)  # "Κυριακή, 21 Ιουνίου 2026"

    # All calendars stacked for the multi-calendar Today widget:
    for cal in registered_calendars():
        print(cal.id, cal.from_instant(utcnow()).long)

Calendars never own time. They translate a UTC ``datetime`` (one
authoritative instant) into a localized civil/ritual presentation. Two
calendars looking at the same instant must always agree on *when*
they're looking at — they only disagree on *how* to spell it.

The first batch shipped Gregorian, Julian, Hebrew, and Thelemic;
v1-016 added Islamic (civil), Coptic, Mayan, and French Republican.
The remaining calendars in `plan/03-time-and-cosmos.md` §1 land in
follow-up batches; the substrate is the same for each.
"""

from theourgia.core.calendars.base import (
    Calendar,
    CalendarDate,
    DateFormat,
    register_calendar,
    registered_calendars,
    get_calendar,
)

# Import side-effect: register every shipped calendar.
from theourgia.core.calendars import gregorian as _gregorian  # noqa: F401
from theourgia.core.calendars import julian as _julian  # noqa: F401
from theourgia.core.calendars import hebrew as _hebrew  # noqa: F401
from theourgia.core.calendars import thelemic as _thelemic  # noqa: F401
from theourgia.core.calendars import islamic as _islamic  # noqa: F401
from theourgia.core.calendars import coptic as _coptic  # noqa: F401
from theourgia.core.calendars import mayan as _mayan  # noqa: F401
from theourgia.core.calendars import french_republican as _french_republican  # noqa: F401

__all__ = [
    "Calendar",
    "CalendarDate",
    "DateFormat",
    "register_calendar",
    "registered_calendars",
    "get_calendar",
]
