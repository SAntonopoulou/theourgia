"""Tests for the user-settings registry."""

from __future__ import annotations

import pytest

from theourgia.core.usersettings.registry import (
    SettingDefinition,
    SettingsRegistry,
    register_setting,
)


def test_definition_rejects_non_dotted_key() -> None:
    with pytest.raises(ValueError, match="dotted"):
        SettingDefinition(key="undotted", value_type=str, default="x")


def test_definition_rejects_empty_key() -> None:
    with pytest.raises(ValueError, match="dotted"):
        SettingDefinition(key="", value_type=str, default="x")


def test_definition_rejects_default_outside_allowed_values() -> None:
    with pytest.raises(ValueError, match="default"):
        SettingDefinition(
            key="ui.theme",
            value_type=str,
            default="purple",
            allowed_values=("light", "dark"),
        )


# ── validate() ───────────────────────────────────────────────────────


def test_validate_allowed_values() -> None:
    d = SettingDefinition(
        key="ui.theme",
        value_type=str,
        default="auto",
        allowed_values=("light", "dark", "auto"),
    )
    assert d.validate("dark") == "dark"
    with pytest.raises(ValueError, match="not in allowed_values"):
        d.validate("purple")


def test_validate_coerces_numeric_strings() -> None:
    d = SettingDefinition(
        key="editor.autosave_seconds", value_type=int, default=15
    )
    assert d.validate("30") == 30
    assert d.validate(30) == 30


def test_validate_bool_coercion() -> None:
    d = SettingDefinition(key="ui.compact", value_type=bool, default=False)
    assert d.validate("true") is True
    assert d.validate("YES") is True
    assert d.validate("1") is True
    assert d.validate("false") is False
    assert d.validate("no") is False
    assert d.validate("0") is False
    with pytest.raises(ValueError, match="bool"):
        d.validate("maybe")


def test_validate_min_value_enforced() -> None:
    d = SettingDefinition(
        key="a11y.font_scale",
        value_type=float,
        default=1.0,
        min_value=0.75,
        max_value=2.0,
    )
    with pytest.raises(ValueError, match="below minimum"):
        d.validate(0.5)


def test_validate_max_value_enforced() -> None:
    d = SettingDefinition(
        key="a11y.font_scale",
        value_type=float,
        default=1.0,
        min_value=0.75,
        max_value=2.0,
    )
    with pytest.raises(ValueError, match="above maximum"):
        d.validate(3.0)


def test_validate_within_bounds_passes() -> None:
    d = SettingDefinition(
        key="a11y.font_scale",
        value_type=float,
        default=1.0,
        min_value=0.75,
        max_value=2.0,
    )
    assert d.validate(1.5) == 1.5


# ── Registry ─────────────────────────────────────────────────────────


def test_register_and_get() -> None:
    r = SettingsRegistry()
    d = SettingDefinition(key="ui.theme", value_type=str, default="auto")
    r.register(d)
    assert r.get("ui.theme") is d
    assert r.has("ui.theme")


def test_register_duplicate_rejected() -> None:
    r = SettingsRegistry()
    r.register(SettingDefinition(key="ui.theme", value_type=str, default="auto"))
    with pytest.raises(ValueError, match="already registered"):
        r.register(
            SettingDefinition(key="ui.theme", value_type=str, default="auto")
        )


def test_register_overwrite_flag() -> None:
    r = SettingsRegistry()
    r.register(SettingDefinition(key="ui.theme", value_type=str, default="light"))
    r.register(
        SettingDefinition(key="ui.theme", value_type=str, default="dark"),
        overwrite=True,
    )
    assert r.get("ui.theme").default == "dark"


def test_register_setting_helper() -> None:
    r = SettingsRegistry()
    d = register_setting(
        "ui.theme",
        value_type=str,
        default="auto",
        description="theme",
        allowed_values=("light", "dark", "auto"),
        registry=r,
    )
    assert isinstance(d, SettingDefinition)
    assert r.has("ui.theme")


def test_alias_routes_old_key_to_new() -> None:
    r = SettingsRegistry()
    r.register(
        SettingDefinition(
            key="ui.theme",
            value_type=str,
            default="auto",
            replaces="ui.color_scheme",
        )
    )
    assert r.has("ui.color_scheme")
    assert r.get("ui.color_scheme").key == "ui.theme"
    assert r.alias_of("ui.color_scheme") == "ui.theme"


def test_by_namespace() -> None:
    r = SettingsRegistry()
    r.register(SettingDefinition(key="ui.theme", value_type=str, default="auto"))
    r.register(SettingDefinition(key="ui.density", value_type=str, default="comfortable"))
    r.register(SettingDefinition(key="a11y.reduce_motion", value_type=bool, default=False))
    ui = sorted(d.key for d in r.by_namespace("ui"))
    assert ui == ["ui.density", "ui.theme"]


def test_get_unknown_raises_keyerror() -> None:
    r = SettingsRegistry()
    with pytest.raises(KeyError):
        r.get("never.registered")
