"""Calendar substrate (Phase 11 B135).

Pure-Python RFC 5545 iCal serializer + helpers. Live data is walked
by the router; this module just turns ``CalendarEvent`` records into
a VCALENDAR/VEVENT block with proper line-folding + escaping.
"""

from __future__ import annotations

from theourgia.core.calendar.feed_walker import (
    WALK_WINDOW_FUTURE,
    WALK_WINDOW_PAST,
    WORKING_ENTRY_TYPES,
    WalkResult,
    walk_feed_data,
)
from theourgia.core.calendar.ical_serializer import (
    CalendarEvent,
    SealedDayMarker,
    SEALED_DAY_SUMMARY_TEMPLATE,
    build_vcalendar,
    fold_line,
    ical_escape,
)

__all__ = [
    "CalendarEvent",
    "SealedDayMarker",
    "SEALED_DAY_SUMMARY_TEMPLATE",
    "WALK_WINDOW_FUTURE",
    "WALK_WINDOW_PAST",
    "WORKING_ENTRY_TYPES",
    "WalkResult",
    "build_vcalendar",
    "fold_line",
    "ical_escape",
    "walk_feed_data",
]
