"""Tests for the PluginLoader.

Uses fake plugin modules registered directly in ``sys.modules`` so the
loader has something to import without touching the filesystem or PyPI.
"""

from __future__ import annotations

import sys
import textwrap
import types
from pathlib import Path

import pytest

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.context import PluginContext
from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.loader import PluginLoader, discover_manifests
from theourgia.core.plugins.manifest import parse_manifest_text
from theourgia.core.plugins.registry import ExtensionRegistry


_MANIFEST = textwrap.dedent(
    """
    [plugin]
    name = "test-plugin"
    version = "0.1.0"
    author = "Test"
    license = "AGPL-3.0-only"
    description = "test plugin"
    theourgia-version = ">=0.1.0"
    capabilities = ["ui.editor.add_block"]
    extension_points = ["workshop.sigil_mode"]

    [plugin.entrypoint]
    backend = "_theourgia_test_plugin_pkg:setup"
    """
)


@pytest.fixture(autouse=True)
def _cleanup_modules():
    """Remove any fake plugin modules between tests."""
    yield
    for name in list(sys.modules):
        if name.startswith("_theourgia_test_plugin"):
            sys.modules.pop(name, None)


def _install_fake_module(*, module_name: str, setup_fn) -> None:
    """Create a synthetic module with a ``setup`` attribute and register it."""
    mod = types.ModuleType(module_name)
    mod.setup = setup_fn  # type: ignore[attr-defined]
    sys.modules[module_name] = mod


def test_discover_manifests_in_empty_dir(tmp_path: Path) -> None:
    assert discover_manifests(tmp_path) == []


def test_discover_manifests_finds_nested(tmp_path: Path) -> None:
    (tmp_path / "plugin-a").mkdir()
    (tmp_path / "plugin-a" / "plugin.toml").write_text("[plugin]\n")
    (tmp_path / "plugin-b" / "sub").mkdir(parents=True)
    (tmp_path / "plugin-b" / "sub" / "plugin.toml").write_text("[plugin]\n")

    found = discover_manifests(tmp_path)
    assert len(found) == 2
    # Sorted for determinism
    assert found == sorted(found)


def test_discover_manifests_missing_root(tmp_path: Path) -> None:
    nonexistent = tmp_path / "does-not-exist"
    assert discover_manifests(nonexistent) == []


def test_activate_runs_setup_and_registers() -> None:
    manifest = parse_manifest_text(_MANIFEST)
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)

    captured: dict[str, object] = {}

    def setup(ctx: PluginContext) -> None:
        captured["ctx"] = ctx
        captured["caps"] = ctx.capabilities
        ctx.register_extension(
            point=ExtensionPoint.SIGIL_MODE,
            name="test-sigil-mode",
            handler=lambda *_a, **_kw: "x",
        )

    _install_fake_module(module_name="_theourgia_test_plugin_pkg", setup_fn=setup)

    loaded = loader.activate(
        manifest, granted_capabilities={Capability.UI_EDITOR_BLOCK}
    )
    assert loaded.manifest.name == "test-plugin"
    assert captured["caps"] == frozenset({Capability.UI_EDITOR_BLOCK})

    impls = registry.implementations_for(ExtensionPoint.SIGIL_MODE)
    assert len(impls) == 1
    assert impls[0].name == "test-sigil-mode"


def test_activate_filters_granted_to_requested() -> None:
    """Granting capabilities not in the manifest doesn't widen the effective set."""
    manifest = parse_manifest_text(_MANIFEST)
    loader = PluginLoader(registry=ExtensionRegistry())

    def setup(ctx: PluginContext) -> None:
        # The plugin only declared ui.editor.add_block; even though we
        # tried to grant write.entries, the context should not have it.
        assert Capability.WRITE_ENTRIES not in ctx.capabilities
        assert Capability.UI_EDITOR_BLOCK in ctx.capabilities

    _install_fake_module(module_name="_theourgia_test_plugin_pkg", setup_fn=setup)

    loader.activate(
        manifest,
        granted_capabilities={Capability.UI_EDITOR_BLOCK, Capability.WRITE_ENTRIES},
    )


