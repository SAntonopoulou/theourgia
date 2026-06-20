"""Tests for plugin manifest parsing and validation."""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest
from pydantic import ValidationError

from theourgia.core.plugins.capabilities import Capability
from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.manifest import (
    PluginManifest,
    load_manifest,
    parse_manifest_text,
)


_MINIMAL_MANIFEST = textwrap.dedent(
    """
    [plugin]
    name = "norse-runes-extended"
    version = "1.2.0"
    author = "Some Magician"
    license = "AGPL-3.0-only"
    description = "Younger Futhark and Anglo-Saxon Futhorc."
    theourgia-version = ">=1.0.0,<2.0.0"
    """
)


def test_parse_minimal_manifest() -> None:
    m = parse_manifest_text(_MINIMAL_MANIFEST)
    assert m.name == "norse-runes-extended"
    assert m.version == "1.2.0"
    assert m.author == "Some Magician"
    assert m.license == "AGPL-3.0-only"
    assert m.theourgia_version == ">=1.0.0,<2.0.0"
    assert m.capabilities == []
    assert m.extension_points == []


def test_parse_full_manifest() -> None:
    text = textwrap.dedent(
        """
        [plugin]
        name = "norse-runes-extended"
        version = "1.2.0"
        author = "Some Magician"
        license = "AGPL-3.0-only"
        description = "Younger Futhark and Anglo-Saxon Futhorc, plus bind-runes."
        homepage = "https://example.com"
        theourgia-version = ">=1.0.0,<2.0.0"
        capabilities = ["ui.editor.add_block"]
        extension_points = ["divination.system", "workshop.sigil_mode"]

        [plugin.entrypoint]
        backend = "norse_runes_extended:setup"
        frontend = "dist/index.js"
        """
    )
    m = parse_manifest_text(text)
    assert Capability.UI_EDITOR_BLOCK in m.capabilities
    assert ExtensionPoint.DIVINATION_SYSTEM in m.extension_points
    assert ExtensionPoint.SIGIL_MODE in m.extension_points
    assert m.entrypoint.backend == "norse_runes_extended:setup"
    assert m.entrypoint.frontend == "dist/index.js"


def test_subsection_capability_array_accepted() -> None:
    """Accept ``[plugin.capabilities] capabilities = [...]`` sub-section style too."""
    text = _MINIMAL_MANIFEST + textwrap.dedent(
        """
        [plugin.capabilities]
        capabilities = ["read.entries", "ui.editor.add_block"]

        [plugin.extension_points]
        implemented = ["divination.system"]
        """
    )
    m = parse_manifest_text(text)
    assert Capability.READ_ENTRIES in m.capabilities
    assert ExtensionPoint.DIVINATION_SYSTEM in m.extension_points


def test_invalid_capability_name_rejected() -> None:
    text = _MINIMAL_MANIFEST + 'capabilities = ["read.nonsense"]\n'
    with pytest.raises(ValidationError):
        parse_manifest_text(text)


def test_invalid_extension_point_rejected() -> None:
    text = _MINIMAL_MANIFEST + 'extension_points = ["not.a.real.point"]\n'
    with pytest.raises(ValidationError):
        parse_manifest_text(text)


def test_duplicate_capability_rejected() -> None:
    text = _MINIMAL_MANIFEST + 'capabilities = ["read.entries", "read.entries"]\n'
    with pytest.raises(ValidationError, match="duplicate capability"):
        parse_manifest_text(text)


def test_duplicate_extension_point_rejected() -> None:
    text = _MINIMAL_MANIFEST + (
        'extension_points = ["divination.system", "divination.system"]\n'
    )
    with pytest.raises(ValidationError, match="duplicate extension point"):
        parse_manifest_text(text)


def test_bad_semver_rejected() -> None:
    text = textwrap.dedent(
        """
        [plugin]
        name = "x"
        version = "1.2"
        author = "x"
        license = "AGPL-3.0-only"
        description = "x"
        theourgia-version = ">=1.0.0"
        """
    )
    with pytest.raises(ValidationError):
        parse_manifest_text(text)


def test_bad_name_format_rejected() -> None:
    text = textwrap.dedent(
        """
        [plugin]
        name = "Not Valid"
        version = "1.0.0"
        author = "x"
        license = "AGPL-3.0-only"
        description = "x"
        theourgia-version = ">=1.0.0"
        """
    )
    with pytest.raises(ValidationError):
        parse_manifest_text(text)


def test_db_migrations_requires_entrypoint_path() -> None:
    text = _MINIMAL_MANIFEST + 'capabilities = ["db.migrations"]\n'
    with pytest.raises(ValidationError, match="entrypoint.migrations"):
        parse_manifest_text(text)


def test_backend_entrypoint_format_validated() -> None:
    text = (
        _MINIMAL_MANIFEST
        + textwrap.dedent(
            """
            [plugin.entrypoint]
            backend = "no-colon-here"
            """
        )
    )
    with pytest.raises(ValidationError, match="module:callable"):
        parse_manifest_text(text)


def test_load_manifest_from_directory(tmp_path: Path) -> None:
    plugin_dir = tmp_path / "myplugin"
    plugin_dir.mkdir()
    (plugin_dir / "plugin.toml").write_text(_MINIMAL_MANIFEST)
    m = load_manifest(plugin_dir)
    assert m.name == "norse-runes-extended"


def test_load_manifest_from_file(tmp_path: Path) -> None:
    f = tmp_path / "plugin.toml"
    f.write_text(_MINIMAL_MANIFEST)
    m = load_manifest(f)
    assert m.name == "norse-runes-extended"


def test_load_manifest_missing_raises(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        load_manifest(tmp_path / "does-not-exist")


def test_no_plugin_section_rejected() -> None:
    with pytest.raises(ValueError, match=r"\[plugin\] section"):
        parse_manifest_text("[notplugin]\nname = 'x'\n")


def test_extra_field_rejected() -> None:
    text = _MINIMAL_MANIFEST + 'unknown_field = "oops"\n'
    with pytest.raises(ValidationError):
        parse_manifest_text(text)
