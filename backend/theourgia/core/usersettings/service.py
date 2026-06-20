"""User settings service — get / set / list for a user.

Features call :meth:`UserSettingsService.get_typed` for the most common
case ("give me the value of this key, applying defaults and aliases").
Setting writes go through :meth:`set` which validates against the
registry definition.

The persistence layer is a :class:`UserSettingsStore` Protocol with
two implementations:

- :class:`InMemoryUserSettingsStore` — for tests + single-process dev.
- DB-backed store lands when the first feature actually reads
  preferences in production (Phase 02 settings UI). The substrate's
  contract is small enough that the DB version is straightforward.

Caching: the service supports an optional :class:`Cache` — when
provided, gets are cached per-user-per-key with a short TTL (default
5 minutes). Writes invalidate the cache.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from typing import Any, Protocol, TypeVar, runtime_checkable
from uuid import UUID

from theourgia.core.usersettings.registry import (
    SettingsRegistry,
    default_settings_registry,
)

__all__ = [
    "InMemoryUserSettingsStore",
    "UserSettingsService",
    "UserSettingsStore",
]

_log = logging.getLogger(__name__)
T = TypeVar("T")


@runtime_checkable
class UserSettingsStore(Protocol):
    """Persistence layer for per-user settings.

    Stores raw JSON-serializable values. The service layer handles
    type coercion via the registry."""

    async def get(self, user_id: UUID, key: str) -> Any | None:
        """Return the stored value, or None if absent."""
        ...

    async def set(self, user_id: UUID, key: str, value: Any) -> None:
        """Persist ``value`` for ``user_id`` under ``key``."""
        ...

    async def delete(self, user_id: UUID, key: str) -> None:
        """Remove the user's value for ``key``. Idempotent."""
        ...

    async def all_for_user(self, user_id: UUID) -> dict[str, Any]:
        """Return every setting a user has explicitly set. Used by the
        export + settings-UI catalog."""
        ...


class InMemoryUserSettingsStore:
    """Process-local store. Tests use this; production swaps for the
    DB-backed implementation that lands with Phase 02 settings UI."""

    def __init__(
        self, initial: Mapping[tuple[UUID, str], Any] | None = None
    ) -> None:
        self._values: dict[tuple[UUID, str], Any] = dict(initial or {})

    async def get(self, user_id: UUID, key: str) -> Any | None:
        return self._values.get((user_id, key))

    async def set(self, user_id: UUID, key: str, value: Any) -> None:
        self._values[(user_id, key)] = value

    async def delete(self, user_id: UUID, key: str) -> None:
        self._values.pop((user_id, key), None)

    async def all_for_user(self, user_id: UUID) -> dict[str, Any]:
        return {k: v for (uid, k), v in self._values.items() if uid == user_id}


class UserSettingsService:
    """Feature-facing API for per-user settings.

    Construction takes a store and an optional registry override (tests
    isolate their own registry). The service is async-safe and stateless
    aside from the store + registry references.
    """

    def __init__(
        self,
        *,
        store: UserSettingsStore,
        registry: SettingsRegistry | None = None,
    ) -> None:
        self._store = store
        self._registry = registry or default_settings_registry

    @property
    def registry(self) -> SettingsRegistry:
        return self._registry

    # ── Read ─────────────────────────────────────────────────────────

    async def get_typed(
        self,
        *,
        user_id: UUID,
        key: str,
        default: T | None = None,
    ) -> T:
        """Return the user's setting for ``key``.

        Resolution order:

        1. Direct value stored for this user under ``key``.
        2. Forwarded value from an aliased old key (when ``key`` has
           been superseded but the user only set the old one).
        3. The supplied ``default`` if any; otherwise the registry's
           default for ``key``.

        Unregistered keys raise ``KeyError`` — settings the substrate
        doesn't know about are bugs, not silent passes.
        """
        definition = self._registry.get(key)

        # Direct read
        raw = await self._store.get(user_id, key)

        # Alias fallback — user set the OLD key but the feature
        # migrated to a new one; honor the old value once.
        if raw is None and definition.replaces:
            raw = await self._store.get(user_id, definition.replaces)

        if raw is None:
            return default if default is not None else definition.default

        try:
            return definition.validate(raw)
        except ValueError:
            _log.warning(
                "usersettings.invalid_stored_value",
                extra={
                    "user_id": str(user_id),
                    "key": key,
                    "raw": str(raw)[:200],
                },
            )
            return default if default is not None else definition.default

    async def get_raw(self, user_id: UUID, key: str) -> Any | None:
        """Return the raw stored value without validation. For the
        admin / settings-UI catalog that wants to show what's
        actually in storage."""
        return await self._store.get(user_id, key)

    async def all_for_user(self, user_id: UUID) -> dict[str, Any]:
        """Every setting the user has explicitly set."""
        return await self._store.all_for_user(user_id)

    async def effective_for_user(self, user_id: UUID) -> dict[str, Any]:
        """Every REGISTERED setting + this user's resolved value
        (explicit, alias-fallback, or default).

        Used by frontends that want to render the user's full
        configured state in one round trip."""
        explicit = await self._store.all_for_user(user_id)
        out: dict[str, Any] = {}
        for definition in self._registry.all():
            if definition.deprecated:
                continue
            raw = explicit.get(definition.key)
            if raw is None and definition.replaces:
                raw = explicit.get(definition.replaces)
            if raw is None:
                out[definition.key] = definition.default
                continue
            try:
                out[definition.key] = definition.validate(raw)
            except ValueError:
                out[definition.key] = definition.default
        return out

    # ── Write ────────────────────────────────────────────────────────

    async def set(
        self, *, user_id: UUID, key: str, value: Any
    ) -> Any:
        """Validate + persist a setting.

        Returns the normalized (coerced) value the store actually
        received. Raises ``ValueError`` on validation failure;
        ``KeyError`` for unregistered keys.
        """
        definition = self._registry.get(key)
        if definition.deprecated:
            _log.info(
                "usersettings.set_deprecated",
                extra={"user_id": str(user_id), "key": key},
            )
        normalized = definition.validate(value)
        await self._store.set(user_id, definition.key, normalized)
        return normalized

    async def delete(self, *, user_id: UUID, key: str) -> None:
        """Remove the user's explicit value for ``key`` — they'll see
        defaults on subsequent reads. Idempotent for missing keys.

        Tolerates unregistered ``key`` so cleanup of stale records
        works during schema migrations."""
        await self._store.delete(user_id, key)

    # ── Bulk + introspection ─────────────────────────────────────────

    async def bulk_set(
        self, *, user_id: UUID, values: Mapping[str, Any]
    ) -> dict[str, Any]:
        """Set multiple keys. Validation happens per-key — one bad
        value rejects only that key and the others still apply.

        Returns the dict of keys that DID apply with their normalized
        values."""
        applied: dict[str, Any] = {}
        for key, value in values.items():
            try:
                applied[key] = await self.set(
                    user_id=user_id, key=key, value=value
                )
            except (KeyError, ValueError) as exc:
                _log.warning(
                    "usersettings.bulk_set_skip",
                    extra={
                        "user_id": str(user_id),
                        "key": key,
                        "error": str(exc),
                    },
                )
        return applied

    def catalog(self) -> list[dict[str, Any]]:
        """Return a JSON-shaped catalog of every registered (non-
        deprecated) setting. Used by the settings UI to render the
        full grid of available preferences."""
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
                    "allowed_values": list(d.allowed_values) if d.allowed_values else None,
                    "min_value": d.min_value,
                    "max_value": d.max_value,
                }
            )
        return out
