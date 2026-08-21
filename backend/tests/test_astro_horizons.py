"""Golden position parity: theourgia-web vs JPL Horizons.

The existing astro tests assert "within the expected sign, within a degree" —
enough to catch a gross regression, not enough to prove the *integration layer*
(time scale, frame, apparent-vs-geometric, Julian-Day conversion, units) is
right. That layer is exactly where errors hide and stay invisible: everything
works, the numbers are plausible, and nobody finds out until two engines
disagree about somebody's chart.

This is the missing golden test. The fixture is the very same one AstroPractise
(the canonical engine) checks itself against — geocentric apparent ecliptic
longitudes from JPL Horizons, at six instants spanning 1900-2050. If the web
matches Horizons and AstroPractise matches Horizons, the two match each other on
positions, which is the foundation every downstream technique stands on.

See tests/fixtures/horizons_positions.json for the provenance and the caveat.
"""

from __future__ import annotations

import json
import pathlib
from datetime import datetime

import pytest

from theourgia.core.astro.chart import EPHEMERIS_SOURCE, ChartRequest, compute_chart

_FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "horizons_positions.json"
_ROWS = json.loads(_FIXTURE.read_text())["rows"]

# The Swiss Ephemeris matches Horizons to a fraction of an arcsecond for the
# planets; the fast Moon shows a few arcseconds at the extreme dates (the UT/UT1
# sub-second residual — the observed worst is 3.26″, the Moon at 2050). This
# bound (10″) sits just above that with headroom for delta-T table drift, and is
# still an order of magnitude tighter than any real regression: a Moshier
# fallback drifts by arcseconds-to-arcminutes, a frame or time-scale slip by
# arcminutes, a wrong body by degrees. The web and AstroPractise both hold to
# this against Horizons, so they hold to each other.
_TOLERANCE_DEG = 10.0 / 3600.0


def _arcsec(delta_deg: float) -> float:
    return abs((delta_deg + 180.0) % 360.0 - 180.0) * 3600.0


def test_ephemeris_source_is_swieph() -> None:
    """The comparison is only meaningful against the Swiss data files. Moshier
    would drift and the golden numbers would not hold — so if this fails, the
    deployment is missing its ephemeris and every chart is subtly wrong."""
    assert EPHEMERIS_SOURCE == "swieph", (
        f"ephemeris is {EPHEMERIS_SOURCE!r}, not swieph — the .se1 files are not "
        "being found; positions will disagree with the phone by arcseconds"
    )


@pytest.mark.parametrize(
    "row",
    _ROWS,
    ids=[f"{r['body']}@{r['instantUtc']}" for r in _ROWS],
)
def test_web_position_matches_horizons(row: dict) -> None:
    instant = datetime.fromisoformat(row["instantUtc"])
    # Geocentric ecliptic longitude does not depend on the observer's place, so
    # any lat/lng gives the same body longitudes; the equator/prime meridian
    # keeps it neutral.
    result = compute_chart(ChartRequest(instant=instant, latitude=0.0, longitude=0.0))
    placement = next(p for p in result.placements if p.body.id == row["body"])
    got = placement.tropical.longitude
    expected = float(row["eclipticLongitude"])
    delta = _arcsec(got - expected)
    assert delta < _TOLERANCE_DEG * 3600.0, (
        f"{row['body']} @ {row['instantUtc']}: web {got:.6f}° vs "
        f"Horizons {expected:.6f}° — off by {delta:.2f}″"
    )
