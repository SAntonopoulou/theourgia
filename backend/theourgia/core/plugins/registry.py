"""In-process registry of plugin extension implementations.

Plugins, at activation time, register their extension implementations
via :meth:`PluginContext.register_extension`. Those registrations land
in a process-wide :class:`ExtensionRegistry` accessed via
:func:`get_registry`.

Host code that surfaces an extension point queries the registry to
iterate over registered implementations. For example, the divination
workbench asks ``registry.implementations_for(ExtensionPoint.DIVINATION_SYSTEM)``
and lists each registered system.

The registry is intentionally a thin in-memory dict. Plugin activation
is the only writer; queries are read-only. The host application
reconstructs the registry from the database on startup by re-running
plugin setup functions.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from threading import RLock
from typing import Any

from theourgia.core.plugins.extension_points import ExtensionPoint

__all__ = ["ExtensionRegistration", "ExtensionRegistry", "get_registry", "reset_registry"]


@dataclass(frozen=True, slots=True)
class ExtensionRegistration:
    """A single registered extension implementation.

    ``handler`` is the Python callable / object the plugin provided.
    Host code that queries the registry knows how to use it based on
    the extension point's contract.

    ``metadata`` is a free-form dict of plugin-supplied static info
    (display name, description, version) — handy for surfacing in admin
    UIs without invoking the handler.
    """

    plugin_name: str
    point: ExtensionPoint
    name: str
    """A handler-local identifier (e.g., the system name for a divination system,
    the cipher name for a gematria scheme). Unique within a (plugin, point)."""

    handler: Any
    """The implementation. Shape is point-specific; defined by the point's contract."""

    metadata: dict[str, object] = field(default_factory=dict)


class ExtensionRegistry:
    """A process-wide registry of registered extensions.

    Thread-safe (RLock-guarded mutations) so plugin setup running in a
    worker thread doesn't race host queries.
    """

    def __init__(self) -> None:
        self._lock = RLock()
        # point → list of registrations
        self._by_point: dict[ExtensionPoint, list[ExtensionRegistration]] = {}
        # plugin_name → list of registrations (for unregister-by-plugin)
        self._by_plugin: dict[str, list[ExtensionRegistration]] = {}

    def register(
        self,
        *,
        plugin_name: str,
        point: ExtensionPoint,
        name: str,
        handler: Callable[..., Any] | Any,
        metadata: dict[str, object] | None = None,
    ) -> ExtensionRegistration:
        """Register an extension. Returns the stored :class:`ExtensionRegistration`.

        Raises :class:`ValueError` if the same (plugin, point, name) triple
        is already registered — explicit error rather than silent overwrite.
        """
        registration = ExtensionRegistration(
            plugin_name=plugin_name,
            point=point,
            name=name,
            handler=handler,
            metadata=dict(metadata) if metadata else {},
        )
        with self._lock:
            existing = self._by_point.get(point, [])
            for r in existing:
                if r.plugin_name == plugin_name and r.name == name:
                    msg = (
                        f"plugin {plugin_name!r} already registered "
                        f"{name!r} at {point.value}"
                    )
                    raise ValueError(msg)
            self._by_point.setdefault(point, []).append(registration)
            self._by_plugin.setdefault(plugin_name, []).append(registration)
        return registration

    def unregister_plugin(self, plugin_name: str) -> int:
        """Remove all registrations for the given plugin. Returns the count."""
        with self._lock:
            to_remove = self._by_plugin.pop(plugin_name, [])
            for reg in to_remove:
                bucket = self._by_point.get(reg.point, [])
                bucket[:] = [r for r in bucket if r.plugin_name != plugin_name]
                if not bucket:
                    self._by_point.pop(reg.point, None)
        return len(to_remove)

    def implementations_for(
        self,
        point: ExtensionPoint,
    ) -> tuple[ExtensionRegistration, ...]:
        """Return the registrations for a given extension point, ordered by
        registration time. Empty tuple if none."""
        with self._lock:
            return tuple(self._by_point.get(point, []))

    def all_registrations(self) -> tuple[ExtensionRegistration, ...]:
        """Return every registration across all points and plugins."""
        with self._lock:
            return tuple(r for regs in self._by_point.values() for r in regs)

    def plugin_count(self) -> int:
        """Number of distinct plugins that have at least one registration."""
        with self._lock:
            return len(self._by_plugin)

    def clear(self) -> None:
        """Remove every registration. Used by tests and during shutdown."""
        with self._lock:
            self._by_point.clear()
            self._by_plugin.clear()


_singleton: ExtensionRegistry | None = None
_singleton_lock = RLock()


def get_registry() -> ExtensionRegistry:
    """Return the process-wide :class:`ExtensionRegistry` (creating it lazily)."""
    global _singleton
    if _singleton is None:
        with _singleton_lock:
            if _singleton is None:
                _singleton = ExtensionRegistry()
    return _singleton


def reset_registry() -> None:
    """Replace the global registry with a fresh one. **Tests only.**"""
    global _singleton
    with _singleton_lock:
        _singleton = ExtensionRegistry()
