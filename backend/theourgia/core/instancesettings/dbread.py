"""Direct DB reads of instance settings for request-time checks.

The full :class:`InstanceSettingsService` composes a store + registry;
request handlers that already hold an ``AsyncSession`` and need one
value (the signup gate, the federation anonymous-inbound escape hatch,
NodeInfo's openRegistrations) read the row directly — the same pattern
:mod:`theourgia.core.traditions` established for the closed-tradition
setting. Missing row / malformed JSON fall back to the registry
default semantics via the caller-supplied ``default``.
"""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from theourgia.models.instancesettings import InstanceSetting

__all__ = ["read_bool_setting"]


async def read_bool_setting(
    session: AsyncSession, key: str, *, default: bool,
) -> bool:
    """Read a boolean instance setting straight from the DB.

    Missing row or malformed value returns ``default`` — instance
    settings are opt-in overrides on top of registry defaults.
    """
    stmt = select(InstanceSetting).where(InstanceSetting.key == key)
    row = (await session.execute(stmt)).scalar_one_or_none()
    if row is None:
        return default
    try:
        raw = json.loads(row.value_json)
    except ValueError:
        return default
    if not isinstance(raw, bool):
        return default
    return raw
