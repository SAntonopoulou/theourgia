"""Instance-settings service.

Get / set / list over a pluggable store. The store interface is
intentionally tiny so the DB-backed implementation that ships
alongside the admin UI is a thin shim.

Authentication / authorization is NOT in this layer — the service
trusts callers. The API layer enforces "only admins can write" via
:func:`authorize` against the appropriate scope.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any, Protocol, TypeVar, runtime_checkable

from theourgia.core.instancesettings.registry import (
    InstanceSettingsRegistry,
    default_instance_settings_registry,
)

__all__ = [
    "InMemoryInstanceSettingsStore",
    "InstanceSettingsService",
    "InstanceSettingsStore",
]

_log = logging.getLogger(__name__)
T = TypeVar("T")


@runtime_checkable
class InstanceSettingsStore(Protocol):
    """Persistence Protocol — one row per key, instance-wide."""

    async def get(self, key: str) -> Any | None:
        ...

    async def set(self, key: str, value: Any) -> None:
        ...

    async def delete(self, key: str) -> None:
        ...

    async def all(self) -> dict[str, Any]:
        """Return every key the operator has explicitly set."""
        ...


class InMemoryInstanceSettingsStore:
    """Process-local store — tests, single-process dev."""

    def __init__(self, initial: Mapping[str, Any] | None = None) -> None:
        self._values: dict[str, Any] = dict(initial or {})

    async def get(self, key: str) -> Any | None:
        return self._values.get(key)

    async def set(self, key: str, value: Any) -> None:
        self._values[key] = value

    async def delete(self, key: str) -> None:
        self._values.pop(key, None)

    async def all(self) -> dict[str, Any]:
        return dict(self._values)


class InstanceSettingsService:
    """Get / set / list with registry-backed validation."""

    def __init__(
        self,
        *,
        store: InstanceSettingsStore,
        registry: InstanceSettingsRegistry | None = None,
    ) -> None:
        self._store = store
        self._registry = registry or default_instance_settings_registry

    @property
    def registry(self) -> InstanceSettingsRegistry:
        return self._registry

    # ── Read ─────────────────────────────────────────────────────────

    async def get_typed(
        self,
        key: str,
        *,
        default: T | None = None,
    ) -> T:
        """Return the instance's value for ``key``.

        Resolution order: explicit stored value → aliased old key
        (when ``key`` has been renamed) → caller default → registry
        default.

        Unregistered keys raise ``KeyError``."""
        definition = self._registry.get(key)
        raw = await self._store.get(key)
        if raw is None and definition.replaces:
            raw = await self._store.get(definition.replaces)
        if raw is None:
            return default if default is not None else definition.default
        try:
            return definition.validate(raw)
        except ValueError:
            _log.warning(
                "instancesettings.invalid_stored_value",
                extra={"key": key, "raw": str(raw)[:200]},
            )
            return default if default is not None else definition.default

    async def get_public_typed(
        self,
        key: str,
        *,
        default: T | None = None,
    ) -> T:
        """Same as :meth:`get_typed` but raises ``PermissionError`` if
        the setting isn't marked ``public=True``.

        Used by anonymous endpoints (e.g. the public "is registration
        open?" check served to the signup page) to enforce that they
        only read keys the operator explicitly opted in to public
        exposure."""
        definition = self._registry.get(key)
        if not definition.public:
            from theourgia.core.i18n import _

            raise PermissionError(
                _(
                    "This setting is not available to non-admin readers.",
                    key=key,
                )
            )
        return await self.get_typed(key, default=default)

    async def get_raw(self, key: str) -> Any | None:
        """Return the raw stored value without validation. For the
        admin UI / settings catalog page."""
        return await self._store.get(key)

    async def all_explicit(self) -> dict[str, Any]:
        """Return every setting the operator has explicitly set."""
        return await self._store.all()

    async def effective(self) -> dict[str, Any]:
        """Return every REGISTERED setting + the instance's resolved
        value (explicit, alias-fallback, or default).

        Used by the admin dashboard's settings page to render the
        full set."""
        explicit = await self._store.all()
        out: dict[str, Any] = {}
        for d in self._registry.all():
            if d.deprecated:
                continue
            raw = explicit.get(d.key)
            if raw is None and d.replaces:
                raw = explicit.get(d.replaces)
            if raw is None:
                out[d.key] = d.default
                continue
            try:
                out[d.key] = d.validate(raw)
            except ValueError:
                out[d.key] = d.default
        return out

    async def effective_public(self) -> dict[str, Any]:
        """The public-readable subset of :meth:`effective`. Served to
        anonymous / homepage callers."""
        explicit = await self._store.all()
        out: dict[str, Any] = {}
        for d in self._registry.public():
            raw = explicit.get(d.key)
            if raw is None and d.replaces:
                raw = explicit.get(d.replaces)
            if raw is None:
                out[d.key] = d.default
                continue
            try:
                out[d.key] = d.validate(raw)
            except ValueError:
                out[d.key] = d.default
        return out

    # ── Write ────────────────────────────────────────────────────────

    async def set(self, key: str, value: Any) -> Any:
        """Validate + persist. Caller is responsible for verifying
        the requester is an admin — this layer trusts the caller.

        Returns the normalized value the store actually received.
        Raises ``ValueError`` on validation failure, ``KeyError`` for
        unregistered keys."""
        definition = self._registry.get(key)
        normalized = definition.validate(value)
        await self._store.set(definition.key, normalized)
        return normalized

    async def delete(self, key: str) -> None:
        """Remove the explicit value — subsequent reads return the
        registry default. Tolerates unregistered keys for cleanup."""
        await self._store.delete(key)

    # ── Catalog ──────────────────────────────────────────────────────

    def catalog(self) -> list[dict[str, Any]]:
        """JSON-shaped catalog of every registered (non-deprecated)
        instance setting. The admin settings UI renders this."""
        out: list[dict[str, Any]] = []
        for d in self._registry.all():
            if d.deprecated:
                continue
            out.append(
                {
                    "key": d.key,
                    "value_type": d.value_type.__name__,
                    "default": d.default,
                    "description": d.description,
                    "public": d.public,
                    "allowed_values": list(d.allowed_values) if d.allowed_values else None,
                    "min_value": d.min_value,
                    "max_value": d.max_value,
                }
            )
        return out
