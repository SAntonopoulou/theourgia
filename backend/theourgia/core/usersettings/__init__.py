"""Per-user settings substrate.

Theme, layout density, sidebar position, accessibility preferences,
timezone, locale override, default visibility, default vault, audio
volume on chant playback, calendar system in use, primary divination
decks, AI agent toggles — every choice a user makes about how they
experience Theourgia plugs into this substrate.

Without this, every feature that adds a user preference would either
inline its own column on the User table (schema sprawl) or invent its
own JSON blob (no validation, no audit, no migration). Both are
maintenance debt this substrate avoids.

Canonical call point::

    theme = await user_settings.get_typed(
        user_id=user.id, key="ui.theme", default="auto"
    )

    await user_settings.set(
        user_id=user.id, key="ui.theme", value="dark"
    )

Settings are typed via a registry — features register their keys at
import time with the expected value type, default, and validator. The
substrate uses the registry to:

- Validate writes (reject bad values at the API surface)
- Provide defaults to readers (no stale "key not set" branches)
- Surface a full catalog to the admin UI (every available setting)
- Enable schema-evolution patterns (deprecating a key without losing
  data; renaming with a forwarding alias)
"""

from __future__ import annotations

from theourgia.core.usersettings.registry import (
    SettingDefinition,
    SettingsRegistry,
    default_settings_registry,
    register_setting,
)
from theourgia.core.usersettings.service import (
    InMemoryUserSettingsStore,
    UserSettingsService,
    UserSettingsStore,
)

__all__ = [
    "InMemoryUserSettingsStore",
    "SettingDefinition",
    "SettingsRegistry",
    "UserSettingsService",
    "UserSettingsStore",
    "default_settings_registry",
    "register_setting",
]
