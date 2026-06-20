"""Tests for the in-process ExtensionRegistry."""

from __future__ import annotations

import pytest

from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.registry import (
    ExtensionRegistry,
    get_registry,
    reset_registry,
)


@pytest.fixture
def reg() -> ExtensionRegistry:
    return ExtensionRegistry()


def test_register_and_retrieve(reg: ExtensionRegistry) -> None:
    def handler() -> str:
        return "ok"

    reg.register(
        plugin_name="my-plugin",
        point=ExtensionPoint.DIVINATION_SYSTEM,
        name="custom-system",
        handler=handler,
        metadata={"display_name": "Custom System"},
    )

    impls = reg.implementations_for(ExtensionPoint.DIVINATION_SYSTEM)
    assert len(impls) == 1
    assert impls[0].plugin_name == "my-plugin"
    assert impls[0].name == "custom-system"
    assert impls[0].handler is handler
    assert impls[0].metadata == {"display_name": "Custom System"}


def test_register_same_plugin_same_name_same_point_raises(
    reg: ExtensionRegistry,
) -> None:
    reg.register(
        plugin_name="p",
        point=ExtensionPoint.CIPHER,
        name="x",
        handler=lambda: None,
    )
    with pytest.raises(ValueError, match="already registered"):
        reg.register(
            plugin_name="p",
            point=ExtensionPoint.CIPHER,
            name="x",
            handler=lambda: None,
        )


def test_same_name_different_plugins_allowed(reg: ExtensionRegistry) -> None:
    reg.register(
        plugin_name="plugin-a", point=ExtensionPoint.CIPHER, name="x", handler=lambda: None
    )
    reg.register(
        plugin_name="plugin-b", point=ExtensionPoint.CIPHER, name="x", handler=lambda: None
    )
    impls = reg.implementations_for(ExtensionPoint.CIPHER)
    assert len(impls) == 2


def test_same_name_different_points_allowed(reg: ExtensionRegistry) -> None:
    reg.register(
        plugin_name="p", point=ExtensionPoint.CIPHER, name="x", handler=lambda: None
    )
    reg.register(
        plugin_name="p", point=ExtensionPoint.SIGIL_MODE, name="x", handler=lambda: None
    )
    assert len(reg.implementations_for(ExtensionPoint.CIPHER)) == 1
    assert len(reg.implementations_for(ExtensionPoint.SIGIL_MODE)) == 1


def test_unregister_plugin_removes_all_its_registrations(reg: ExtensionRegistry) -> None:
    reg.register(
        plugin_name="p", point=ExtensionPoint.CIPHER, name="x", handler=lambda: None
    )
    reg.register(
        plugin_name="p", point=ExtensionPoint.SIGIL_MODE, name="y", handler=lambda: None
    )
    reg.register(
        plugin_name="other", point=ExtensionPoint.CIPHER, name="z", handler=lambda: None
    )

    removed = reg.unregister_plugin("p")
    assert removed == 2
    assert len(reg.implementations_for(ExtensionPoint.CIPHER)) == 1
    assert len(reg.implementations_for(ExtensionPoint.SIGIL_MODE)) == 0


def test_unregister_unknown_plugin_returns_zero(reg: ExtensionRegistry) -> None:
    assert reg.unregister_plugin("never-registered") == 0


def test_all_registrations_iterates_across_points(reg: ExtensionRegistry) -> None:
    reg.register(
        plugin_name="p", point=ExtensionPoint.CIPHER, name="a", handler=lambda: None
    )
    reg.register(
        plugin_name="p", point=ExtensionPoint.SIGIL_MODE, name="b", handler=lambda: None
    )
    reg.register(
        plugin_name="q", point=ExtensionPoint.CALENDAR, name="c", handler=lambda: None
    )
    assert len(reg.all_registrations()) == 3
    assert reg.plugin_count() == 2


def test_clear_empties_registry(reg: ExtensionRegistry) -> None:
    reg.register(
        plugin_name="p", point=ExtensionPoint.CIPHER, name="x", handler=lambda: None
    )
    reg.clear()
    assert reg.all_registrations() == ()
    assert reg.plugin_count() == 0


def test_get_registry_returns_singleton() -> None:
    a = get_registry()
    b = get_registry()
    assert a is b


def test_reset_registry_replaces_singleton() -> None:
    a = get_registry()
    reset_registry()
    b = get_registry()
    assert a is not b
