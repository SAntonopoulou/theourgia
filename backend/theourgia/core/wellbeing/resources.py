"""Crisis-support resources — region-keyed starter list.

Served by ``GET /api/v1/wellbeing/nudge`` when (and only when) the
user has opted in to the crisis-aware nudge. When the setting is off
the endpoint returns an empty list and never reaches this module's
data.

MAINTAINER REVIEW REQUIRED — do not resolve in code:
the designer's "Sacred Well Directory" is a placeholder name for a
Theourgia-curated, magick-literate directory that does not yet exist
(see ``feedback_wellbeing_copy_never_improvise.md`` and the placeholder
comments in ``frontend/admin/src/routes/Wellbeing.tsx``). The entries
below are a starter list carried under that same flag: every entry is
pending maintainer review before any production deployment. These
strings are API data (backend strings are unrestricted); the designer
owns whatever copy eventually surrounds them in the UI.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

__all__ = ["CRISIS_RESOURCES", "CrisisResource", "resources_payload"]


@dataclass(frozen=True, slots=True)
class CrisisResource:
    """One crisis-support resource, keyed by region."""

    region: str
    name: str
    url: str


#: Starter list — international entries only until the maintainer
#: review described in the module docstring has happened.
CRISIS_RESOURCES: Final[tuple[CrisisResource, ...]] = (
    CrisisResource(
        region="international",
        name="IASP Crisis Centres directory",
        url="https://www.iasp.info/resources/Crisis_Centres/",
    ),
    CrisisResource(
        region="international",
        name="Find a Helpline",
        url="https://findahelpline.com",
    ),
)


def resources_payload() -> list[dict[str, str]]:
    """The starter list as JSON-shaped dicts for the API response."""
    return [
        {"region": r.region, "name": r.name, "url": r.url}
        for r in CRISIS_RESOURCES
    ]
