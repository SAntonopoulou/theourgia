"""Tests for the PluginContext sandbox object."""

from __future__ import annotations

import pytest

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.context import CapabilityDeniedError, PluginContext
from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.registry import ExtensionRegistry


@pytest.fixture
def registry() -> ExtensionRegistry:
    return ExtensionRegistry()


@pytest.fixture
def ctx(registry: ExtensionRegistry) -> PluginContext:
    return PluginContext(
        plugin_name="my-plugin",
        plugin_version="1.0.0",
        granted_capabilities={
            Capability.READ_ENTRIES,
            Capability.UI_EDITOR_BLOCK,
        },
        registry=registry,
        plugin_settings={"theme": "antiquarian", "depth": 3},
    )


def test_identity_properties(ctx: PluginContext) -> None:
    assert ctx.plugin_name == "my-plugin"
    assert ctx.plugin_version == "1.0.0"


def test_capabilities_frozen_set(ctx: PluginContext) -> None:
    assert Capability.READ_ENTRIES in ctx.capabilities
    assert Capability.UI_EDITOR_BLOCK in ctx.capabilities
    assert Capability.WRITE_ENTRIES not in ctx.capabilities
    # Read-only — caller cannot mutate
    with pytest.raises(AttributeError):
        ctx.capabilities.add(Capability.WRITE_ENTRIES)  # type: ignore[attr-defined]


def test_has_capability(ctx: PluginContext) -> None:
    assert ctx.has_capability(Capability.READ_ENTRIES)
    assert not ctx.has_capability(Capability.WRITE_ENTRIES)


def test_require_capability_passes_when_granted(ctx: PluginContext) -> None:
    # Does not raise
    ctx.require_capability(Capability.READ_ENTRIES)


def test_require_capability_raises_when_not_granted(ctx: PluginContext) -> None:
    with pytest.raises(CapabilityDeniedError) as exc_info:
        ctx.require_capability(Capability.WRITE_ENTRIES)
    assert exc_info.value.plugin_name == "my-plugin"
    assert exc_info.value.capability == Capability.WRITE_ENTRIES


def test_logger_namespace(ctx: PluginContext) -> None:
    assert ctx.logger.name == "theourgia.plugin.my-plugin"


def test_get_setting_returns_value(ctx: PluginContext) -> None:
    assert ctx.get_setting("theme") == "antiquarian"
    assert ctx.get_setting("depth") == 3


def test_get_setting_default(ctx: PluginContext) -> None:
    assert ctx.get_setting("missing") is None
    assert ctx.get_setting("missing", default="fallback") == "fallback"


def test_register_extension_works(ctx: PluginContext, registry: ExtensionRegistry) -> None:
    def handler() -> str:
        return "ok"

    reg = ctx.register_extension(
        point=ExtensionPoint.CIPHER,
        name="custom-cipher",
        handler=handler,
    )
    assert reg.plugin_name == "my-plugin"
    assert reg.name == "custom-cipher"
    # And the registry agrees
    assert len(registry.implementations_for(ExtensionPoint.CIPHER)) == 1


def test_repr_does_not_leak_settings(ctx: PluginContext) -> None:
    text = repr(ctx)
    assert "my-plugin" in text
    # Settings are not in repr
    assert "antiquarian" not in text
    assert "PluginContext" in text


def test_capability_denied_error_message() -> None:
    err = CapabilityDeniedError("p", Capability.WRITE_ENTRIES)
    msg = str(err)
    assert "p" in msg
    assert "write.entries" in msg
