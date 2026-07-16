"""Closed-tradition substrate (Phase 15 §14 · FEATURES §15).

Some traditions are closed: living practices — many active indigenous
ceremonial traditions among them — whose communities have asked that
their material not be redistributed by outsiders. Theourgia's
respect-source rule honors that: content carrying a closed-tradition
tag is never publicly shared from this instance. It can still be
journaled privately; only the public-facing paths (visibility=public,
entry publish, publication embeds) refuse it, and it is excluded from
AI agent access.

Which traditions are closed is not something software should decide.
The list is operator-curated via the ``content.closed_tradition_slugs``
instance setting (comma- and/or whitespace-separated slugs); Theourgia
ships an empty default so each operator makes that judgement for their
own community.
"""

from __future__ import annotations

import json
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.instancesettings import InstanceSetting

__all__ = [
    "CLOSED_TRADITION_SETTING_KEY",
    "RESPECT_SOURCE_DETAIL",
    "closed_tradition_conflicts",
    "get_closed_tradition_slugs",
    "normalize_tradition_slug",
    "parse_closed_tradition_slugs",
]

CLOSED_TRADITION_SETTING_KEY = "content.closed_tradition_slugs"

# Shared 4xx detail for every enforcement point — entries, publish,
# publication embeds. ``{slugs}`` is the comma-joined conflict list.
RESPECT_SOURCE_DETAIL = (
    "This content carries a closed-tradition tag: {slugs}. Closed "
    "traditions are not publicly shared from this instance. The "
    "respect-source rule is set by the instance operator — see the "
    "closed-tradition documentation."
)


def normalize_tradition_slug(s: str) -> str:
    """Casefold + strip; internal whitespace collapses to a single hyphen."""
    return "-".join(s.casefold().split())


def parse_closed_tradition_slugs(raw: str) -> frozenset[str]:
    """Parse the operator-supplied slug list.

    Accepts comma and/or whitespace separated tokens; each is
    normalized via :func:`normalize_tradition_slug`. Multi-word slugs
    must therefore be written hyphenated ("golden-dawn").
    """
    tokens = raw.replace(",", " ").split()
    return frozenset(normalize_tradition_slug(t) for t in tokens)


async def get_closed_tradition_slugs(
    session: AsyncSession,
) -> frozenset[str]:
    """Read the operator-curated closed-tradition set.

    Missing row, empty value, or malformed JSON all mean "nothing is
    closed" — the substrate is opt-in.
    """
    stmt = select(InstanceSetting).where(
        InstanceSetting.key == CLOSED_TRADITION_SETTING_KEY,
    )
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        return frozenset()
    try:
        raw = json.loads(row.value_json)
    except ValueError:
        return frozenset()
    if not isinstance(raw, str) or not raw.strip():
        return frozenset()
    return parse_closed_tradition_slugs(raw)


def closed_tradition_conflicts(
    tradition_tags: Iterable[str], closed: frozenset[str]
) -> list[str]:
    """Normalized intersection of ``tradition_tags`` with ``closed``,
    preserving the order tags appear in."""
    if not closed:
        return []
    seen: set[str] = set()
    conflicts: list[str] = []
    for tag in tradition_tags:
        slug = normalize_tradition_slug(tag)
        if slug in closed and slug not in seen:
            seen.add(slug)
            conflicts.append(slug)
    return conflicts
