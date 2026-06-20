"""Plugin manifest schema and parser.

Plugins ship a ``plugin.toml`` file at the root of their package
describing their identity, the extension points they implement, the
capabilities they require, and where their entry points live.

The schema is intentionally strict (``extra='forbid'``) so typos fail
loudly at install time rather than silently at runtime. Authors get
clear error messages from Pydantic.
"""

from __future__ import annotations

import tomllib
from pathlib import Path
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.extension_points import ExtensionPoint

__all__ = ["PluginManifest", "PluginEntrypoints", "load_manifest", "parse_manifest_text"]


_SemVerStr = Annotated[str, StringConstraints(pattern=r"^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$")]
"""Strict SemVer 2.0 string (with optional pre-release; build metadata omitted)."""

_PluginNameStr = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9-]{1,63}$")]
"""Plugin name: lowercase letters, digits, hyphens; 2–64 chars."""


class PluginEntrypoints(BaseModel):
    """Where the plugin's code lives.

    All paths are relative to the plugin package root.
    """

    model_config = ConfigDict(extra="forbid")

    backend: str | None = Field(
        default=None,
        description=(
            "Python entry point in the form ``module:callable``. The callable "
            "receives a PluginContext at activation time."
        ),
    )
    frontend: str | None = Field(
        default=None,
        description="Path to the built frontend bundle (ES module)",
    )
    migrations: str | None = Field(
        default=None,
        description="Path to an Alembic migrations directory (relative)",
    )

    @field_validator("backend")
    @classmethod
    def _validate_backend_entrypoint(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if ":" not in v:
            msg = f"backend entrypoint must be 'module:callable', got {v!r}"
            raise ValueError(msg)
        module, _, callable_name = v.partition(":")
        if not module or not callable_name:
            msg = f"backend entrypoint must be 'module:callable', got {v!r}"
            raise ValueError(msg)
        return v


class PluginManifest(BaseModel):
    """Top-level plugin manifest.

    Parsed from ``plugin.toml``. The shape is:

    .. code-block:: toml

        [plugin]
        name = "norse-runes-extended"
        version = "1.2.0"
        author = "..."
        license = "AGPL-3.0-only"
        description = "..."
        theourgia-version = ">=1.0.0,<2.0.0"

        [plugin.entrypoint]
        backend = "norse_runes_extended:setup"
        frontend = "dist/index.js"
        migrations = "migrations/"

        [plugin.capabilities]
        capabilities = ["read.entries", "ui.editor.add_block"]

        [plugin.extension_points]
        implemented = ["divination.system", "workshop.sigil_mode"]

        [plugin.allowed_hosts]
        # When network.outbound is requested, list specific hosts here.
        hosts = []
    """

    model_config = ConfigDict(extra="forbid")

    name: _PluginNameStr = Field(description="Plugin identifier (matches PyPI / registry name)")
    version: _SemVerStr = Field(description="Plugin version (SemVer)")
    author: str = Field(description="Author name or organization")
    license: str = Field(
        description=(
            "SPDX license identifier. Must be AGPL-3.0-compatible to install in "
            "the Theourgia ecosystem."
        ),
    )
    description: str = Field(min_length=1, max_length=2000)
    homepage: str | None = Field(default=None, description="Plugin homepage / repo URL")
    theourgia_version: str = Field(
        alias="theourgia-version",
        description="PEP 440-style range of Theourgia versions this plugin supports",
    )

    entrypoint: PluginEntrypoints = Field(default_factory=PluginEntrypoints)
    capabilities: list[Capability] = Field(
        default_factory=list,
        description="Capabilities this plugin requires (shown to user at install)",
    )
    extension_points: list[ExtensionPoint] = Field(
        default_factory=list,
        description="Extension points this plugin implements",
    )
    allowed_hosts: list[str] = Field(
        default_factory=list,
        description=(
            "When ``network.outbound`` is in capabilities, the specific hosts "
            "the plugin may contact. Empty means denied even if capability is granted."
        ),
    )

    @model_validator(mode="after")
    def _validate_consistency(self) -> "PluginManifest":
        # If db.migrations capability declared, an entrypoint must specify the path
        if Capability.DB_MIGRATIONS in self.capabilities and not self.entrypoint.migrations:
            msg = (
                "capability db.migrations declared but no entrypoint.migrations path"
            )
            raise ValueError(msg)

        # If network.outbound requested, require explicit allowed_hosts to be
        # set (empty is allowed but means a no-op; we warn at install via lint).
        # The capability still requires explicit declaration of the list.
        if Capability.NETWORK_OUTBOUND in self.capabilities and self.allowed_hosts is None:
            msg = "capability network.outbound declared but allowed_hosts missing"
            raise ValueError(msg)

        # Capabilities must be unique
        if len(self.capabilities) != len(set(self.capabilities)):
            msg = "duplicate capability in manifest"
            raise ValueError(msg)

        # Extension points must be unique
        if len(self.extension_points) != len(set(self.extension_points)):
            msg = "duplicate extension point in manifest"
            raise ValueError(msg)

        return self


def parse_manifest_text(text: str) -> PluginManifest:
    """Parse a manifest from a TOML string.

    Raises :class:`pydantic.ValidationError` on schema violations
    (clear error messages identify the offending field).
    """
    data = tomllib.loads(text)
    plugin_section = data.get("plugin")
    if not isinstance(plugin_section, dict):
        msg = "plugin.toml must have a [plugin] section"
        raise ValueError(msg)
    # Flatten capability and extension_point arrays from sub-sections if present
    plugin_section = _normalize_subsections(plugin_section)
    return PluginManifest.model_validate(plugin_section)


def _normalize_subsections(plugin: dict[str, object]) -> dict[str, object]:
    """Pull arrays out of nested [plugin.capabilities] / [plugin.extension_points] / [plugin.allowed_hosts] sub-sections.

    The TOML schema documented in the docstring uses sub-sections with a
    field inside them; we accept either that or flat top-level arrays
    on the [plugin] section.
    """
    if isinstance(plugin.get("capabilities"), dict):
        sub = plugin["capabilities"]
        if isinstance(sub, dict) and "capabilities" in sub:
            plugin["capabilities"] = sub["capabilities"]
    if isinstance(plugin.get("extension_points"), dict):
        sub = plugin["extension_points"]
        if isinstance(sub, dict) and "implemented" in sub:
            plugin["extension_points"] = sub["implemented"]
    if isinstance(plugin.get("allowed_hosts"), dict):
        sub = plugin["allowed_hosts"]
        if isinstance(sub, dict) and "hosts" in sub:
            plugin["allowed_hosts"] = sub["hosts"]
    return plugin


def load_manifest(path: Path) -> PluginManifest:
    """Load and validate a plugin manifest from a path.

    ``path`` may point at the manifest file or its containing directory.
    """
    p = Path(path)
    if p.is_dir():
        p = p / "plugin.toml"
    if not p.exists():
        msg = f"plugin manifest not found: {p}"
        raise FileNotFoundError(msg)
    return parse_manifest_text(p.read_text(encoding="utf-8"))
