"""Tests for the instance-settings substrate."""

from __future__ import annotations

import pytest

from theourgia.core.instancesettings.defaults import (
    register_default_instance_settings,
)
from theourgia.core.instancesettings.registry import (
    InstanceSettingDefinition,
    InstanceSettingsRegistry,
)
from theourgia.core.instancesettings.service import (
    InMemoryInstanceSettingsStore,
    InstanceSettingsService,
)


# ── Definition validation ────────────────────────────────────────────


def test_definition_rejects_non_dotted_key() -> None:
    with pytest.raises(ValueError, match="dotted"):
        InstanceSettingDefinition(
            key="undotted", value_type=str, default="x"
        )


def test_definition_rejects_default_outside_allowed_values() -> None:
    with pytest.raises(ValueError, match="default"):
        InstanceSettingDefinition(
            key="ui.theme",
            value_type=str,
            default="purple",
            allowed_values=("light", "dark"),
        )


def test_validate_allowed_values() -> None:
    d = InstanceSettingDefinition(
        key="ui.theme",
        value_type=str,
        default="auto",
        allowed_values=("light", "dark", "auto"),
    )
    assert d.validate("dark") == "dark"
    with pytest.raises(ValueError):
        d.validate("invalid")


def test_validate_coerces_bool_string() -> None:
    d = InstanceSettingDefinition(
        key="registration.open", value_type=bool, default=True
    )
    assert d.validate("true") is True
    assert d.validate("false") is False


def test_validate_enforces_bounds() -> None:
    d = InstanceSettingDefinition(
        key="some.timeout", value_type=int, default=30, min_value=5, max_value=300
    )
    with pytest.raises(ValueError, match="below minimum"):
        d.validate(1)
    with pytest.raises(ValueError, match="above maximum"):
        d.validate(1000)
    assert d.validate(60) == 60


# ── Registry ─────────────────────────────────────────────────────────


def test_registry_register_and_get() -> None:
    r = InstanceSettingsRegistry()
    r.register(
        InstanceSettingDefinition(
            key="registration.open", value_type=bool, default=True
        )
    )
    assert r.has("registration.open")
    assert r.get("registration.open").default is True


def test_registry_duplicate_rejected() -> None:
    r = InstanceSettingsRegistry()
    r.register(
        InstanceSettingDefinition(
            key="x.y", value_type=bool, default=True
        )
    )
    with pytest.raises(ValueError, match="already registered"):
        r.register(
            InstanceSettingDefinition(
                key="x.y", value_type=bool, default=False
            )
        )


def test_registry_public_subset() -> None:
    r = InstanceSettingsRegistry()
    r.register(
        InstanceSettingDefinition(
            key="registration.open",
            value_type=bool,
            default=True,
            public=True,
        )
    )
    r.register(
        InstanceSettingDefinition(
            key="admin.secret_thing", value_type=str, default="x"
        )
    )
    public_keys = [d.key for d in r.public()]
    assert "registration.open" in public_keys
    assert "admin.secret_thing" not in public_keys


def test_registry_alias_routes_old_key() -> None:
    r = InstanceSettingsRegistry()
    r.register(
        InstanceSettingDefinition(
            key="ui.welcome_message",
            value_type=str,
            default="",
            replaces="homepage.intro",
        )
    )
    assert r.has("homepage.intro")
    assert r.get("homepage.intro").key == "ui.welcome_message"


# ── Service get / set ───────────────────────────────────────────────


@pytest.fixture
def registry() -> InstanceSettingsRegistry:
    r = InstanceSettingsRegistry()
    r.register(
        InstanceSettingDefinition(
            key="registration.open",
            value_type=bool,
            default=True,
            public=True,
        )
    )
    r.register(
        InstanceSettingDefinition(
            key="admin.maintenance_message",
            value_type=str,
            default="Under maintenance.",
        )
    )
    return r


@pytest.fixture
def service(registry: InstanceSettingsRegistry) -> InstanceSettingsService:
    return InstanceSettingsService(
        store=InMemoryInstanceSettingsStore(), registry=registry
    )


@pytest.mark.asyncio
async def test_get_returns_default_when_unset(
    service: InstanceSettingsService,
) -> None:
    value = await service.get_typed("registration.open")
    assert value is True


@pytest.mark.asyncio
async def test_get_returns_stored_value(
    service: InstanceSettingsService,
) -> None:
    await service.set("registration.open", False)
    assert await service.get_typed("registration.open") is False


