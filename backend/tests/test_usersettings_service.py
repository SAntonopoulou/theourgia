"""Tests for the UserSettingsService."""

from __future__ import annotations

from uuid import uuid4

import pytest

from theourgia.core.usersettings.registry import (
    SettingDefinition,
    SettingsRegistry,
)
from theourgia.core.usersettings.service import (
    InMemoryUserSettingsStore,
    UserSettingsService,
)


@pytest.fixture
def registry() -> SettingsRegistry:
    r = SettingsRegistry()
    r.register(
        SettingDefinition(
            key="ui.theme",
            value_type=str,
            default="auto",
            allowed_values=("light", "dark", "auto"),
        )
    )
    r.register(
        SettingDefinition(
            key="ui.density",
            value_type=str,
            default="comfortable",
            allowed_values=("comfortable", "compact", "spacious"),
        )
    )
    r.register(
        SettingDefinition(
            key="a11y.font_scale",
            value_type=float,
            default=1.0,
            min_value=0.75,
            max_value=2.0,
        )
    )
    r.register(
        SettingDefinition(
            key="editor.autosave_seconds",
            value_type=int,
            default=15,
            min_value=5,
            max_value=300,
        )
    )
    return r


@pytest.fixture
def service(registry: SettingsRegistry) -> UserSettingsService:
    return UserSettingsService(
        store=InMemoryUserSettingsStore(), registry=registry
    )


# ── get_typed ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_returns_registry_default_for_unset_user(
    service: UserSettingsService,
) -> None:
    value = await service.get_typed(user_id=uuid4(), key="ui.theme")
    assert value == "auto"


@pytest.mark.asyncio
async def test_get_returns_stored_value(service: UserSettingsService) -> None:
    uid = uuid4()
    await service.set(user_id=uid, key="ui.theme", value="dark")
    value = await service.get_typed(user_id=uid, key="ui.theme")
    assert value == "dark"


@pytest.mark.asyncio
async def test_get_uses_explicit_default_over_registry_default(
    service: UserSettingsService,
) -> None:
    value = await service.get_typed(
        user_id=uuid4(), key="ui.theme", default="custom_override"
    )
    assert value == "custom_override"


@pytest.mark.asyncio
async def test_get_unknown_key_raises_keyerror(
    service: UserSettingsService,
) -> None:
    with pytest.raises(KeyError):
        await service.get_typed(user_id=uuid4(), key="never.registered")


@pytest.mark.asyncio
async def test_get_invalid_stored_value_falls_back_to_default(
    service: UserSettingsService,
) -> None:
    """If somehow a stored value can't be validated (corrupt, post-
    migration mismatch), the service returns the registry default
    rather than raising — readers don't crash on a single bad row."""
    uid = uuid4()
    # Bypass the service's validation by writing directly to the store
    await service._store.set(uid, "ui.theme", "bogus_unsupported_value")  # type: ignore[attr-defined]
    value = await service.get_typed(user_id=uid, key="ui.theme")
    assert value == "auto"


# ── set ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_set_validates_against_allowed_values(
    service: UserSettingsService,
) -> None:
    with pytest.raises(ValueError, match="not in allowed_values"):
        await service.set(user_id=uuid4(), key="ui.theme", value="purple")


@pytest.mark.asyncio
async def test_set_coerces_numeric_string(
    service: UserSettingsService,
) -> None:
    uid = uuid4()
    normalized = await service.set(
        user_id=uid, key="editor.autosave_seconds", value="60"
    )
    assert normalized == 60
    stored = await service.get_typed(
        user_id=uid, key="editor.autosave_seconds"
    )
    assert stored == 60


@pytest.mark.asyncio
async def test_set_enforces_min_value(service: UserSettingsService) -> None:
    with pytest.raises(ValueError, match="below minimum"):
        await service.set(user_id=uuid4(), key="a11y.font_scale", value=0.1)


@pytest.mark.asyncio
async def test_set_enforces_max_value(service: UserSettingsService) -> None:
    with pytest.raises(ValueError, match="above maximum"):
        await service.set(user_id=uuid4(), key="a11y.font_scale", value=99.0)


@pytest.mark.asyncio
async def test_set_unknown_key_raises_keyerror(
    service: UserSettingsService,
) -> None:
    with pytest.raises(KeyError):
        await service.set(
            user_id=uuid4(), key="never.registered", value="x"
        )


