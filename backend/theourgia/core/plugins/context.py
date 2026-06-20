"""The sandboxed context passed to plugin setup.

When a plugin is activated, its declared backend entry point (e.g.,
``norse_runes_extended:setup``) is called with one argument: a
:class:`PluginContext`. The context exposes a capability-scoped API
surface — the plugin cannot reach the FastAPI app, the global DB
session, or anything else outside what the context allows.

The context is the **only** intended interface for plugin code.
Plugins that import from elsewhere in :mod:`theourgia` (other than
their own schema namespace) are misbehaving; future hardening
(restricted importers, AST validation at install time) will catch this.

The capabilities granted to a context are determined at plugin install
time by the user's explicit consent; the manifest declares what the
plugin asks for, the install UI surfaces the request, and the user
approves or refuses.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.registry import ExtensionRegistration, ExtensionRegistry

__all__ = ["PluginContext", "CapabilityDeniedError"]


class CapabilityDeniedError(PermissionError):
    """Raised when a plugin attempts an operation outside its granted capabilities."""

    def __init__(self, plugin_name: str, capability: Capability):
        super().__init__(
            f"plugin {plugin_name!r} lacks capability {capability.value!r}"
        )
        self.plugin_name = plugin_name
        self.capability = capability


class PluginContext:
    """The capability-scoped API surface for a plugin.

    A new context is constructed per-activation; capability checks run
    on each operation. Plugins keep the context reference during their
    setup; the host application keeps a registry of contexts so that
    capability changes (re-consent, revocation) propagate.
    """

    __slots__ = (
        "_capabilities",
        "_logger",
        "_plugin_name",
        "_plugin_version",
        "_registry",
        "_settings",
    )

    def __init__(
        self,
        *,
        plugin_name: str,
        plugin_version: str,
        granted_capabilities: set[Capability],
        registry: ExtensionRegistry,
        plugin_settings: dict[str, Any] | None = None,
    ) -> None:
        self._plugin_name = plugin_name
        self._plugin_version = plugin_version
        self._capabilities = frozenset(granted_capabilities)
        self._registry = registry
        self._settings = dict(plugin_settings or {})
        self._logger = logging.getLogger(f"theourgia.plugin.{plugin_name}")

    # ── Identity ─────────────────────────────────────────────────────

    @property
    def plugin_name(self) -> str:
        """The name from the plugin's manifest."""
        return self._plugin_name

    @property
    def plugin_version(self) -> str:
        """The version from the plugin's manifest."""
        return self._plugin_version

    @property
    def capabilities(self) -> frozenset[Capability]:
        """The set of capabilities granted to this plugin."""
        return self._capabilities

    @property
    def logger(self) -> logging.Logger:
        """A namespaced logger (``theourgia.plugin.<name>``).

        Plugins should log through this rather than configuring their own,
        so log output is consistent and the host can correlate."""
        return self._logger

    # ── Settings ─────────────────────────────────────────────────────

    def get_setting(self, key: str, default: Any = None) -> Any:
        """Look up a plugin-specific configuration value.

        Settings come from the ``plugin_setting`` table (populated by
        the admin UI). Plugins must tolerate missing keys gracefully.
        """
        return self._settings.get(key, default)

    # ── Extension registration ───────────────────────────────────────

    def register_extension(
        self,
        *,
        point: ExtensionPoint,
        name: str,
        handler: Callable[..., Any] | Any,
        metadata: dict[str, object] | None = None,
    ) -> ExtensionRegistration:
        """Register an extension implementation at the given extension point.

        Raises:
            ValueError: if (this plugin, this point, this name) is
                already registered.
        """
        return self._registry.register(
            plugin_name=self._plugin_name,
            point=point,
            name=name,
            handler=handler,
            metadata=metadata,
        )

    # ── Capability check helper ──────────────────────────────────────

    def require_capability(self, capability: Capability) -> None:
        """Raise :class:`CapabilityDeniedError` if the plugin lacks the capability."""
        if capability not in self._capabilities:
            raise CapabilityDeniedError(self._plugin_name, capability)

    def has_capability(self, capability: Capability) -> bool:
        """Return whether the plugin has been granted the capability."""
        return capability in self._capabilities

    def __repr__(self) -> str:  # No-leak default
        return (
            f"PluginContext(name={self._plugin_name!r}, "
            f"version={self._plugin_version!r}, "
            f"capabilities={sorted(c.value for c in self._capabilities)!r})"
        )
