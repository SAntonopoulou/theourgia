"""Swiss Ephemeris + JPL DE441 attribution.

Mandatory under the AGPL-3.0 path of Astrodienst's dual license (see
`plan/03-time-and-cosmos.md` §"Swiss Ephemeris licensing"). The string
is rendered:

1. In the footer of any chart SVG/HTML produced by the renderer.
2. On the About page and the docs credits page.
3. In ``ChartResult.attribution`` so an API consumer must opt *out*
   of showing it (and CI asserts it's still present in the response).

The text is fixed — do not edit without consulting the licensing
notes. Two separate lines are kept distinct because Astrodienst and
NASA/JPL each require their own credit.
"""

from __future__ import annotations

ATTRIBUTION = (
    "Astrological calculations powered by Swiss Ephemeris "
    "by Astrodienst AG (https://www.astro.com/swisseph/).\n"
    "Ephemeris data derived from the JPL DE441 planetary ephemeris "
    "(NASA / Jet Propulsion Laboratory / California Institute of Technology)."
)
