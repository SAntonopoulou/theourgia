"""Astrology engine — Swiss Ephemeris wrapper.

Wraps ``pyswisseph`` for chart calculation. Multi-tradition by default:
the same chart can be queried with tropical or sidereal zodiac, with
Placidus or Whole Sign houses, with modern or Hellenistic dignity
scoring. All three traditions consume the same underlying ephemeris.

Attribution is baked in: ``ChartResult.attribution`` carries the
mandatory Swiss Ephemeris + JPL DE441 credit per the
AGPL-3.0 / commercial dual-license obligations
(see `plan/03-time-and-cosmos.md` §"Swiss Ephemeris licensing").
The default chart renderer in the frontend reads this field and
displays it as a footer; the credits page in docs hard-codes the same
text. CI asserts the attribution is present in any rendered chart
output.

Canonical call points::

    from theourgia.core.astro import compute_chart, ChartRequest

    chart = compute_chart(
        ChartRequest(
            instant=datetime(2026, 6, 21, 12, tzinfo=UTC),
            latitude=37.9838,
            longitude=23.7275,
            zodiac="tropical",
            house_system="placidus",
        )
    )
    for placement in chart.placements:
        print(placement.body, placement.zodiac_sign, placement.degree_in_sign)
"""

from theourgia.core.astro.attribution import ATTRIBUTION
from theourgia.core.astro.chart import (
    ChartRequest,
    ChartResult,
    Placement,
    compute_chart,
)
from theourgia.core.astro.events import (
    AstroEvent,
    AstroEventKind,
    events_in_range,
    lunar_phases_in_range,
    planetary_ingresses_in_range,
)
from theourgia.core.astro.planetary_hours import (
    PLANET_GLYPH,
    Planet,
    PlanetaryHour,
    compute_planetary_hours,
    current_planetary_hour,
    day_ruler,
)
from theourgia.core.astro.sun_times import SunTimes, compute_sun_times
from theourgia.core.astro.zodiac import (
    SIGNS,
    Ayanamsa,
    Zodiac,
    sign_of,
)

__all__ = [
    "ATTRIBUTION",
    "AstroEvent",
    "AstroEventKind",
    "Ayanamsa",
    "ChartRequest",
    "ChartResult",
    "PLANET_GLYPH",
    "Placement",
    "Planet",
    "PlanetaryHour",
    "SIGNS",
    "SunTimes",
    "Zodiac",
    "compute_chart",
    "compute_planetary_hours",
    "compute_sun_times",
    "current_planetary_hour",
    "day_ruler",
    "events_in_range",
    "lunar_phases_in_range",
    "planetary_ingresses_in_range",
    "sign_of",
]
