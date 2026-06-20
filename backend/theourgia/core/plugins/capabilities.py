"""Plugin capability vocabulary.

Capabilities are explicit permissions plugins declare in their
manifests and users approve at install time (browser-extension-style
review screen). The runtime enforces them: a plugin without the
``read.entries`` capability cannot read journal entries even if it
finds a way to call the function.

Capabilities are grouped by domain (``read.``, ``write.``, ``ui.``,
``db.``, ``network.``, ``fs.``, ``notif.``). The capability set is
intentionally small at v1: new capabilities require a new ADR (because
the plugin SDK is supposed to be stable).

Strings are the wire format (manifest TOML uses them); the enum is for
in-code reference.
"""

from __future__ import annotations

import enum

__all__ = ["Capability"]


class Capability(str, enum.Enum):
    """Permissions a plugin may declare.

    Format: ``domain.action`` (or ``domain.subdomain.action``). Each
    value is the stable wire form; new capabilities never reuse old
    names. Renames go through ADR.
    """

    # ── Vault data — read access ─────────────────────────────────────
    READ_ENTRIES = "read.entries"
    READ_ENTITIES = "read.entities"
    READ_DIVINATIONS = "read.divinations"
    READ_LIBRARY = "read.library"
    READ_CORRESPONDENCES = "read.correspondences"
    READ_ANALYTICS = "read.analytics"
    READ_MEDIA = "read.media"

    # ── Vault data — write access ────────────────────────────────────
    WRITE_ENTRIES = "write.entries"
    WRITE_ENTITIES = "write.entities"
    WRITE_DIVINATIONS = "write.divinations"
    WRITE_CORRESPONDENCES = "write.correspondences"
    WRITE_MEDIA = "write.media"

    # ── UI extension ─────────────────────────────────────────────────
    UI_EDITOR_BLOCK = "ui.editor.add_block"
    UI_DASHBOARD_WIDGET = "ui.dashboard.add_widget"
    UI_SETTINGS_PAGE = "ui.settings.add_page"
    UI_DIVINATION_SURFACE = "ui.divination.add_surface"

    # ── Database extension ───────────────────────────────────────────
    DB_MIGRATIONS = "db.migrations"
    """Allow the plugin to declare and run Alembic migrations.

    Migrations execute in a schema namespaced per-plugin
    (``plugin_<name>.*``); the plugin cannot touch tables outside its
    own schema even with this capability.
    """

    # ── Network ──────────────────────────────────────────────────────
    NETWORK_OUTBOUND = "network.outbound"
    """Allow outbound HTTP requests to declared hosts.

    The manifest must list specific hosts in ``allowed_hosts``; the
    sandbox blocks any other destination.
    """

    # ── Filesystem ───────────────────────────────────────────────────
    FS_READ = "fs.read"
    """Allow filesystem reads under the plugin's data directory only."""

    FS_WRITE = "fs.write"
    """Allow filesystem writes under the plugin's data directory only."""

    # ── Notifications ────────────────────────────────────────────────
    NOTIF_SEND = "notif.send"
    """Allow sending notifications through registered channels (email,
    Matrix, ntfy, etc.). Channel availability depends on host config."""

    # ── Federation ───────────────────────────────────────────────────
    FEDERATION_OUTBOUND = "federation.outbound"
    """Allow the plugin to emit federation messages. Restricted to the
    plugin's declared message types."""

    # ── AI agent integration (Phase 16) ──────────────────────────────
    AGENT_INVOKE = "agent.invoke"
    """Allow the plugin to invoke an authorized agent on behalf of the user."""

    @classmethod
    def from_string(cls, value: str) -> "Capability":
        """Parse a capability string into the enum, raising on unknown."""
        try:
            return cls(value)
        except ValueError as exc:
            msg = f"unknown capability: {value!r}"
            raise ValueError(msg) from exc

    @property
    def domain(self) -> str:
        """The domain prefix of this capability (``read``, ``write``, …)."""
        return self.value.split(".", 1)[0]
