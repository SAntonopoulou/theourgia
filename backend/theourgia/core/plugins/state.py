"""Plugin lifecycle state machine.

A plugin moves through a small set of states:

- :data:`PluginState.INSTALLED` — manifest validated, package present,
  not yet activated. Default after install.
- :data:`PluginState.ACTIVE` — running; extension hooks are registered.
- :data:`PluginState.INACTIVE` — deactivated by the user but still
  installed; can be re-activated.
- :data:`PluginState.ERROR` — activation or shutdown failed; plugin is
  not running. Error reason is recorded for the admin UI.
- :data:`PluginState.UNINSTALLING` — transient state during removal;
  the row is deleted from the database once teardown completes.

Allowed transitions are documented by :func:`allowed_transition`; the
state machine is small enough to encode as a static lookup.
"""

from __future__ import annotations

import enum

__all__ = ["PluginState", "allowed_transition"]


class PluginState(str, enum.Enum):
    """The lifecycle states a plugin install can be in."""

    INSTALLED = "installed"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    UNINSTALLING = "uninstalling"


# Allowed transitions (closed set; anything else raises).
_TRANSITIONS: dict[tuple[PluginState, PluginState], bool] = {
    # Initial activation flow
    (PluginState.INSTALLED, PluginState.ACTIVE): True,
    (PluginState.INSTALLED, PluginState.ERROR): True,
    (PluginState.INSTALLED, PluginState.UNINSTALLING): True,
    # Active operations
    (PluginState.ACTIVE, PluginState.INACTIVE): True,
    (PluginState.ACTIVE, PluginState.ERROR): True,
    (PluginState.ACTIVE, PluginState.UNINSTALLING): True,
    # Reactivation from inactive
    (PluginState.INACTIVE, PluginState.ACTIVE): True,
    (PluginState.INACTIVE, PluginState.ERROR): True,
    (PluginState.INACTIVE, PluginState.UNINSTALLING): True,
    # Recovery from error
    (PluginState.ERROR, PluginState.ACTIVE): True,
    (PluginState.ERROR, PluginState.INACTIVE): True,
    (PluginState.ERROR, PluginState.UNINSTALLING): True,
    # UNINSTALLING is terminal — row gets deleted
}


def allowed_transition(current: PluginState, target: PluginState) -> bool:
    """Whether ``current → target`` is a permitted transition.

    Self-transitions are not allowed; the database row would not change.
    Transitions away from ``UNINSTALLING`` are not allowed; once
    uninstall starts, the only completion is row deletion.
    """
    if current == target:
        return False
    return _TRANSITIONS.get((current, target), False)
