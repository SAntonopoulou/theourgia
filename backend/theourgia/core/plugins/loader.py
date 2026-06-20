"""Plugin loader — discover, validate, activate.

The loader is the bridge between manifest files on disk and registered
extensions in memory. Its responsibilities:

1. **Discover** plugin packages in a directory (each one is a directory
   containing a ``plugin.toml`` manifest).
2. **Validate** that each manifest parses and the declared extension
   points + capabilities are recognized.
3. **Activate** validated plugins by importing the manifest's
   ``backend`` entrypoint and calling it with a sandboxed
   :class:`PluginContext`.
4. **Deactivate** running plugins by clearing their registry entries
   and (optionally) calling a teardown callable.

Database persistence of plugin state (``plugin_install``,
``plugin_capability_grant``) is handled by the admin layer, not here;
this module is the pure "in-memory lifecycle" piece.

Phase 14 (Plugin Ecosystem) will add: signed-release verification at
load time, capability re-prompt UI when manifests change, sandbox
process isolation for high-risk capabilities. The contract here is
stable enough that those additions slot in without breaking plugins.
"""

from __future__ import annotations

import importlib
import logging
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.context import PluginContext
from theourgia.core.plugins.manifest import PluginManifest, load_manifest
from theourgia.core.plugins.registry import ExtensionRegistry, get_registry

__all__ = ["LoadedPlugin", "PluginLoader", "discover_manifests"]

_log = logging.getLogger(__name__)


@dataclass(slots=True)
class LoadedPlugin:
    """An in-memory record of a successfully activated plugin."""

    manifest: PluginManifest
    context: PluginContext
    teardown: Callable[[], None] | None = None
    """Optional teardown function the plugin's setup returned. Called at
    deactivation. May raise; the loader catches and logs but proceeds."""


def discover_manifests(root: Path) -> list[Path]:
    """Find all ``plugin.toml`` files under ``root`` (recursively).

    Returns absolute paths to the manifests, sorted for determinism.
    Returns an empty list if ``root`` doesn't exist.
    """
    if not root.exists():
        return []
    return sorted(p.resolve() for p in root.rglob("plugin.toml"))


class PluginLoader:
    """Loads, activates, and deactivates plugins."""

    def __init__(
        self,
        *,
        registry: ExtensionRegistry | None = None,
    ) -> None:
        self._registry = registry or get_registry()
        self._loaded: dict[str, LoadedPlugin] = {}

    @property
    def loaded(self) -> dict[str, LoadedPlugin]:
        """Currently-active plugins keyed by name."""
        return dict(self._loaded)

    def activate(
        self,
        manifest: PluginManifest,
        *,
        granted_capabilities: set[Capability],
        plugin_settings: dict[str, Any] | None = None,
    ) -> LoadedPlugin:
        """Activate a plugin from a manifest.

        Resolves the backend entrypoint (``module:callable``), imports
        the module, calls the callable with a :class:`PluginContext`.
        The callable's return value (if it returns a callable itself)
        is recorded as the plugin's teardown function.

        Raises:
            RuntimeError: on import failure, missing entrypoint, or any
                exception from the plugin's setup function.
            ValueError: on already-loaded plugin or missing backend entry.
        """
        if manifest.name in self._loaded:
            msg = f"plugin {manifest.name!r} is already loaded"
            raise ValueError(msg)
        if manifest.entrypoint.backend is None:
            msg = f"plugin {manifest.name!r} has no backend entrypoint"
            raise ValueError(msg)

        # The user's consent: capabilities they actually granted.
        # We never give a context more capabilities than the manifest asked
        # for (defensive: even if the admin tried to grant extras).
        requested = set(manifest.capabilities)
        effective = granted_capabilities & requested

        if effective != granted_capabilities:
            extra = granted_capabilities - requested
            _log.warning(
                "plugin %s granted capabilities not declared in manifest: %s",
                manifest.name,
                sorted(c.value for c in extra),
            )

        context = PluginContext(
            plugin_name=manifest.name,
            plugin_version=manifest.version,
            granted_capabilities=effective,
            registry=self._registry,
            plugin_settings=plugin_settings,
        )

        module_name, _, callable_name = manifest.entrypoint.backend.partition(":")
        try:
            module = importlib.import_module(module_name)
        except Exception as exc:
            msg = f"failed to import plugin entry module {module_name!r}: {exc}"
            raise RuntimeError(msg) from exc

        try:
            setup = getattr(module, callable_name)
        except AttributeError as exc:
            msg = (
                f"plugin entry module {module_name!r} has no callable "
                f"{callable_name!r}"
            )
            raise RuntimeError(msg) from exc

        if not callable(setup):
            msg = f"plugin entry {manifest.entrypoint.backend!r} is not callable"
            raise RuntimeError(msg)

        try:
            result = setup(context)
        except Exception as exc:
            # Roll back any partial registrations the setup might have made.
            self._registry.unregister_plugin(manifest.name)
            msg = f"plugin {manifest.name!r} setup raised: {exc}"
            raise RuntimeError(msg) from exc

        teardown: Callable[[], None] | None = None
        if callable(result):
            teardown = result

        loaded = LoadedPlugin(manifest=manifest, context=context, teardown=teardown)
        self._loaded[manifest.name] = loaded

        _log.info(
            "plugin.activated",
            extra={
                "plugin": manifest.name,
                "version": manifest.version,
                "capabilities": sorted(c.value for c in effective),
            },
        )
        return loaded

    def deactivate(self, plugin_name: str) -> None:
        """Deactivate a loaded plugin.

        Calls the teardown function (if any), unregisters extensions,
        and removes the in-memory record. Exceptions from teardown are
        logged but do not stop deactivation — once the host wants the
        plugin gone, it must be gone.
        """
        loaded = self._loaded.pop(plugin_name, None)
        if loaded is None:
            msg = f"plugin {plugin_name!r} is not loaded"
            raise KeyError(msg)

        if loaded.teardown is not None:
            try:
                loaded.teardown()
            except Exception as exc:
                _log.warning(
                    "plugin.teardown.error",
                    extra={"plugin": plugin_name, "error": str(exc)},
                )

        removed = self._registry.unregister_plugin(plugin_name)
        _log.info(
            "plugin.deactivated",
            extra={"plugin": plugin_name, "extensions_removed": removed},
        )

    def activate_from_path(
        self,
        path: Path,
        *,
        granted_capabilities: set[Capability],
        plugin_settings: dict[str, Any] | None = None,
    ) -> LoadedPlugin:
        """Convenience: load manifest from path then activate."""
        manifest = load_manifest(path)
        return self.activate(
            manifest,
            granted_capabilities=granted_capabilities,
            plugin_settings=plugin_settings,
        )
