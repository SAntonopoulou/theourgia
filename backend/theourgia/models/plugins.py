"""Plugin lifecycle models — what's installed, what capabilities are granted,
per-plugin settings.

Tables:

- ``plugin_install`` — one row per installed plugin. Holds manifest
  metadata, lifecycle state, and the source (registry / direct URL /
  local).
- ``plugin_capability_grant`` — explicit user grants of capabilities to
  a plugin. Stored separately from the install so revocation /
  re-consent is a row-level operation.
- ``plugin_setting`` — per-plugin key/value configuration.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    LargeBinary,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Enum as SQLEnum
from sqlmodel import Field

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.state import PluginState
from theourgia.models.base import IDMixin, TimestampMixin

__all__ = ["PluginInstall", "PluginCapabilityGrant", "PluginSetting"]


class PluginInstall(IDMixin, TimestampMixin, table=True):
    """An installed plugin.

    Per-vault scoping: vault owners install plugins for their own vault.
    A single Theourgia instance may have multiple vaults each with
    independent plugin installs.
    """

    __tablename__ = "plugin_install"
    __table_args__ = (
        UniqueConstraint("vault_id", "name", name="uq_plugin_install_vault_name"),
        Index("ix_plugin_install_state", "state"),
    )

    vault_id: UUID = Field(
        sa_column=Column(
            ForeignKey("vault.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    # From the plugin's manifest
    name: str = Field(sa_column=Column(String(64), nullable=False))
    version: str = Field(sa_column=Column(String(64), nullable=False))
    author: str = Field(sa_column=Column(String(255), nullable=False))
    license: str = Field(sa_column=Column(String(64), nullable=False))
    description: str = Field(default="", sa_column=Column(String(2000), nullable=False))
    homepage: Optional[str] = Field(default=None, sa_column=Column(String(500), nullable=True))

    # Where the plugin was installed from
    source: str = Field(
        sa_column=Column(String(500), nullable=False),
        description="Registry name, URL, or local path",
    )

    # Lifecycle
    state: PluginState = Field(
        sa_column=Column(
            SQLEnum(PluginState, name="plugin_state"),
            nullable=False,
            server_default=PluginState.INSTALLED.value,
        ),
    )
    last_error: Optional[str] = Field(
        default=None,
        sa_column=Column(String(2000), nullable=True),
        description="If state is ERROR, the most recent error message",
    )
    activated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Bookkeeping for signed releases (Phase 14)
    signature: Optional[bytes] = Field(
        default=None,
        sa_column=Column(LargeBinary, nullable=True),
        description="Ed25519 signature of the manifest, if present",
    )
    signature_public_key: Optional[bytes] = Field(
        default=None,
        sa_column=Column(LargeBinary, nullable=True),
        description="Public key that signed the manifest",
    )
    artifact_sha256: Optional[str] = Field(
        default=None,
        sa_column=Column(String(64), nullable=True),
        description=(
            "Hex SHA-256 of the release archive this install came from "
            "(registry installs only). Forensic pin: lets an operator "
            "later prove which exact bytes were installed."
        ),
    )

    # The full manifest as JSON for forensic reference
    manifest_json: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )


class PluginCapabilityGrant(IDMixin, TimestampMixin, table=True):
    """A capability the user has granted to a plugin install.

    The manifest declares what the plugin asks for; this table records
    what the user actually approved (the install UI shows the diff and
    requires explicit confirmation). Revoking a capability is a row
    delete; the next activation cycle will re-prompt for it.
    """

    __tablename__ = "plugin_capability_grant"
    __table_args__ = (
        UniqueConstraint(
            "plugin_install_id",
            "capability",
            name="uq_plugin_capability_install_cap",
        ),
    )

    plugin_install_id: UUID = Field(
        sa_column=Column(
            ForeignKey("plugin_install.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    capability: Capability = Field(
        sa_column=Column(
            SQLEnum(Capability, name="plugin_capability"),
            nullable=False,
        ),
    )

    # Who granted (typically the vault owner). Captured for audit.
    granted_by_user_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="SET NULL"), nullable=False),
    )


class PluginSetting(IDMixin, TimestampMixin, table=True):
    """A key/value configuration entry for a plugin install.

    Keys are plugin-defined. Values are JSON-shaped (the column is
    JSONB) so plugins can store arbitrary configuration. The plugin's
    code reads these through :meth:`PluginContext.get_setting`.
    """

    __tablename__ = "plugin_setting"
    __table_args__ = (
        UniqueConstraint(
            "plugin_install_id",
            "key",
            name="uq_plugin_setting_install_key",
        ),
    )

    plugin_install_id: UUID = Field(
        sa_column=Column(
            ForeignKey("plugin_install.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )

    key: str = Field(sa_column=Column(String(128), nullable=False))

    value: dict[str, object] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
