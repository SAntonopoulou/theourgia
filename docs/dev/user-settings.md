# Per-user settings — developer guide

Every choice a user makes about how they experience Theourgia routes through this substrate. Theme, layout, accessibility, timezone, default visibility, AI agent toggle — all of it.

## Why this exists as a substrate

Without it, every feature that adds a preference would either inline its own column on the User table (schema sprawl) or invent its own JSON blob (no validation, no audit, no migration path). Both are maintenance debt that snowballs.

With it: every setting is declared once in a registry. Validation, defaults, alias forwarding for renamed keys, catalog introspection — all from the same definition.

## The substrate at a glance

```
core/usersettings/
├── registry.py      # SettingDefinition + SettingsRegistry + register_setting
├── service.py       # UserSettingsService + UserSettingsStore + InMemory store
└── defaults.py      # baseline UI / a11y / i18n / editor / etc. registrations

models/usersettings.py     # UserSetting table (key + value_json per user)
```

## Pattern: declare a setting

A feature owns its preferences. Declare them at module import time:

```python
# theourgia/features/journal/preferences.py
from theourgia.core.usersettings import register_setting


def register() -> None:
    register_setting(
        "journal.entry_sort_order",
        value_type=str,
        default="newest_first",
        allowed_values=("newest_first", "oldest_first"),
        description="How entries are ordered in the inbox view.",
    )
    register_setting(
        "journal.default_visibility",
        value_type=str,
        default="personal",
        allowed_values=("personal", "viewer", "network", "public", "sealed"),
        description="Visibility applied to new entries when not set explicitly.",
    )
```

Call `register()` from the feature's `__init__` so it runs at import time.

## Pattern: read a setting

```python
from theourgia.core.usersettings import UserSettingsService

async def list_entries(service: UserSettingsService, user: User):
    sort = await service.get_typed(
        user_id=user.id, key="journal.entry_sort_order"
    )
    # sort is guaranteed to be valid — registry default kicks in if
    # the user hasn't set anything; corrupt stored values fall back
    # to the default with a WARNING log.
    return await fetch_entries(user.id, sort_order=sort)
```

`get_typed`:

1. Returns the user's stored value if present and valid.
2. Else falls forward to the value the user set under a renamed/replaced key (alias resolution).
3. Else returns the explicit `default=...` argument if supplied.
4. Else returns the registry default.

Unregistered keys raise `KeyError` — settings the substrate doesn't know about are bugs, not silent passes.

## Pattern: write a setting

```python
await service.set(
    user_id=user.id,
    key="journal.entry_sort_order",
    value="oldest_first",
)
```

The substrate validates against the definition's `allowed_values` / `min_value` / `max_value` / type, coerces numeric strings to numbers and `"true"`/`"yes"`/`"1"` to `True`, and persists the normalized value. Invalid values raise `ValueError`.

## Pattern: rendering the full settings UI

The settings page in Phase 02 calls one method:

```python
effective = await service.effective_for_user(user.id)
# effective is a dict of every registered (non-deprecated) key
# → the user's resolved value (explicit, alias-forwarded, or default).
```

And one for the catalog (metadata for the form):

```python
catalog = service.catalog()
# list of {key, value_type, default, description, allowed_values, ...}
```

Render the form from the catalog; bind initial values from `effective`. When the user saves, call `bulk_set` with their changes — invalid keys are skipped with a warning, valid ones apply.

## Schema evolution: renaming a key

When a key needs to be renamed (`ui.color_scheme` → `ui.theme`):

```python
register_setting(
    "ui.theme",
    value_type=str,
    default="auto",
    allowed_values=("light", "dark", "auto"),
    replaces="ui.color_scheme",  # ← carries forward
)
```

Users who set `ui.color_scheme` automatically see that value when code asks for `ui.theme`. No migration job required. Once you're confident nobody references the old key, remove the `replaces` and drop the old rows.

## Deprecating a key

```python
register_setting(
    "ui.old_thing",
    value_type=str,
    default="x",
    deprecated=True,
    description="No longer used; superseded by ui.new_thing.",
)
```

Deprecated keys:
- Still readable (so legacy callers don't crash).
- Excluded from `catalog()` (settings UI no longer renders them).
- Excluded from `effective_for_user()` (frontend doesn't bind to them).
- Set operations log INFO when called.

## Pattern: testing

```python
@pytest.fixture
def service():
    registry = SettingsRegistry()
    registry.register(SettingDefinition(
        key="ui.theme", value_type=str, default="auto",
        allowed_values=("light", "dark", "auto"),
    ))
    return UserSettingsService(
        store=InMemoryUserSettingsStore(),
        registry=registry,
    )


@pytest.mark.asyncio
async def test_my_feature_honors_user_theme(service):
    await service.set(user_id=user.id, key="ui.theme", value="dark")
    result = await my_feature.render(user=user, settings=service)
    assert result.theme == "dark"
```

Each test should use an isolated `SettingsRegistry` so test-registered keys don't bleed into other tests.

## Baseline settings shipped today

| Key | Type | Default | Description |
|---|---|---|---|
| `ui.theme` | str | `auto` | light / dark / auto |
| `ui.density` | str | `comfortable` | comfortable / compact / spacious |
| `ui.sidebar.position` | str | `left` | left / right |
| `ui.sidebar.collapsed` | bool | `false` | start with sidebar collapsed |
| `a11y.reduce_motion` | bool | `false` | reduce non-essential animations |
| `a11y.high_contrast` | bool | `false` | increase contrast |
| `a11y.font_size_scale` | float | `1.0` | 0.75–2.0 multiplier on base size |
| `i18n.locale_override` | str | `""` | explicit locale (empty = Accept-Language) |
| `i18n.timezone` | str | `UTC` | IANA timezone name |
| `editor.font_family` | str | `serif` | font for the entry editor |
| `editor.autosave_seconds` | int | `15` | 5–300 seconds between autosaves |
| `editor.spellcheck` | bool | `true` | browser-side spellcheck |
| `notifications.do_not_disturb` | bool | `false` | silence all notifications |
| `federation.publish_default` | str | `personal` | default visibility for new entries |
| `agent.enabled` | bool | `false` | daskalos AI agent (off by default) |

Features add to this set via their own `register()` functions.

## Anti-patterns

**Don't** add a column to the `user` table for a new preference:

```python
# WRONG — schema sprawl as preferences accumulate
class User(SQLModel, table=True):
    theme: str = "auto"
    show_sidebar: bool = True
    autosave_seconds: int = 15
    # ...
```

**Do** register settings:

```python
# RIGHT
register_setting("ui.theme", value_type=str, default="auto", ...)
register_setting("ui.sidebar.collapsed", value_type=bool, default=False, ...)
```

**Don't** stuff structured preferences into a free-form JSON blob:

```python
# WRONG — no validation, no introspection, no migration
class User:
    preferences_json: str = "{}"
```

**Do** use the registry's typing — the substrate handles JSON serialization for you.
