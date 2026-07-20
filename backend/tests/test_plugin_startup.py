"""Startup plugin activation tests — v1-032.

Proves the loader actually EXECUTES installed plugins at boot:

  · an ACTIVE example-cipher install, discovered against the repo's
    real ``plugins/`` directory, registers its cipher (the handler is
    invocable and computes);
  · a broken plugin never blocks the sweep — it is marked ERROR with
    ``last_error`` while the healthy plugin still loads;
  · an ACTIVE install whose package is missing on disk is marked ERROR
    and reported.
"""

from __future__ import annotations

import sys
import textwrap
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest

from theourgia.core.plugins.extension_points import ExtensionPoint
from theourgia.core.plugins.loader import PluginLoader
from theourgia.core.plugins.registry import ExtensionRegistry
from theourgia.core.plugins.startup import load_active_plugins
from theourgia.core.plugins.state import PluginState

_REPO_ROOT = Path(__file__).resolve().parents[2]
_PLUGINS_DIR = _REPO_ROOT / "plugins"

EXAMPLE = "theourgia-plugin-example-cipher"


@pytest.fixture(autouse=True)
def _clean_import_state():
    """Purge plugin modules + sys.path entries the sweep adds."""
    before = list(sys.path)
    for name in list(sys.modules):
        if name.startswith("theourgia_plugin_"):
            sys.modules.pop(name, None)
    try:
        yield
    finally:
        sys.path[:] = before
        for name in list(sys.modules):
            if name.startswith("theourgia_plugin_"):
                sys.modules.pop(name, None)


# ── fakes ───────────────────────────────────────────────────────────


class _Result:
    def __init__(self, rows: list[Any]):
        self._rows = rows

    def scalars(self) -> _Result:
        return self

    def all(self) -> list[Any]:
        return self._rows


class _FakeSession:
    """First execute → installs; second → grants."""

    def __init__(self, installs: list[Any], grants: list[Any] | None = None):
        self.results = [_Result(installs)]
        if installs:
            self.results.append(_Result(grants or []))
        self.commits = 0

    async def execute(self, stmt: Any) -> _Result:
        assert self.results, "unexpected query"
        return self.results.pop(0)

    async def commit(self) -> None:
        self.commits += 1


def _active_install(name: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        name=name,
        version="0.1.0",
        state=PluginState.ACTIVE,
        last_error=None,
    )


# ── the real thing: example-cipher executes ─────────────────────────


async def test_startup_loads_example_cipher_and_registers_its_cipher() -> None:
    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)
    install = _active_install(EXAMPLE)
    session = _FakeSession([install])

    report = await load_active_plugins(
        session, plugins_dir=_PLUGINS_DIR, loader=loader,
    )

    assert report.loaded == [EXAMPLE]
    assert report.failed == {}
    assert install.state is PluginState.ACTIVE

    registrations = registry.implementations_for(ExtensionPoint.CIPHER)
    assert [r.name for r in registrations] == ["example-unity"]
    handler = registrations[0].handler
    # The cipher actually computes — proof the entrypoint EXECUTED.
    assert handler["compute"]("abc") == 3
    assert handler["compute"]("Hello, world!") == 10


# ── failure isolation ───────────────────────────────────────────────


def _write_broken_plugin(root: Path) -> None:
    pkg = root / "theourgia-plugin-broken"
    (pkg / "src" / "theourgia_plugin_broken").mkdir(parents=True)
    (pkg / "plugin.toml").write_text(
        textwrap.dedent(
            """\
            [plugin]
            name = "theourgia-plugin-broken"
            version = "0.1.0"
            author = "Test"
            license = "AGPL-3.0-only"
            description = "Deliberately broken plugin for isolation tests."
            theourgia-version = ">=0.1.0"

            [plugin.entrypoint]
            backend = "theourgia_plugin_broken.plugin:activate"
            """
        ),
        encoding="utf-8",
    )
    (pkg / "src" / "theourgia_plugin_broken" / "__init__.py").write_text("")
    (pkg / "src" / "theourgia_plugin_broken" / "plugin.py").write_text(
        "raise RuntimeError('boom at import time')\n",
    )


def _copy_example_plugin(root: Path) -> None:
    import shutil

    dest = root / EXAMPLE
    shutil.copytree(
        _PLUGINS_DIR / EXAMPLE,
        dest,
        symlinks=False,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )


async def test_broken_plugin_never_blocks_healthy_one(tmp_path) -> None:
    plugins_dir = tmp_path / "plugins"
    plugins_dir.mkdir()
    _copy_example_plugin(plugins_dir)
    _write_broken_plugin(plugins_dir)

    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)
    broken = _active_install("theourgia-plugin-broken")
    healthy = _active_install(EXAMPLE)
    session = _FakeSession([broken, healthy])

    report = await load_active_plugins(
        session, plugins_dir=plugins_dir, loader=loader,
    )

    assert report.loaded == [EXAMPLE]
    assert "theourgia-plugin-broken" in report.failed
    assert "boom at import time" in report.failed["theourgia-plugin-broken"]

    # Broken → ERROR with last_error; healthy stays ACTIVE.
    assert broken.state is PluginState.ERROR
    assert "boom at import time" in broken.last_error
    assert healthy.state is PluginState.ACTIVE
    assert session.commits == 1

    # The healthy plugin's cipher IS registered.
    assert [
        r.name
        for r in registry.implementations_for(ExtensionPoint.CIPHER)
    ] == ["example-unity"]


async def test_missing_package_marks_error(tmp_path) -> None:
    plugins_dir = tmp_path / "empty-plugins"
    plugins_dir.mkdir()

    registry = ExtensionRegistry()
    loader = PluginLoader(registry=registry)
    orphan = _active_install("theourgia-plugin-ghost")
    session = _FakeSession([orphan])

    report = await load_active_plugins(
        session, plugins_dir=plugins_dir, loader=loader,
    )

    assert report.missing_package == ["theourgia-plugin-ghost"]
    assert orphan.state is PluginState.ERROR
    assert "not found" in orphan.last_error
    assert session.commits == 1


async def test_no_active_installs_is_a_quiet_noop() -> None:
    session = _FakeSession([])
    report = await load_active_plugins(
        session, plugins_dir=_PLUGINS_DIR, loader=PluginLoader(
            registry=ExtensionRegistry(),
        ),
    )
    assert report.loaded == []
    assert report.failed == {}
    assert session.commits == 0
