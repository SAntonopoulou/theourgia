"""Calendar protocol + registry.

A :class:`Calendar` translates a UTC ``datetime`` into a localized
:class:`CalendarDate`. The protocol is intentionally narrow so plugin
authors can ship third-party calendars (Mayan Long Count, Coptic,
French Republican, etc.) without touching core code.

Every calendar carries:

* a stable ``id`` (lowercase, kebab-case, e.g. ``"gregorian"``,
  ``"hebrew"``, ``"thelemic"``);
* a human display ``name`` (the English label;
  per-locale endonyms live in the i18n catalog);
* a ``family`` tag (one of ``solar``, ``lunisolar``, ``lunar``,
  ``ritual``) so the UI can group calendars sensibly when the user
  has several enabled.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable

__all__ = [
    "Calendar",
    "CalendarDate",
    "DateFormat",
    "register_calendar",
    "registered_calendars",
    "get_calendar",
]


DateFormat = str  # "long" | "short" | "numeric" | "with-day-name"
# Kept as a plain string alias rather than Literal — calendars are free
# to add their own format keys (e.g. Hebrew's "biblical-style") so long
# as they document them.


@dataclass(frozen=True, slots=True)
class CalendarDate:
    """A point on a single calendar.

    ``year`` / ``month`` / ``day`` are the calendar's *native* numbers
    (Hebrew years go like 5786; Thelemic years like "IVxxxv"; Mayan
    won't even fit this shape — see ``raw`` for calendars that need
    richer representations).

    ``long`` / ``short`` / ``numeric`` are pre-formatted strings
    localized via Babel (or the calendar's own format hook). They're
    materialized eagerly so consumers don't have to re-thread the
    locale every render.

    ``raw`` holds any calendar-specific extras (Hebrew leap-month
    flag, Mayan haab/tzolkin/long-count tuple, etc.) so dynamic
    callers can introspect without the protocol changing every time a
    new calendar lands.
    """

    calendar_id: str
    year: int
    month: int
    day: int
    long: str
    short: str
    numeric: str
    with_day_name: str
    locale: str
    raw: dict[str, object]


@runtime_checkable
class Calendar(Protocol):
    """Minimum surface every calendar implementation provides.

    The runtime stays narrow: forward conversion (instant → native)
    and backward conversion (native → instant) is what the UI + API
    layer actually need. Inverse-precision details (e.g. the Hebrew
    day starts at sunset, not midnight) belong to the calendar
    implementation, not the protocol.
    """

    id: str
    name: str
    family: str  # "solar" | "lunisolar" | "lunar" | "ritual"

    def from_instant(
        self,
        instant: datetime,
        *,
        locale: str = "en",
    ) -> CalendarDate:
        """Translate a UTC instant into a localized :class:`CalendarDate`."""

    def to_instant(self, date: CalendarDate) -> datetime:
        """Inverse of :meth:`from_instant`. Returns a UTC datetime."""


# ────────────────────────────────────────────────────────────────────────
# Registry
# ────────────────────────────────────────────────────────────────────────

_REGISTRY: dict[str, Calendar] = {}


def register_calendar(calendar: Calendar) -> None:
    """Add a calendar to the registry. Idempotent on id."""
    _REGISTRY[calendar.id] = calendar


def registered_calendars() -> list[Calendar]:
    """Every calendar currently in the registry, in insertion order."""
    return list(_REGISTRY.values())


def get_calendar(calendar_id: str) -> Calendar:
    """Look up a calendar by id. Raises :class:`KeyError` if missing."""
    if calendar_id not in _REGISTRY:
        raise KeyError(
            f"No calendar registered with id {calendar_id!r}. "
            f"Known: {sorted(_REGISTRY)}."
        )
    return _REGISTRY[calendar_id]
