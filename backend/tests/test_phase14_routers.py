"""Phase 14 plugin + sandbox router smoke tests.

Schema-only — focused on the invariants:

  · Body schemas reject unknown fields (defence in depth).
  · Install accepts every Capability vocabulary string.
  · Configure body envelopes a primitive into ``{"value": ...}``
    (the JSONB column needs a dict).
  · The plugin state machine refuses self-transitions and out-of-band
    transitions.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from theourgia.api.routers.v1.plugins import (
    ConfigureBody,
    InstallBody,
    PluginInstallRead,
)
from theourgia.api.routers.v1.sandbox import (
    SandboxImportBody,
    SandboxRead,
)
from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.state import PluginState, allowed_transition


def test_install_body_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        InstallBody(  # type: ignore[call-arg]
            name="x",
            version="0.0.1",
            author="a",
            license="MIT",
            source="local",
            sneaky=True,
        )


def test_install_body_accepts_minimum_shape() -> None:
    body = InstallBody(
        name="example",
        version="1.0.0",
        author="did:theourgia:x.example:y",
        license="AGPL-3.0-only",
        source="local",
    )
    assert body.description == ""
    assert body.capabilities == []
    assert body.manifest == {}


def test_install_body_size_bounds() -> None:
    with pytest.raises(ValidationError):
        InstallBody(
            name="x" * 65,
            version="1.0.0",
            author="a",
            license="MIT",
            source="local",
        )


def test_every_capability_value_parses() -> None:
    """The install router calls Capability.from_string on each
    capability in the body — every advertised value must round-trip."""
    for cap in Capability:
        assert Capability.from_string(cap.value) is cap


def test_configure_body_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        ConfigureBody(  # type: ignore[call-arg]
            settings={"k": "v"},
            sneaky=True,
        )


def test_configure_body_settings_required() -> None:
    with pytest.raises(ValidationError):
        ConfigureBody()  # type: ignore[call-arg]


def test_plugin_install_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        PluginInstallRead(  # type: ignore[call-arg]
            id="x",
            name="x",
            version="1.0.0",
            author="a",
            license="MIT",
            description="",
            homepage=None,
            source="local",
            state="installed",
            last_error=None,
            activated_at=None,
            installed_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            capabilities=[],
            sneaky=True,
        )


def test_sandbox_import_body_kind_is_literal() -> None:
    with pytest.raises(ValidationError):
        SandboxImportBody(
            kind="random",  # type: ignore[arg-type]
            label="x",
            source="x",
        )


def test_sandbox_import_body_label_required() -> None:
    with pytest.raises(ValidationError):
        SandboxImportBody(
            kind="bundle",
            label="",
            source="x",
        )


def test_sandbox_read_extra_forbidden() -> None:
    with pytest.raises(ValidationError):
        SandboxRead(  # type: ignore[call-arg]
            id="x",
            kind="bundle",
            label="x",
            source="x",
            notes="",
            created_at="2026-06-27T00:00:00Z",  # type: ignore[arg-type]
            expires_at="2026-07-27T00:00:00Z",  # type: ignore[arg-type]
            sneaky=True,
        )


def test_plugin_state_no_self_transitions() -> None:
    for state in PluginState:
        assert allowed_transition(state, state) is False


def test_plugin_state_uninstall_is_terminal() -> None:
    for state in PluginState:
        if state is PluginState.UNINSTALLING:
            continue
        assert allowed_transition(PluginState.UNINSTALLING, state) is False


def test_plugin_state_installed_to_active_allowed() -> None:
    assert allowed_transition(PluginState.INSTALLED, PluginState.ACTIVE)
    assert allowed_transition(PluginState.ACTIVE, PluginState.INACTIVE)
    assert allowed_transition(PluginState.INACTIVE, PluginState.ACTIVE)
    assert allowed_transition(PluginState.ERROR, PluginState.ACTIVE)
