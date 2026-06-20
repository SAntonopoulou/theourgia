"""Theourgia plugin substrate.

Plugins extend Theourgia at well-defined :class:`ExtensionPoint`\\ s:
calendars, astrology techniques, divination systems, ciphers, sigil
modes, editor blocks, dashboard widgets, notification channels, and
more. They are Python packages with a ``plugin.toml`` manifest that
declares the extension points they implement and the capabilities they
require.

This package provides the **scaffolding** in Phase 01:

- Manifest schema and parser (:mod:`manifest`)
- Capability vocabulary (:mod:`capabilities`)
- Extension point taxonomy (:mod:`extension_points`)
- In-process extension registry (:mod:`registry`)
- Plugin lifecycle state machine (:mod:`state`)
- A sandboxed context object passed to plugin setup (:mod:`context`)
- The loader that discovers and activates plugins (:mod:`loader`)

The runtime enforcement of capabilities (process isolation, audit of
out-of-scope calls, signed-release verification, plugin marketplace
integration) is finalized in Phase 14 — but the contracts here are
stable enough that plugin authors can begin writing against them today.
"""

from __future__ import annotations

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.context import PluginContext
from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.manifest import PluginManifest, load_manifest
from theourgia.core.plugins.registry import (
    ExtensionRegistration,
    ExtensionRegistry,
    get_registry,
)
from theourgia.core.plugins.state import PluginState

__all__ = [
    "Capability",
    "ExtensionPoint",
    "ExtensionRegistration",
    "ExtensionRegistry",
    "PluginContext",
    "PluginManifest",
    "PluginState",
    "get_registry",
    "load_manifest",
]
