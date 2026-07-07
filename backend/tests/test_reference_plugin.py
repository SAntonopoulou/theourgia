"""End-to-end test for the reference plugin `theourgia-plugin-example-cipher`.

Proves the plugin substrate works round-trip:

1. Discover + parse the plugin's ``plugin.toml`` from the repo's
   ``plugins/`` directory.
2. Activate it via :class:`PluginLoader`, which imports the backend
   entrypoint module + calls ``activate(ctx)``.
3. Assert the ``linguistic.cipher`` extension point picked up the
   registered ``example-unity`` handler.
4. Exercise the registered ``compute`` callable and confirm it returns
   the expected letter-count-equivalent value.

The test adds the plugin's ``src/`` directory to ``sys.path`` at setup
so the loader can import it without a full ``pip install -e``. This
mirrors the plan for the on-disk registry hosting: the loader knows
how to find in-repo reference plugins during development.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.loader import PluginLoader, discover_manifests
from theourgia.core.plugins.manifest import load_manifest
from theourgia.core.plugins.registry import ExtensionRegistry


# Repo root — this file lives at backend/tests/, so parent[2] = repo root.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_PLUGIN_DIR = _REPO_ROOT / "plugins" / "theourgia-plugin-example-cipher"
_PLUGIN_SRC = _PLUGIN_DIR / "src"


@pytest.fixture(autouse=True)
def _plugin_on_syspath():
    """Ensure the plugin's ``src/`` is importable, then clean up.

    Also purges the plugin module from ``sys.modules`` before and after
    so successive test runs get a fresh import.
    """
    src = str(_PLUGIN_SRC)
    added = False
    if src not in sys.path:
        sys.path.insert(0, src)
        added = True
    for name in list(sys.modules):
        if name.startswith("theourgia_plugin_example_cipher"):
            sys.modules.pop(name, None)
    try:
        yield
    finally:
        for name in list(sys.modules):
            if name.startswith("theourgia_plugin_example_cipher"):
                sys.modules.pop(name, None)
        if added:
            try:
                sys.path.remove(src)
            except ValueError:
                pass


def test_plugin_manifest_exists_on_disk() -> None:
    """Sanity check: the manifest file is where the plugin's README says."""
    assert (_PLUGIN_DIR / "plugin.toml").exists()
    assert (_PLUGIN_DIR / "LICENSE").exists()
    assert (_PLUGIN_SRC / "theourgia_plugin_example_cipher" / "plugin.py").exists()


def test_discover_finds_reference_plugin() -> None:
    """The loader's discovery walk includes the example plugin."""
    manifests = discover_manifests(_REPO_ROOT / "plugins")
    names = {m.parent.name for m in manifests}
    assert "theourgia-plugin-example-cipher" in names


def test_manifest_parses_against_strict_schema() -> None:
    """The manifest satisfies the (extra='forbid') Pydantic schema."""
    manifest = load_manifest(_PLUGIN_DIR / "plugin.toml")
    assert manifest.name == "theourgia-plugin-example-cipher"
    assert manifest.version == "0.1.0"
    assert manifest.license == "AGPL-3.0-only"
    assert manifest.capabilities == []
    assert manifest.extension_points == [ExtensionPoint.CIPHER]
    assert (
        manifest.entrypoint.backend
        == "theourgia_plugin_example_cipher.plugin:activate"
    )


def test_loader_activates_reference_plugin_and_registers_cipher() -> None:
    """The end-to-end round trip: load manifest → activate → registry has it."""
    manifest = load_manifest(_PLUGIN_DIR / "plugin.toml")
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)

    # The manifest declares zero capabilities, so we grant an empty set.
    loaded = loader.activate(manifest, granted_capabilities=set())

    assert loaded.manifest.name == "theourgia-plugin-example-cipher"
    assert loaded.context.capabilities == frozenset()

    impls = registry.implementations_for(ExtensionPoint.CIPHER)
    assert len(impls) == 1
    (reg,) = impls
    assert reg.plugin_name == "theourgia-plugin-example-cipher"
    assert reg.name == "example-unity"
    assert reg.metadata["display_name"] == "Example Unity Cipher"
    assert reg.metadata["language"] == "english"


def test_registered_cipher_computes_expected_values() -> None:
    """The registered handler's compute() returns the unity-cipher sum."""
    manifest = load_manifest(_PLUGIN_DIR / "plugin.toml")
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)
    loader.activate(manifest, granted_capabilities=set())

    (reg,) = registry.implementations_for(ExtensionPoint.CIPHER)
    handler = reg.handler
    compute = handler["compute"]

    # Every letter in a-z contributes 1; non-letters contribute 0;
    # case is folded before lookup.
    assert compute("") == 0
    assert compute("a") == 1
    assert compute("cat") == 3
    assert compute("CAT") == 3
    assert compute("theourgia") == 9
    # Spaces + punctuation contribute nothing.
    assert compute("hello, world!") == 10

    # Mapping is exposed for host code that wants the raw table.
    mapping = handler["mapping"]
    assert set(mapping.keys()) == {chr(ord("a") + i) for i in range(26)}
    assert set(mapping.values()) == {1}


def test_deactivate_reference_plugin_unregisters_cipher() -> None:
    """Deactivating drops the registration cleanly."""
    manifest = load_manifest(_PLUGIN_DIR / "plugin.toml")
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)

    loader.activate(manifest, granted_capabilities=set())
    assert len(registry.implementations_for(ExtensionPoint.CIPHER)) == 1

    loader.deactivate("theourgia-plugin-example-cipher")
    assert registry.implementations_for(ExtensionPoint.CIPHER) == ()
    assert "theourgia-plugin-example-cipher" not in loader.loaded


def test_reference_plugin_requests_no_capabilities() -> None:
    """The reference plugin is a pure data contribution — no perms needed.

    This is a canary: if someone ever slips a capability into the
    manifest, the test will loudly signal that the reference is no
    longer the smallest-possible example.
    """
    manifest = load_manifest(_PLUGIN_DIR / "plugin.toml")
    assert manifest.capabilities == []
    # Also verify that a fully-empty grant is accepted at activation time.
    loader = PluginLoader(registry=ExtensionRegistry())
    loaded = loader.activate(manifest, granted_capabilities=set())
    assert loaded.context.capabilities == frozenset()
    assert Capability.READ_ENTRIES not in loaded.context.capabilities
