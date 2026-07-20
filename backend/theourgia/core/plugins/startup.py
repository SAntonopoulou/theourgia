"""Startup activation of installed plugins — Phase 14 close-out (v1-032).

The database knows which plugins the magician installed + activated
(``plugin_install`` rows in state ACTIVE, with their per-capability
grants); the plugins directory holds the unpacked packages. At app
startup this module reconciles the two: every ACTIVE install whose
package is discoverable gets loaded through :class:`PluginLoader`
with the **capability intersection** the loader already enforces
(grants ∩ manifest declarations).

Failure isolation: one broken plugin must never block boot. Each
activation runs in its own try/except; failures are logged and the
install row moves ACTIVE → ERROR (a transition the state machine
permits) with ``last_error`` set, so the H09 status dashboard surfaces
the problem honestly instead of the plugin silently not existing.

Import mechanics: plugin packages are directories, not pip-installed
distributions. Before importing a plugin's entry module the loader
root gets ``<package>/`` and ``<package>/src/`` prepended to
``sys.path`` (the src-layout the reference plugins use). Entries are
NOT removed afterwards — the plugin's module must stay importable for
the lifetime of the process.
"""

from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from sqlalchemy import select

from theourgia.core.plugins.loader import PluginLoader, discover_manifests
from theourgia.core.plugins.manifest import PluginManifest, load_manifest
from theourgia.core.plugins.state import PluginState, allowed_transition
from theourgia.models.plugins import PluginCapabilityGrant, PluginInstall

if TYPE_CHECKING:
    from pathlib import Path
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from theourgia.core.plugins.capabilities import Capability

__all__ = ["StartupLoadReport", "load_active_plugins"]

_log = logging.getLogger(__name__)


@dataclass(slots=True)
class StartupLoadReport:
    """What happened during the startup sweep."""

    loaded: list[str] = field(default_factory=list)
    failed: dict[str, str] = field(default_factory=dict)
    missing_package: list[str] = field(default_factory=list)


def _ensure_importable(package_dir: Path) -> None:
    """Prepend the package dir (and its ``src/`` if present) to sys.path."""
    for candidate in (package_dir / "src", package_dir):
        if candidate.is_dir():
            path_str = str(candidate)
            if path_str not in sys.path:
                sys.path.insert(0, path_str)


def _discover_packages(plugins_dir: Path) -> dict[str, Path]:
    """Map manifest name → package directory for every discoverable
    plugin. A manifest that fails strict parsing is skipped with a log
    (it will surface as ``missing_package`` for any ACTIVE install)."""
    packages: dict[str, Path] = {}
    for manifest_path in discover_manifests(plugins_dir):
        try:
            manifest = load_manifest(manifest_path)
        except Exception as exc:  # noqa: BLE001 — a bad manifest must not block the sweep
            _log.warning(
                "plugin.startup.manifest_unparseable",
                extra={"path": str(manifest_path), "error": str(exc)},
            )
            continue
        packages[manifest.name] = manifest_path.parent
    return packages


async def load_active_plugins(
    session: AsyncSession,
    *,
    plugins_dir: Path,
    loader: PluginLoader | None = None,
) -> StartupLoadReport:
    """Activate every ACTIVE plugin install found on disk.

    Per-plugin failure isolation: an exception from one plugin's
    import/setup marks THAT install ERROR (with ``last_error``) and the
    sweep continues. The session is committed once at the end when any
    state changed.
    """
    loader = loader or PluginLoader()
    report = StartupLoadReport()
    packages = _discover_packages(plugins_dir)

    installs = list(
        (
            await session.execute(
                select(PluginInstall).where(
                    PluginInstall.state == PluginState.ACTIVE,
                )
            )
        ).scalars().all()
    )
    if not installs:
        return report

    grants_by_install: dict[UUID, set[Capability]] = {}
    grant_rows = list(
        (
            await session.execute(
                select(PluginCapabilityGrant).where(
                    PluginCapabilityGrant.plugin_install_id.in_(
                        [i.id for i in installs],
                    )
                )
            )
        ).scalars().all()
    )
    for grant in grant_rows:
        grants_by_install.setdefault(
            grant.plugin_install_id, set(),
        ).add(grant.capability)

    dirty = False
    for install in installs:
        package_dir = packages.get(install.name)
        if package_dir is None:
            report.missing_package.append(install.name)
            dirty |= _mark_error(
                install,
                f"plugin package not found under {plugins_dir}",
            )
            continue
        try:
            _ensure_importable(package_dir)
            manifest: PluginManifest = load_manifest(package_dir)
            loader.activate(
                manifest,
                granted_capabilities=grants_by_install.get(
                    install.id, set(),
                ),
            )
        except Exception as exc:  # noqa: BLE001 — failure isolation IS the contract
            report.failed[install.name] = str(exc)
            dirty |= _mark_error(install, str(exc))
            _log.error(
                "plugin.startup.activation_failed",
                extra={"plugin": install.name, "error": str(exc)},
            )
            continue
        report.loaded.append(install.name)
        _log.info(
            "plugin.startup.activated",
            extra={"plugin": install.name, "version": install.version},
        )

    if dirty:
        await session.commit()
    return report


def _mark_error(install: PluginInstall, message: str) -> bool:
    """Move an install to ERROR if the state machine allows it.

    Returns True when the row changed. ACTIVE → ERROR is always a
    permitted transition; the guard exists so a future caller passing
    rows in other states can't corrupt the machine."""
    if not allowed_transition(install.state, PluginState.ERROR):
        _log.error(
            "plugin.startup.cannot_mark_error",
            extra={"plugin": install.name, "state": install.state.value},
        )
        return False
    install.state = PluginState.ERROR
    install.last_error = message[:2000]
    return True