@pytest.mark.asyncio
async def test_set_validates(service: InstanceSettingsService) -> None:
    """Coerces bool-shaped string to bool."""
    normalized = await service.set("registration.open", "false")
    assert normalized is False


@pytest.mark.asyncio
async def test_set_unknown_key_raises(
    service: InstanceSettingsService,
) -> None:
    with pytest.raises(KeyError):
        await service.set("never.registered", True)


@pytest.mark.asyncio
async def test_get_unknown_key_raises(
    service: InstanceSettingsService,
) -> None:
    with pytest.raises(KeyError):
        await service.get_typed("never.registered")


# ── Public read enforcement ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_public_typed_returns_public_value(
    service: InstanceSettingsService,
) -> None:
    """An anonymous caller can read a public setting."""
    value = await service.get_public_typed("registration.open")
    assert value is True


@pytest.mark.asyncio
async def test_get_public_typed_refuses_non_public(
    service: InstanceSettingsService,
) -> None:
    """A non-public setting raises PermissionError when read via the
    public path — even if the underlying store has a value."""
    await service.set("admin.maintenance_message", "Custom message")
    # The English source surfaces through the i18n substrate; the
    # match below pins the source-language phrasing so a future
    # rewording is a deliberate decision rather than a silent regression.
    with pytest.raises(PermissionError, match="not available to non-admin"):
        await service.get_public_typed("admin.maintenance_message")


# ── all_explicit / effective ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_all_explicit_returns_only_set_values(
    service: InstanceSettingsService,
) -> None:
    await service.set("registration.open", False)
    explicit = await service.all_explicit()
    assert "registration.open" in explicit
    assert "admin.maintenance_message" not in explicit  # never set


@pytest.mark.asyncio
async def test_effective_merges_explicit_with_defaults(
    service: InstanceSettingsService,
) -> None:
    await service.set("registration.open", False)
    effective = await service.effective()
    assert effective["registration.open"] is False  # explicit
    assert effective["admin.maintenance_message"] == "Under maintenance."  # default


@pytest.mark.asyncio
async def test_effective_public_only_returns_public(
    service: InstanceSettingsService,
) -> None:
    await service.set("admin.maintenance_message", "x")
    pub = await service.effective_public()
    assert "registration.open" in pub
    assert "admin.maintenance_message" not in pub


# ── delete ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_restores_default(
    service: InstanceSettingsService,
) -> None:
    await service.set("registration.open", False)
    await service.delete("registration.open")
    assert await service.get_typed("registration.open") is True


@pytest.mark.asyncio
async def test_delete_missing_is_noop(
    service: InstanceSettingsService,
) -> None:
    await service.delete("never.set")  # must not raise


# ── catalog ──────────────────────────────────────────────────────────


def test_catalog_lists_registered_with_metadata(
    service: InstanceSettingsService,
) -> None:
    cat = service.catalog()
    keys = {entry["key"] for entry in cat}
    assert "registration.open" in keys
    reg_open = next(e for e in cat if e["key"] == "registration.open")
    assert reg_open["public"] is True
    assert reg_open["value_type"] == "bool"


# ── Defaults baseline ───────────────────────────────────────────────


def test_register_default_instance_settings_idempotent() -> None:
    r = InstanceSettingsRegistry()
    register_default_instance_settings(r)
    count_first = len(r.all())
    register_default_instance_settings(r)  # again
    count_second = len(r.all())
    assert count_first == count_second


def test_baseline_includes_registration_toggle() -> None:
    r = InstanceSettingsRegistry()
    register_default_instance_settings(r)
    assert r.has("registration.open")
    assert r.get("registration.open").public is True


def test_baseline_maintenance_mode_registered() -> None:
    r = InstanceSettingsRegistry()
    register_default_instance_settings(r)
    assert r.has("maintenance.mode")
    assert r.get("maintenance.mode").public is True


def test_baseline_agent_off_by_default() -> None:
    """The instance-wide agent toggle starts off — operators opt in."""
    r = InstanceSettingsRegistry()
    register_default_instance_settings(r)
    assert r.get("agent.allowed").default is False


def test_baseline_federation_off_by_default() -> None:
    """Federation starts off — operators opt in once they understand
    the implications."""
    r = InstanceSettingsRegistry()
    register_default_instance_settings(r)
    assert r.get("federation.enabled").default is False
