"""Planetary hours — true sunrise / sunset based.

Replaces the placeholder clock-hour heuristic in
``frontend/admin/src/routes/Workshop.tsx`` with the actual
traditional computation:

1. Sunrise and sunset are computed for the given UTC date + location
   via the Swiss Ephemeris (see :mod:`sun_times`).
2. The daylight arc (sunrise → sunset) is divided into 12 equal
   "planetary hours of the day."
3. The nighttime arc (sunset → next-day sunrise) is divided into 12
   equal "planetary hours of the night."
4. The Chaldean ordering is applied: starting at the day-of-week's
   planetary ruler, walking the canonical Saturn → Jupiter → Mars →
   Sun → Venus → Mercury → Moon cycle.

Day-of-week rulers (Sunday → Sun, Monday → Moon, ...) follow the
medieval tradition that gave the days of the week their names —
this is the same scheme found in Agrippa Book II Ch. 32 and
preserved in Crowley's *Liber 777*. Arabic / Hellenistic /
Hermetic sources all agree on this ordering.

For a polar observer (no sunrise or sunset on a given UTC day), the
function falls back to dividing the 24-hour solar arc evenly — the
practitioner is left to judge whether traditional hours are
meaningful at that latitude.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import Enum

from theourgia.core.astro.sun_times import compute_sun_times

__all__ = [
    "Planet",
    "PlanetaryHour",
    "compute_planetary_hours",
    "day_ruler",
    "current_planetary_hour",
]


class Planet(str, Enum):
    """The seven classical planetary rulers of the hours."""

    SATURN = "saturn"
    JUPITER = "jupiter"
    MARS = "mars"
    SUN = "sun"
    VENUS = "venus"
    MERCURY = "mercury"
    MOON = "moon"


PLANET_GLYPH: dict[Planet, str] = {
    Planet.SATURN: "♄",
    Planet.JUPITER: "♃",
    Planet.MARS: "♂",
    Planet.SUN: "☉",
    Planet.VENUS: "♀",
    Planet.MERCURY: "☿",
    Planet.MOON: "☽",
}


# Chaldean order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon
# then wraps. This is the slowest-to-fastest geocentric order.
CHALDEAN_ORDER: tuple[Planet, ...] = (
    Planet.SATURN,
    Planet.JUPITER,
    Planet.MARS,
    Planet.SUN,
    Planet.VENUS,
    Planet.MERCURY,
    Planet.MOON,
)


# Day-of-week → planetary ruler. Python's weekday() is 0 = Monday,
# 6 = Sunday. We index the same way.
DAY_RULERS: tuple[Planet, ...] = (
    Planet.MOON,     # Monday
    Planet.MARS,     # Tuesday
    Planet.MERCURY,  # Wednesday
    Planet.JUPITER,  # Thursday
    Planet.VENUS,    # Friday
    Planet.SATURN,   # Saturday
    Planet.SUN,      # Sunday
)


def day_ruler(date_utc: datetime) -> Planet:
    """The planet ruling the *daylight* portion of the given UTC date.

    The day's ruler is also the ruler of the first planetary hour
    (counting from sunrise).
    """
    return DAY_RULERS[date_utc.weekday()]


@dataclass(frozen=True, slots=True)
class PlanetaryHour:
    """A single planetary hour with its ruler and span.

    ``index`` is 1..24 (1..12 for day hours, 13..24 for night hours).
    ``length`` is :class:`~datetime.timedelta` and lets the consumer
    measure how short the night is in mid-summer / midwinter.
    """

    index: int
    ruler: Planet
    glyph: str
    start: datetime
    end: datetime
    is_day: bool

    @property
    def length(self) -> timedelta:
        return self.end - self.start


def _split_arc(start: datetime, end: datetime, n: int) -> list[tuple[datetime, datetime]]:
    """Split an arc into ``n`` equal segments."""
    total = (end - start) / n
    return [(start + total * i, start + total * (i + 1)) for i in range(n)]


def compute_planetary_hours(
    date_utc: datetime,
    latitude: float,
    longitude: float,
) -> list[PlanetaryHour]:
    """The 24 planetary hours covering ``date_utc``'s daylight arc plus
    the night arc that follows it (sunrise → next sunrise).

    The first 12 are daylight hours starting at sunrise; the next 12
    are night hours starting at sunset. Each is ruled by the next
    planet in the Chaldean cycle, starting from the day ruler.
    """
    if date_utc.tzinfo is None:
        raise ValueError("compute_planetary_hours requires a tz-aware datetime")
    times = compute_sun_times(date_utc, latitude, longitude)
    next_day = (date_utc + timedelta(days=1)).astimezone(UTC).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    next_times = compute_sun_times(next_day, latitude, longitude)

    # Polar fallback: when the Sun never rises or never sets on this
    # UTC day, split the 24-hour solar-noon-to-solar-noon arc evenly.
    if times.sunrise is None or times.sunset is None or next_times.sunrise is None:
        day_arc_start = times.solar_noon - timedelta(hours=6)
        day_arc_end = times.solar_noon + timedelta(hours=6)
        night_arc_end = next_times.solar_midnight + timedelta(hours=12)
    else:
        day_arc_start = times.sunrise
        day_arc_end = times.sunset
        night_arc_end = next_times.sunrise

    day_segments = _split_arc(day_arc_start, day_arc_end, 12)
    night_segments = _split_arc(day_arc_end, night_arc_end, 12)

    ruler = day_ruler(date_utc)
    start_index = CHALDEAN_ORDER.index(ruler)

    hours: list[PlanetaryHour] = []
    for i, (start, end) in enumerate(day_segments):
        planet = CHALDEAN_ORDER[(start_index + i) % 7]
        hours.append(
            PlanetaryHour(
                index=i + 1,
                ruler=planet,
                glyph=PLANET_GLYPH[planet],
                start=start,
                end=end,
                is_day=True,
            )
        )
    for i, (start, end) in enumerate(night_segments):
        planet = CHALDEAN_ORDER[(start_index + 12 + i) % 7]
        hours.append(
            PlanetaryHour(
                index=12 + i + 1,
                ruler=planet,
                glyph=PLANET_GLYPH[planet],
                start=start,
                end=end,
                is_day=False,
            )
        )
    return hours


def current_planetary_hour(
    now: datetime,
    latitude: float,
    longitude: float,
) -> PlanetaryHour:
    """The planetary hour containing ``now`` at the given location.

    Looks up the day's hours first; if ``now`` is before that day's
    sunrise, falls back to the previous civil day's night hours.
    """
    if now.tzinfo is None:
        raise ValueError("current_planetary_hour requires a tz-aware datetime")
    today_hours = compute_planetary_hours(now, latitude, longitude)
    if now < today_hours[0].start:
        # We're before today's sunrise — yesterday's hours are still active.
        yesterday_hours = compute_planetary_hours(
            now - timedelta(days=1), latitude, longitude,
        )
        for h in yesterday_hours:
            if h.start <= now < h.end:
                return h
    for h in today_hours:
        if h.start <= now < h.end:
            return h
    # Past the last night-hour but before the next sunrise — fall
    # through to the last hour (rare; only at second-level boundaries).
    return today_hours[-1]
