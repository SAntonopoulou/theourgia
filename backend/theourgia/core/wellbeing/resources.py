"""Crisis-support resources — operator-configured, never fabricated.

Served by ``GET /api/v1/wellbeing/nudge`` when (and only when) the
user has opted in to the crisis-aware nudge. When the setting is off
the endpoint returns an empty list and this module is never consulted.

Honesty rules (the Sacred Well Directory placeholder, resolved):

* The designer's "Sacred Well Directory" — a Theourgia-curated,
  magick-literate resource directory — **does not exist** (see
  ``feedback_wellbeing_copy_never_improvise.md``). Earlier revisions
  of this module shipped a hard-coded "starter list" under a
  MAINTAINER REVIEW REQUIRED flag and served it as live data; that
  review never happened, so the list is gone.
* Theourgia now ships **zero** built-in entries. Resources come solely
  from the operator-editable instance setting
  ``wellbeing.crisis_resources`` (a JSON list of
  ``{"region", "name", "url"}`` objects). The operator vets every
  entry for their own instance.
* When nothing is configured, the API serves an explicit empty state
  (``resources: []`` + ``resources_configured: false``) — never a
  default the project hasn't verified.
* Malformed entries are skipped, never "repaired" into something the
  operator didn't write.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Final

from sqlalchemy import select

from theourgia.models.instancesettings import InstanceSetting

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

__all__ = [
    "CRISIS_RESOURCES_KEY",
    "CrisisResource",
    "load_crisis_resources",
]


#: Instance-setting key holding the operator's resource list.
CRISIS_RESOURCES_KEY: Final[str] = "wellbeing.crisis_resources"


@dataclass(frozen=True, slots=True)
class CrisisResource:
    """One crisis-support resource, keyed by region."""

    region: str
    name: str
    url: str


def _coerce_resource(item: Any) -> CrisisResource | None:
    """Validate one raw entry; ``None`` if it isn't a complete
    ``{region, name, url}`` object with an http(s) URL."""
    if not isinstance(item, dict):
        return None
    region = item.get("region")
    name = item.get("name")
    url = item.get("url")
    if not all(
        isinstance(v, str) and v.strip() for v in (region, name, url)
    ):
        return None
    if not url.startswith(("https://", "http://")):
        return None
    return CrisisResource(region=region, name=name, url=url)


async def load_crisis_resources(
    session: AsyncSession,
) -> list[CrisisResource]:
    """The operator-configured resource list, empty when unset.

    Reads the ``wellbeing.crisis_resources`` instance-setting row
    directly (same request-time pattern as
    :mod:`theourgia.core.instancesettings.dbread`). A missing row,
    malformed JSON, or a non-list value all yield ``[]`` — the
    explicit "nothing configured" state.
    """
    stmt = select(InstanceSetting).where(
        InstanceSetting.key == CRISIS_RESOURCES_KEY,
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        return []
    try:
        raw = json.loads(row.value_json)
    except (TypeError, ValueError):
        return []
    if not isinstance(raw, list):
        return []
    out: list[CrisisResource] = []
    for item in raw:
        resource = _coerce_resource(item)
        if resource is not None:
            out.append(resource)
    return out