def test_activate_twice_raises() -> None:
    manifest = parse_manifest_text(_MANIFEST)
    loader = PluginLoader(registry=ExtensionRegistry())

    def setup(_ctx: PluginContext) -> None:
        pass

    _install_fake_module(module_name="_theourgia_test_plugin_pkg", setup_fn=setup)

    loader.activate(manifest, granted_capabilities={Capability.UI_EDITOR_BLOCK})
    with pytest.raises(ValueError, match="already loaded"):
        loader.activate(manifest, granted_capabilities={Capability.UI_EDITOR_BLOCK})


def test_activate_missing_module_raises() -> None:
    manifest = parse_manifest_text(_MANIFEST)
    loader = PluginLoader(registry=ExtensionRegistry())

    # Do NOT install the fake module — import should fail
    with pytest.raises(RuntimeError, match="failed to import"):
        loader.activate(manifest, granted_capabilities=set())


def test_activate_missing_callable_raises() -> None:
    manifest = parse_manifest_text(_MANIFEST)
    loader = PluginLoader(registry=ExtensionRegistry())

    # Install module without 'setup' attribute
    mod = types.ModuleType("_theourgia_test_plugin_pkg")
    sys.modules["_theourgia_test_plugin_pkg"] = mod

    with pytest.raises(RuntimeError, match="no callable"):
        loader.activate(manifest, granted_capabilities=set())


def test_activate_setup_raises_unregisters_partial_extensions() -> None:
    """If setup partially registers extensions then raises, the partial
    registrations are rolled back."""
    manifest = parse_manifest_text(_MANIFEST)
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)

    def setup(ctx: PluginContext) -> None:
        ctx.register_extension(
            point=ExtensionPoint.SIGIL_MODE,
            name="partial",
            handler=lambda: None,
        )
        raise RuntimeError("kaboom")

    _install_fake_module(module_name="_theourgia_test_plugin_pkg", setup_fn=setup)

    with pytest.raises(RuntimeError, match="kaboom"):
        loader.activate(manifest, granted_capabilities=set())

    # No registrations remain
    assert registry.implementations_for(ExtensionPoint.SIGIL_MODE) == ()


def test_deactivate_calls_teardown_and_unregisters() -> None:
    manifest = parse_manifest_text(_MANIFEST)
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)

    teardown_calls = []

    def teardown() -> None:
        teardown_calls.append(True)

    def setup(ctx: PluginContext):  # noqa: ANN202
        ctx.register_extension(
            point=ExtensionPoint.SIGIL_MODE,
            name="t",
            handler=lambda: None,
        )
        return teardown

    _install_fake_module(module_name="_theourgia_test_plugin_pkg", setup_fn=setup)

    loader.activate(manifest, granted_capabilities=set())
    loader.deactivate("test-plugin")
    assert teardown_calls == [True]
    assert registry.implementations_for(ExtensionPoint.SIGIL_MODE) == ()


def test_deactivate_unknown_plugin_raises() -> None:
    loader = PluginLoader(registry=ExtensionRegistry())
    with pytest.raises(KeyError, match="not loaded"):
        loader.deactivate("never-loaded")


def test_deactivate_teardown_exception_does_not_block_removal() -> None:
    manifest = parse_manifest_text(_MANIFEST)
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)

    def bad_teardown() -> None:
        raise RuntimeError("teardown explosion")

    def setup(ctx: PluginContext):  # noqa: ANN202
        ctx.register_extension(
            point=ExtensionPoint.SIGIL_MODE,
            name="t",
            handler=lambda: None,
        )
        return bad_teardown

    _install_fake_module(module_name="_theourgia_test_plugin_pkg", setup_fn=setup)

    loader.activate(manifest, granted_capabilities=set())
    # Must not propagate the teardown error
    loader.deactivate("test-plugin")
    assert "test-plugin" not in loader.loaded
    assert registry.implementations_for(ExtensionPoint.SIGIL_MODE) == ()
