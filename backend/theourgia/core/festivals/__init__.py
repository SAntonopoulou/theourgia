"""Festival overlays — multi-tradition sacred dates with provenance.

Theourgia treats festival data with the same standard as the rest of
the product: every entry has at least one cited source, and the
distinction between primary attestation, scholarly reconstruction,
and contemporary practice is made explicit so the practitioner can
judge.

This batch ships five traditions:

* **Wheel of the Year** (8 Sabbats) — modern Neo-pagan synthesis,
  honestly attributed to Gardner / Nichols / Hutton.
* **Greek** (5 Athenian festivals) — Anthesteria, Thesmophoria,
  Eleusinia, Panathenaia, Pyanepsia, with Parker / Burkert / primary
  sources.
* **Roman** (5 republican-era festivals) — Lupercalia, Floralia,
  Vestalia, Saturnalia, Compitalia, anchored on Ovid's *Fasti*.
* **Hekatean** — monthly Deipnon and Noumenia keyed to the lunar
  cycle.
* **Thelemic** — the four Feasts of the Times, Crowleymas, and the
  Three Days of the Writing of the Book.

Hindu and Egyptian festivals are intentionally **NOT** shipped in
this batch — those traditions deserve consultation with practitioners
before inclusion (per `plan/03-time-and-cosmos.md` "Risks" §"Festival
data quality / cultural appropriation concerns"). Adding them is a
future maintainer-review batch.

Canonical call points::

    from theourgia.core.festivals import festivals_for_year, Tradition

    for instance in festivals_for_year(2026):
        festival = get_festival(instance.festival_id)
        print(instance.label, festival.tradition, festival.sources[0].title)
"""

from theourgia.core.festivals.base import (
    Citation,
    CitationKind,
    Festival,
    FestivalInstance,
    Tradition,
    festivals_by_tradition,
    festivals_for_year,
    get_festival,
    register_festival,
    registered_festivals,
)

# Side-effect imports: register every shipped festival.
from theourgia.core.festivals import sabbats as _sabbats  # noqa: F401
from theourgia.core.festivals import hekatean as _hekatean  # noqa: F401
from theourgia.core.festivals import greek as _greek  # noqa: F401
from theourgia.core.festivals import roman as _roman  # noqa: F401
from theourgia.core.festivals import thelemic as _thelemic  # noqa: F401

__all__ = [
    "Citation",
    "CitationKind",
    "Festival",
    "FestivalInstance",
    "Tradition",
    "festivals_by_tradition",
    "festivals_for_year",
    "get_festival",
    "register_festival",
    "registered_festivals",
]
