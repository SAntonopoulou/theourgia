"""User notification preferences.

A :class:`PreferenceSet` declares which channels are enabled for each
notification kind for a single user. The :class:`PreferenceResolver`
combines per-user preferences with template defaults to decide which
channels actually fire.

The resolver is async + injectable so production can hit the database
while tests use an :class:`InMemoryPreferenceResolver`.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable
from uuid import UUID

from theourgia.core.notifications.message import DeliveryChannel

__all__ = [
    "InMemoryPreferenceResolver",
    "PreferenceResolver",
    "PreferenceSet",
]


@dataclass(frozen=True, slots=True)
class PreferenceSet:
    """Per-user enabled channels grouped by notification kind.

    Attributes:
        enabled: Mapping ``{kind -> {channel}}``. A channel listed
            under a kind is enabled; an empty set disables the kind
            entirely; an unmentioned kind uses the template default.
    """

    enabled: Mapping[str, frozenset[DeliveryChannel]] = field(default_factory=dict)
    """Per-kind channel allowlist."""

    fully_muted: bool = False
    """When True, every channel is disabled regardless of per-kind
    settings. Used for ``do not disturb`` toggle in user settings."""

    def resolve(
        self, kind: str, defaults: tuple[DeliveryChannel, ...]
    ) -> tuple[DeliveryChannel, ...]:
        """Return the channels that should actually fire for ``kind``.

        - ``fully_muted=True`` → empty tuple.
        - ``kind`` present in ``enabled`` → use its set, intersected
          with ``defaults`` (a user can't enable a channel a template
          doesn't support).
        - ``kind`` absent → use ``defaults`` as-is.
        """
        if self.fully_muted:
            return ()
        if kind in self.enabled:
            allowed = self.enabled[kind]
            return tuple(c for c in defaults if c in allowed)
        return tuple(defaults)


@runtime_checkable
class PreferenceResolver(Protocol):
    """Looks up a user's :class:`PreferenceSet`. Implementations vary
    (DB-backed in production, in-memory in tests)."""

    async def get(self, user_id: UUID) -> PreferenceSet:
        ...


class InMemoryPreferenceResolver:
    """Process-local resolver. Tests use this directly; production
    code substitutes a DB-backed resolver."""

    def __init__(self, prefs: Mapping[UUID, PreferenceSet] | None = None) -> None:
        self._prefs: dict[UUID, PreferenceSet] = dict(prefs or {})

    async def get(self, user_id: UUID) -> PreferenceSet:
        return self._prefs.get(user_id, PreferenceSet())

    def set(self, user_id: UUID, prefs: PreferenceSet) -> None:
        self._prefs[user_id] = prefs
