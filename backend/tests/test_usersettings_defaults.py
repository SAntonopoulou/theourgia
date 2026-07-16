"""Tests for the baseline default settings registration."""

from __future__ import annotations

import pytest

from theourgia.core.usersettings.defaults import register_default_settings
from theourgia.core.usersettings.registry import SettingsRegistry


@pytest.fixture
def registry() -> SettingsRegistry:
    r = SettingsRegistry()
    register_default_settings(r)
    return r


def test_ui_theme_registered(registry: SettingsRegistry) -> None:
    d = registry.get("ui.theme")
    assert d.default == "auto"
    assert d.allowed_values == ("light", "dark", "auto")


def test_ui_density_registered(registry: SettingsRegistry) -> None:
    d = registry.get("ui.density")
    assert d.default == "comfortable"
    assert "compact" in d.allowed_values
    assert "spacious" in d.allowed_values


def test_a11y_reduce_motion_registered(registry: SettingsRegistry) -> None:
    d = registry.get("a11y.reduce_motion")
    assert d.value_type is bool
    assert d.default is False


def test_a11y_font_scale_has_sensible_bounds(
    registry: SettingsRegistry,
) -> None:
    d = registry.get("a11y.font_size_scale")
    assert d.min_value == 0.75
    assert d.max_value == 2.0


def test_i18n_timezone_registered(registry: SettingsRegistry) -> None:
    d = registry.get("i18n.timezone")
    assert d.default == "UTC"


def test_editor_autosave_seconds_bounded(registry: SettingsRegistry) -> None:
    d = registry.get("editor.autosave_seconds")
    assert d.min_value == 5
    assert d.max_value == 300


def test_federation_publish_default_is_personal(
    registry: SettingsRegistry,
) -> None:
    """The default visibility on new entries must be conservative."""
    d = registry.get("federation.publish_default")
    assert d.default == "personal"
    assert "public" in d.allowed_values


def test_agent_enabled_default_is_false(registry: SettingsRegistry) -> None:
    """The AI agent is off by default — Theourgia ships zero-telemetry."""
    d = registry.get("agent.enabled")
    assert d.value_type is bool
    assert d.default is False


def test_namespaces_grouped(registry: SettingsRegistry) -> None:
    """All baseline keys fall into one of the documented namespaces."""
    expected_namespaces = {
        "ui", "a11y", "i18n", "editor", "notifications",
        "federation", "agent", "audio", "calendars",
    }
    actual = {d.key.split(".", 1)[0] for d in registry.all()}
    assert actual.issubset(expected_namespaces), (
        f"baseline introduced new namespace not in expected set: "
        f"{actual - expected_namespaces}"
    )
