# Instance-wide settings — developer guide

Operator-controlled runtime toggles distinct from environment configuration. Settings change behaviour without restarting the process.

Sibling to S10 (per-user settings) but instance-scoped.

## When to use what

| Concern | Substrate |
|---|---|
| User picks their UI theme | S10 (`core/usersettings`) |
| Operator opens / closes signups | S11 (`core/instancesettings`) — this one |
| Configuration that requires a restart (DB URL, secrets) | `core/config.py` (env vars) |
| Feature flag for a user-segment rollout | S11 with custom validator |

Rule of thumb: if changing it requires a process restart, it belongs in env config. If a user picks it, S10. If an admin picks it at runtime, S11.

## The substrate at a glance

```
core/instancesettings/
├── registry.py   # InstanceSettingDefinition + InstanceSettingsRegistry
├── service.py    # InstanceSettingsService + Store Protocol + InMemory
└── defaults.py   # baseline settings

models/instancesettings.py     # InstanceSetting table (key + value_json, no user_id)
```

## Pattern: declare a setting

A feature owns the keys its toggles control:

```python
# theourgia/features/auth/instance_settings.py
from theourgia.core.instancesettings import register_instance_setting


def register() -> None:
    register_instance_setting(
        "auth.password_min_length",
        value_type=int,
        default=12,
        min_value=8,
        max_value=128,
        description=(
            "Minimum password length. Operators may raise this for "
            "security-conscious deployments; lowering below 12 is "
            "discouraged."
        ),
    )
    register_instance_setting(
        "auth.totp_required_for_admins",
        value_type=bool,
        default=False,
        description=(
            "When True, hub_admin / hub_officer accounts must have "
            "TOTP enrolled to sign in."
        ),
    )
```

## Pattern: read a setting

```python
from theourgia.core.instancesettings import InstanceSettingsService

async def open_for_signups(service: InstanceSettingsService) -> bool:
    return await service.get_typed("registration.open", default=True)
```

For settings marked `public=True`, anonymous endpoints can read via the public path:

```python
@router.get("/api/v1/public/instance-state")
async def public_state(service: InstanceSettingsServiceDep):
    return {
        "registration_open": await service.get_public_typed("registration.open"),
        "welcome_message": await service.get_public_typed("homepage.welcome_message"),
    }
```

The public path raises `PermissionError` if the setting is NOT marked public, so a typo can't accidentally leak admin-only state.

## Pattern: write a setting

The service trusts callers — auth lives in the API layer via the authorization substrate. A typical admin endpoint looks like:

```python
@router.put("/api/v1/admin/settings/{key}")
async def update_setting(
    key: str,
    payload: dict,
    user: Annotated[User, Depends(require_scope(Scope.ADMIN_OBSERVE))],
    service: InstanceSettingsServiceDep,
):
    try:
        normalized = await service.set(key, payload["value"])
    except KeyError:
        raise NotFoundError(f"unknown setting: {key}")
    except ValueError as exc:
        raise ValidationFailedError(str(exc))
    return {"key": key, "value": normalized}
```

The admin scope check in `require_scope` is enforced by the S6 authorization substrate.

## public vs private settings

Mark a setting `public=True` when:

- The signup screen / homepage / unauthenticated visitor genuinely needs to see it.
- Examples: `registration.open`, `homepage.welcome_message`, `maintenance.mode`, `agent.allowed` (so the frontend can hide the agent UI when the instance has disabled it).

Mark it private (default) when:

- Only admins should see the value.
- Includes anything operator-internal: API quotas, secret hooks, retention windows.

The default is **private**. Be deliberate about adding `public=True`.

## Maintenance mode

The baseline includes `maintenance.mode` (default `false`). Future middleware will check this on every request and return 503 to non-admin callers when it's set. Operators flip it during migrations:

```python
await service.set("maintenance.mode", True)
# … run migrations, restart workers …
await service.set("maintenance.mode", False)
```

(The middleware wiring lands when the first operator-facing migration tool ships.)

## Testing

```python
@pytest.fixture
def service():
    registry = InstanceSettingsRegistry()
    registry.register(InstanceSettingDefinition(
        key="x.y", value_type=bool, default=True,
    ))
    return InstanceSettingsService(
        store=InMemoryInstanceSettingsStore(), registry=registry,
    )


@pytest.mark.asyncio
async def test_feature_honors_instance_setting(service):
    await service.set("x.y", False)
    result = await my_feature.do_thing(instance=service)
    assert result.something == "expected_when_off"
```

Always use an isolated `InstanceSettingsRegistry` per test so test registrations don't bleed.

## Baseline settings shipped today

| Key | Type | Default | Public | Description |
|---|---|---|---|---|
| `registration.open` | bool | `true` | ✓ | Allow new signups |
| `registration.invite_only` | bool | `false` | ✓ | Require invitation token for signup |
| `homepage.welcome_message` | str | `""` | ✓ | Custom landing-page message |
| `homepage.show_divinations_preview` | bool | `false` | ✓ | Show recent public divinations on the landing page |
| `federation.enabled` | bool | `false` | ✓ | Master federation toggle |
| `federation.accept_anonymous_inbound` | bool | `false` | ✗ | Accept unsigned inbound (off by design) |
| `agent.allowed` | bool | `false` | ✓ | Instance-wide AI agent gate |
| `plugins.third_party_install_allowed` | bool | `false` | ✗ | Allow non-official-registry plugins |
| `maintenance.mode` | bool | `false` | ✓ | Return 503 to non-admins |
| `maintenance.message` | str | `"Theourgia is undergoing maintenance."` | ✓ | Message shown during maintenance |

Features add to this set via their own `register()` functions.

## Anti-patterns

**Don't** add an env var for a setting that needs to change at runtime:

```python
# WRONG — requires restart, no audit trail
THEOURGIA_REGISTRATION_OPEN=false
```

**Do** use the substrate:

```python
# RIGHT — admin can toggle live; change is audited
await service.set("registration.open", False)
```

**Don't** add a per-user setting for something instance-wide:

```python
# WRONG — every user would need to set this independently
register_setting("auth.password_min_length", ..., default=12)
```

**Do** use the instance substrate for operator decisions:

```python
# RIGHT — one place, set once, applies to everyone
register_instance_setting("auth.password_min_length", ..., default=12)
```
