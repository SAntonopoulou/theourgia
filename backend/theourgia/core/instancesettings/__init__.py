"""Instance-wide dynamic settings substrate.

Operator-controlled runtime toggles distinct from environment
configuration. Settings change behaviour without restarting the
process: "is registration open right now?", "show the divinations
tab on the homepage?", "is the daskalos AI agent enabled instance-
wide?"

Sibling to S10 (per-user settings) but instance-scoped:

- :class:`InstanceSettingDefinition` — same shape as the per-user
  registry, plus a ``public`` flag controlling whether unauthenticated
  / non-admin requests can read the value.
- :class:`InstanceSettingsRegistry` — features register their keys at
  import time.
- :class:`InstanceSettingsService` — get / set / list.

Differences from S10:

- **One row per key** (no user_id).
- **Writes are admin-only** (enforced via the authorization substrate
  in the API layer; the service itself doesn't authenticate).
- **Reads can be public** when the definition's ``public=True``.
  Anonymous "is registration open?" lookups don't need an auth round
  trip.

Canonical call point::

    if await instance_settings.get_typed("registration.open", default=False):
        # accept signups
        ...
"""

from __future__ import annotations

from theourgia.core.instancesettings.registry import (
    InstanceSettingDefinition,
    InstanceSettingsRegistry,
    default_instance_settings_registry,
    register_instance_setting,
)
from theourgia.core.instancesettings.service import (
    InMemoryInstanceSettingsStore,
    InstanceSettingsService,
    InstanceSettingsStore,
)

__all__ = [
    "InMemoryInstanceSettingsStore",
    "InstanceSettingDefinition",
    "InstanceSettingsRegistry",
    "InstanceSettingsService",
    "InstanceSettingsStore",
    "default_instance_settings_registry",
    "register_instance_setting",
]