@pytest.mark.asyncio
async def test_users_are_independent(service: UserSettingsService) -> None:
    alice = uuid4()
    bob = uuid4()
    await service.set(user_id=alice, key="ui.theme", value="dark")
    await service.set(user_id=bob, key="ui.theme", value="light")
    assert await service.get_typed(user_id=alice, key="ui.theme") == "dark"
    assert await service.get_typed(user_id=bob, key="ui.theme") == "light"


# ── delete ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_restores_default(service: UserSettingsService) -> None:
    uid = uuid4()
    await service.set(user_id=uid, key="ui.theme", value="dark")
    await service.delete(user_id=uid, key="ui.theme")
    assert await service.get_typed(user_id=uid, key="ui.theme") == "auto"


@pytest.mark.asyncio
async def test_delete_missing_is_noop(service: UserSettingsService) -> None:
    await service.delete(user_id=uuid4(), key="ui.theme")  # should not raise


# ── alias / replaces ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_alias_old_key_value_returned_for_new_key() -> None:
    """User set the OLD key; reading the NEW key returns that value."""
    r = SettingsRegistry()
    r.register(
        SettingDefinition(
            key="ui.theme",
            value_type=str,
            default="auto",
            allowed_values=("light", "dark", "auto"),
            replaces="ui.color_scheme",
        )
    )
    service = UserSettingsService(
        store=InMemoryUserSettingsStore(), registry=r
    )
    uid = uuid4()
    # User set the old key
    await service._store.set(uid, "ui.color_scheme", "dark")  # type: ignore[attr-defined]
    # New-key read returns the old value
    assert await service.get_typed(user_id=uid, key="ui.theme") == "dark"


# ── bulk_set ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_bulk_set_applies_valid_skips_invalid(
    service: UserSettingsService,
) -> None:
    uid = uuid4()
    applied = await service.bulk_set(
        user_id=uid,
        values={
            "ui.theme": "dark",  # valid
            "ui.density": "ultra-mega",  # invalid (not in allowed_values)
            "a11y.font_scale": 1.5,  # valid
            "never.registered": "x",  # unknown key
        },
    )
    assert "ui.theme" in applied
    assert applied["ui.theme"] == "dark"
    assert "a11y.font_scale" in applied
    assert "ui.density" not in applied
    assert "never.registered" not in applied
    # The valid ones actually persisted
    assert await service.get_typed(user_id=uid, key="ui.theme") == "dark"
    assert await service.get_typed(user_id=uid, key="a11y.font_scale") == 1.5


# ── all_for_user / effective_for_user ────────────────────────────────


@pytest.mark.asyncio
async def test_all_for_user_returns_only_explicit(
    service: UserSettingsService,
) -> None:
    uid = uuid4()
    await service.set(user_id=uid, key="ui.theme", value="dark")
    rows = await service.all_for_user(uid)
    assert "ui.theme" in rows
    assert "ui.density" not in rows  # never set


@pytest.mark.asyncio
async def test_effective_for_user_returns_full_registry(
    service: UserSettingsService,
) -> None:
    """effective_for_user merges explicit values with defaults — gives
    the frontend the user's complete state in one round trip."""
    uid = uuid4()
    await service.set(user_id=uid, key="ui.theme", value="dark")
    effective = await service.effective_for_user(uid)
    assert effective["ui.theme"] == "dark"  # explicit
    assert effective["ui.density"] == "comfortable"  # default
    assert effective["a11y.font_scale"] == 1.0  # default


# ── catalog ──────────────────────────────────────────────────────────


def test_catalog_lists_every_registered_setting(
    service: UserSettingsService,
) -> None:
    cat = service.catalog()
    keys = {entry["key"] for entry in cat}
    assert "ui.theme" in keys
    assert "ui.density" in keys
    assert "a11y.font_scale" in keys
    # Catalog entries carry the metadata the settings UI needs
    theme_entry = next(e for e in cat if e["key"] == "ui.theme")
    assert theme_entry["value_type"] == "str"
    assert theme_entry["default"] == "auto"
    assert "light" in theme_entry["allowed_values"]


def test_catalog_skips_deprecated() -> None:
    r = SettingsRegistry()
    r.register(SettingDefinition(key="ui.theme", value_type=str, default="auto"))
    r.register(
        SettingDefinition(
            key="ui.old_thing",
            value_type=str,
            default="x",
            deprecated=True,
        )
    )
    service = UserSettingsService(
        store=InMemoryUserSettingsStore(), registry=r
    )
    keys = {e["key"] for e in service.catalog()}
    assert "ui.theme" in keys
    assert "ui.old_thing" not in keys
