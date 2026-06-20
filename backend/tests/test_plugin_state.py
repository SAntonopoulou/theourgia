"""Tests for the plugin state machine."""

from __future__ import annotations

import pytest

from theourgia.core.plugins.state import PluginState, allowed_transition


def test_self_transitions_are_forbidden() -> None:
    for s in PluginState:
        assert not allowed_transition(s, s)


@pytest.mark.parametrize(
    ("a", "b"),
    [
        (PluginState.INSTALLED, PluginState.ACTIVE),
        (PluginState.INSTALLED, PluginState.ERROR),
        (PluginState.INSTALLED, PluginState.UNINSTALLING),
        (PluginState.ACTIVE, PluginState.INACTIVE),
        (PluginState.ACTIVE, PluginState.ERROR),
        (PluginState.ACTIVE, PluginState.UNINSTALLING),
        (PluginState.INACTIVE, PluginState.ACTIVE),
        (PluginState.INACTIVE, PluginState.ERROR),
        (PluginState.INACTIVE, PluginState.UNINSTALLING),
        (PluginState.ERROR, PluginState.ACTIVE),
        (PluginState.ERROR, PluginState.INACTIVE),
        (PluginState.ERROR, PluginState.UNINSTALLING),
    ],
)
def test_allowed_transitions(a: PluginState, b: PluginState) -> None:
    assert allowed_transition(a, b)


def test_uninstalling_is_terminal() -> None:
    """Once in UNINSTALLING, the only completion is row deletion — no transition out."""
    for target in PluginState:
        assert not allowed_transition(PluginState.UNINSTALLING, target)


def test_installed_cannot_jump_to_inactive() -> None:
    """A fresh install must be activated first; INSTALLED → INACTIVE skips the
    activation cycle and is therefore not allowed."""
    assert not allowed_transition(PluginState.INSTALLED, PluginState.INACTIVE)


def test_active_cannot_revert_to_installed() -> None:
    """ACTIVE → INSTALLED is not meaningful; deactivation goes to INACTIVE."""
    assert not allowed_transition(PluginState.ACTIVE, PluginState.INSTALLED)
